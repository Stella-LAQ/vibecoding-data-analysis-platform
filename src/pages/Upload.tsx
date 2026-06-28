import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useDataStore } from "@/store/dataStore";
import toast from "react-hot-toast";
import { UploadCloud, FileSpreadsheet, FileJson, Loader2, ShieldCheck } from "lucide-react";
import * as XLSX from "xlsx";

// 200MB limit
const MAX_FILE_SIZE = 200 * 1024 * 1024;
const ALLOWED_EXTS = [".csv", ".xlsx", ".json"] as const;

function validateFile(file: File): { ok: true } | { ok: false; error: string } {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  if (!ALLOWED_EXTS.includes(ext as (typeof ALLOWED_EXTS)[number])) {
    return { ok: false, error: "Unsupported file format. Please upload CSV, Excel, or JSON files." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: "File size exceeds the 200MB limit. Please use a smaller file." };
  }
  return { ok: true };
}

export default function UploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const setSession = useDataStore((s) => s.setSession);
  const uploadMutation = trpc.upload.useMutation();

  const handleFile = useCallback(
    async (file: File) => {
      // Validate
      const validation = validateFile(file);
      if (!validation.ok) { toast.error(validation.error); return; }

      // Prevent double submit
      if (uploading) return;
      setUploading(true);
      setProgress(0);

      try {
        let content: string;
        const fileType = file.name.toLowerCase().endsWith(".json")
          ? "application/json"
          : file.name.toLowerCase().endsWith(".csv")
            ? "text/csv"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

        if (fileType === "text/csv") {
          const text = await file.text();
          content = btoa(unescape(encodeURIComponent(text)));
          setProgress(40);
        } else if (fileType === "application/json") {
          const text = await file.text();
          const parsed = JSON.parse(text);
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          const headers = Array.from(new Set(arr.flatMap((row) => (row && typeof row === "object" ? Object.keys(row) : []))));
          const rows = arr.map((row) => {
            const r: Record<string, string | number | null> = {};
            headers.forEach((h) => { const v = row?.[h]; r[h] = v === undefined || v === null ? null : typeof v === "number" ? v : String(v); });
            return r;
          });
          content = btoa(unescape(encodeURIComponent(JSON.stringify({ columns: headers, data: rows }))));
          setProgress(30);
        } else {
          // Excel
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null }) as (string | number | null)[][];
          if (jsonData.length < 2) { toast.error("File appears to be empty"); setUploading(false); return; }
          const headers = jsonData[0].map((h) => (h === null ? "" : String(h)));
          const rows: Record<string, string | number | null>[] = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row: Record<string, string | number | null> = {};
            headers.forEach((h, j) => {
              const val = jsonData[i][j];
              row[h] = val === undefined || val === null || val === "" ? null : typeof val === "number" ? val : String(val);
            });
            rows.push(row);
          }
          content = btoa(unescape(encodeURIComponent(JSON.stringify({ columns: headers, data: rows }))));
          setProgress(30);
        }

        setProgress(60);
        const result = await uploadMutation.mutateAsync({ fileName: file.name, fileType, fileSize: file.size, content });
        setProgress(100);

        setSession(result.sessionKey, file.name, result.rowCount, result.colCount, result.columns, result.columnTypes);
        toast.success(`${file.name} imported successfully`);

        // Auto-redirect to Preview page after short delay
        setTimeout(() => navigate("/preview"), 600);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "File upload failed. Please check your file and try again.";
        toast.error(msg);
      } finally { setUploading(false); }
    },
    [uploadMutation, setSession, navigate, uploading]
  );

  const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file); }, [handleFile]);
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) handleFile(file); }, [handleFile]);

  return (
    <div className="page-transition max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-2">Import Data</h2>
        <p className="text-sm text-muted-foreground">Upload CSV, Excel, or JSON files. Auto type detection included.</p>
      </div>

      <div
        onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className="relative transition-all duration-300"
        style={{
          border: isDragging ? "2px dashed hsl(var(--accent))" : "2px dashed hsl(var(--border))",
          borderRadius: "16px",
          background: isDragging ? "linear-gradient(165deg, hsl(var(--accent) / 0.04), hsl(var(--primary) / 0.02))" : "linear-gradient(165deg, hsl(var(--card) / 0.6), hsl(var(--card) / 0.5))",
          backdropFilter: "blur(20px)",
          padding: "48px 32px",
          boxShadow: isDragging ? "0 8px 32px hsl(var(--accent) / 0.08)" : "0 4px 16px hsl(var(--background) / 0.3)",
          cursor: uploading ? "not-allowed" : "pointer",
          opacity: uploading ? 0.7 : 1,
        }}
      >
        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.json" onChange={onFileInput} className="hidden" disabled={uploading} />

        {uploading ? (
          <div className="flex flex-col items-center gap-5">
            <Loader2 className="animate-spin" size={36} style={{ color: "hsl(var(--primary))" }} />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground mb-3">Processing file...</p>
              <div className="w-56 h-1.5 rounded-full overflow-hidden mx-auto" style={{ background: "hsl(var(--border))" }}>
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))" }} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">{progress}%</p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-transform" style={{ background: isDragging ? "hsl(var(--accent) / 0.1)" : "hsl(var(--primary) / 0.08)" }}>
              <UploadCloud size={28} style={{ color: isDragging ? "hsl(var(--accent))" : "hsl(var(--primary))" }} strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-medium text-foreground mb-1.5">
              {isDragging ? "Drop file to upload" : "Click or drag file here"}
            </p>
            <p className="text-[12px] text-muted-foreground">CSV, Excel, JSON up to 200MB</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mt-6">
        {[
          { icon: FileSpreadsheet, label: "Excel / CSV", desc: "Tabular data" },
          { icon: FileJson, label: "JSON", desc: "Structured data" },
          { icon: ShieldCheck, label: "Auto-Detect", desc: "Num, text, date" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="glass-card p-4 text-center">
              <Icon size={18} className="mx-auto mb-2.5" style={{ color: "hsl(var(--primary))" }} strokeWidth={1.5} />
              <p className="text-[12px] font-medium text-foreground">{item.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
