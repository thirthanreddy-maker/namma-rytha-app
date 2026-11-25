import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AlertTriangle, CheckCircle2, MapPin, PlusCircle, Radio, ShieldCheck, ThumbsUp, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

type Props = {
  lat: number;
  lng: number;
  onToast: (message: string) => void;
};

const INTEL_CATEGORIES = [
  { id: "all", label: "All reports" },
  { id: "pest_attack", label: "Pest attacks" },
  { id: "crop_disease", label: "Crop diseases" },
  { id: "unusual_rainfall", label: "Unusual rainfall" },
  { id: "water_shortage", label: "Water shortages" },
  { id: "crop_damage", label: "Crop damage" },
  { id: "market_change", label: "Market changes" },
] as const;

export default function LocalIntelligenceWorkspace({ lat, lng, onToast }: Props) {
  const { t } = useTranslation(["farm", "common"]);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "unverified">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showReportForm, setShowReportForm] = useState(false);

  const [category, setCategory] = useState<"pest_attack" | "crop_disease" | "unusual_rainfall" | "water_shortage" | "crop_damage" | "market_change">("pest_attack");
  const [title, setTitle] = useState("");
  const [crop, setCrop] = useState("Tomato");
  const [severity, setSeverity] = useState<"low" | "moderate" | "high">("moderate");
  const [location, setLocation] = useState("Hegganahalli, Kolar");
  const [description, setDescription] = useState("");
  const [pinCoords, setPinCoords] = useState({ lat, lng });

  const listInput = useMemo(() => ({ category: categoryFilter, verification: verificationFilter }), [categoryFilter, verificationFilter]);
  const reportsQuery = trpc.regionalIntel.list.useQuery(listInput, { refetchOnWindowFocus: false });
  const utils = trpc.useUtils();

  const submitMutation = trpc.regionalIntel.submit.useMutation({
    onSuccess: () => {
      void utils.regionalIntel.list.invalidate();
      setShowReportForm(false);
      setTitle("");
      setDescription("");
      onToast("Regional report submitted (currently marked Unverified until corroborated or reviewed).");
    },
    onError: (err) => onToast(err.message),
  });

  const corroborateMutation = trpc.regionalIntel.corroborate.useMutation({
    onSuccess: (res) => {
      void utils.regionalIntel.list.invalidate();
      onToast(res.verified ? "Report reached verification threshold!" : "Corroboration recorded.");
    },
    onError: (err) => onToast(err.message),
  });

  const verifyMutation = trpc.regionalIntel.verify.useMutation({
    onSuccess: () => {
      void utils.regionalIntel.list.invalidate();
      onToast("Verification status updated.");
    },
    onError: (err) => onToast(err.message),
  });

  const reports = reportsQuery.data ?? [];
  const verifiedCount = reports.filter((r) => r.verified).length;
  const unverifiedCount = reports.filter((r) => !r.verified).length;

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapEl.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapEl.current, {
      center: [lat, lng],
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);

    map.on("click", (ev: L.LeafletMouseEvent) => {
      setPinCoords({ lat: Number(ev.latlng.lat.toFixed(4)), lng: Number(ev.latlng.lng.toFixed(4)) });
    });

    reports.forEach((rep) => {
      const markerColor = rep.verified ? "#1e7a4c" : "#d9821f";
      const circle = L.circleMarker([rep.latitude, rep.longitude], {
        radius: 10,
        color: markerColor,
        weight: rep.verified ? 3 : 2,
        dashArray: rep.verified ? undefined : "4 3",
        fillColor: markerColor,
        fillOpacity: rep.verified ? 0.85 : 0.45,
      }).addTo(map);

      circle.bindPopup(
        `<strong>${rep.verified ? "✓ VERIFIED" : "⚠ UNVERIFIED"}: ${rep.title}</strong><br/>` +
        `Crop: ${rep.crop} · ${rep.severity.toUpperCase()}<br/>` +
        `${rep.location}<br/><em>${rep.description}</em>`
      );
    });

    mapRef.current = map;
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [reports, lat, lng]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitMutation.mutate({
      category,
      title: title.trim(),
      crop: crop.trim(),
      severity,
      description: description.trim(),
      location: location.trim(),
      latitude: pinCoords.lat,
      longitude: pinCoords.lng,
    });
  };

  return (
    <div className="rytha-module-stack">
      <div className="intel-header-bar">
        <div className="intel-filter-group">
          <button type="button" className={`tiny-pill ${verificationFilter === "all" ? "active" : ""}`} onClick={() => setVerificationFilter("all")}>
            All ({reports.length})
          </button>
          <button type="button" className={`tiny-pill ${verificationFilter === "verified" ? "active" : ""}`} onClick={() => setVerificationFilter("verified")}>
            <ShieldCheck size={13} /> Verified ({verifiedCount})
          </button>
          <button type="button" className={`tiny-pill ${verificationFilter === "unverified" ? "active" : ""}`} onClick={() => setVerificationFilter("unverified")}>
            <AlertTriangle size={13} /> Unverified ({unverifiedCount})
          </button>
        </div>
        <button className="primary-button" onClick={() => setShowReportForm((v) => !v)}>
          <PlusCircle size={15} /> Report local issue
        </button>
      </div>

      <div className="preset-pill-row">
        {INTEL_CATEGORIES.map((c) => (
          <button key={c.id} type="button" className={`tiny-pill ${categoryFilter === c.id ? "active" : ""}`} onClick={() => setCategoryFilter(c.id)}>
            {c.label}
          </button>
        ))}
      </div>

      {showReportForm && (
        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">SUBMIT COMMUNITY FIELD ALERT</span>
              <h3>Report regional crop, weather, or water alert</h3>
              <p>Click anywhere on the map below to adjust report GPS pin ({pinCoords.lat}, {pinCoords.lng}).</p>
            </div>
            <button className="icon-button" onClick={() => setShowReportForm(false)} aria-label="Close"><X size={16} /></button>
          </div>
          <form className="announcement-form-grid" style={{ marginTop: 14 }} onSubmit={handleSubmit}>
            <label>
              Issue category
              <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
                <option value="pest_attack">Pest attack</option>
                <option value="crop_disease">Crop disease</option>
                <option value="unusual_rainfall">Unusual rainfall</option>
                <option value="water_shortage">Water shortage</option>
                <option value="crop_damage">Crop damage</option>
                <option value="market_change">Market price/arrival change</option>
              </select>
            </label>
            <label>
              Affected crop
              <input required value={crop} onChange={(e) => setCrop(e.target.value)} />
            </label>
            <label>
              Headline
              <input required minLength={4} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sudden aphid wave in Chilli border" />
            </label>
            <label>
              Severity
              <select value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
                <option value="low">Low — watch</option>
                <option value="moderate">Moderate — spreading</option>
                <option value="high">High — urgent regional alert</option>
              </select>
            </label>
            <label>
              Village / Area name
              <input required value={location} onChange={(e) => setLocation(e.target.value)} />
            </label>
            <label className="announcement-form-wide">
              Observation details
              <textarea required minLength={6} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What did you observe on the field or market today?" />
            </label>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
              <button className="primary-button" type="submit" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? "Submitting…" : "Publish community report"}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="rytha-two-col">
        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">REGIONAL ALERT MAP</span>
              <h3>Verified vs. Community Unverified pins</h3>
            </div>
            <Radio size={19} className="muted-icon" />
          </div>
          <div className="sat-map-wrapper">
            <div ref={mapEl} className="sat-leaflet-container" />
            <div className="sat-legend">
              <div className="sat-legend-scale">
                <span><i style={{ background: "#1e7a4c" }} /> Solid Green: Verified by KVK / 3+ Farmers</span>
                <span><i style={{ background: "#d9821f" }} /> Amber Dashed: Unverified Farmer Submission</span>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">REGIONAL REPORTS FEED</span>
              <h3>Active field intelligence</h3>
              <p>Verified & unverified alerts are clearly separated below.</p>
            </div>
          </div>

          <div className="intel-feed-list">
            {reports.map((rep) => (
              <article key={rep.id} className={`intel-card ${rep.verified ? "verified" : "unverified"}`}>
                <div className="intel-card-top">
                  <span className={`status-pill ${rep.verified ? "green" : "amber"}`}>
                    {rep.verified ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                    {rep.verified ? "Verified" : "Unverified"}
                  </span>
                  <span className="intel-cat-label">{rep.category.replace("_", " ")} · {rep.severity}</span>
                </div>
                <strong>{rep.title}</strong>
                <p>{rep.description}</p>
                <div className="intel-meta">
                  <span><MapPin size={12} /> {rep.location} ({rep.crop})</span>
                  <span>By {rep.reporterName}</span>
                </div>
                {rep.verifiedBy && <small className="intel-verifier">Verified by: {rep.verifiedBy}</small>}
                <div className="intel-actions">
                  <button
                    className="tiny-button"
                    disabled={corroborateMutation.isPending}
                    onClick={() => corroborateMutation.mutate({ reportId: rep.id })}
                  >
                    <ThumbsUp size={12} /> Confirm ({rep.corroborations})
                  </button>
                  {isAdmin && (
                    <button
                      className="tiny-button"
                      onClick={() => verifyMutation.mutate({ reportId: rep.id, verified: !rep.verified })}
                    >
                      {rep.verified ? "Unverify" : "Verify report"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
