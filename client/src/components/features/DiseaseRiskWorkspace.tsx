import { useMemo, useState } from "react";
import { AlertCircle, CloudRain, FileText, Printer, RefreshCw, ShieldAlert, ShieldCheck, ThermometerSun } from "lucide-react";
import { trpc } from "@/lib/trpc";

type Props = {
  selectedPlot: string;
  lat: number;
  lng: number;
  historyItems: Array<{ id: number; crop: string; likelyCondition: string; confidence: number; severity: string; explanation: string; createdAt: Date | string }>;
};

export default function DiseaseRiskWorkspace({ selectedPlot, lat, lng, historyItems }: Props) {
  const crop = selectedPlot.includes("Ragi") ? "Ragi" : selectedPlot.includes("Maize") ? "Maize" : "Tomato";
  const [showHealthReport, setShowHealthReport] = useState(false);
  const [treatmentCondition, setTreatmentCondition] = useState("Early Blight");
  const [treatmentApplied, setTreatmentApplied] = useState("");
  const [treatmentOutcome, setTreatmentOutcome] = useState("monitoring");

  const riskInput = useMemo(() => ({ crop, plotName: selectedPlot, lat, lng }), [crop, selectedPlot, lat, lng]);
  const riskQuery = trpc.disease.forecastRisk.useQuery(riskInput, { refetchOnWindowFocus: false });
  const aiStatusQuery = trpc.disease.aiStatus.useQuery(undefined, { refetchOnWindowFocus: false });
  const treatmentsQuery = trpc.disease.treatments.useQuery(undefined, { refetchOnWindowFocus: false });
  const logTreatmentMut = trpc.disease.logTreatment.useMutation({
    onSuccess: () => {
      void treatmentsQuery.refetch();
      setTreatmentApplied("");
    },
  });

  const risk = riskQuery.data;

  return (
    <div className="rytha-module-stack" style={{ marginTop: 18 }}>
      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">PREDICTIVE DISEASE RISK RADAR · WEATHER + HISTORY</span>
            <h3>Upcoming 7-day outbreak risk for {crop}</h3>
            <p>
              Combines {risk?.weatherSource === "live" ? "live Open-Meteo" : "fallback"} humidity ({risk?.humidity ?? 68}%),
              forecast rain ({risk?.rainExpectedMm48h ?? 0} mm / 48h), and your past diagnosis logs ({risk?.priorReportsCount ?? 0} carried reports).
            </p>
          </div>
          <button className="secondary-button" onClick={() => setShowHealthReport((v) => !v)}>
            <FileText size={15} /> {showHealthReport ? "Hide report" : "Crop health report"}
          </button>
        </div>

        <div className="ai-mode-banner">
          {aiStatusQuery.data?.liveLlmConfigured ? (
            <span className="status-pill green"><ShieldCheck size={13} /> Cloud Vision AI Active</span>
          ) : (
            <span className="status-pill amber"><AlertCircle size={13} /> Local Visual & Symptom Engine Active (set GEMINI_API_KEY for cloud vision AI)</span>
          )}
        </div>

        {riskQuery.isLoading ? (
          <div className="history-empty"><RefreshCw size={18} className="spin" /><span>Computing 7-day weather & pathology risk…</span></div>
        ) : risk ? (
          <>
            <div className="risk-summary-bar">
              <div className={`risk-gauge ${risk.overallLevel.toLowerCase()}`}>
                <strong>{risk.overallRiskPct}%</strong>
                <span>{risk.overallLevel} Outbreak Risk</span>
              </div>
              <div className="risk-weather-pills">
                <span><CloudRain size={14} /> Wet days next 7d: <b>{risk.wetDaysNext7d}</b></span>
                <span><ThermometerSun size={14} /> Humidity: <b>{risk.humidity}%</b></span>
                <span><ShieldAlert size={14} /> Prior carryover cases: <b>{risk.priorReportsCount}</b></span>
              </div>
            </div>

            <div className="disease-risk-grid">
              {risk.risks.map((item) => (
                <article key={item.diseaseName} className="disease-risk-card">
                  <div className="disease-risk-head">
                    <strong>{item.diseaseName}</strong>
                    <span className={`status-pill ${item.riskLevel === "High" ? "amber" : item.riskLevel === "Moderate" ? "blue" : "green"}`}>
                      {item.riskScorePct}% · {item.riskLevel}
                    </span>
                  </div>
                  <p className="risk-symptom"><b>Watch for:</b> {item.symptoms}</p>
                  <p className="risk-prevent"><b>Preventive step:</b> {item.prevention}</p>
                  <ul className="risk-drivers">
                    {item.drivers.map((d) => <li key={d}>{d}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </section>

      {showHealthReport && (
        <section className="panel health-report-card">
          <div className="panel-title">
            <div>
              <span className="eyebrow">CROP HEALTH REPORT · {selectedPlot.toUpperCase()}</span>
              <h3>Printable Plot Health Summary</h3>
              <p>Generated {new Date().toLocaleString("en-IN")}</p>
            </div>
            <button className="primary-button" onClick={() => window.print()}>
              <Printer size={14} /> Print / Save PDF
            </button>
          </div>
          <div className="health-report-stats">
            <div><small>MONITORED CROP</small><strong>{crop}</strong></div>
            <div><small>7-DAY DISEASE RISK</small><strong>{risk ? `${risk.overallRiskPct}% (${risk.overallLevel})` : "Calculating…"}</strong></div>
            <div><small>TOTAL SCANS LOGGED</small><strong>{historyItems.length}</strong></div>
          </div>
          <div className="health-report-history">
            <strong>Recent Crop Checks</strong>
            {historyItems.length === 0 ? (
              <p className="capstone-muted-copy">No leaf scans uploaded yet for {selectedPlot}. Upload a crop photo above to begin building your health timeline.</p>
            ) : (
              historyItems.slice(0, 5).map((item) => (
                <div key={item.id} className="saved-scenario-row">
                  <div>
                    <strong>{item.likelyCondition}</strong>
                    <small>{new Date(item.createdAt).toLocaleDateString("en-IN")} · {item.severity} severity</small>
                  </div>
                  <span>AI estimate ({Math.round(item.confidence)}%)</span>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">TREATMENT &amp; RECOVERY TIMELINE</span>
            <h3>Log field treatments &amp; track crop recovery</h3>
            <p>Track applied sprays, pruning, or organic controls and monitor recovery over time.</p>
          </div>
        </div>
        <div className="fm-form-grid" style={{ marginBottom: 12 }}>
          <label>Condition / Symptom
            <input value={treatmentCondition} onChange={(e) => setTreatmentCondition(e.target.value)} placeholder="e.g. Early Blight" />
          </label>
          <label>Treatment applied
            <input value={treatmentApplied} onChange={(e) => setTreatmentApplied(e.target.value)} placeholder="e.g. Pruned lower leaves + neem oil 3ml/L" />
          </label>
          <label>Recovery status
            <select value={treatmentOutcome} onChange={(e) => setTreatmentOutcome(e.target.value)}>
              <option value="monitoring">Monitoring</option>
              <option value="improving">Improving</option>
              <option value="recovered">Recovered</option>
              <option value="escalated">Needs agronomist</option>
            </select>
          </label>
        </div>
        <button
          className="secondary-button"
          disabled={logTreatmentMut.isPending || !treatmentApplied.trim()}
          onClick={() => logTreatmentMut.mutate({ plotName: selectedPlot, crop, conditionName: treatmentCondition, treatmentApplied, outcome: treatmentOutcome })}
        >
          {logTreatmentMut.isPending ? "Saving…" : "Log treatment"}
        </button>

        {(treatmentsQuery.data ?? []).length > 0 && (
          <div className="saved-scenarios-list" style={{ marginTop: 12 }}>
            {(treatmentsQuery.data ?? []).map((t: { id: number; plotName: string; conditionName: string; treatmentApplied: string; outcome: string; loggedAt: string | Date }) => (
              <div key={t.id} className="saved-scenario-row">
                <div>
                  <strong>{t.conditionName} · {t.plotName}</strong>
                  <small>{t.treatmentApplied} · {new Date(t.loggedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</small>
                </div>
                <span className={`status-pill ${t.outcome === "recovered" ? "green" : t.outcome === "improving" ? "blue" : "amber"}`}>{t.outcome}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
