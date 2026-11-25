import { useEffect, useState } from "react";
import { ArrowRightLeft, Award, BarChart3, CheckCircle2, Droplets, IndianRupee } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { trpc } from "@/lib/trpc";

type CropRowDraft = {
  crop: string;
  areaAcres: number;
  seedCost: number;
  fertilizerCost: number;
  labourCost: number;
  waterCost: number;
  machineryCost: number;
  expectedYieldQ: number;
  expectedPricePerQ: number;
};

const DEFAULT_CROPS: CropRowDraft[] = [
  { crop: "Tomato", areaAcres: 2, seedCost: 8400, fertilizerCost: 15600, labourCost: 25000, waterCost: 9000, machineryCost: 7600, expectedYieldQ: 190, expectedPricePerQ: 2450 },
  { crop: "Ragi", areaAcres: 2, seedCost: 2200, fertilizerCost: 5200, labourCost: 11600, waterCost: 3200, machineryCost: 4800, expectedYieldQ: 28, expectedPricePerQ: 3850 },
  { crop: "Maize", areaAcres: 2, seedCost: 4800, fertilizerCost: 9600, labourCost: 12800, waterCost: 6400, machineryCost: 6800, expectedYieldQ: 52, expectedPricePerQ: 2220 },
  { crop: "Chilli", areaAcres: 2, seedCost: 10800, fertilizerCost: 18400, labourCost: 37000, waterCost: 10400, machineryCost: 8200, expectedYieldQ: 44, expectedPricePerQ: 9800 },
];

