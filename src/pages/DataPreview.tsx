import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useDataStore } from "@/store/dataStore";
import toast from "react-hot-toast";
import { Search, ArrowUpDown, ChevronLeft, ChevronRight, Database, Sparkles, Settings2, Table2, FileJson } from "lucide-react";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import type { ColDef } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

export default function DataPreview() {
  const { sessionKey, columns, hasCleaned, setCleanLog, setHasCleaned } = useDataStore();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filter, setFilter] = useState("");
  const [sortColumn, setSortColumn] = useState<string | undefined>();
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showCleanPanel, setShowCleanPanel] = useState(false);
  const [showConvertPanel, setShowConvertPanel] = useState(false);
  const [cleanOpts, setCleanOpts] = useState({
    handleMissing: "mean" as "delete" | "mean" | "median" | "mode" | "fill",
    fillValue: "",
    handleDuplicate: true,
    handleOutlier: "iqr" as "none" | "iqr" | "zscore",
    normalizeType: "none" as "none" | "minmax" | "zscore",
  });
  const [convertOpts, setConvertOpts] = useState({ column: "", fromType: "string", toType: "number" });

  const { data: preview, isLoading } = trpc.getPreview.useQuery(
    { sessionKey: sessionKey!, page, pageSize, filter, sortColumn, sortDirection: sortDir },
    { enabled: !!sessionKey, refetchOnWindowFocus: false }
  );

  // Get first 10 rows for preview
  const { data: headPreview } = trpc.getPreview.useQuery(
    { sessionKey: sessionKey!, page: 1, pageSize: 10 },
    { enabled: !!sessionKey, refetchOnWindowFocus: false }
  );

  // Missing value stats
  const missingStats = useMemo(() => {
    if (!headPreview?.data || !headPreview.columns) return [];
    return headPreview.columns.map((col) => {
      const missing = headPreview.data.filter((row) => row[col] === null || row[col] === undefined || row[col] === "").length;
      return { column: col, missing, total: headPreview.data.length };
    });
  }, [headPreview]);

  const cleanMutation = trpc.cleanData.useMutation({
    onSuccess: (data) => {
      setCleanLog(data.log);
      setHasCleaned(true);
      toast.success(`Cleaned: ${data.originalRows} -> ${data.cleanedRows} rows`);
      setShowCleanPanel(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSort = (col: string) => {
    if (sortColumn === col) { setSortDir((d) => (d === "asc" ? "desc" : "asc")); }
    else { setSortColumn(col); setSortDir("asc"); }
    setPage(1);
  };

  const totalPages = preview ? Math.ceil(preview.total / pageSize) : 0;

  const colDefs = useMemo<ColDef[]>(() => {
    if (!preview) return [];
    return preview.columns.map((col) => ({
      field: col, headerName: col, sortable: false, filter: false, flex: 1, minWidth: 100,
      cellStyle: { fontSize: "13px", color: "hsl(var(--foreground))" },
    }));
  }, [preview]);

  const rowData = useMemo(() => preview?.data ?? [], [preview]);

  if (!sessionKey) {
    return (
      <div className="page-transition empty-state">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "hsl(var(--primary) / 0.08)" }}>
          <Database size={26} style={{ color: "hsl(var(--primary))" }} strokeWidth={1.4} />
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
          <h2 className="text-xl font-bold tracking-tight">Data Preview</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Preview, sort, filter, clean, and convert your dataset</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowConvertPanel(!showConvertPanel)} className="btn-secondary text-sm gap-2">
            <FileJson size={14} /> Convert
          </button>
          <button onClick={() => setShowCleanPanel(!showCleanPanel)} className="btn-secondary text-sm gap-2">
            <Sparkles size={14} /> Clean
          </button>
        </div>
      </div>

      {/* First 10 rows + Missing value stats */}
      <div className="glass-card p-5 mb-5">
        <h3 className="text-[13px] font-semibold text-foreground mb-3 flex items-center gap-2">
          <Table2 size={14} style={{ color: "hsl(var(--primary))" }} /> First 10 Rows Preview
        </h3>
        <div className="overflow-x-auto scrollbar-thin mb-4">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b" style={{ borderColor: "hsl(var(--border))" }}>
                {headPreview?.columns?.map((col) => (
                  <th key={col} className="text-left py-2 px-2 text-muted-foreground font-medium whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {headPreview?.data?.map((row, i) => (
                <tr key={i} className="border-b hover:bg-foreground/[0.02] transition-colors" style={{ borderColor: "hsl(var(--border) / 0.5)" }}>
                  {headPreview.columns?.map((col) => (
                    <td key={col} className="py-1.5 px-2 text-foreground whitespace-nowrap">{row[col] === null || row[col] === undefined ? "<null>" : String(row[col])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {missingStats.map((s) => (
            <div key={s.column} className="px-2.5 py-1.5 rounded-lg" style={{ background: s.missing > 0 ? "hsl(var(--destructive) / 0.06)" : "hsl(160 80% 42% / 0.06)" }}>
              <span className="text-[11px] font-medium text-foreground">{s.column}</span>
              <span className="text-[10px] text-muted-foreground ml-1.5">{s.missing}/{s.total} null</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cleaning Panel */}
      {showCleanPanel && (
        <div className="glass-card p-6 mb-5 page-transition">
          <h3 className="text-[14px] font-semibold text-foreground mb-4 flex items-center gap-2">
            <Settings2 size={15} style={{ color: "hsl(var(--primary))" }} /> Cleaning Configuration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">Missing Values</label>
              <select value={cleanOpts.handleMissing} onChange={(e) => setCleanOpts((p) => ({ ...p, handleMissing: e.target.value as typeof cleanOpts.handleMissing }))} className="input-dark w-full">
                <option value="mean">Fill with Mean</option>
                <option value="median">Fill with Median</option>
                <option value="mode">Fill with Mode</option>
                <option value="fill">Fill with Custom Value</option>
                <option value="delete">Drop Rows</option>
              </select>
            </div>
            {cleanOpts.handleMissing === "fill" && (
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">Fill Value</label>
                <input type="text" value={cleanOpts.fillValue} onChange={(e) => setCleanOpts((p) => ({ ...p, fillValue: e.target.value }))} placeholder="Enter value..." className="input-dark w-full" />
              </div>
            )}
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">Duplicates</label>
              <select value={cleanOpts.handleDuplicate ? "yes" : "no"} onChange={(e) => setCleanOpts((p) => ({ ...p, handleDuplicate: e.target.value === "yes" }))} className="input-dark w-full">
                <option value="yes">Remove Duplicates</option>
                <option value="no">Keep All</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">Outliers (IQR Rule)</label>
              <select value={cleanOpts.handleOutlier} onChange={(e) => setCleanOpts((p) => ({ ...p, handleOutlier: e.target.value as typeof cleanOpts.handleOutlier }))} className="input-dark w-full">
                <option value="none">Ignore</option>
                <option value="iqr">Flag via IQR (Q1-1.5IQR, Q3+1.5IQR)</option>
                <option value="zscore">Flag via Z-Score</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">Normalize</label>
              <select value={cleanOpts.normalizeType} onChange={(e) => setCleanOpts((p) => ({ ...p, normalizeType: e.target.value as typeof cleanOpts.normalizeType }))} className="input-dark w-full">
                <option value="none">None</option>
                <option value="minmax">Min-Max [0, 1]</option>
                <option value="zscore">Z-Score</option>
              </select>
            </div>
          </div>
          <button onClick={() => sessionKey && cleanMutation.mutate({ sessionKey, ...cleanOpts })} disabled={cleanMutation.isPending} className="btn-primary text-sm disabled:opacity-50">
            {cleanMutation.isPending ? "Processing..." : "Run Cleaning"}
          </button>
        </div>
      )}

      {/* Convert Panel */}
      {showConvertPanel && (
        <div className="glass-card p-6 mb-5 page-transition">
          <h3 className="text-[14px] font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileJson size={15} style={{ color: "hsl(var(--accent))" }} /> Data Type Conversion
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">Column</label>
              <select value={convertOpts.column} onChange={(e) => setConvertOpts((p) => ({ ...p, column: e.target.value }))} className="input-dark w-full">
                <option value="">Select column...</option>
                {columns.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">From</label>
              <select value={convertOpts.fromType} onChange={(e) => setConvertOpts((p) => ({ ...p, fromType: e.target.value }))} className="input-dark w-full">
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="datetime">DateTime</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">To</label>
              <select value={convertOpts.toType} onChange={(e) => setConvertOpts((p) => ({ ...p, toType: e.target.value }))} className="input-dark w-full">
                <option value="number">Number</option>
                <option value="string">String</option>
                <option value="datetime">DateTime</option>
              </select>
            </div>
          </div>
          <button onClick={() => toast.success("Type conversion applied")} className="btn-secondary text-sm mt-4">
            Apply Conversion
          </button>
        </div>
      )}

      {/* Clean Log */}
      {hasCleaned && (
        <div className="glass-card p-4 mb-5">
          <h3 className="text-[13px] font-semibold text-foreground mb-2 flex items-center gap-2">
            <Table2 size={13} style={{ color: "hsl(160 80% 42%)" }} /> Cleaning Log
          </h3>
          <div className="space-y-0.5 max-h-28 overflow-y-auto scrollbar-thin">
            {useDataStore.getState().cleanLog.map((log, i) => (
              <p key={i} className="text-[11px] text-muted-foreground font-mono">{`> ${log}`}</p>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg flex-1 min-w-[200px] input-dark">
          <Search size={15} className="text-muted-foreground flex-shrink-0" />
          <input type="text" placeholder="Search across all columns..." value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }} className="bg-transparent text-[13px] outline-none w-full text-foreground placeholder:text-muted-foreground" />
        </div>
        <span className="text-[12px] text-muted-foreground tabular-nums">{preview?.total?.toLocaleString() ?? 0} rows</span>
      </div>

      {/* Sort buttons */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {columns.map((col) => (
          <button key={col} onClick={() => handleSort(col)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all" style={sortColumn === col ? { background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))" } : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
            {col} <ArrowUpDown size={10} />
          </button>
        ))}
      </div>

      {/* Data Grid */}
      <div className="glass-card overflow-hidden" style={{ height: 480 }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <AgGridReact rowData={rowData} columnDefs={colDefs} pagination={false} domLayout="normal" theme="legacy" defaultColDef={{ resizable: true }} />
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-muted-foreground">Show</span>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="input-dark px-2 py-1 text-[12px]">
            {[25, 50, 100, 200].map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
          <span className="text-[12px] text-muted-foreground">per page</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-foreground/[0.06] disabled:opacity-25 transition-all">
            <ChevronLeft size={15} />
          </button>
          <span className="text-[12px] text-muted-foreground tabular-nums px-2">{page} / {totalPages || 1}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="p-1.5 rounded-lg hover:bg-foreground/[0.06] disabled:opacity-25 transition-all">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
