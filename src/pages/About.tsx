import { useNavigate } from "react-router";
import { toast } from "react-hot-toast";
import {
  Hexagon, Code2, Database, BarChart3, BrainCircuit, Layers, Zap,
  Sparkles, ArrowRight, TrendingUp, Eye, ShieldCheck, FileSpreadsheet,
} from "lucide-react";

export default function About() {
  const navigate = useNavigate();

  const techStack = [
    { icon: Code2, name: "React 19", desc: "Component-driven UI with TypeScript", color: "hsl(var(--primary))" },
    { icon: Database, name: "tRPC + Drizzle", desc: "End-to-end type-safe API layer", color: "hsl(var(--accent))" },
    { icon: BarChart3, name: "Chart.js", desc: "Interactive data visualization", color: "hsl(160 80% 42%)" },
    { icon: BrainCircuit, name: "Custom Engine", desc: "Pure math stats, zero dependencies", color: "hsl(15 85% 58%)" },
    { icon: Layers, name: "Three.js", desc: "WebGL background effects", color: "hsl(30 100% 50%)" },
    { icon: Zap, name: "Vite", desc: "Fast builds with HMR", color: "hsl(270 60% 55%)" },
  ];

  const capabilities = [
    { icon: FileSpreadsheet, title: "Data Import", desc: "Supports CSV, Excel, and JSON. Automatic type detection for numeric, text, date, and categorical columns." },
    { icon: Eye, title: "Smart Cleaning", desc: "Handles missing values with multiple fill strategies, detects outliers via IQR and Z-Score, removes duplicates, normalizes data." },
    { icon: BarChart3, title: "Visualization", desc: "Line, bar, scatter, pie, heatmap, radar, and box plots. Full control over axes, colors, and chart styling." },
    { icon: TrendingUp, title: "Predictions", desc: "Linear regression with confidence intervals, time-series trend forecasting. Model evaluation via R\u00b2, MAE, and RMSE." },
    { icon: ShieldCheck, title: "Privacy First", desc: "All computation runs in-memory. Data is not persisted on servers and stays within the active session." },
    { icon: Sparkles, title: "Report Export", desc: "Download cleaned datasets as CSV or JSON, or generate a complete PDF analysis report with one click." },
  ];

  return (
    <div className="page-transition max-w-3xl mx-auto">
      {/* Hero */}
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))" }}>
          <Hexagon size={32} className="text-white" strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3" style={{ letterSpacing: "-0.03em" }}>
          Clarvation
        </h1>
        <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
          An integrated data analysis platform. Import, clean, analyze, visualize, and export, all in one workflow.
        </p>
        <button onClick={() => navigate("/upload")} className="btn-primary mt-6 text-sm">
          Start Analyzing <ArrowRight size={15} className="ml-2" />
        </button>
      </div>

      {/* About This Project — 用户固定文案 */}
      <div className="glass-card p-7 mb-6">
        <h2 className="text-[15px] font-semibold text-foreground mb-4 tracking-tight">About This Project</h2>
        <div className="text-[13px] text-muted-foreground leading-[1.8] space-y-3">
          <p>In today's data-driven decision-making landscape, extracting actionable business insights from raw data is often hindered by fragmented tools, convoluted workflows, and steep learning curves. To address these challenges, this project introduces an all-in-one intelligent data analysis platform, built entirely in-house.</p>
          <p>The platform unifies the entire workflow — from data import, cleaning, and exploratory analysis, to visualization and report generation — breaking down silos between stages to create a seamless, end-to-end analysis pipeline. At its core, it runs a custom-built pure-mathematics statistical engine, with zero dependencies on third-party statistical libraries, ensuring full control over computation logic and reliable, stable performance.</p>
          <p>Built on a modern full-stack architecture, the frontend is developed with React 19 and TypeScript for a responsive, type-safe user interface. The backend leverages Hono with tRPC to deliver end-to-end type-safe APIs, paired with MySQL for persistent data storage — balancing maintainable architecture with a smooth, intuitive user experience.</p>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="mb-6">
        <h2 className="text-[15px] font-semibold text-foreground mb-4 tracking-tight">Tech Stack</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {techStack.map((tech) => {
            const Icon = tech.icon;
            return (
              <div key={tech.name} className="glass-card p-4 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${tech.color}12` }}>
                  <Icon size={17} style={{ color: tech.color }} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-foreground">{tech.name}</p>
                  <p className="text-[11px] text-muted-foreground">{tech.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Capabilities */}
      <div className="mb-6">
        <h2 className="text-[15px] font-semibold text-foreground mb-4 tracking-tight">Capabilities</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {capabilities.map((feat) => {
            const Icon = feat.icon;
            return (
              <div key={feat.title} className="glass-card p-5">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--primary) / 0.08)" }}>
                    <Icon size={15} style={{ color: "hsl(var(--primary))" }} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-[13px] font-semibold text-foreground">{feat.title}</h3>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Behind The Project — 用户固定文案 */}
      <div className="glass-card p-7 mb-6">
        <h2 className="text-[15px] font-semibold text-foreground mb-4 tracking-tight">Behind The Project</h2>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--accent) / 0.15))" }}>
            <Hexagon size={26} style={{ color: "hsl(var(--primary))" }} strokeWidth={1.5} />
          </div>
          <div className="text-[13px] text-muted-foreground leading-[1.8]">
            <p>Specializing in data visualization and full-stack application development, with expertise in translating real-world data analysis requirements into production-ready solutions through an engineering-driven approach.</p>
            <p className="mt-2">This project is independently built end-to-end — from product ideation and architecture design, to frontend/backend development and core statistical engine implementation. It represents a synthesis of full-stack engineering practice and data science capabilities. Our platform aims to deliver a professional yet lightweight analysis tool, lowering the barrier to entry for academic research and day-to-day data analysis, enabling users to efficiently unlock the intrinsic value of their data.</p>
          </div>
        </div>
      </div>

      {/* Feedback */}
      <div className="glass-card p-5 text-center">
        <p className="text-[13px] text-muted-foreground mb-3">How do you like this generated work?</p>
        <div className="flex items-center justify-center gap-2">
          {["Good", "Neutral", "Not good"].map((opt) => (
            <button key={opt} onClick={() => toast(`${opt} — thanks for the feedback`)} className="px-4 py-2 rounded-lg text-[12px] font-medium transition-all" style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