export default function CropProfitSimulator() {
  const [rows, setRows] = useState<CropRowDraft[]>(DEFAULT_CROPS);
  const [currentCrop, setCurrentCrop] = useState("Tomato");
  const [waterLevel, setWaterLevel] = useState<"Scarce" | "Moderate" | "Abundant">("Moderate");
  const [maxBudgetInput, setMaxBudgetInput] = useState("75000");
  const [riskAppetite, setRiskAppetite] = useState<"Conservative" | "Balanced" | "High-Return">("Balanced");

  const parsedBudget = Number(maxBudgetInput);
  const isValidBudget = Number.isFinite(parsedBudget) && parsedBudget >= 1000;

  const compareMutation = trpc.profit.compareCrops.useMutation();

  useEffect(() => {
    if (!isValidBudget) return;
    const timer = window.setTimeout(() => {
      compareMutation.mutate({
        crops: rows,
        constraints: {
          currentCrop,
          availableWaterLevel: waterLevel,
          maxBudgetTotal: parsedBudget,
          riskAppetite,
        },
      });
    }, 220);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, currentCrop, waterLevel, maxBudgetInput, riskAppetite, isValidBudget, parsedBudget]);

  const updateRow = (index: number, patch: Partial<CropRowDraft>) => {
    setRows((cur) => cur.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const result = compareMutation.data;
  const chartData = (result?.comparisons ?? []).map((c) => ({
    crop: c.crop,
    Investment: c.totalInvestment,
    Revenue: c.estimatedRevenue,
    "Net Profit": c.netProfit,
  }));

  return (
    <div className="rytha-module-stack" style={{ marginTop: 18 }}>
      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">CROP SWITCHING RECOMMENDATION ENGINE</span>
            <h3>Compare 4 crops before sowing</h3>
            <p>Set your farm&apos;s water supply, capital ceiling, and risk preference to evaluate crop switching.</p>
          </div>
          <ArrowRightLeft size={20} className="muted-icon" />
        </div>

        <div className="switch-constraints-grid">
          <label>
            Current / baseline crop
            <select value={currentCrop} onChange={(e) => setCurrentCrop(e.target.value)}>
              {rows.map((r) => <option key={r.crop}>{r.crop}</option>)}
            </select>
          </label>
          <label>
            Available irrigation water
            <select value={waterLevel} onChange={(e) => setWaterLevel(e.target.value as typeof waterLevel)}>
              <option value="Scarce">Scarce (Rainfed / limited borewell)</option>
              <option value="Moderate">Moderate (Standard seasonal)</option>
              <option value="Abundant">Abundant (Assured drip + tank)</option>
            </select>
          </label>
          <label>
            Max investment budget (₹)
            <input type="number" min={1000} step={2500} value={maxBudgetInput} onChange={(e) => setMaxBudgetInput(e.target.value)} />
            {!isValidBudget && <small style={{ color: "var(--amber-strong)", fontWeight: 600 }}>Enter at least ₹1,000 to run comparison</small>}
          </label>
          <label>
            Risk appetite
            <select value={riskAppetite} onChange={(e) => setRiskAppetite(e.target.value as typeof riskAppetite)}>
              <option value="Conservative">Conservative (Stable yield & low debt)</option>
              <option value="Balanced">Balanced</option>
              <option value="High-Return">High-Return (Market-responsive)</option>
            </select>
          </label>
        </div>

        {result && (
          <div className="switch-recommendation-banner">
            <div className="switch-rec-badge">
              <Award size={20} />
              <div>
                <small>TOP RECOMMENDED CROP</small>
                <strong>{result.topRecommendation.crop} ({result.topRecommendation.kannadaName}) · Fit Score {result.topRecommendation.suitabilityScore}/100</strong>
              </div>
            </div>
            <p>{result.switchingSummary}</p>
            <div className="assumptions-inline">
              {result.assumptions.map((a) => (
                <span key={a}><CheckCircle2 size={12} /> {a}</span>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="rytha-two-col">
        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">INVESTMENT VS RETURN</span>
              <h3>Side-by-side financial comparison</h3>
            </div>
            <BarChart3 size={19} className="muted-icon" />
          </div>
          <div className="rytha-chart-box">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="crop" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: number) => `₹${Number(v).toLocaleString("en-IN")}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Investment" fill="#d39e4a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Revenue" fill="#5b9bb5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Net Profit" fill="#247b58" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">CROP ECONOMICS BREAKDOWN</span>
              <h3>ROI, break-even & water fit</h3>
            </div>
            <IndianRupee size={19} className="muted-icon" />
          </div>
          <div className="profit-compare-cards">
            {(result?.comparisons ?? []).map((c) => (
              <div key={c.crop} className={`profit-crop-mini ${result?.topRecommendation.crop === c.crop ? "best" : ""}`}>
                <div className="profit-crop-mini-head">
                  <strong>{c.crop}</strong>
                  <span className={`status-pill ${c.withinBudget ? "green" : "amber"}`}>
                    ROI {c.roiPct}% {c.withinBudget ? "" : "· Over Budget"}
                  </span>
                </div>
                <div className="profit-crop-mini-stats">
                  <span>Cost: <b>₹{c.totalInvestment.toLocaleString("en-IN")}</b></span>
                  <span>Revenue: <b>₹{c.estimatedRevenue.toLocaleString("en-IN")}</b></span>
                  <span>Net: <b className={c.netProfit >= 0 ? "positive" : "negative"}>₹{c.netProfit.toLocaleString("en-IN")}</b></span>
                  <span><Droplets size={11} /> Water: {c.waterSensitivity}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">CUSTOMIZE EXPENSE & YIELD ASSUMPTIONS</span>
            <h3>Edit crop-by-crop inputs (Seed, Fertilizer, Labour, Water, Machinery)</h3>
          </div>
        </div>
        <div className="crop-inputs-scroll">
          <table className="crop-inputs-table">
            <thead>
              <tr>
                <th>Crop</th>
                <th>Acres</th>
                <th>Seed ₹</th>
                <th>Fertilizer ₹</th>
                <th>Labour ₹</th>
                <th>Water ₹</th>
                <th>Machinery ₹</th>
                <th>Yield (q)</th>
                <th>Price ₹/q</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.crop}>
                  <td><strong>{row.crop}</strong></td>
                  <td><input type="number" min={0.5} step={0.5} value={row.areaAcres} onChange={(e) => updateRow(idx, { areaAcres: Number(e.target.value) })} /></td>
                  <td><input type="number" min={0} step={200} value={row.seedCost} onChange={(e) => updateRow(idx, { seedCost: Number(e.target.value) })} /></td>
                  <td><input type="number" min={0} step={500} value={row.fertilizerCost} onChange={(e) => updateRow(idx, { fertilizerCost: Number(e.target.value) })} /></td>
                  <td><input type="number" min={0} step={500} value={row.labourCost} onChange={(e) => updateRow(idx, { labourCost: Number(e.target.value) })} /></td>
                  <td><input type="number" min={0} step={200} value={row.waterCost} onChange={(e) => updateRow(idx, { waterCost: Number(e.target.value) })} /></td>
                  <td><input type="number" min={0} step={200} value={row.machineryCost} onChange={(e) => updateRow(idx, { machineryCost: Number(e.target.value) })} /></td>
                  <td><input type="number" min={1} step={1} value={row.expectedYieldQ} onChange={(e) => updateRow(idx, { expectedYieldQ: Number(e.target.value) })} /></td>
                  <td><input type="number" min={100} step={50} value={row.expectedPricePerQ} onChange={(e) => updateRow(idx, { expectedPricePerQ: Number(e.target.value) })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
