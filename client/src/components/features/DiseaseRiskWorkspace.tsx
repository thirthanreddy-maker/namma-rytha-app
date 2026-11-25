import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, CloudRain, FileText, Printer, RefreshCw, ShieldAlert, ShieldCheck, ThermometerSun } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/i18n";

type Props = {
  selectedPlot: string;
  lat: number;
  lng: number;
  historyItems: Array<{ id: number; crop: string; likelyCondition: string; confidence: number; severity: string; explanation: string; createdAt: Date | string }>;
};

export default function DiseaseRiskWorkspace({ selectedPlot, lat, lng, historyItems }: Props) {
  const { t, i18n } = useTranslation(["crop", "common"]);
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
            <span className="eyebrow">{t("crop:diseaseRisk.eyebrow")}</span>
            <h3>{t("crop:diseaseRisk.title", { crop: t(`common:crops.${crop}`, { defaultValue: crop }) })}</h3>
            <p>
              {t("crop:diseaseRisk.subtitle", {
                source: risk?.weatherSource === "live" ? t("crop:diseaseRisk.liveSource") : t("crop:diseaseRisk.fallbackSource"),
                humidity: risk?.humidity ?? 68,
                rain: risk?.rainExpectedMm48h ?? 0,
                count: risk?.priorReportsCount ?? 0,
              })}
            </p>
          </div>
          <button className="secondary-button" onClick={() => setShowHealthReport((v) => !v)}>
            <FileText size={15} /> {showHealthReport ? t("crop:diseaseRisk.hideReport") : t("crop:diseaseRisk.showReport")}
          </button>
        </div>

        <div className="ai-mode-banner">
          {aiStatusQuery.data?.liveLlmConfigured ? (
            <span className="status-pill green"><ShieldCheck size={13} /> {t("crop:diseaseRisk.cloudAiActive")}</span>
          ) : (
            <span className="status-pill amber"><AlertCircle size={13} /> {t("crop:diseaseRisk.localEngineActive")}</span>
          )}
        </div>

        {riskQuery.isLoading ? (
          <div className="history-empty"><RefreshCw size={18} className="spin" /><span>{t("crop:diseaseRisk.computing")}</span></div>
        ) : risk ? (
          <>
            <div className="risk-summary-bar">
              <div className={`risk-gauge ${risk.overallLevel.toLowerCase()}`}>
                <strong>{risk.overallRiskPct}%</strong>
                <span>{t("crop:diseaseRisk.outbreakRisk", { level: risk.overallLevel })}</span>
              </div>
              <div className="risk-weather-pills">
                <span><CloudRain size={14} /> {t("crop:diseaseRisk.wetDays")}: <b>{risk.wetDaysNext7d}</b></span>
                <span><ThermometerSun size={14} /> {t("crop:diseaseRisk.humidity")}: <b>{risk.humidity}%</b></span>
                <span><ShieldAlert size={14} /> {t("crop:diseaseRisk.priorCases")}: <b>{risk.priorReportsCount}</b></span>
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
                  <p className="risk-symptom"><b>{t("crop:diseaseRisk.watchFor")}</b> {item.symptoms}</p>
                  <p className="risk-prevent"><b>{t("crop:diseaseRisk.preventiveStep")}</b> {item.prevention}</p>
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
              <span className="eyebrow">{t("crop:diseaseRisk.reportEyebrow", { plot: selectedPlot.toUpperCase() })}</span>
              <h3>{t("crop:diseaseRisk.reportTitle")}</h3>
              <p>{formatDate(new Date(), i18n.language)}</p>
            </div>
            <button className="primary-button" onClick={() => window.print()}>
              <Printer size={14} /> {t("crop:diseaseRisk.printPdf")}
            </button>
          </div>
          <div className="health-report-stats">
            <div><small>{t("crop:diseaseRisk.monitoredCrop")}</small><strong>{t(`common:crops.${crop}`, { defaultValue: crop })}</strong></div>
            <div><small>{t("crop:diseaseRisk.risk7d")}</small><strong>{risk ? `${risk.overallRiskPct}% (${risk.overallLevel})` : t("common:loading")}</strong></div>
            <div><small>{t("crop:diseaseRisk.totalScans")}</small><strong>{historyItems.length}</strong></div>
          </div>
          <div className="health-report-history">
            <strong>{t("crop:diseaseRisk.recentChecks")}</strong>
            {historyItems.length === 0 ? (
              <p className="capstone-muted-copy">{t("crop:diseaseRisk.noScans", { plot: selectedPlot })}</p>
            ) : (
              historyItems.slice(0, 5).map((item) => (
                <div key={item.id} className="saved-scenario-row">
                  <div>
                    <strong>{item.likelyCondition}</strong>
                    <small>{formatDate(item.createdAt, i18n.language)} · {item.severity}</small>
                  </div>
                  <span>{t("crop:diseaseRisk.aiEstimate", { pct: Math.round(item.confidence) })}</span>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">{t("crop:diseaseRisk.treatmentEyebrow")}</span>
            <h3>{t("crop:diseaseRisk.treatmentTitle")}</h3>
            <p>{t("crop:diseaseRisk.treatmentSub")}</p>
          </div>
        </div>
        <div className="fm-form-grid" style={{ marginBottom: 12 }}>
          <label>{t("crop:diseaseRisk.conditionLabel")}
            <input value={treatmentCondition} onChange={(e) => setTreatmentCondition(e.target.value)} placeholder={t("crop:diseaseRisk.conditionPlaceholder")} />
          </label>
          <label>{t("crop:diseaseRisk.treatmentLabel")}
            <input value={treatmentApplied} onChange={(e) => setTreatmentApplied(e.target.value)} placeholder={t("crop:diseaseRisk.treatmentPlaceholder")} />
          </label>
          <label>{t("crop:diseaseRisk.outcomeLabel")}
            <select value={treatmentOutcome} onChange={(e) => setTreatmentOutcome(e.target.value)}>
              <option value="monitoring">{t("crop:diseaseRisk.outcomes.monitoring")}</option>
              <option value="improving">{t("crop:diseaseRisk.outcomes.improving")}</option>
              <option value="recovered">{t("crop:diseaseRisk.outcomes.recovered")}</option>
              <option value="escalated">{t("crop:diseaseRisk.outcomes.escalated")}</option>
            </select>
          </label>
        </div>
        <button
          className="secondary-button"
          disabled={logTreatmentMut.isPending || !treatmentApplied.trim()}
          onClick={() => logTreatmentMut.mutate({ plotName: selectedPlot, crop, conditionName: treatmentCondition, treatmentApplied, outcome: treatmentOutcome })}
        >
          {logTreatmentMut.isPending ? t("common:saving") : t("crop:diseaseRisk.logTreatment")}
        </button>

        {(treatmentsQuery.data ?? []).length > 0 && (
          <div className="saved-scenarios-list" style={{ marginTop: 12 }}>
            {(treatmentsQuery.data ?? []).map((item: { id: number; plotName: string; conditionName: string; treatmentApplied: string; outcome: string; loggedAt: string | Date }) => (
              <div key={item.id} className="saved-scenario-row">
                <div>
                  <strong>{item.conditionName} · {item.plotName}</strong>
                  <small>{item.treatmentApplied} · {formatDate(item.loggedAt, i18n.language)}</small>
                </div>
                <span className={`status-pill ${item.outcome === "recovered" ? "green" : item.outcome === "improving" ? "blue" : "amber"}`}>{t(`crop:diseaseRisk.outcomes.${item.outcome}`, { defaultValue: item.outcome })}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
