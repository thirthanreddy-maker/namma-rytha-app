import { FormEvent, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardCheck, HelpCircle, Microscope, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";

const SYMPTOM_OPTIONS = [
  "Yellow lower leaves",
  "Dark leaf spots / blight",
  "Wilting despite wet soil",
  "Dry / brittle leaf edges",
  "Flower drop before fruit set",
  "Leaf curl / stunted shoot",
  "Stem base rot / blackening",
  "Heavy pest colonization",
];

export default function CropFailureWorkspace() {
  const [crop, setCrop] = useState("Tomato");
  const [soilType, setSoilType] = useState("Red sandy loam");
  const [soilPh, setSoilPh] = useState("5.3");
  const [irrigationMethod, setIrrigationMethod] = useState("Drip");
  const [irrigationFrequency, setIrrigationFrequency] = useState("Irregular every 6-7 days");
  const [fertilizerUsage, setFertilizerUsage] = useState("High Urea basal, skipped Potassium");
  const [weatherConditions, setWeatherConditions] = useState("Heatwave followed by heavy rain");
  const [symptoms, setSymptoms] = useState<string[]>(["Yellow lower leaves", "Flower drop before fruit set"]);
  const [notes, setNotes] = useState("");
  const [historicalYieldQ, setHistoricalYieldQ] = useState("90");
  const [actualYieldQ, setActualYieldQ] = useState("42");

  const historyQuery = trpc.failureAnalysis.history.useQuery(undefined, { refetchOnWindowFocus: false });
  const utils = trpc.useUtils();
  const analyzeMutation = trpc.failureAnalysis.analyze.useMutation({
    onSuccess: () => void utils.failureAnalysis.history.invalidate(),
  });

  const toggleSymptom = (sym: string) => {
    setSymptoms((cur) => (cur.includes(sym) ? cur.filter((s) => s !== sym) : [...cur, sym]));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (symptoms.length === 0) return;
    analyzeMutation.mutate({
      crop,
      soilType,
      soilPh: Number(soilPh) || 6.5,
      irrigationMethod,
      irrigationFrequency,
      fertilizerUsage,
      weatherConditions,
      symptoms,
      notes: notes.trim() || undefined,
      historicalYieldQ: Math.max(1, Number(historicalYieldQ) || 50),
      actualYieldQ: Math.max(0, Number(actualYieldQ) || 20),
      saveToHistory: true,
    });
  };

  const result = analyzeMutation.data;

  return (
    <div className="rytha-module-stack">
      <div className="rytha-two-col">
        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">CROP FAILURE INVESTIGATION INTAKE</span>
              <h3>Enter season soil, water & symptom history</h3>
              <p>Analyze yield loss to separate metric-backed indicators from possible field hypotheses.</p>
            </div>
            <Microscope size={21} className="muted-icon" />
          </div>

          <form className="announcement-form-grid" style={{ marginTop: 14 }} onSubmit={handleSubmit}>
            <label>
              Affected crop
              <select value={crop} onChange={(e) => setCrop(e.target.value)}>
                <option>Tomato</option>
                <option>Ragi</option>
                <option>Maize</option>
                <option>Chilli</option>
                <option>Onion</option>
                <option>Groundnut</option>
              </select>
            </label>
            <label>
              Soil type
              <input required value={soilType} onChange={(e) => setSoilType(e.target.value)} />
            </label>
            <label>
              Soil pH (measured or est.)
              <input type="number" step="0.1" min="3.5" max="9.5" value={soilPh} onChange={(e) => setSoilPh(e.target.value)} />
            </label>
            <label>
              Irrigation method
              <select value={irrigationMethod} onChange={(e) => setIrrigationMethod(e.target.value)}>
                <option>Drip</option>
                <option>Furrow / Flood</option>
                <option>Sprinkler</option>
                <option>Rainfed</option>
              </select>
            </label>
            <label>
              Irrigation schedule / frequency
              <input required value={irrigationFrequency} onChange={(e) => setIrrigationFrequency(e.target.value)} />
            </label>
            <label>
              Fertilizer & nutrient schedule
              <input required value={fertilizerUsage} onChange={(e) => setFertilizerUsage(e.target.value)} />
            </label>
            <label>
              Weather extremes observed
              <input required value={weatherConditions} onChange={(e) => setWeatherConditions(e.target.value)} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label>
                Normal yield (q)
                <input type="number" min="1" value={historicalYieldQ} onChange={(e) => setHistoricalYieldQ(e.target.value)} />
              </label>
              <label>
                Actual yield (q)
                <input type="number" min="0" value={actualYieldQ} onChange={(e) => setActualYieldQ(e.target.value)} />
              </label>
            </div>

            <div className="announcement-form-wide">
              <span className="eyebrow" style={{ marginBottom: 8 }}>OBSERVED FIELD SYMPTOMS (SELECT ALL THAT APPLY)</span>
              <div className="preset-pill-row">
                {SYMPTOM_OPTIONS.map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    className={`tiny-pill ${symptoms.includes(sym) ? "active" : ""}`}
                    onClick={() => toggleSymptom(sym)}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            <label className="announcement-form-wide">
              Additional notes
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any seed variety notes or chemical spray dates…" />
            </label>

            <div style={{ gridColumn: "1 / -1", display: "grid", gap: 6 }}>
              {symptoms.length === 0 && (
                <small style={{ color: "var(--amber-strong)", fontWeight: 700 }}>
                  Select at least 1 observed field symptom above to run root-cause analysis.
                </small>
              )}
              <button className="primary-button full-width" type="submit" disabled={analyzeMutation.isPending || symptoms.length === 0}>
                {analyzeMutation.isPending ? "Running root-cause analysis…" : "Run Crop Failure Analysis"}
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">STRUCTURED ROOT-CAUSE REPORT</span>
              <h3>{result ? `${result.crop} · ${result.yieldDropPct}% Yield Drop Analysis` : "Analysis awaits input"}</h3>
            </div>
            <ClipboardCheck size={20} className="muted-icon" />
          </div>

          {!result ? (
            <div className="history-empty" style={{ minHeight: 320 }}>
              <Microscope size={26} />
              <strong>Enter plot history on the left</strong>
              <span>We separate verified metric signals (like Soil pH mismatches) from possible field causes needing inspection.</span>
            </div>
          ) : (
            <div className="failure-results">
              {result.confirmedIndicators.length > 0 && (
                <div className="failure-group confirmed">
                  <div className="failure-group-title">
                    <ShieldCheck size={16} />
                    <strong>Strong / Metric-Verified Indicators</strong>
                  </div>
                  {result.confirmedIndicators.map((c) => (
                    <div key={c.cause} className="failure-cause-card confirmed">
                      <div className="failure-cause-head">
                        <strong>{c.cause}</strong>
                        <span className="status-pill green">{c.confidencePct}% match</span>
                      </div>
                      <small><b>Evidence:</b> {c.evidence}</small>
                      <small><b>Recommended Fix:</b> {c.action}</small>
                    </div>
                  ))}
                </div>
              )}

              <div className="failure-group possible">
                <div className="failure-group-title">
                  <HelpCircle size={16} />
                  <strong>Possible Causes (Hypotheses Requiring Field Inspection)</strong>
                </div>
                {result.possibleCauses.map((c) => (
                  <div key={c.cause} className="failure-cause-card possible">
                    <div className="failure-cause-head">
                      <strong>{c.cause}</strong>
                      <span className="status-pill amber">{c.confidencePct}% likelihood</span>
                    </div>
                    <small><b>Clues:</b> {c.evidence}</small>
                    <small><b>Action:</b> {c.action}</small>
                  </div>
                ))}
              </div>

              <div className="failure-recovery-box">
                <strong><CheckCircle2 size={14} /> Recovery & Next-Season Plan</strong>
                <ul>
                  {result.recoveryPlan.map((step) => <li key={step}>{step}</li>)}
                </ul>
              </div>

              <div className="market-disclaimer">
                <AlertCircle size={15} />
                <span>{result.diagnosticDisclaimer}</span>
              </div>
            </div>
          )}
        </section>
      </div>

      {(historyQuery.data?.length ?? 0) > 0 && (
        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">SAVED INVESTIGATION LOGS</span>
              <h3>Previous crop failure reports</h3>
            </div>
          </div>
          <div className="saved-scenarios-list">
            {historyQuery.data!.map((item) => (
              <div key={item.id} className="saved-scenario-row">
                <div>
                  <strong>{item.crop} · {item.soilType} (pH {item.soilPh})</strong>
                  <small>Yield {item.actualYieldQ}q vs {item.historicalYieldQ}q normal · {new Date(item.createdAt).toLocaleDateString("en-IN")}</small>
                </div>
                <span className="negative">−{item.yieldDropPct}% yield</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
