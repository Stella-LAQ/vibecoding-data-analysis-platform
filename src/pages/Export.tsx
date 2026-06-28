import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useDataStore } from "@/store/dataStore";
import toast from "react-hot-toast";
import { FileDown, FileSpreadsheet, FileJson, FileText, Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function Export() {
  const { sessionKey, fileName, rowCount, colCount, hasStats, hasCleaned, hasPredictions } = useDataStore();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<"csv" | "json" | "pdf">("csv");
  const reportRef = useRef<HTMLDivElement>(null);

  const exportQ = trpc.exportData.useQuery(
    { sessionKey: sessionKey!, format: exportType === "pdf" ? "csv" : exportType, useCleaned: true },
    { enabled: false }
  );

  const handleExport = async () => {
    if (!sessionKey) return;
    try {
      setExporting(true);
      if (exportType === "pdf") { await generatePDF(); }
      else {
        const result = await exportQ.refetch();
        if (result.data?.content) {
          const ext = exportType;
          const blob = new Blob([result.data.content], { type: result.data.mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `clarvation_export.${ext}`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success(`Exported as ${ext.toUpperCase()}`);
        }
      }
    } catch { toast.error("Export failed"); }
    finally { setExporting(false); }
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { backgroundColor: "#07080F", scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210, pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight, position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft >= 0) { position = heightLeft - imgHeight; pdf.addPage(); pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight); heightLeft -= pageHeight; }
    pdf.save("Clarvation_Report.pdf");
    toast.success("PDF report generated");
  };

  if (!sessionKey) {
    return (
      <div className="page-transition empty-state">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "hsl(var(--primary) / 0.08)" }}>
          <FileDown size={26} style={{ color: "hsl(var(--primary))" }} strokeWidth={1.4} />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">No Data Loaded</h3>
        <p className="text-sm text-muted-foreground mb-5 max-w-md text-center">
          No data imported yet. Click Import in the sidebar, or drag & drop your CSV/JSON file here to get started.
        </p>
        <button onClick={() => navigate("/upload")} className="btn-primary text-sm">Import Data</button>
      </div>
    );
  }

  const options = [
    { key: "csv" as const, label: "CSV", icon: FileText, desc: "Comma-separated, universal compatibility" },
    { key: "json" as const, label: "JSON", icon: FileJson, desc: "Structured data for programmatic use" },
    { key: "pdf" as const, label: "PDF Report", icon: FileSpreadsheet, desc: "Full analysis report with charts" },
  ];

  return (
    <div className="page-transition">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">Export & Reports</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">Download cleaned data or generate a comprehensive PDF report</p>
      </div>

      <div className="glass-card p-6 mb-6">
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Export Format</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button key={opt.key} onClick={() => setExportType(opt.key)}
                className="flex items-center gap-3.5 p-4 rounded-xl text-left transition-all"
                style={exportType === opt.key ? { background: "hsl(var(--primary) / 0.08)", outline: "1.5px solid hsl(var(--primary) / 0.35)" } : { background: "hsl(var(--muted) / 0.5)", outline: "1.5px solid transparent" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "hsl(var(--primary) / 0.1)" }}>
                  <Icon size={18} style={{ color: "hsl(var(--primary))" }} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-foreground">{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <button onClick={handleExport} disabled={exporting} className="btn-primary text-sm disabled:opacity-50 flex items-center gap-2">
          {exporting ? <Loader2 className="animate-spin" size={15} /> : <Download size={15} />}
          {exporting ? "Generating..." : `Export ${options.find((o) => o.key === exportType)?.label}`}
        </button>
      </div>

      {/* Hidden PDF template */}
      <div ref={reportRef} className="p-10" style={{ background: "#07080F", display: exportType === "pdf" ? "block" : "none" }}>
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Clarvation Analysis Report</h1>
          <p className="text-[11px] text-muted-foreground">Generated {new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
        <div className="mb-8">
          <h2 className="text-[13px] font-semibold text-white mb-3" style={{ color: "hsl(var(--primary))" }}>1. Dataset Overview</h2>
          <table className="w-full text-[11px]">
            <tbody>
              {[["File Name", fileName], ["Rows", rowCount.toLocaleString()], ["Columns", colCount], ["Cleaning", hasCleaned ? "Completed" : "Not run"], ["Analysis", hasStats ? "Completed" : "Not run"], ["Predictions", hasPredictions ? "Completed" : "Not run"]].map(([k, v]) => (
                <tr key={k as string} className="border-b" style={{ borderColor: "hsl(220 10% 14%)" }}>
                  <td className="py-2 text-muted-foreground w-1/3">{k}</td>
                  <td className="py-2 text-white">{v as string}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-center mt-8 pt-4 border-t" style={{ borderColor: "hsl(220 10% 14%)" }}>
          <p className="text-[9px] text-muted-foreground">Generated by Clarvation</p>
        </div>
      </div>
    </div>
  );
}
