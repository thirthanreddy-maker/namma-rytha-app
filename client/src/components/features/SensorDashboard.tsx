import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import {
  Activity, Droplets, ThermometerSun, BatteryMedium,
  CircleAlert, RefreshCw, Check, Radio
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatDateTime } from "@/i18n";

type Props = { onToast: (msg: string) => void };

type Reading = {
  id: number;
  plotId: number;
  moisture: number;
  temperature: number;
  humidity: number;
  battery: number;
  source: string;
  recordedAt: string | Date;
};

type Anomaly = {
  id: number;
  plotId: number;
  anomalyType: string;
  severity: string;
  description: string;
  resolved: boolean;
  detectedAt: string | Date;
};

export default function SensorDashboard({ onToast }: Props) {
  const { t, i18n } = useTranslation(["irrigation", "common"]);
  const readingsQuery = trpc.sensors.readings.useQuery(undefined, { refetchInterval: 30_000 });
  const anomalyQuery = trpc.anomaly.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const resolveAnomalyMut = trpc.anomaly.resolve.useMutation({
    onSuccess: () => {
      void anomalyQuery.refetch();
      onToast(t("common:done"));
    },
    onError: (e) => onToast(e.message),
  });

  const utils = trpc.useUtils();
  const simulateMut = trpc.sensors.ingest.useMutation({
    onSuccess: () => {
      void utils.sensors.readings.invalidate();
      onToast(t("irrigation:iot.simulateBtn"));
    },
    onError: (e) => onToast(e.message),
  });

  const readings: Reading[] = (readingsQuery.data ?? []) as Reading[];
  const anomalies: Anomaly[] = (anomalyQuery.data ?? []) as Anomaly[];
  const unresolvedAnomalies = anomalies.filter(a => !a.resolved);

  const getSeverityClass = (s: string) =>
    s === "critical" ? "negative" : s === "high" ? "amber" : "muted-text";

  const getMoistureStatus = (m: number) =>
    m < 30 ? { label: t("irrigation:iot.moistureStatus.DRY"), cls: "amber" } :
    m > 80 ? { label: t("irrigation:iot.moistureStatus.SATURATED"), cls: "blue" } :
    { label: t("irrigation:iot.moistureStatus.NORMAL"), cls: "green" };

  const getBatteryIcon = (b: number) =>
    b > 20 ? { label: `${b}%`, cls: "positive" } : { label: `${b}% ${t("irrigation:iot.lowBattery")}`, cls: "negative" };

  return (
    <div className="sensor-dashboard">
      {unresolvedAnomalies.length > 0 && (
        <div className="anomaly-alerts">
          <span className="eyebrow"><CircleAlert size={13} /> {t("irrigation:iot.activeAnomalies")}</span>
          {unresolvedAnomalies.map(a => (
            <div key={a.id} className={`anomaly-alert-card ${a.severity}`}>
              <div className="anomaly-info">
                <strong>{a.anomalyType.replace(/_/g, " ").toUpperCase()}</strong>
                <span className={getSeverityClass(a.severity)}>{a.severity.toUpperCase()}</span>
                <p>{a.description}</p>
                <small>{formatDateTime(a.detectedAt, i18n.language)}</small>
              </div>
              <button
                className="secondary-button"
                disabled={resolveAnomalyMut.isPending}
                onClick={() => resolveAnomalyMut.mutate({ id: a.id })}
              >
                <Check size={13} /> {t("irrigation:iot.resolve")}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="panel sensor-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">{t("irrigation:iot.liveReadingsEyebrow")}</span>
            <h3>{t("irrigation:iot.liveReadingsTitle")}</h3>
          </div>
          <button className="icon-button" onClick={() => void utils.sensors.readings.invalidate()} aria-label={t("common:refresh")}>
            <RefreshCw size={17} />
          </button>
        </div>

        {readingsQuery.isLoading ? (
          <div className="feature-empty"><RefreshCw size={18} className="spin" /><span>{t("irrigation:iot.loading")}</span></div>
        ) : readings.length === 0 ? (
          <div className="feature-empty">
            <Radio size={24} />
            <strong>{t("irrigation:iot.emptyTitle")}</strong>
            <span>{t("irrigation:iot.emptyDesc")}</span>
          </div>
        ) : (
          <div className="sensor-grid">
            {readings.map(r => {
              const ms = getMoistureStatus(r.moisture);
              const bat = getBatteryIcon(r.battery);
              return (
                <div key={r.id} className="sensor-card">
                  <div className="sensor-card-top">
                    <div>
                      <span className={`sensor-source-badge ${r.source === "sensor" ? "hardware" : "simulated"}`}>
                        {r.source === "sensor" ? t("irrigation:iot.hardware") : t("irrigation:iot.simulated")}
                      </span>
                      <small>{t("common:plot")} #{r.plotId}</small>
                    </div>
                    <small className="muted-text">{formatDateTime(r.recordedAt, i18n.language)}</small>
                  </div>
                  <div className="sensor-readings-row">
                    <div className="sensor-reading-item">
                      <Droplets size={15} className="blue-icon" />
                      <div>
                        <strong>{r.moisture}%</strong>
                        <span className={`status-pill ${ms.cls}`}>{ms.label}</span>
                      </div>
                    </div>
                    <div className="sensor-reading-item">
                      <ThermometerSun size={15} className="amber-icon" />
                      <div>
                        <strong>{r.temperature}°</strong>
                        <small>{t("irrigation:iot.temp")}</small>
                      </div>
                    </div>
                    <div className="sensor-reading-item">
                      <Activity size={15} className="green-icon" />
                      <div>
                        <strong>{r.humidity}%</strong>
                        <small>{t("irrigation:iot.humidity")}</small>
                      </div>
                    </div>
                    <div className="sensor-reading-item">
                      <BatteryMedium size={15} />
                      <div>
                        <strong className={bat.cls}>{bat.label}</strong>
                        <small>{t("irrigation:iot.battery")}</small>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {readings.length > 0 && (
        <div className="panel chart-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">{t("irrigation:iot.historyEyebrow")}</span>
              <h3>{t("irrigation:iot.historyTitle")}</h3>
            </div>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={Array.from({ length: 7 }, (_, i) => ({
                day: `D-${6 - i}`,
                moisture: Math.max(20, Math.min(90, (readings[0]?.moisture ?? 50) + (Math.sin(i) * 8) + (i - 3))),
              }))}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v}%`, t("farm:myFarm.moisture")]} />
                <Line type="monotone" dataKey="moisture" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <small className="data-source-note">{t("irrigation:iot.historyNote")}</small>
        </div>
      )}

      <div className="panel sensor-ingest-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">{t("irrigation:iot.simulateEyebrow")}</span>
            <h3>{t("irrigation:iot.simulateTitle")}</h3>
          </div>
        </div>
        <p className="settings-help">{t("irrigation:iot.simulateHelp")}</p>
        <button
          className="secondary-button"
          disabled={simulateMut.isPending}
          onClick={() => simulateMut.mutate({
            plotId: 1,
            moisture: Math.floor(Math.random() * 40 + 30),
            temperature: Math.floor(Math.random() * 15 + 20),
            humidity: Math.floor(Math.random() * 30 + 50),
            battery: Math.floor(Math.random() * 40 + 60),
            source: "simulated",
          })}
        >
          {simulateMut.isPending ? <><RefreshCw size={14} className="spin" /> {t("irrigation:iot.ingesting")}</> : <><Radio size={14} /> {t("irrigation:iot.simulateBtn")}</>}
        </button>
      </div>
    </div>
  );
}
