import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { dataSessions } from "@db/schema";
import crypto from "crypto";
import {
  createSession,
  getSession,
  setOriginalData,
  setCleanedData,
  setStats,
  setPredictions,
} from "./dataStore";
import {
  detectColumnType,
  getColumnStats,
  cleanData,
  correlationMatrix,
  linearRegression,
  trendForecast,
} from "./dataEngine";
import type { DataFrame } from "./dataStore";

// File validation constants
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls", ".json"];
const ALLOWED_MIME_TYPES = ["text/csv", "application/json", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];

function validateFile(fileName: string, fileType: string, fileSize: number): { ok: true } | { ok: false; error: string } {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { ok: false, error: "Unsupported file format. Please upload CSV, Excel, or JSON files." };
  }
  if (!ALLOWED_MIME_TYPES.includes(fileType) && !fileName.toLowerCase().endsWith(".xls")) {
    // .xls files may have varying mime types, be lenient for those
    if (!ALLOWED_EXTENSIONS.some((e) => fileName.toLowerCase().endsWith(e))) {
      return { ok: false, error: "Unsupported file format. Please upload CSV, Excel, or JSON files." };
    }
  }
  if (fileSize > MAX_FILE_SIZE) {
    return { ok: false, error: "File size exceeds the 200MB limit. Please use a smaller file." };
  }
  return { ok: true };
}

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),

  // 1. File upload
  upload: publicQuery
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number(),
        content: z.string(), // base64 encoded file content
      })
    )
    .mutation(async ({ input }) => {
      // Validate file
      const validation = validateFile(input.fileName, input.fileType, input.fileSize);
      if (!validation.ok) {
        throw new Error(validation.error);
      }

      let sessionKey: string;
      let parsed: { columns: string[]; data: Record<string, (string | number | null)>[] };

      try {
        sessionKey = crypto.randomBytes(32).toString("hex");
        const buffer = Buffer.from(input.content, "base64");

        if (input.fileType === "text/csv" || input.fileName.toLowerCase().endsWith(".csv")) {
          parsed = parseCSV(buffer.toString("utf-8"));
        } else if (
          input.fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          input.fileName.toLowerCase().endsWith(".xlsx") ||
          input.fileName.toLowerCase().endsWith(".xls")
        ) {
          parsed = JSON.parse(buffer.toString("utf-8"));
        } else if (input.fileType === "application/json" || input.fileName.toLowerCase().endsWith(".json")) {
          parsed = JSON.parse(buffer.toString("utf-8"));
        } else {
          throw new Error("Unsupported file format. Please upload CSV, Excel, or JSON files.");
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "File upload failed. Please check your file and try again.";
        throw new Error(message);
      }

      const { columns, data } = parsed;

      if (columns.length === 0 || data.length === 0) {
        throw new Error("File appears to be empty or has no valid data.");
      }

      // Detect column types
      const columnTypes: Record<string, string> = {};
      for (const col of columns) {
        const values = data.map((row) => row[col]);
        columnTypes[col] = detectColumnType(values);
      }

      const df: DataFrame = {
        columns,
        data: data.slice(0, 5000),
        rowCount: data.length,
        colCount: columns.length,
        columnTypes,
      };

      createSession(sessionKey);
      setOriginalData(sessionKey, df);

      // Save to database with try/catch
      try {
        const db = getDb();
        await db.insert(dataSessions).values({
          sessionKey,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: input.fileSize,
          rowCount: data.length,
          colCount: columns.length,
          columns,
        });
      } catch (dbErr) {
        console.error("Database insert error:", dbErr);
        // Session data is already in memory, continue even if DB fails
      }

      return {
        success: true,
        sessionKey,
        rowCount: data.length,
        colCount: columns.length,
        columns,
        columnTypes,
      };
    }),

  // 2. Data preview
  getPreview: publicQuery
    .input(
      z.object({
        sessionKey: z.string(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
        sortColumn: z.string().optional(),
        sortDirection: z.enum(["asc", "desc"]).optional(),
        filter: z.string().optional(),
      })
    )
    .query(({ input }) => {
      const session = getSession(input.sessionKey);
      if (!session) throw new Error("Session not found. Please import a file first.");

      const df = session.cleaned || session.original;
      if (!df) throw new Error("No data available. Please import a file first.");

      let data = [...df.data];

      if (input.filter) {
        const filterLower = input.filter.toLowerCase();
        data = data.filter((row) =>
          df.columns.some((col) => String(row[col]).toLowerCase().includes(filterLower))
        );
      }

      if (input.sortColumn) {
        const col = input.sortColumn;
        data.sort((a, b) => {
          const aVal = a[col];
          const bVal = b[col];
          const aNum = Number(aVal);
          const bNum = Number(bVal);

          if (!isNaN(aNum) && !isNaN(bNum)) {
            return input.sortDirection === "desc" ? bNum - aNum : aNum - bNum;
          }

          const aStr = String(aVal ?? "");
          const bStr = String(bVal ?? "");
          return input.sortDirection === "desc" ? bStr.localeCompare(aStr) : aStr.localeCompare(bStr);
        });
      }

      const total = data.length;
      const start = (input.page - 1) * input.pageSize;
      const paginated = data.slice(start, start + input.pageSize);

      return {
        columns: df.columns,
        data: paginated,
        total,
        page: input.page,
        pageSize: input.pageSize,
        columnTypes: df.columnTypes,
      };
    }),

  // 3. Data cleaning
  cleanData: publicQuery
    .input(
      z.object({
        sessionKey: z.string(),
        handleMissing: z.enum(["delete", "mean", "median", "mode", "fill"]).default("mean"),
        fillValue: z.union([z.string(), z.number()]).optional(),
        handleDuplicate: z.boolean().default(true),
        handleOutlier: z.enum(["none", "iqr", "zscore"]).default("iqr"),
        normalizeType: z.enum(["none", "minmax", "zscore"]).default("none"),
      })
    )
    .mutation(({ input }) => {
      const session = getSession(input.sessionKey);
      if (!session) throw new Error("Session not found. Please import a file first.");
      if (!session.original) throw new Error("No data available. Please import a file first.");

      const { data: cleaned, log } = cleanData(
        session.original.data,
        session.original.columns,
        {
          handleMissing: input.handleMissing,
          fillValue: input.fillValue,
          handleDuplicate: input.handleDuplicate,
          handleOutlier: input.handleOutlier,
          normalizeType: input.normalizeType,
        }
      );

      const cleanedDf: DataFrame = {
        columns: session.original.columns,
        data: cleaned,
        rowCount: cleaned.length,
        colCount: session.original.columns.length,
        columnTypes: session.original.columnTypes,
      };

      setCleanedData(input.sessionKey, cleanedDf, log);

      return {
        success: true,
        log,
        originalRows: session.original.rowCount,
        cleanedRows: cleaned.length,
      };
    }),

  // 4. Statistics
  getStats: publicQuery
    .input(z.object({ sessionKey: z.string() }))
    .query(({ input }) => {
      const session = getSession(input.sessionKey);
      if (!session) throw new Error("Session not found. Please import a file first.");

      const df = session.cleaned || session.original;
      if (!df) throw new Error("No data available. Please import a file first.");

      const columnStats: Record<string, unknown> = {};
      for (const col of df.columns) {
        const values = df.data.map((row) => row[col]);
        columnStats[col] = getColumnStats(values);
      }

      const corr = correlationMatrix(df.data, df.columns);

      const result = {
        columnStats,
        correlation: corr,
        summary: {
          totalRows: df.rowCount,
          totalCols: df.colCount,
          numericCols: Object.entries(df.columnTypes).filter(([, t]) => t === "numeric").length,
          categoricalCols: Object.entries(df.columnTypes).filter(([, t]) => t === "categorical").length,
          datetimeCols: Object.entries(df.columnTypes).filter(([, t]) => t === "datetime").length,
        },
      };

      setStats(input.sessionKey, result);
      return result;
    }),

  // 5. Chart data
  getChartData: publicQuery
    .input(
      z.object({
        sessionKey: z.string(),
        chartType: z.enum(["line", "bar", "pie", "scatter", "heatmap", "radar"]),
        xColumn: z.string(),
        yColumn: z.string().optional(),
      })
    )
    .query(({ input }) => {
      const session = getSession(input.sessionKey);
      if (!session) throw new Error("Session not found. Please import a file first.");

      const df = session.cleaned || session.original;
      if (!df) throw new Error("No data available. Please import a file first.");

      const data = df.data;
      const { chartType, xColumn, yColumn } = input;

      switch (chartType) {
        case "line":
        case "bar": {
          const grouped: Record<string, { sum: number; count: number }> = {};
          data.forEach((row) => {
            const key = String(row[xColumn] ?? "N/A");
            const val = yColumn ? Number(row[yColumn]) : 1;
            if (!grouped[key]) grouped[key] = { sum: 0, count: 0 };
            if (!isNaN(val)) { grouped[key].sum += val; grouped[key].count++; }
          });

          const labels = Object.keys(grouped);
          const values = labels.map((k) => grouped[k].count > 0 ? Number((grouped[k].sum / grouped[k].count).toFixed(4)) : 0);

          let finalLabels = labels;
          let finalValues = values;
          if (labels.length > 30) {
            const step = Math.ceil(labels.length / 30);
            finalLabels = labels.filter((_, i) => i % step === 0);
            finalValues = values.filter((_, i) => i % step === 0);
          }

          return { labels: finalLabels, values: finalValues, chartType };
        }

        case "pie": {
          const counts: Record<string, number> = {};
          data.forEach((row) => { const key = String(row[xColumn] ?? "N/A"); counts[key] = (counts[key] || 0) + 1; });
          const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15);
          return { labels: sorted.map(([k]) => k), values: sorted.map(([, v]) => v), chartType };
        }

        case "scatter": {
          if (!yColumn) throw new Error("Scatter plot requires a Y axis selection.");
          const points = data.map((row) => ({ x: Number(row[xColumn]), y: Number(row[yColumn]) })).filter((p) => !isNaN(p.x) && !isNaN(p.y));
          const sampled = points.length > 1000 ? points.filter((_, i) => i % Math.ceil(points.length / 1000) === 0) : points;
          return { points: sampled, chartType };
        }

        case "heatmap": {
          const corr = correlationMatrix(data, df.columns);
          return { columns: corr.columns, matrix: corr.matrix, chartType };
        }

        case "radar": {
          if (!yColumn) throw new Error("Radar chart requires a grouping field.");
          const groups: Record<string, number[]> = {};
          data.forEach((row) => {
            const group = String(row[yColumn] ?? "N/A");
            const val = Number(row[xColumn]);
            if (!groups[group]) groups[group] = [];
            if (!isNaN(val)) groups[group].push(val);
          });

          const labels = Object.keys(groups).slice(0, 6);
          const datasets = labels.map((lbl) => {
            const vals = groups[lbl];
            const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
            return { label: lbl, value: Number(avg.toFixed(4)) };
          });

          return { labels, datasets, chartType };
        }

        default:
          return { labels: [], values: [], chartType };
      }
    }),

  // 6. Prediction
  predict: publicQuery
    .input(
      z.object({
        sessionKey: z.string(),
        model: z.enum(["linear_regression", "trend_forecast"]).default("linear_regression"),
        xColumn: z.string(),
        yColumn: z.string(),
        predictSteps: z.number().default(5),
      })
    )
    .mutation(({ input }) => {
      const session = getSession(input.sessionKey);
      if (!session) throw new Error("Session not found. Please import a file first.");

      const df = session.cleaned || session.original;
      if (!df) throw new Error("No data available. Please import a file first.");

      let result: Record<string, unknown>;

      if (input.model === "linear_regression") {
        result = linearRegression(df.data, input.xColumn, input.yColumn, input.predictSteps);
      } else {
        result = trendForecast(df.data, input.yColumn, 3, input.predictSteps);
      }

      setPredictions(input.sessionKey, result);
      return result;
    }),

  // 7. Export
  exportData: publicQuery
    .input(
      z.object({
        sessionKey: z.string(),
        format: z.enum(["csv", "xlsx", "json"]).default("csv"),
        useCleaned: z.boolean().default(true),
      })
    )
    .query(({ input }) => {
      const session = getSession(input.sessionKey);
      if (!session) throw new Error("Session not found. Please import a file first.");

      const df = input.useCleaned ? (session.cleaned || session.original) : session.original;
      if (!df) throw new Error("No data available. Please import a file first.");

      if (input.format === "json") {
        return { content: JSON.stringify(df.data, null, 2), mimeType: "application/json" };
      }

      const headers = df.columns.join(",");
      const rows = df.data.map((row) =>
        df.columns.map((col) => {
          const val = row[col];
          const str = val === null || val === undefined ? "" : String(val);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(",")
      );
      const csv = [headers, ...rows].join("\n");

      return { content: csv, mimeType: "text/csv" };
    }),

  // 8. Session status
  getSessionStatus: publicQuery
    .input(z.object({ sessionKey: z.string() }))
    .query(({ input }) => {
      const session = getSession(input.sessionKey);
      if (!session) return null;

      return {
        hasData: !!session.original,
        hasCleaned: !!session.cleaned,
        cleanLog: session.cleanedLog,
        hasStats: !!session.stats,
        hasPredictions: !!session.predictions,
        rowCount: session.original?.rowCount || 0,
        colCount: session.original?.colCount || 0,
      };
    }),

  // 9. Session list
  getSessions: publicQuery.query(async () => {
    try {
      const db = getDb();
      const sessions = await db.select().from(dataSessions).orderBy(dataSessions.createdAt).limit(50);
      return sessions;
    } catch {
      return [];
    }
  }),
});

export type AppRouter = typeof appRouter;

// CSV parser
function parseCSV(content: string): { columns: string[]; data: Record<string, (string | number | null)>[] } {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) throw new Error("File appears to be empty.");

  const headers = parseCSVLine(lines[0]);
  if (headers.length === 0) throw new Error("No columns found in file header.");

  const data: Record<string, (string | number | null)>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.every((v) => v === "")) continue; // skip empty rows
    const row: Record<string, (string | number | null)> = {};
    headers.forEach((h, j) => {
      const val = values[j] ?? "";
      const num = Number(val);
      row[h] = val === "" ? null : (!isNaN(num) && val !== "") ? num : val;
    });
    data.push(row);
  }

  if (data.length === 0) throw new Error("No data rows found in file.");

  return { columns: headers, data };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else { current += char; }
  }
  result.push(current.trim());
  return result;
}
