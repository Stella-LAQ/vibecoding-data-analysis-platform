import { useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useDataStore } from "@/store/dataStore";
import toast from "react-hot-toast";
import { BrainCircuit, TrendingUp, LineChart, Target, Zap, Award } from "lucide-react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend, Filler);

export default function Predict() {
  const { sessionKey, columns, columnTypes, setHasPredictions } = useDataStore();
  const navigate = useNavigate();
  const [model, setModel] = useState<"linear_regression" | "trend_forecast">("linear_regression");
  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");
  const [predictSteps, setPredictSteps] = useState(5);

  const numericCols = columns.filter((c) => columnTypes[c] === "numeric");

  const predictMutation = trpc.predict.useMutation({
    onSuccess: (data) => {
      if ("error" in data && data.error) { toast.error(String(data.error)); }
      else { setHasPredictions(true); toast.success("Prediction complete"); }
    },
    onError: (err) => toast.error(err.message),
  });

  const handlePredict = () => {
    if (!sessionKey) return;
    if (!yColumn) { toast.error("Select target variable (Y)"); return; }
    if (model === "linear_regression" && !xColumn) { toast.error("Select feature variable (X)"); return; }
    predictMutation.mutate({ sessionKey, model, xColumn, yColumn, predictSteps });
  };

  const result = predictMutation.data;

  const regressionChart = result && "predictions" in result && "actual" in result ? {
    labels: [
      ...(result.actual as { x: number; y: number }[]).map((p) => String(p.x)),
      ...(result.predictions as { x: number; y: number }[]).map((p) => `F:${p.x}`),
    ],
    datasets: [
      {
        label: "Actual", data: (result.actual as { x: number; y: number }[]).map((p) => p.y),
        borderColor: "hsl(187 100% 50%)", backgroundColor: "hsl(187 100% 50% / 0.08)",
        pointBackgroundColor: "hsl(187 100% 50%)", pointRadius: 3, tension: 0.3,
      },
      {
        label: "Predicted", data: [
          ...(result.actual as { x: number; y: number }[]).map(() => null),
          ...(result.predictions as { x: number; y: number }[]).map((p) => p.y),
        ],
        borderColor: "hsl(var(--primary))", backgroundColor: "hsl(var(--primary) / 0.08)",
        borderDash: [5, 4], pointBackgroundColor: "hsl(var(--primary))", pointRadius: 4, tension: 0.3,
      },
      {
        label: "CI Upper", data: [
          ...(result.actual as { x: number; y: number }[]).map(() => null),
          ...(result.predictions as unknown as { upper: number }[]).map((p) => p.upper),
        ],
        borderColor: "hsl(var(--primary) / 0.25)", backgroundColor: "hsl(var(--primary) / 0.03)",
        pointRadius: 0, borderDash: [2, 3], fill: 1,
      },
    ],
  } : null;

  const trendChart = result && "historical" in result && "forecasts" in result ? {
    labels: [
      ...(result.historical as { index: number }[]).map((p) => String(p.index)),
      ...(result.forecasts as { index: number }[]).map((p) => `F:${p.index}`),
    ],
    datasets: [
      {
        label: "Historical", data: (result.historical as { value: number }[]).map((p) => p.value),
        borderColor: "hsl(187 100% 50%)", backgroundColor: "hsl(187 100% 50% / 0.06)",
        pointBackgroundColor: "hsl(187 100% 50%)", pointRadius: 1, tension: 0.3,
      },
      {
        label: "Forecast", data: [
          ...(result.historical as { value: number }[]).map(() => null),
          ...(result.forecasts as { value: number }[]).map((p) => p.value),
        ],
        borderColor: "hsl(var(--primary))", backgroundColor: "hsl(var(--primary) / 0.06)",
        borderDash: [5, 4], pointBackgroundColor: "hsl(var(--primary))", pointRadius: 3, tension: 0.3,
      },
    ],
  } : null;

  const chartOpt = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "hsl(220 10% 65%)", font: { size: 11 } } } },
    scales: {
      x: { ticks: { color: "hsl(220 10% 55%)", maxTicksLimit: 12, font: { size: 10 } }, grid: { color: "hsl(220 10% 16%)" } },
      y: { ticks: { color: "hsl(220 10% 55%)", font: { size: 10 } }, grid: { color: "hsl(220 10% 16%)" } },
    },
  };

  if (!sessionKey) {
    return (
      <div className="page-transition empty-state">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "hsl(var(--primary) / 0.08)" }}>
          <BrainCircuit size={26} style={{ color: "hsl(var(--primary))" }} strokeWidth={1.4} />
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
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">Predictive Modeling</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">Regression, trend forecasting, and confidence intervals</p>
      </div>

      <div className="glass-card p-6 mb-6">
        <h3 className="text-[14px] font-semibold text-foreground mb-4">Model Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">Model</label>
            <div className="flex gap-2">
              <button onClick={() => setModel("linear_regression")} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all" style={model === "linear_regression" ? { background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" } : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                <LineChart size={13} /> Regression
              </button>
              <button onClick={() => setModel("trend_forecast")} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all" style={model === "trend_forecast" ? { background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" } : { background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
                <TrendingUp size={13} /> Trend
              </button>
            </div>
          </div>

          {model === "linear_regression" && (
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">Feature (X)</label>
              <select value={xColumn} onChange={(e) => setXColumn(e.target.value)} className="input-dark w-full">
                <option value="">Select...</option>
                {numericCols.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">{model === "linear_regression" ? "Target (Y)" : "Value Column"}</label>
            <select value={yColumn} onChange={(e) => setYColumn(e.target.value)} className="input-dark w-full">
              <option value="">Select...</option>
              {numericCols.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">Steps</label>
            <input type="number" min={1} max={20} value={predictSteps} onChange={(e) => setPredictSteps(Math.min(20, Math.max(1, Number(e.target.value))))} className="input-dark w-full" />
          </div>
        </div>

        <button onClick={handlePredict} disabled={predictMutation.isPending} className="btn-primary text-sm mt-4 disabled:opacity-50">
          {predictMutation.isPending ? "Training..." : "Run Prediction"}
        </button>
      </div>

      {result && !("error" in result && result.error) && (
        <div className="space-y-5">
          {model === "linear_regression" && "r2" in result && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: Award, label: "R\u00b2 Score", value: (result.r2 as number)?.toFixed(4), color: "hsl(var(--primary))" },
                { icon: Target, label: "MAE", value: (result.mae as number)?.toFixed(4), color: "hsl(187 100% 50%)" },
                { icon: Zap, label: "RMSE", value: (result.rmse as number)?.toFixed(4), color: "hsl(160 80% 42%)" },
                { icon: TrendingUp, label: "Slope", value: (result.slope as number)?.toFixed(4), color: "hsl(15 85% 58%)" },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.label} className="glass-card-stat p-4 text-center">
                    <Icon className="mx-auto mb-2" size={18} style={{ color: m.color }} strokeWidth={1.5} />
                    <div className="text-xl font-bold tabular-nums" style={{ color: m.color }}>{m.value}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{m.label}</div>
                  </div>
                );
              })}
            </div>
          )}

          {"equation" in result && (
            <div className="glass-card p-4 text-center">
              <code className="text-[15px] font-mono" style={{ color: "hsl(187 100% 50%)" }}>{result.equation as string}</code>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">Regression Equation</p>
            </div>
          )}

          {model === "trend_forecast" && "trend" in result && (
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card-stat p-4 text-center">
                <TrendingUp className="mx-auto mb-2" size={18} style={{ color: "hsl(var(--primary))" }} />
                <div className="text-xl font-bold" style={{ color: "hsl(var(--primary))" }}>{(result.trend as number)?.toFixed(4)}</div>
                <div className="text-[10px] text-muted-foreground">Trend Change</div>
              </div>
              <div className="glass-card-stat p-4 text-center">
                <Target className="mx-auto mb-2" size={18} style={{ color: "hsl(187 100% 50%)" }} />
                <div className="text-xl font-bold" style={{ color: "hsl(187 100% 50%)" }}>{(result as Record<string, unknown>).window as number}</div>
                <div className="text-[10px] text-muted-foreground">Window Size</div>
              </div>
            </div>
          )}

          <div className="glass-card p-6">
            <h3 className="text-[14px] font-semibold text-foreground mb-4">{model === "linear_regression" ? "Regression Plot" : "Trend Forecast"}</h3>
            <div style={{ height: 380 }}>
              {regressionChart && model === "linear_regression" && <Line data={regressionChart} options={chartOpt} />}
              {trendChart && model === "trend_forecast" && <Line data={trendChart} options={chartOpt} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
