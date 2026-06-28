import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useDataStore } from "@/store/dataStore";
import ConstellationBackground from "@/components/effects/ConstellationBackground";
import {
  FileSpreadsheet, Database, BarChart3, BrainCircuit,
  TrendingUp, Eye, Sparkles, ArrowRight, ShieldCheck, Zap, Layers,
} from "lucide-react";

function AnimatedCounter({ value, duration = 2000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.floor(eased * value);
      setDisplay(start);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  return <span>{display.toLocaleString()}</span>;
}

export default function Dashboard() {
  const { sessionKey, rowCount, colCount, hasStats, hasPredictions } = useDataStore();
  const navigate = useNavigate();

  const kpiCards = [
    {
      label: "Files",
      sublabel: sessionKey ? "Active dataset loaded" : "No file imported yet",
      value: sessionKey ? 1 : 0,
      icon: FileSpreadsheet,
      accent: "hsl(var(--primary))",
    },
    {
      label: "Rows",
      sublabel: rowCount > 0 ? `${colCount} columns detected` : "Waiting for data",
      value: rowCount,
      icon: Database,
      accent: "hsl(var(--accent))",
    },
    {
      label: "Charts",
      sublabel: hasStats ? "Visualization ready" : "Run analysis first",
      value: hasStats ? 7 : 0,
      icon: BarChart3,
      accent: "hsl(160 80% 42%)",
    },
    {
      label: "Models",
      sublabel: hasPredictions ? "Predictions generated" : "No models trained",
      value: hasPredictions ? 2 : 0,
      icon: BrainCircuit,
      accent: "hsl(15 85% 58%)",
    },
  ];

  const coreFeatures = [
    {
      icon: Sparkles, title: "Smart Cleaning",
      desc: "Auto-detect and fix missing values, outliers, and duplicates in one pass. Supports multiple fill strategies and normalization methods.",
      path: "/preview", accent: "hsl(var(--primary))",
    },
    {
      icon: Eye, title: "Visual Exploration",
      desc: "Transform raw numbers into actionable charts. Choose from line, bar, scatter, box plot, heatmap, and radar with custom styling.",
      path: "/analysis", accent: "hsl(var(--accent))",
    },
    {
      icon: TrendingUp, title: "Predictive Modeling",
      desc: "Run linear regression, time-series forecasts, classification, and K-Means clustering. Get confidence intervals and evaluation metrics.",
      path: "/predict", accent: "hsl(160 80% 42%)",
    },
  ];

  const secondaryFeatures = [
    { icon: Zap, title: "Fast Processing", desc: "In-memory engine handles datasets up to thousands of rows in seconds, entirely in the browser." },
    { icon: ShieldCheck, title: "Privacy First", desc: "All computation happens locally. Your data never leaves the session and is not persisted on any server." },
    { icon: Layers, title: "Format Support", desc: "Import CSV, Excel (.xlsx/.xls), and JSON files. Export cleaned data, charts, or full PDF reports." },
  ];

  return (
    <div className="relative page-transition">
      <ConstellationBackground />
      <div className="relative z-10">
        {/* Hero */}
        <div className="text-center pt-14 pb-16">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full mb-6"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.08))", border: "1px solid hsl(var(--primary) / 0.15)" }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "hsl(160 80% 42%)", boxShadow: "0 0 6px hsl(160 80% 42%)" }} />
            <span className="text-[11px] font-medium tracking-wide uppercase" style={{ color: "hsl(var(--primary))" }}>
              {sessionKey ? "Session Active" : "Ready to Import"}
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-5" style={{ letterSpacing: "-0.03em" }}>
            <span className="text-foreground">Clar</span>
            <span className="glow-text" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>vation</span>
          </h1>

          <p className="text-base text-muted-foreground max-w-xl mx-auto mb-2 leading-relaxed">
            The all-in-one platform to import, clean, analyze, visualize, and export your data — all in a single, privacy-first workflow.
          </p>

          {!sessionKey && (
            <button onClick={() => navigate("/upload")} className="btn-primary mt-8 text-sm animate-pulse-glow">
              Start Analyzing <ArrowRight size={16} className="ml-2" />
            </button>
          )}

          {sessionKey && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button onClick={() => navigate("/analysis")} className="btn-primary text-sm">
                View Analysis <ArrowRight size={16} className="ml-2" />
              </button>
              <button onClick={() => navigate("/predict")} className="btn-secondary text-sm">Run Predictions</button>
            </div>
          )}
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 section-spacing">
          {kpiCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="glass-card-stat p-5" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${card.accent}15` }}>
                    <Icon size={18} style={{ color: card.accent }} strokeWidth={1.5} />
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: card.accent, boxShadow: `0 0 6px ${card.accent}`, opacity: card.value > 0 ? 1 : 0.25 }} />
                </div>
                <div className="text-[32px] font-bold tabular-nums tracking-tight mb-1.5" style={{ color: card.accent }}>
                  <AnimatedCounter value={card.value} />
                </div>
                <div className="text-[13px] font-medium text-foreground mb-0.5">{card.label}</div>
                <div className="text-[11px] text-muted-foreground">{card.sublabel}</div>
              </div>
            );
          })}
        </div>

        {/* Core Features */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground mb-4">Core Capabilities</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {coreFeatures.map((feat) => {
              const Icon = feat.icon;
              return (
                <button key={feat.title} onClick={() => navigate(feat.path)} className="glass-card-core p-6 text-left cursor-pointer group">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110" style={{ background: `${feat.accent}18` }}>
                    <Icon size={20} style={{ color: feat.accent }} strokeWidth={1.6} />
                  </div>
                  <h3 className="text-[15px] font-semibold text-foreground mb-2 tracking-tight">{feat.title}</h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">{feat.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {secondaryFeatures.map((feat) => {
            const Icon = feat.icon;
            return (
              <div key={feat.title} className="glass-card p-5 flex items-start gap-4 group">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "hsl(var(--primary) / 0.08)" }}>
                  <Icon size={16} className="transition-all duration-300 group-hover:scale-110" style={{ color: "hsl(var(--primary))" }} strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="text-[13px] font-medium text-foreground mb-1">{feat.title}</h4>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
