import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Droplets, Gauge, IndianRupee, Plus, RefreshCw, Save, Sliders, Sprout, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { trpc } from "@/lib/trpc";

type Props = {
  lat: number;
  lng: number;
  onToast: (message: string) => void;
  onOpenAddPlot: () => void;
};

const CROP_OPTIONS = ["Tomato", "Ragi", "Maize", "Chilli", "Onion", "Groundnut"];

export default function DigitalTwinWorkspace({ lat, lng, onToast, onOpenAddPlot }: Props) {
  const overviewInput = useMemo(() => ({ lat, lng }), [lat, lng]);
  const overviewQuery = trpc.digitalTwin.overview.useQuery(overviewInput, { refetchOnWindowFocus: false });
  const utils = trpc.useUtils();

  const plots = overviewQuery.data?.plots ?? [];
  const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);
  const activePlot = plots.find((p) => p.id === selectedPlotId) ?? plots[0];

  const [rainfallDeltaPct, setRainfallDeltaPct] = useState(0);
  const [fertilizerCostDeltaPct, setFertilizerCostDeltaPct] = useState(0);
  const [irrigationReductionPct, setIrrigationReductionPct] = useState(0);
  const [harvestDelayDays, setHarvestDelayDays] = useState(0);
  const [switchToCrop, setSwitchToCrop] = useState<string>("");
  const [scenarioName, setScenarioName] = useState("");

  const simulateMutation = trpc.digitalTwin.simulate.useMutation({
    onError: (err) => onToast(err.message),
  });
  const saveMutation = trpc.digitalTwin.saveScenario.useMutation({
    onSuccess: () => {
      void utils.digitalTwin.overview.invalidate();
      setScenarioName("");
      onToast("What-If scenario saved to your farm history.");
    },
    onError: (err) => onToast(err.message),
  });

  useEffect(() => {
    if (!activePlot) return;
    simulateMutation.mutate({
      plotName: activePlot.name,
      baseCrop: activePlot.crop,
      areaAcres: activePlot.areaAcres,
      soilType: activePlot.soilType,
      growthStage: activePlot.growthStage,
      soilMoisturePct: activePlot.moisturePct,
      rainfallDeltaPct,
      fertilizerCostDeltaPct,
      switchToCrop: switchToCrop || activePlot.crop,
      irrigationReductionPct,
      harvestDelayDays,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlot?.id, rainfallDeltaPct, fertilizerCostDeltaPct, switchToCrop, irrigationReductionPct, harvestDelayDays]);

  const sim = simulateMutation.data;

  const applyPreset = (name: string, rain: number, fert: number, irr: number, delay: number, crop: string) => {
    setRainfallDeltaPct(rain);
    setFertilizerCostDeltaPct(fert);
    setIrrigationReductionPct(irr);
    setHarvestDelayDays(delay);
    setSwitchToCrop(crop);
    setScenarioName(name);
  };

  const chartData = sim
    ? [
        { metric: "Expenses (₹)", Baseline: sim.baseline.expenses, Simulated: sim.simulated.expenses },
        { metric: "Revenue (₹)", Baseline: sim.baseline.revenue, Simulated: sim.simulated.revenue },
        { metric: "Net Profit (₹)", Baseline: sim.baseline.netProfit, Simulated: sim.simulated.netProfit },
      ]
    : [];

  if (overviewQuery.isLoading) {
    return (
      <div className="panel rytha-loading-card">
        <RefreshCw className="spin" size={20} />
        <strong>Syncing your farm Digital Twin telemetry…</strong>
      </div>
    );
  }

  return (
    <div className="rytha-module-stack">
      <div className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">VIRTUAL FARM PLOTS · LIVE TELEMETRY</span>
            <h3>Registered agricultural plots ({plots.length})</h3>
            <p>Select any plot below to inspect its virtual crop, soil, water, and production twin.</p>
          </div>
          <button className="secondary-button" onClick={onOpenAddPlot}>
            <Plus size={15} /> Register plot
          </button>
        </div>

        <div className="twin-plots-grid">
          {plots.map((plot) => {
            const isSelected = activePlot?.id === plot.id;
            return (
              <button
                key={plot.id}
                type="button"
                className={`twin-plot-card ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  setSelectedPlotId(plot.id);
                  setSwitchToCrop("");
                }}
              >
                <div className="twin-plot-head">
                  <strong>{plot.name}</strong>
                  <span className={`status-pill ${plot.healthScore >= 75 ? "green" : "amber"}`}>
                    Health {plot.healthScore}/100
                  </span>
                </div>
                <div className="twin-plot-meta">
                  <span><Sprout size={13} /> {plot.crop} · {plot.growthStage}</span>
                  <span>{plot.areaAcres} acres · {plot.soilType}</span>
                </div>
                <div className="twin-plot-kpis">
                  <div>
                    <small>MOISTURE</small>
                    <b>{plot.moisturePct}%</b>
                  </div>
                  <div>
                    <small>DAILY WATER REQ</small>
                    <b>{(plot.dailyWaterReqLiters / 1000).toFixed(1)}k L</b>
                  </div>
                  <div>
                    <small>EST. YIELD</small>
                    <b>{plot.estimatedProductionQ} q</b>
                  </div>
                </div>
                <small className="twin-npk">{plot.npkStatus} · pH {plot.soilPh}</small>
              </button>
            );
          })}
        </div>
      </div>

      {activePlot && (
        <div className="rytha-two-col">
          <section className="panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">WHAT-IF SIMULATOR · {activePlot.name.toUpperCase()}</span>
                <h3>Stress-test farm decisions</h3>
                <p>Adjust weather, costs, crop switching, and harvest timing to forecast impact.</p>
              </div>
              <Sliders size={20} className="muted-icon" />
            </div>

            <div className="preset-pill-row">
              <button type="button" className="tiny-pill" onClick={() => applyPreset("Drought Stress (-45% Rain)", -45, 0, 25, 0, "")}>
                Drought stress (−45% rain)
              </button>
              <button type="button" className="tiny-pill" onClick={() => applyPreset("Fertilizer Cost Spike (+35%)", 0, 35, 0, 0, "")}>
                Fertilizer spike (+35%)
              </button>
              <button type="button" className="tiny-pill" onClick={() => applyPreset("Switch to Ragi Resilience", -40, 0, 30, 0, "Ragi")}>
                Switch to Ragi
              </button>
              <button type="button" className="tiny-pill" onClick={() => applyPreset("Baseline", 0, 0, 0, 0, "")}>
                Reset baseline
              </button>
            </div>

            <div className="sim-controls-grid">
              <label className="sim-slider">
                <div><span>Rainfall change</span><b>{rainfallDeltaPct > 0 ? `+${rainfallDeltaPct}%` : `${rainfallDeltaPct}%`}</b></div>
                <input type="range" min={-80} max={60} step={5} value={rainfallDeltaPct} onChange={(e) => setRainfallDeltaPct(Number(e.target.value))} />
              </label>

              <label className="sim-slider">
                <div><span>Fertilizer cost change</span><b>+{fertilizerCostDeltaPct}%</b></div>
                <input type="range" min={0} max={100} step={5} value={fertilizerCostDeltaPct} onChange={(e) => setFertilizerCostDeltaPct(Number(e.target.value))} />
              </label>

              <label className="sim-slider">
                <div><span>Irrigation reduction</span><b>−{irrigationReductionPct}%</b></div>
                <input type="range" min={0} max={60} step={5} value={irrigationReductionPct} onChange={(e) => setIrrigationReductionPct(Number(e.target.value))} />
              </label>

              <label className="sim-slider">
                <div><span>Delayed harvesting</span><b>+{harvestDelayDays} days</b></div>
                <input type="range" min={0} max={21} step={1} value={harvestDelayDays} onChange={(e) => setHarvestDelayDays(Number(e.target.value))} />
              </label>

              <label className="sim-select">
                <span>Crop switching simulation</span>
                <select value={switchToCrop || activePlot.crop} onChange={(e) => setSwitchToCrop(e.target.value)}>
                  {CROP_OPTIONS.map((crop) => (
                    <option key={crop} value={crop}>
                      {crop}{crop === activePlot.crop ? " (Current crop)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="sim-save-row">
              <input
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="Scenario name (e.g. Dry Rabi Plan)"
                maxLength={120}
              />
              <button
                className="primary-button"
                disabled={!sim || !scenarioName.trim() || saveMutation.isPending}
                onClick={() => {
                  if (!sim) return;
                  saveMutation.mutate({
                    plotName: activePlot.name,
                    baseCrop: activePlot.crop,
                    scenarioName: scenarioName.trim(),
                    params: { rainfallDeltaPct, fertilizerCostDeltaPct, irrigationReductionPct, harvestDelayDays, switchToCrop: switchToCrop || activePlot.crop },
                    results: sim as unknown as Record<string, unknown>,
                  });
                }}
              >
                <Save size={14} /> {saveMutation.isPending ? "Saving…" : "Save scenario"}
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">SIMULATION OUTCOME</span>
                <h3>Baseline vs. Simulated twin</h3>
                <p>Transparent agronomic projection based on {activePlot.areaAcres} acres.</p>
              </div>
              <Activity size={20} className="muted-icon" />
            </div>

            {sim ? (
              <>
                <div className="sim-kpi-grid">
                  <div className="sim-kpi">
                    <small>NET PROFIT</small>
                    <strong>₹{sim.simulated.netProfit.toLocaleString("en-IN")}</strong>
                    <span className={sim.deltas.profitDiff >= 0 ? "positive" : "negative"}>
                      {sim.deltas.profitDiff >= 0 ? "+" : ""}₹{sim.deltas.profitDiff.toLocaleString("en-IN")} vs base
                    </span>
                  </div>
                  <div className="sim-kpi">
                    <small>EST. PRODUCTION</small>
                    <strong>{sim.simulated.productionQuintals} q</strong>
                    <span className={sim.deltas.productionDiffQ >= 0 ? "positive" : "negative"}>
                      {sim.deltas.productionDiffQ >= 0 ? "+" : ""}{sim.deltas.productionDiffQ} q
                    </span>
                  </div>
                  <div className="sim-kpi">
                    <small>SEASON WATER</small>
                    <strong>{Math.round(sim.simulated.waterLiters / 1000).toLocaleString("en-IN")}k L</strong>
                    <span className={sim.deltas.waterLitersDiff <= 0 ? "positive" : "negative"}>
                      {sim.deltas.waterLitersDiff > 0 ? "+" : ""}{Math.round(sim.deltas.waterLitersDiff / 1000)}k L
                    </span>
                  </div>
                  <div className="sim-kpi">
                    <small>TOTAL EXPENSES</small>
                    <strong>₹{sim.simulated.expenses.toLocaleString("en-IN")}</strong>
                    <span className={sim.deltas.expensesDiff <= 0 ? "positive" : "negative"}>
                      {sim.deltas.expensesDiff > 0 ? "+" : ""}₹{sim.deltas.expensesDiff.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                <div className="rytha-chart-box">
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                      <Tooltip formatter={(v: number) => `₹${Number(v).toLocaleString("en-IN")}`} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Baseline" fill="#7aa68b" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="Simulated" fill="#247b58" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="sim-alerts">
                  {sim.alerts.map((alert) => (
                    <div key={alert} className="sim-alert-row">
                      {sim.deltas.profitDiff < -5000 ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>

                <div className="sim-assumptions">
                  <strong>Transparent assumptions:</strong>
                  <ul>
                    {sim.assumptions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="history-empty"><Gauge size={22} /><span>Move any slider to simulate farm impact.</span></div>
            )}
          </section>
        </div>
      )}

      {(overviewQuery.data?.scenarios?.length ?? 0) > 0 && (
        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">SAVED WHAT-IF SCENARIOS &amp; ACTUAL VS PREDICTED</span>
              <h3>Scenario timeline &amp; seasonal performance</h3>
              <p>Compare saved simulation predictions against actual plot outcomes. Simulation confidence is rule-based agronomic estimation.</p>
            </div>
            <TrendingUp size={19} className="muted-icon" />
          </div>
          <div className="saved-scenarios-list">
            {overviewQuery.data!.scenarios.map((s) => {
              const res = s.results as { baseline?: { productionQuintals?: number; netProfit?: number }; simulated?: { crop?: string; netProfit?: number; productionQuintals?: number; expenses?: number } };
              const baseQ = res.baseline?.productionQuintals ?? 0;
              const simQ = res.simulated?.productionQuintals ?? 0;
              const deltaQ = Number((simQ - baseQ).toFixed(1));
              return (
                <div key={s.id} className="saved-scenario-row">
                  <div>
                    <strong>{s.scenarioName}</strong>
                    <small>{s.plotName} · {res.simulated?.crop ?? s.baseCrop} · Saved {new Date(s.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</small>
                  </div>
                  <span>{simQ || "—"} q ({deltaQ >= 0 ? "+" : ""}{deltaQ} q vs baseline)</span>
                  <b>₹{(res.simulated?.netProfit ?? 0).toLocaleString("en-IN")} net</b>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
