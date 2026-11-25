import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CloudRain, Droplets, Gauge, Plus, RefreshCw, Waves } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { trpc } from "@/lib/trpc";
import { formatNumber } from "@/i18n";

type Props = {
  lat: number;
  lng: number;
  onToast: (message: string) => void;
};

export default function WaterBudgetPlanner({ lat, lng, onToast }: Props) {
  const { t, i18n } = useTranslation(["irrigation", "common"]);
  const [availableLiters, setAvailableLiters] = useState(32000);
  const [logPlot, setLogPlot] = useState("Plot A · Tomato");
  const [logLiters, setLogLiters] = useState("11500");
  const [logMethod, setLogMethod] = useState<"drip" | "sprinkler" | "flood">("drip");

  const queryInput = useMemo(() => ({ availableDailyLiters: availableLiters, lat, lng }), [availableLiters, lat, lng]);
  const budgetQuery = trpc.irrigationIntel.budgetPlan.useQuery(queryInput, { refetchOnWindowFocus: false });
  const utils = trpc.useUtils();

  const logMutation = trpc.irrigationIntel.logUsage.useMutation({
    onSuccess: () => {
      void utils.irrigationIntel.budgetPlan.invalidate();
      onToast("Water usage logged and savings updated.");
    },
    onError: (err) => onToast(err.message),
  });

  const plan = budgetQuery.data?.plan;
  const weather = budgetQuery.data?.weather;
  const logs = budgetQuery.data?.logs ?? [];

  const weeklyChart = (weather?.daily ?? []).map((d) => ({
    day: d.date.slice(5),
    "ET0 Crop Need (mm)": d.et0Mm,
    "Forecast Rain (mm)": d.rainMm,
  }));

  return (
    <div className="rytha-module-stack" style={{ marginTop: 18 }}>
      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">{t("irrigation:waterBudget.eyebrow")}</span>
            <h3>{t("irrigation:waterBudget.title")}</h3>
            <p>
              {plan?.weatherSource === "live" ? t("irrigation:liveOpenMeteo") : t("irrigation:savedFallback")} ({plan?.et0DailyMm ?? 4.3} mm/day)
            </p>
          </div>
          <Waves size={21} className="muted-icon" />
        </div>

        <div className="budget-control-bar">
          <label className="budget-slider-label">
            <div>
              <span>{t("irrigation:waterBudget.availableDaily")}</span>
              <strong>{formatNumber(availableLiters, i18n.language)} {t("common:liters")}</strong>
            </div>
            <input
              type="range"
              min={5000}
              max={100000}
              step={1000}
              value={availableLiters}
              onChange={(e) => setAvailableLiters(Number(e.target.value))}
            />
          </label>
          {plan && (
            <div className={`budget-status-card ${plan.farmSurplusOrDeficitLiters >= 0 ? "surplus" : "deficit"}`}>
              <small>{t("irrigation:waterBudget.surplusDeficit")}</small>
              <strong>
                {plan.farmSurplusOrDeficitLiters >= 0 ? "+" : ""}
                {formatNumber(plan.farmSurplusOrDeficitLiters, i18n.language)} {t("common:liters")}
              </strong>
              <span>{formatNumber(plan.weeklySavedVsFloodLiters, i18n.language)} {t("common:liters")}</span>
            </div>
          )}
        </div>

        {budgetQuery.isLoading ? (
          <div className="history-empty"><RefreshCw className="spin" size={18} /><span>Computing ET0 crop water demands…</span></div>
        ) : plan ? (
          <div className="water-allocations-list">
            {plan.allocations.map((alloc) => (
              <div key={alloc.plotName} className="water-alloc-row">
                <div className="water-alloc-main">
                  <div className="water-alloc-head">
                    <strong>{alloc.plotName}</strong>
                    <span className={`status-pill ${alloc.coveragePct >= 95 ? "green" : alloc.coveragePct >= 70 ? "blue" : "amber"}`}>
                      {alloc.coveragePct}% covered · {alloc.waterSensitivity} priority
                    </span>
                  </div>
                  <small>
                    {alloc.areaAcres} acres · {alloc.growthStage} (Kc {alloc.kc}) · Moisture {alloc.soilMoisturePct}% · {alloc.recommendedWindow}
                  </small>
                  <div className="coverage-track">
                    <span style={{ width: `${alloc.coveragePct}%` }} />
                  </div>
                </div>
                <div className="water-alloc-numbers">
                  <div>
                    <small>ALLOCATED</small>
                    <b>{alloc.allocatedLitersPerDay.toLocaleString("en-IN")} L</b>
                  </div>
                  <div>
                    <small>REQUIRED</small>
                    <span>{alloc.requiredLitersPerDay.toLocaleString("en-IN")} L</span>
                  </div>
                  <div>
                    <small>BALANCE</small>
                    <em className={alloc.deficitOrSurplusLiters >= 0 ? "positive" : "negative"}>
                      {alloc.deficitOrSurplusLiters >= 0 ? "Balanced" : `${alloc.deficitOrSurplusLiters.toLocaleString("en-IN")} L`}
                    </em>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <div className="rytha-two-col">
        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">7-DAY EVAPOTRANSPIRATION VS RAIN</span>
              <h3>Moisture deficit & surplus outlook</h3>
            </div>
            <CloudRain size={19} className="muted-icon" />
          </div>
          <div className="rytha-chart-box">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyChart} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="ET0 Crop Need (mm)" fill="#d6953a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Forecast Rain (mm)" fill="#3b8ea5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">TRACK WATER CONSUMPTION</span>
              <h3>Log today&apos;s irrigation run</h3>
            </div>
            <Droplets size={19} className="muted-icon" />
          </div>
          <div className="water-log-form">
            <label>
              Plot
              <select value={logPlot} onChange={(e) => setLogPlot(e.target.value)}>
                {(plan?.allocations ?? []).map((a) => (
                  <option key={a.plotName} value={a.plotName}>{a.plotName}</option>
                ))}
                {!plan?.allocations?.length && <option value="Plot A · Tomato">Plot A · Tomato</option>}
              </select>
            </label>
            <label>
              Liters applied
              <input type="number" min={100} value={logLiters} onChange={(e) => setLogLiters(e.target.value)} />
            </label>
            <label>
              Method
              <select value={logMethod} onChange={(e) => setLogMethod(e.target.value as typeof logMethod)}>
                <option value="drip">Drip irrigation (88% eff.)</option>
                <option value="sprinkler">Sprinkler (75% eff.)</option>
                <option value="flood">Flood / Furrow (55% eff.)</option>
              </select>
            </label>
            <button
              className="primary-button full-width"
              disabled={logMutation.isPending}
              onClick={() => {
                const rec = plan?.allocations.find((a) => a.plotName === logPlot)?.requiredLitersPerDay ?? 12000;
                logMutation.mutate({
                  plotName: logPlot,
                  litersUsed: Math.max(100, Number(logLiters) || 1000),
                  litersRecommended: rec,
                  method: logMethod,
                });
              }}
            >
              <Plus size={14} /> {logMutation.isPending ? "Logging…" : "Record water usage"}
            </button>
          </div>
          {logs.length > 0 && (
            <div className="saved-scenarios-list" style={{ marginTop: 14 }}>
              {logs.slice(0, 3).map((l) => (
                <div key={l.id} className="saved-scenario-row">
                  <div>
                    <strong>{l.plotName}</strong>
                    <small>{l.method} · {new Date(l.loggedAt).toLocaleDateString("en-IN")}</small>
                  </div>
                  <b>{l.litersUsed.toLocaleString("en-IN")} L</b>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
