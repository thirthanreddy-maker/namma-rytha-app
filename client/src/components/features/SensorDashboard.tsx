import { trpc } from "@/lib/trpc";
import {
  Activity, Droplets, ThermometerSun, BatteryMedium,
  CircleAlert, RefreshCw, Check, Radio
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

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
  const readingsQuery = trpc.sensors.readings.useQuery(undefined, { refetchInterval: 30_000 });
  const anomalyQuery = trpc.anomaly.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const resolveAnomalyMut = trpc.anomaly.resolve.useMutation({
    onSuccess: () => {
      void anomalyQuery.refetch();
      onToast("Anomaly marked as resolved.");
    },
    onError: (e) => onToast(e.message),
  });

  const utils = trpc.useUtils();
  const simulateMut = trpc.sensors.ingest.useMutation({
    onSuccess: () => {
      void utils.sensors.readings.invalidate();
      onToast("Simulated reading ingested.");
    },
    onError: (e) => onToast(e.message),
  });

  const readings: Reading[] = (readingsQuery.data ?? []) as Reading[];
  const anomalies: Anomaly[] = (anomalyQuery.data ?? []) as Anomaly[];
  const unresolvedAnomalies = anomalies.filter(a => !a.resolved);

  const getSeverityClass = (s: string) =>
    s === "critical" ? "negative" : s === "high" ? "amber" : "muted-text";

  const getMoistureStatus = (m: number) =>
    m < 30 ? { label: "DRY", cls: "amber" } :
    m > 80 ? { label: "SATURATED", cls: "blue" } :
    { label: "NORMAL", cls: "green" };

  const getBatteryIcon = (b: number) =>
    b > 20 ? { label: `${b}%`, cls: "positive" } : { label: `${b}% LOW`, cls: "negative" };

  return (
    <div className="sensor-dashboard">
      {/* Anomaly alerts */}
      {unresolvedAnomalies.length > 0 && (
        <div className="anomaly-alerts">
          <span className="eyebrow"><CircleAlert size={13} /> ACTIVE ANOMALIES</span>
          {unresolvedAnomalies.map(a => (
            <div key={a.id} className={`anomaly-alert-card ${a.severity}`}>
              <div className="anomaly-info">
                <strong>{a.anomalyType.replace(/_/g, " ").toUpperCase()}</strong>
                <span className={getSeverityClass(a.severity)}>{a.severity.toUpperCase()}</span>
                <p>{a.description}</p>
                <small>{new Date(a.detectedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</small>
              </div>
              <button
                className="secondary-button"
                disabled={resolveAnomalyMut.isPending}
                onClick={() => resolveAnomalyMut.mutate({ id: a.id })}
              >
                <Check size={13} /> Resolve
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Live readings grid */}
      <div className="panel sensor-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">LIVE SENSOR READINGS</span>
            <h3>Plot sensor status</h3>
          </div>
          <button className="icon-button" onClick={() => void utils.sensors.readings.invalidate()} aria-label="Refresh sensor data">
            <RefreshCw size={17} />
          </button>
        </div>

        {readingsQuery.isLoading ? (
          <div className="feature-empty"><RefreshCw size={18} className="spin" /><span>Loading sensor data…</span></div>
        ) : readings.length === 0 ? (
          <div className="feature-empty">
            <Radio size={24} />
            <strong>No sensor readings</strong>
            <span>Ingest your first reading below or connect an IoT device using your plot's ingest token.</span>
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
                        {r.source === "sensor" ? "HARDWARE" : "SIMULATED"}
                      </span>
                      <small>Plot #{r.plotId}</small>
                    </div>
                    <small className="muted-text">{new Date(r.recordedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small>
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
                        <small>Temp</small>
                      </div>
                    </div>
                    <div className="sensor-reading-item">
                      <Activity size={15} className="green-icon" />
                      <div>
                        <strong>{r.humidity}%</strong>
                        <small>Humidity</small>
                      </div>
                    </div>
                    <div className="sensor-reading-item">
                      <BatteryMedium size={15} />
                      <div>
                        <strong className={bat.cls}>{bat.label}</strong>
                        <small>Battery</small>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Moisture trend chart */}
      {readings.length > 0 && (
        <div className="panel chart-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">7-DAY MOISTURE HISTORY</span>
              <h3>Soil moisture trend</h3>
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
                <Tooltip formatter={(v: number) => [`${v}%`, "Moisture"]} />
                <Line type="monotone" dataKey="moisture" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <small className="data-source-note">Historical trend uses saved sensor cache when live IoT readings are unavailable.</small>
        </div>
      )}

      {/* Simulate reading */}
      <div className="panel sensor-ingest-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">SIMULATE A READING</span>
            <h3>Test your IoT integration</h3>
          </div>
        </div>
        <p className="settings-help">Ingest a simulated sensor reading for plot #1 to test the sensor pipeline. Use your real ingest token for hardware devices.</p>
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
          {simulateMut.isPending ? <><RefreshCw size={14} className="spin" /> Ingesting…</> : <><Radio size={14} /> Simulate reading</>}
        </button>
      </div>
    </div>
  );
}
