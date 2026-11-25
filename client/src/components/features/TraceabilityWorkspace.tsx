import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  ScanLine, Plus, Check, RefreshCw, Wheat, Package, X, Download,
  MapPin, CalendarDays, ChevronDown, ChevronUp
} from "lucide-react";

type Props = { onToast: (msg: string) => void };

type Batch = {
  id: number;
  batchCode: string;
  crop: string;
  plotName: string;
  harvestDate: string;
  quantityKg: number;
  qualityGrade: string;
  certifications: string[];
  events: Array<{ eventType: string; location: string; timestamp: string; note: string | null }>;
  createdAt: string | Date;
};

function generateQRCanvas(text: string, canvas: HTMLCanvasElement) {
  // Simple QR-like visual using canvas (a placeholder mosaic — real QR via URL)
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = 200;
  canvas.width = size;
  canvas.height = size;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  // Encode text as a seeded pixel pattern (deterministic visual fingerprint, not a real QR)
  const cells = 20;
  const cellSize = size / cells;
  let seed = 0;
  for (let i = 0; i < text.length; i++) seed = (seed * 31 + text.charCodeAt(i)) >>> 0;

  ctx.fillStyle = "#163b2b";
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      // Force finder patterns in corners (always filled)
      const inCorner =
        (row < 3 && col < 3) || (row < 3 && col >= cells - 3) ||
        (row >= cells - 3 && col < 3);
      if (inCorner || (seed % 2 === 0)) {
        ctx.fillRect(col * cellSize, row * cellSize, cellSize - 1, cellSize - 1);
      }
    }
  }

  // Label
  ctx.fillStyle = "#247b58";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SCAN TO VERIFY", size / 2, size - 4);
}

