import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  BookOpen, Plus, Search, Edit3, Trash2, ChevronDown, ChevronUp,
  Wheat, CalendarDays, IndianRupee, Check, X, RefreshCw
} from "lucide-react";

type MemoryRecord = {
  id: number;
  recordType: string;
  crop: string;
  plotName: string;
  sowingDate: string | null;
  harvestDate: string | null;
  quantityQ: number | null;
  pricePerQ: number | null;
  notes: string | null;
  createdAt: string | Date;
};

type Props = { onToast: (msg: string) => void };

export default function FarmMemoryWorkspace({ onToast }: Props) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [form, setForm] = useState({
    recordType: "harvest",
    crop: "Tomato",
    plotName: "",
    sowingDate: "",
    harvestDate: "",
    quantityQ: "",
    pricePerQ: "",
    notes: "",
  });

  const listQuery = trpc.farmMemory.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const utils = trpc.useUtils();

  const createMut = trpc.farmMemory.create.useMutation({
    onSuccess: () => {
      void utils.farmMemory.list.invalidate();
      onToast("Farm memory record saved.");
      setShowForm(false);
      resetForm();
    },
    onError: (e) => onToast(e.message),
  });

  const updateMut = trpc.farmMemory.update.useMutation({
    onSuccess: () => {
      void utils.farmMemory.list.invalidate();
      onToast("Record updated.");
      setEditId(null);
      resetForm();
    },
    onError: (e) => onToast(e.message),
  });

  const deleteMut = trpc.farmMemory.delete.useMutation({
    onSuccess: () => {
      void utils.farmMemory.list.invalidate();
      onToast("Record deleted.");
    },
    onError: (e) => onToast(e.message),
  });

  const resetForm = () => setForm({
    recordType: "harvest", crop: "Tomato", plotName: "",
    sowingDate: "", harvestDate: "", quantityQ: "", pricePerQ: "", notes: "",
  });

  const submitForm = () => {
    const payload = {
      recordType: form.recordType,
      crop: form.crop.trim(),
      plotName: form.plotName.trim() || "General",
      sowingDate: form.sowingDate || null,
      harvestDate: form.harvestDate || null,
      quantityQ: form.quantityQ ? Number(form.quantityQ) : null,
      pricePerQ: form.pricePerQ ? Number(form.pricePerQ) : null,
      notes: form.notes.trim() || null,
    };
    if (editId !== null) {
      updateMut.mutate({ id: editId, ...payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const startEdit = (r: MemoryRecord) => {
    setEditId(r.id);
    setForm({
      recordType: r.recordType,
      crop: r.crop,
      plotName: r.plotName,
      sowingDate: r.sowingDate ? r.sowingDate.slice(0, 10) : "",
      harvestDate: r.harvestDate ? r.harvestDate.slice(0, 10) : "",
      quantityQ: r.quantityQ != null ? String(r.quantityQ) : "",
      pricePerQ: r.pricePerQ != null ? String(r.pricePerQ) : "",
      notes: r.notes ?? "",
    });
    setShowForm(true);
  };

  const records: MemoryRecord[] = listQuery.data ?? [];
  const filtered = search.trim()
    ? records.filter(r =>
        r.crop.toLowerCase().includes(search.toLowerCase()) ||
        r.plotName.toLowerCase().includes(search.toLowerCase()) ||
        (r.notes ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : records;

  const grouped: Record<string, MemoryRecord[]> = {};
  for (const r of filtered) {
    const year = r.sowingDate
      ? new Date(r.sowingDate).getFullYear().toString()
      : r.harvestDate
      ? new Date(r.harvestDate).getFullYear().toString()
      : "Unknown season";
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(r);
  }
  const seasons = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="farm-memory-workspace">
      <div className="fm-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            placeholder="Search by crop, plot or notes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          className="primary-button"
          onClick={() => { resetForm(); setEditId(null); setShowForm(!showForm); }}
        >
          <Plus size={15} /> Add record
        </button>
      </div>

      {showForm && (
        <div className="panel fm-form">
          <div className="panel-title">
            <div>
              <span className="eyebrow">{editId ? "EDIT RECORD" : "NEW RECORD"}</span>
              <h3>Farm Memory Entry</h3>
            </div>
            <button className="icon-button" onClick={() => { setShowForm(false); setEditId(null); resetForm(); }}><X size={17} /></button>
          </div>
          <div className="fm-form-grid">
            <label>Record type
              <select value={form.recordType} onChange={e => setForm(f => ({ ...f, recordType: e.target.value }))}>
                <option value="harvest">Harvest</option>
                <option value="expense">Expense</option>
                <option value="observation">Field Observation</option>
                <option value="treatment">Treatment</option>
                <option value="sale">Sale</option>
              </select>
            </label>
            <label>Crop
              <input value={form.crop} onChange={e => setForm(f => ({ ...f, crop: e.target.value }))} placeholder="e.g. Tomato" />
            </label>
            <label>Plot name
              <input value={form.plotName} onChange={e => setForm(f => ({ ...f, plotName: e.target.value }))} placeholder="e.g. Plot A" />
            </label>
            <label>Sowing date
              <input type="date" value={form.sowingDate} onChange={e => setForm(f => ({ ...f, sowingDate: e.target.value }))} />
            </label>
            <label>Harvest date
              <input type="date" value={form.harvestDate} onChange={e => setForm(f => ({ ...f, harvestDate: e.target.value }))} />
            </label>
            <label>Quantity (quintals)
              <input type="number" min="0" value={form.quantityQ} onChange={e => setForm(f => ({ ...f, quantityQ: e.target.value }))} placeholder="e.g. 12" />
            </label>
            <label>Price per quintal (₹)
              <input type="number" min="0" value={form.pricePerQ} onChange={e => setForm(f => ({ ...f, pricePerQ: e.target.value }))} placeholder="e.g. 2800" />
            </label>
            <label className="fm-notes">Notes
              <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observations, lessons, weather conditions…" />
            </label>
          </div>
          <div className="fm-form-actions">
            <button
              className="primary-button"
              disabled={createMut.isPending || updateMut.isPending || !form.crop.trim()}
              onClick={submitForm}
            >
              <Check size={15} /> {editId ? "Update record" : "Save record"}
            </button>
            <button className="secondary-button" onClick={() => { setShowForm(false); setEditId(null); resetForm(); }}>Cancel</button>
          </div>
        </div>
      )}

      {listQuery.isLoading ? (
        <div className="feature-empty"><RefreshCw size={20} className="spin" /><span>Loading farm memory…</span></div>
      ) : records.length === 0 ? (
        <div className="feature-empty">
          <BookOpen size={28} />
          <strong>No farm records yet</strong>
          <span>Add harvest data, treatment logs, and field observations to build your farm's memory.</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="feature-empty"><Search size={20} /><span>No records matching "{search}"</span></div>
      ) : (
        <div className="fm-timeline">
          {seasons.map(season => (
            <div key={season} className="fm-season">
              <div className="fm-season-header">
                <span className="eyebrow">SEASON {season}</span>
                <span className="fm-season-count">{grouped[season].length} records</span>
              </div>
              {grouped[season].map(r => {
                const isExpanded = expandedId === r.id;
                const revenue = r.quantityQ != null && r.pricePerQ != null
                  ? (r.quantityQ * r.pricePerQ).toLocaleString("en-IN")
                  : null;
                return (
                  <div key={r.id} className={`fm-card ${r.recordType}`}>
                    <div className="fm-card-top" onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                      <div className="fm-card-left">
                        <span className={`fm-type-badge ${r.recordType}`}>{r.recordType}</span>
                        <div>
                          <strong>{r.crop}</strong>
                          <small>{r.plotName}</small>
                        </div>
                      </div>
                      <div className="fm-card-right">
                        {revenue && <span className="fm-revenue"><IndianRupee size={12} />₹{revenue}</span>}
                        {r.quantityQ != null && <span className="fm-qty"><Wheat size={12} />{r.quantityQ} q</span>}
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="fm-card-detail">
                        <div className="fm-dates">
                          {r.sowingDate && <span><CalendarDays size={13} /> Sown: {new Date(r.sowingDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>}
                          {r.harvestDate && <span><CalendarDays size={13} /> Harvested: {new Date(r.harvestDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>}
                        </div>
                        {r.notes && <p className="fm-notes-text">{r.notes}</p>}
                        <div className="fm-card-actions">
                          <button className="secondary-button" onClick={() => startEdit(r)}><Edit3 size={13} /> Edit</button>
                          <button
                            className="danger-button"
                            disabled={deleteMut.isPending}
                            onClick={() => { if (confirm("Delete this record?")) deleteMut.mutate({ id: r.id }); }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
