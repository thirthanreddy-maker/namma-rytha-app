import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AlertCircle, Layers, RefreshCw, Satellite, ShieldCheck, TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { trpc } from "@/lib/trpc";

type Props = {
  lat: number;
  lng: number;
};

export default function SatelliteHealthWorkspace({ lat, lng }: Props) {
  const { t } = useTranslation(["farm"]);
  const queryInput = useMemo(() => ({ lat, lng }), [lat, lng]);
  const satQuery = trpc.satellite.insights.useQuery(queryInput, { refetchOnWindowFocus: false });
  const plots = satQuery.data?.plots ?? [];

  const [selectedPlotId, setSelectedPlotId] = useState<number | null>(null);
  const [layerMode, setLayerMode] = useState<"satellite" | "ndvi" | "moisture">("ndvi");
  const activePlot = plots.find((p) => p.plotId === selectedPlotId) ?? plots[0];

  const mapEl = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapEl.current || !activePlot) return;
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const map = L.map(mapEl.current, {
      center: [activePlot.center.lat, activePlot.center.lng],
      zoom: 17,
      zoomControl: true,
      attributionControl: false,
    });

    // Real open Esri World Imagery satellite tiles
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19 }
    ).addTo(map);

    // Optional street/label overlay
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 19, opacity: 0.7 }
    ).addTo(map);

    activePlot.zones.forEach((z) => {
      const zoneColor =
        layerMode === "moisture"
          ? z.ndvi >= 0.65
            ? "#2e86ab"
            : "#e07a3d"
          : layerMode === "satellite"
            ? "#ffffff"
            : z.color;

      const poly = L.polygon(z.polygon, {
        color: zoneColor,
        weight: 2,
        fillColor: zoneColor,
        fillOpacity: layerMode === "satellite" ? 0.08 : 0.44,
      }).addTo(map);

      poly.bindPopup(
        `<strong>${z.label}</strong><br/>NDVI: ${z.ndvi}<br/>Status: ${z.status}`
      );
    });

    mapInstance.current = map;

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [activePlot, layerMode]);

  if (satQuery.isLoading) {
    return (
      <div className="panel rytha-loading-card">
        <RefreshCw size={20} className="spin" />
        <strong>{t("farm:satellite.loading")}</strong>
      </div>
    );
  }

  return (
    <div className="rytha-module-stack">
      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">{t("farm:satellite.eyebrow")}</span>
            <h3>{satQuery.data?.imageryProvider}</h3>
            <p>{satQuery.data?.ndviSource}</p>
          </div>
          {satQuery.data?.configuredSentinel ? (
            <span className="status-pill green"><ShieldCheck size={13} /> {t("farm:satellite.sentinelLive")}</span>
          ) : (
            <span className="status-pill amber"><AlertCircle size={13} /> {t("farm:satellite.modeledEstimate")}</span>
          )}
        </div>
        {!satQuery.data?.configuredSentinel && (
          <div className="market-disclaimer" style={{ marginBottom: 10 }}>
            <AlertCircle size={15} />
            <span>{t("farm:satellite.modeledBanner")}</span>
          </div>
        )}

        <div className="sat-toolbar">
          <div className="sat-plot-tabs">
            {plots.map((p) => (
              <button
                key={p.plotId}
                type="button"
                className={`tiny-pill ${activePlot?.plotId === p.plotId ? "active" : ""}`}
                onClick={() => setSelectedPlotId(p.plotId)}
              >
                {p.plotName} (NDVI {p.currentNdvi})
              </button>
            ))}
          </div>
          <div className="sat-layer-tabs">
            <button type="button" className={layerMode === "satellite" ? "active" : ""} onClick={() => setLayerMode("satellite")}>
              <Satellite size={13} /> {t("farm:satellite.layers.satellite")}
            </button>
            <button type="button" className={layerMode === "ndvi" ? "active" : ""} onClick={() => setLayerMode("ndvi")}>
              <Layers size={13} /> {t("farm:satellite.layers.ndvi")}
            </button>
            <button type="button" className={layerMode === "moisture" ? "active" : ""} onClick={() => setLayerMode("moisture")}>
              {t("farm:satellite.layers.moisture")}
            </button>
          </div>
        </div>

        <div className="sat-map-wrapper">
          <div ref={mapEl} className="sat-leaflet-container" />
          <div className="sat-legend">
            <strong>NDVI</strong>
            <div className="sat-legend-scale">
              <span><i style={{ background: "#e07a3d" }} /> (&lt;0.55)</span>
              <span><i style={{ background: "#d9a22b" }} /> (0.55–0.65)</span>
              <span><i style={{ background: "#2b8a57" }} /> (&gt;0.65)</span>
            </div>
          </div>
        </div>
      </section>

      {activePlot && (
        <div className="rytha-two-col">
          <section className="panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">{t("farm:satellite.zoneEyebrow")}</span>
                <h3>{activePlot.plotName} · {activePlot.healthLabel}</h3>
                <p>{t("farm:satellite.zoneSub")}</p>
              </div>
              <span className={`status-pill ${activePlot.unhealthyZoneCount > 0 ? "amber" : "green"}`}>
                {t("farm:satellite.watchZones", { count: activePlot.unhealthyZoneCount })}
              </span>
            </div>

            <div className="sim-kpi-grid" style={{ marginBottom: 14 }}>
              <div className="sim-kpi">
                <small>{t("farm:satellite.currentNdvi")}</small>
                <strong>{activePlot.currentNdvi}</strong>
                <span className={activePlot.changePct >= 0 ? "positive" : "negative"}>
                  {t("farm:satellite.vs2Wks", { pct: `${activePlot.changePct >= 0 ? "+" : ""}${activePlot.changePct}` })}
                </span>
              </div>
              <div className="sim-kpi">
                <small>{t("farm:satellite.ndwiMoisture")}</small>
                <strong>{activePlot.ndwiMoistureIndex}</strong>
                <span>{t("farm:satellite.canopySig")}</span>
              </div>
            </div>

            <div className="sat-zones-list">
              {activePlot.zones.map((z) => (
                <div key={z.id} className="saved-scenario-row">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: z.color, display: "inline-block" }} />
                    <div>
                      <strong>{z.label}</strong>
                      <small>{z.status}</small>
                    </div>
                  </div>
                  <b>NDVI {z.ndvi}</b>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">HISTORICAL CROP CONDITION</span>
                <h3>NDVI & canopy change over time</h3>
                <p>Track field vigor progression over the last 6 weeks.</p>
              </div>
              <TrendingUp size={19} className="muted-icon" />
            </div>

            <div className="rytha-chart-box">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={activePlot.history} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <YAxis domain={[0.2, 1.0]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="ndvi" name="NDVI Index" stroke="#247b58" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