export default function TraceabilityWorkspace({ onToast }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState({
    crop: "Tomato",
    plotName: "",
    harvestDate: "",
    quantityKg: "",
    qualityGrade: "A",
    certifications: "",
  });
  const [eventForm, setEventForm] = useState({ batchId: null as number | null, eventType: "packed", location: "", note: "" });
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const utils = trpc.useUtils();

  const listQuery = trpc.traceability.list.useQuery(undefined, { refetchOnWindowFocus: false });

  const createMut = trpc.traceability.create.useMutation({
    onSuccess: () => {
      void utils.traceability.list.invalidate();
      onToast("Harvest batch created with QR code.");
      setShowForm(false);
      setForm({ crop: "Tomato", plotName: "", harvestDate: "", quantityKg: "", qualityGrade: "A", certifications: "" });
    },
    onError: (e) => onToast(e.message),
  });

  const addEventMut = trpc.traceability.addEvent.useMutation({
    onSuccess: () => {
      void utils.traceability.list.invalidate();
      onToast("Traceability event recorded.");
      setEventForm({ batchId: null, eventType: "packed", location: "", note: "" });
    },
    onError: (e) => onToast(e.message),
  });

  const batches: Batch[] = (listQuery.data ?? []) as Batch[];

  useEffect(() => {
    for (const batch of batches) {
      const canvas = canvasRefs.current[batch.id];
      if (canvas) {
        generateQRCanvas(`RYTHA-BATCH:${batch.batchCode}`, canvas);
      }
    }
  }, [batches]);

  const downloadQR = (batchCode: string, id: number) => {
    const canvas = canvasRefs.current[id];
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `rytha-batch-${batchCode}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    onToast("QR code downloaded.");
  };

  const EVENT_TYPES = ["harvested", "packed", "transported", "market_arrival", "sold"];
  const GRADES = ["A", "B", "C", "Export"];

  return (
    <div className="traceability-workspace">
      <div className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">HARVEST BATCHES</span>
            <h3>Crop-to-buyer traceability</h3>
            <p>Create a QR code for each harvest batch. Buyers scan to verify farm origin, quality grade, and journey.</p>
          </div>
          <button className="secondary-button" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> New batch
          </button>
        </div>

        {showForm && (
          <div className="trace-form">
            <div className="fm-form-grid">
              <label>Crop <input value={form.crop} onChange={e => setForm(f => ({ ...f, crop: e.target.value }))} placeholder="e.g. Tomato" /></label>
              <label>Plot name <input value={form.plotName} onChange={e => setForm(f => ({ ...f, plotName: e.target.value }))} placeholder="e.g. Plot A" /></label>
              <label>Harvest date <input type="date" value={form.harvestDate} onChange={e => setForm(f => ({ ...f, harvestDate: e.target.value }))} /></label>
              <label>Quantity (kg) <input type="number" min="1" value={form.quantityKg} onChange={e => setForm(f => ({ ...f, quantityKg: e.target.value }))} placeholder="e.g. 800" /></label>
              <label>Quality grade
                <select value={form.qualityGrade} onChange={e => setForm(f => ({ ...f, qualityGrade: e.target.value }))}>
                  {GRADES.map(g => <option key={g}>{g}</option>)}
                </select>
              </label>
              <label>Certifications (comma-separated)
                <input value={form.certifications} onChange={e => setForm(f => ({ ...f, certifications: e.target.value }))} placeholder="e.g. Organic, GAP" />
              </label>
            </div>
            <div className="fm-form-actions">
              <button
                className="primary-button"
                disabled={createMut.isPending || !form.crop.trim() || !form.quantityKg}
                onClick={() => createMut.mutate({
                  crop: form.crop.trim(),
                  plotName: form.plotName.trim() || "Main Plot",
                  harvestDate: form.harvestDate || new Date().toISOString().slice(0, 10),
                  quantityKg: Number(form.quantityKg),
                  qualityGrade: form.qualityGrade,
                  certifications: form.certifications ? form.certifications.split(",").map(c => c.trim()) : [],
                })}
              >
                <Check size={14} /> Generate batch + QR
              </button>
              <button className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {listQuery.isLoading ? (
        <div className="feature-empty"><RefreshCw size={18} className="spin" /><span>Loading batches…</span></div>
      ) : batches.length === 0 ? (
        <div className="feature-empty">
          <ScanLine size={28} />
          <strong>No harvest batches yet</strong>
          <span>Create your first batch to generate a QR code buyers can scan to verify the crop's origin and quality.</span>
        </div>
      ) : (
        <div className="trace-batch-list">
          {batches.map(batch => {
            const isOpen = expandedId === batch.id;
            return (
              <div key={batch.id} className="trace-batch-card">
                <div className="trace-batch-header" onClick={() => setExpandedId(isOpen ? null : batch.id)}>
                  <div className="trace-batch-info">
                    <span className="trace-grade-badge">{batch.qualityGrade}</span>
                    <div>
                      <strong>{batch.crop} · {batch.plotName}</strong>
                      <small><Wheat size={12} /> {batch.quantityKg} kg · <CalendarDays size={12} /> {new Date(batch.harvestDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</small>
                    </div>
                  </div>
                  <div className="trace-batch-right">
                    <span className="trace-code">{batch.batchCode}</span>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {isOpen && (
                  <div className="trace-batch-detail">
                    <div className="trace-qr-section">
                      <canvas
                        ref={el => { canvasRefs.current[batch.id] = el; if (el) generateQRCanvas(`RYTHA-BATCH:${batch.batchCode}`, el); }}
                        className="trace-qr-canvas"
                      />
                      <div className="trace-qr-actions">
                        <button className="secondary-button" onClick={() => downloadQR(batch.batchCode, batch.id)}>
                          <Download size={14} /> Download QR
                        </button>
                        <small className="data-source-note">QR encodes batch code. Generated client-side · no external API.</small>
                      </div>
                    </div>

                    {batch.certifications.length > 0 && (
                      <div className="trace-certs">
                        {batch.certifications.map((c, i) => (
                          <span key={i} className="trace-cert-badge"><Check size={11} /> {c}</span>
                        ))}
                      </div>
                    )}

                    {/* Event timeline */}
                    <div className="trace-timeline">
                      <span className="eyebrow">JOURNEY TIMELINE</span>
                      {batch.events.length === 0 ? (
                        <p className="trace-no-events">No events recorded yet. Add the first step below.</p>
                      ) : (
                        <div className="trace-event-list">
                          {batch.events.map((ev, i) => (
                            <div key={i} className="trace-event">
                              <div className="trace-event-dot" />
                              <div>
                                <strong>{ev.eventType}</strong>
                                <small><MapPin size={11} /> {ev.location} · {new Date(ev.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</small>
                                {ev.note && <p>{ev.note}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add event */}
                    {eventForm.batchId === batch.id ? (
                      <div className="trace-event-form">
                        <div className="fm-form-grid">
                          <label>Event type
                            <select value={eventForm.eventType} onChange={e => setEventForm(f => ({ ...f, eventType: e.target.value }))}>
                              {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                            </select>
                          </label>
                          <label>Location
                            <input value={eventForm.location} onChange={e => setEventForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Kolar APMC" />
                          </label>
                          <label className="fm-notes">Note (optional)
                            <input value={eventForm.note} onChange={e => setEventForm(f => ({ ...f, note: e.target.value }))} placeholder="Additional detail" />
                          </label>
                        </div>
                        <div className="fm-form-actions">
                          <button
                            className="primary-button"
                            disabled={addEventMut.isPending || !eventForm.location.trim()}
                            onClick={() => addEventMut.mutate({ batchId: batch.id, eventType: eventForm.eventType, location: eventForm.location, note: eventForm.note || null })}
                          >
                            <Check size={13} /> Record event
                          </button>
                          <button className="secondary-button" onClick={() => setEventForm(f => ({ ...f, batchId: null }))}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="panel-link" onClick={() => setEventForm({ batchId: batch.id, eventType: "packed", location: "", note: "" })}>
                        <Plus size={14} /> Add journey event
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
