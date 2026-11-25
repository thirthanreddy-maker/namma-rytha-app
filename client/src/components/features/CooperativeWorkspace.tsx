import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  UsersRound, Plus, Check, RefreshCw, IndianRupee, Package,
  X, ChevronRight, Sparkles
} from "lucide-react";

type Props = { onToast: (msg: string) => void };

export default function CooperativeWorkspace({ onToast }: Props) {
  const [showCreateCoop, setShowCreateCoop] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState<number | null>(null);
  const [coopForm, setCoopForm] = useState({ name: "", description: "", district: "Kolar" });
  const [bulkForm, setBulkForm] = useState({ itemName: "", quantityKg: "", unitPrice: "", preferredVendor: "" });
  const [savingsCalc, setSavingsCalc] = useState({ qty: "", unitPrice: "" });

  const utils = trpc.useUtils();
  const listQuery = trpc.cooperative.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const myGroupsQuery = trpc.cooperative.myGroups.useQuery(undefined, { refetchOnWindowFocus: false });
  const bulkListQuery = trpc.cooperative.bulkPurchase.list.useQuery(undefined, { refetchOnWindowFocus: false });

  const createMut = trpc.cooperative.create.useMutation({
    onSuccess: () => {
      void utils.cooperative.list.invalidate();
      void utils.cooperative.myGroups.invalidate();
      onToast("Cooperative created!");
      setShowCreateCoop(false);
      setCoopForm({ name: "", description: "", district: "Kolar" });
    },
    onError: (e) => onToast(e.message),
  });

  const joinMut = trpc.cooperative.join.useMutation({
    onSuccess: () => {
      void utils.cooperative.myGroups.invalidate();
      void utils.cooperative.list.invalidate();
      onToast("Joined cooperative!");
    },
    onError: (e) => onToast(e.message),
  });

  const bulkMut = trpc.cooperative.bulkPurchase.create.useMutation({
    onSuccess: () => {
      void utils.cooperative.bulkPurchase.list.invalidate();
      onToast("Bulk purchase request submitted.");
      setShowBulkForm(null);
      setBulkForm({ itemName: "", quantityKg: "", unitPrice: "", preferredVendor: "" });
    },
    onError: (e) => onToast(e.message),
  });

  const myGroupIds = new Set((myGroupsQuery.data ?? []).map((g: { coopId: number }) => g.coopId));

  // Deterministic savings calculator (10% group discount assumption)
  const qty = Number(savingsCalc.qty);
  const unitPrice = Number(savingsCalc.unitPrice);
  const groupPrice = unitPrice * 0.90;
  const savings = qty && unitPrice ? (unitPrice - groupPrice) * qty : 0;

  const DISTRICTS = ["Kolar", "Chikkaballapur", "Bangalore Rural", "Tumkur", "Mysuru", "Mandya", "Hassan"];

  return (
    <div className="cooperative-workspace">
      {/* Savings Calculator */}
      <div className="panel coop-calculator">
        <div className="panel-title">
          <div>
            <span className="eyebrow">SAVINGS ESTIMATOR</span>
            <h3>How much can your group save?</h3>
          </div>
          <Sparkles size={20} className="muted-icon" />
        </div>
        <p className="coop-calc-note">Group buying typically reduces input costs by 10–15% through bulk discounts. <em>Assumption: 10% discount.</em></p>
        <div className="coop-calc-grid">
          <label>Quantity (kg)
            <input type="number" min="0" value={savingsCalc.qty}
              onChange={e => setSavingsCalc(s => ({ ...s, qty: e.target.value }))}
              placeholder="e.g. 500" />
          </label>
          <label>Unit price (₹/kg)
            <input type="number" min="0" step="0.5" value={savingsCalc.unitPrice}
              onChange={e => setSavingsCalc(s => ({ ...s, unitPrice: e.target.value }))}
              placeholder="e.g. 45" />
          </label>
        </div>
        {savings > 0 && (
          <div className="coop-savings-result">
            <div className="savings-row">
              <span>Individual cost</span><strong>₹{(qty * unitPrice).toLocaleString("en-IN")}</strong>
            </div>
            <div className="savings-row">
              <span>Group cost (10% off)</span><strong>₹{(qty * groupPrice).toLocaleString("en-IN")}</strong>
            </div>
            <div className="savings-row highlight">
              <span><IndianRupee size={14} /> Estimated savings</span>
              <strong className="positive">₹{savings.toLocaleString("en-IN")}</strong>
            </div>
            <small className="data-source-note">Actual savings depend on vendor negotiation and group size. Assumption: 10% bulk discount.</small>
          </div>
        )}
      </div>

      {/* Create cooperative */}
      <div className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">FARMER GROUPS</span>
            <h3>Cooperatives in your area</h3>
          </div>
          <button className="secondary-button" onClick={() => setShowCreateCoop(!showCreateCoop)}>
            <Plus size={14} /> Create group
          </button>
        </div>

        {showCreateCoop && (
          <div className="coop-create-form">
            <div className="fm-form-grid">
              <label>Group name
                <input value={coopForm.name} onChange={e => setCoopForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Kolar Tomato Growers" />
              </label>
              <label>District
                <select value={coopForm.district} onChange={e => setCoopForm(f => ({ ...f, district: e.target.value }))}>
                  {DISTRICTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </label>
              <label className="fm-notes">Description
                <textarea rows={2} value={coopForm.description}
                  onChange={e => setCoopForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What does this group focus on?" />
              </label>
            </div>
            <div className="fm-form-actions">
              <button className="primary-button" disabled={createMut.isPending || !coopForm.name.trim()} onClick={() => createMut.mutate(coopForm)}>
                <Check size={14} /> Create cooperative
              </button>
              <button className="secondary-button" onClick={() => setShowCreateCoop(false)}>Cancel</button>
            </div>
          </div>
        )}

        {listQuery.isLoading ? (
          <div className="feature-empty"><RefreshCw size={18} className="spin" /><span>Loading groups…</span></div>
        ) : (listQuery.data ?? []).length === 0 ? (
          <div className="feature-empty">
            <UsersRound size={24} />
            <strong>No cooperatives yet</strong>
            <span>Create the first farmer group in your area.</span>
          </div>
        ) : (
          <div className="coop-list">
            {(listQuery.data ?? []).map((coop: { id: number; name: string; district: string; description: string; memberCount: number; createdAt: string | Date }) => {
              const isMember = myGroupIds.has(coop.id);
              return (
                <div key={coop.id} className="coop-card">
                  <div className="coop-card-left">
                    <div className="coop-avatar"><UsersRound size={18} /></div>
                    <div>
                      <strong>{coop.name}</strong>
                      <small>{coop.district} · {coop.memberCount} member{coop.memberCount !== 1 ? "s" : ""}</small>
                      {coop.description && <p>{coop.description}</p>}
                    </div>
                  </div>
                  <div className="coop-card-right">
                    {isMember ? (
                      <span className="coop-member-badge"><Check size={12} /> Member</span>
                    ) : (
                      <button className="primary-button" disabled={joinMut.isPending} onClick={() => joinMut.mutate({ coopId: coop.id })}>
                        Join group <ChevronRight size={13} />
                      </button>
                    )}
                    {isMember && (
                      <button className="secondary-button" onClick={() => setShowBulkForm(coop.id)}>
                        <Package size={13} /> Bulk request
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk purchase form */}
      {showBulkForm !== null && (
        <div className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">BULK PURCHASE REQUEST</span>
              <h3>Pool your buying power</h3>
            </div>
            <button className="icon-button" onClick={() => setShowBulkForm(null)}><X size={17} /></button>
          </div>
          <div className="fm-form-grid">
            <label>Item name
              <input value={bulkForm.itemName} onChange={e => setBulkForm(f => ({ ...f, itemName: e.target.value }))} placeholder="e.g. NPK Fertilizer (50kg bags)" />
            </label>
            <label>Quantity (kg)
              <input type="number" min="1" value={bulkForm.quantityKg} onChange={e => setBulkForm(f => ({ ...f, quantityKg: e.target.value }))} placeholder="e.g. 1000" />
            </label>
            <label>Target unit price (₹/kg)
              <input type="number" min="0" value={bulkForm.unitPrice} onChange={e => setBulkForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="e.g. 38" />
            </label>
            <label>Preferred vendor (optional)
              <input value={bulkForm.preferredVendor} onChange={e => setBulkForm(f => ({ ...f, preferredVendor: e.target.value }))} placeholder="Vendor name or any" />
            </label>
          </div>
          <div className="fm-form-actions">
            <button
              className="primary-button"
              disabled={bulkMut.isPending || !bulkForm.itemName.trim() || !bulkForm.quantityKg}
              onClick={() => bulkMut.mutate({ coopId: showBulkForm, itemName: bulkForm.itemName, quantityKg: Number(bulkForm.quantityKg), unitPrice: Number(bulkForm.unitPrice) || 0, preferredVendor: bulkForm.preferredVendor || null })}
            >
              <Check size={14} /> Submit bulk request
            </button>
            <button className="secondary-button" onClick={() => setShowBulkForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Bulk purchase list */}
      {(bulkListQuery.data ?? []).length > 0 && (
        <div className="panel">
          <div className="panel-title">
            <div><span className="eyebrow">ACTIVE BULK REQUESTS</span><h3>Group purchase orders</h3></div>
          </div>
          <div className="coop-bulk-list">
            {(bulkListQuery.data ?? []).map((req: { id: number; itemName: string; quantityKg: number; unitPrice: number; status: string; preferredVendor: string | null }) => (
              <div key={req.id} className="coop-bulk-item">
                <Package size={15} />
                <div>
                  <strong>{req.itemName}</strong>
                  <small>{req.quantityKg} kg · ₹{req.unitPrice}/kg · <span className={`coop-status ${req.status}`}>{req.status}</span></small>
                  {req.preferredVendor && <small>Preferred: {req.preferredVendor}</small>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
