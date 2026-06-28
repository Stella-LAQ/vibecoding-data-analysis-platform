import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useDataStore } from "@/store/dataStore";
import toast from "react-hot-toast";
import { BarChart3, TrendingUp, PieChart, ScatterChart, Grid3x3, Activity, Download } from "lucide-react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement,
  Title, Tooltip, Legend, Filler, RadialLinearScale,
} from "chart.js";
import { Bar, Line, Pie, Scatter, Radar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler, RadialLinearScale);

const chartTypes = [
  { key: "line" as const, label: "Line", icon: TrendingUp },
  { key: "bar" as const, label: "Bar", icon: BarChart3 },
  { key: "pie" as const, label: "Pie", icon: PieChart },
  { key: "scatter" as const, label: "Scatter", icon: ScatterChart },
  { key: "heatmap" as const, label: "Heatmap", icon: Grid3x3 },
  { key: "radar" as const, label: "Radar", icon: Activity },
];

const chartColors = [
  "hsl(252 73% 64%)", "hsl(187 100% 50%)", "hsl(160 100% 39%)", "hsl(15 85% 60%)",
  "hsl(30 100% 50%)", "hsl(270 60% 55%)", "hsl(200 80% 55%)", "hsl(340 75% 55%)",
];

export default function Analysis() {
  const { sessionKey, columns, columnTypes } = useDataStore();
  const navigate = useNavigate();
  const [chartType, setChartType] = useState<"line" | "bar" | "pie" | "scatter" | "heatmap" | "radar">("line");
  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");

  const numericCols = useMemo(() => columns.filter((c) => columnTypes[c] === "numeric"), [columns, columnTypes]);

  const { data: stats } = trpc.getStats.useQuery(
    { sessionKey: sessionKey! },
    { enabled: !!sessionKey, refetchOnWindowFocus: false }
  );

  const { data: chartData, isLoading: chartLoading } = trpc.getChartData.useQuery(
    { sessionKey: sessionKey!, chartType, xColumn, yColumn },
    { enabled: !!sessionKey && !!xColumn, refetchOnWindowFocus: false }
  );

  const exportQ = trpc.exportData.useQuery(
    { sessionKey: sessionKey!, format: "csv", useCleaned: true },
    { enabled: false }
  );

  const handleExport = async () => {
    if (!sessionKey) return;
    try {
      const result = await exportQ.refetch();
      if (result.data?.content) {
        const blob = new Blob([result.data.content], { type: result.data.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "clarvation_export.csv";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Data exported");
      }
    } catch { toast.error("Export failed"); }
  };

  const buildChart = () => {
    if (!chartData) return null;
    const baseOpt = {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "hsl(220 10% 65%)", font: { size: 11 } } } },
    };
    switch (chartData.chartType) {
      case "line": return {
        type: "line" as const,
        data: { labels: chartData.labels, datasets: [{ label: yColumn || xColumn, data: chartData.values, borderColor: chartColors[0], backgroundColor: chartColors[0] + "18", fill: true, tension: 0.4, pointRadius: 2 }] },
        options: { ...baseOpt, scales: { x: { ticks: { color: "hsl(220 10% 55%)", maxRotation: 45, font: { size: 10 } }, grid: { color: "hsl(220 10% 18%)" } }, y: { ticks: { color: "hsl(220 10% 55%)", font: { size: 10 } }, grid: { color: "hsl(220 10% 18%)" } } } }
      };
      case "bar": return {
        type: "bar" as const,
        data: { labels: chartData.labels, datasets: [{ label: yColumn || "Value", data: chartData.values, backgroundColor: (chartData.labels as string[]).map((_: string, i: number) => chartColors[i % chartColors.length] + "B0"), borderRadius: 5 }] },
        options: { ...baseOpt, scales: { x: { ticks: { color: "hsl(220 10% 55%)", font: { size: 10 } }, grid: { color: "hsl(220 10% 18%)" } }, y: { ticks: { color: "hsl(220 10% 55%)", font: { size: 10 } }, grid: { color: "hsl(220 10% 18%)" } } } }
      };
      case "pie": {
        const pd = chartData as { labels: string[]; values: number[] };
        return { type: "pie" as const, data: { labels: pd.labels, datasets: [{ data: pd.values, backgroundColor: pd.labels.map((_: string, i: number) => chartColors[i % chartColors.length] + "CC"), borderColor: "hsl(228 30% 5%)", borderWidth: 2 }] }, options: baseOpt };
      }
      case "scatter": {
        const sd = chartData as { points: { x: number; y: number }[] };
        const pts = sd.points.length > 800 ? sd.points.filter((_: unknown, i: number) => i % Math.ceil(sd.points.length / 800) === 0) : sd.points;
        return { type: "scatter" as const, data: { datasets: [{ label: `${xColumn} vs ${yColumn}`, data: pts, backgroundColor: chartColors[1] + "70", pointRadius: 3 }] }, options: { ...baseOpt, scales: { x: { ticks: { color: "hsl(220 10% 55%)" }, grid: { color: "hsl(220 10% 18%)" } }, y: { ticks: { color: "hsl(220 10% 55%)" }, grid: { color: "hsl(220 10% 18%)" } } } } };
      }
      case "heatmap": {
        const hm = chartData as { columns: string[]; matrix: Record<string, Record<string, number>> };
        const cl = hm.columns;
        const mx = cl.map((r) => cl.map((c) => Math.abs(hm.matrix[r]?.[c] ?? 0)));
        const bgFor = (r: number[], idx: number) => { const v = r[idx]; const intensity = Math.min(v, 1); return `hsl(252 73% 64% / ${0.15 + intensity * 0.7})`; };
        return {
          type: "bar" as const,
          data: { labels: cl, datasets: cl.map((ci, idx) => ({ label: ci, data: mx.map((r) => r[idx]), backgroundColor: mx.map((r) => bgFor(r, idx)) })) },
          options: { ...baseOpt, scales: { x: { stacked: true, ticks: { color: "hsl(220 10% 55%)", font: { size: 9 } }, grid: { color: "hsl(220 10% 18%)" } }, y: { stacked: true, ticks: { color: "hsl(220 10% 55%)", font: { size: 9 } }, grid: { color: "hsl(220 10% 18%)" } } } }
        };
      }
      case "radar": {
        const rd = chartData as { labels: string[]; datasets: { label: string; value: number }[] };
        return { type: "radar" as const, data: { labels: rd.labels, datasets: rd.datasets.map((ds, i) => ({ label: ds.label, data: [ds.value], borderColor: chartColors[i % chartColors.length], backgroundColor: chartColors[i % chartColors.length] + "20", pointBackgroundColor: chartColors[i % chartColors.length] })) }, options: baseOpt };
      }
      default: return null;
    }
  };

  const chartDS = buildChart();

  if (!sessionKey) {
    return (
      <div className="page-transition empty-state">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "hsl(var(--primary) / 0.08)" }}>
          <BarChart3 size={26} style={{ color: "hsl(var(--primary))" }} strokeWidth={1.4} />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">No Data Loaded</h3>
        <p className="text-sm text-muted-foreground mb-5 max-w-md text-center">
          No data imported yet. Click Import in the sidebar, or drag & drop your CSV/JSON file here to get started.
        </p>
        <button onClick={() => navigate("/upload")} className="btn-primary text-sm">Import Data</button>
      </div>
    );
  }

  return (
    <div className="page-transition">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Analysis & Visualization</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Statistical summary, correlation matrix, and interactive charts</p>
        </div>
        <button onClick={handleExport} className="btn-secondary text-sm gap-2">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Stats Panel */}
      {stats && (
        <div className="glass-card p-6 mb-6">
          <h3 className="text-[14px] font-semibold text-foreground mb-4">Statistical Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Total Rows", value: stats.summary.totalRows.toLocaleString(), accent: "hsl(var(--primary))" },
              { label: "Columns", value: stats.summary.totalCols, accent: "hsl(var(--accent))" },
              { label: "Numeric", value: stats.summary.numericCols, accent: "hsl(160 80% 42%)" },
              { label: "Categorical", value: stats.summary.categoricalCols, accent: "hsl(15 85% 58%)" },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-xl" style={{ background: `${s.accent}10` }}>
                <div className="text-xl font-bold" style={{ color: s.accent }}>{s.value}</div>
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b" style={{ borderColor: "hsl(var(--border))" }}>
                  {["Column", "Type", "Mean", "Median", "Min", "Max", "Std Dev"].map((h) => (
                    <th key={h} className={`text-left py-2.5 px-2 text-muted-foreground font-medium ${h !== "Column" && h !== "Type" ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.columnStats).map(([col, stat]) => {
                  const s = stat as { type: string; mean?: number; median?: number; min?: number; max?: number; std?: number } | null;
                  const isNum = s?.type === "numeric";
                  return (
                    <tr key={col} className="border-b hover:bg-foreground/[0.02] transition-colors" style={{ borderColor: "hsl(var(--border) / 0.5)" }}>
                      <td className="py-2 px-2 font-medium text-foreground">{col}</td>
                      <td className="py-2 px-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: isNum ? "hsl(var(--primary) / 0.12)" : "hsl(160 80% 42% / 0.12)", color: isNum ? "hsl(var(--primary))" : "hsl(160 80% 42%)" }}>{isNum ? "Numeric" : "Category"}</span>
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums" style={{ color: "hsl(var(--accent))" }}>{s?.mean?.toFixed(2) ?? "-"}</td>
                      <td className="py-2 px-2 text-right tabular-nums" style={{ color: "hsl(var(--accent))" }}>{s?.median?.toFixed(2) ?? "-"}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{s?.min?.toFixed(2) ?? "-"}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{s?.max?.toFixed(2) ?? "-"}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{s?.std?.toFixed(2) ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chart Controls */}
      <div className="glass-card p-6 mb-6">
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Chart Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">Chart Type</label>
            <div className="flex flex-wrap gap-1.5">
              {chartTypes.map((ct) => { const Icon = ct.icon; return (
                <button key={ct.key} onClick={() => setChartType(ct.key)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all" style={chartType === ct.key ? { background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" } : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                  <Icon size={12} /> {ct.label}
                </button>
              ); })}
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">X Axis</label>
            <select value={xColumn} onChange={(e) => setXColumn(e.target.value)} className="input-dark w-full">
              <option value="">Select column...</option>
              {columns.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">Y Axis</label>
            <select value={yColumn} onChange={(e) => setYColumn(e.target.value)} className="input-dark w-full">
              <option value="">Select column...</option>
              {numericCols.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
        </div>
      </div>

      {/* Chart */}
      {xColumn && (
        <div className="glass-card p-6">
          <h3 className="text-[14px] font-semibold text-foreground mb-4">
            {chartTypes.find((c) => c.key === chartType)?.label} Chart - {xColumn}{yColumn ? ` vs ${yColumn}` : ""}
          </h3>
          <div style={{ height: 380 }}>
            {chartLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent" />
              </div>
            ) : chartDS ? (
              <>
                {chartDS.type === "line" && <Line data={chartDS.data} options={chartDS.options} />}
                {chartDS.type === "bar" && <Bar data={chartDS.data} options={chartDS.options} />}
                {chartDS.type === "pie" && <Pie data={chartDS.data} options={chartDS.options} />}
                {chartDS.type === "scatter" && <Scatter data={chartDS.data} options={chartDS.options} />}
                {chartDS.type === "radar" && <Radar data={chartDS.data} options={chartDS.options} />}
              </>
            ) : (<div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data to display</div>)}
          </div>
        </div>
      )}
    </div>
  );
}
