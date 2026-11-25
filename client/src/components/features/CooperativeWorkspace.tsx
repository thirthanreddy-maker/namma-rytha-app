import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import {
  UsersRound, Plus, Check, RefreshCw, IndianRupee, Package,
  X, ChevronRight, Sparkles
} from "lucide-react";
import { formatCurrency } from "@/i18n";

type Props = { onToast: (msg: string) => void };

export default function CooperativeWorkspace({ onToast }: Props) {
  const { t, i18n } = useTranslation(["farm", "common"]);
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
      onToast(t("farm:cooperatives.createBtn"));
      setShowCreateCoop(false);
      setCoopForm({ name: "", description: "", district: "Kolar" });
    },
    onError: (e) => onToast(e.message),
  });

  const joinMut = trpc.cooperative.join.useMutation({
    onSuccess: () => {
      void utils.cooperative.myGroups.invalidate();
      void utils.cooperative.list.invalidate();
      onToast(t("farm:cooperatives.joinGroup"));
    },
    onError: (e) => onToast(e.message),
  });

  const bulkMut = trpc.cooperative.bulkPurchase.create.useMutation({
    onSuccess: () => {
      void utils.cooperative.bulkPurchase.list.invalidate();
      onToast(t("farm:cooperatives.submitBulk"));
      setShowBulkForm(null);
      setBulkForm({ itemName: "", quantityKg: "", unitPrice: "", preferredVendor: "" });
    },
    onError: (e) => onToast(e.message),
  });

  const myGroupIds = new Set((myGroupsQuery.data ?? []).map((g: { coopId: number }) => g.coopId));

  const qty = Number(savingsCalc.qty);
  const unitPrice = Number(savingsCalc.unitPrice);
  const groupPrice = unitPrice * 0.90;
  const savings = qty && unitPrice ? (unitPrice - groupPrice) * qty : 0;

  const DISTRICTS = ["Kolar", "Chikkaballapur", "Bangalore Rural", "Tumkur", "Mysuru", "Mandya", "Hassan"];

  return (
    <div className="cooperative-workspace">
      <div className="panel coop-calculator">
        <div className="panel-title">
          <div>
            <span className="eyebrow">{t("farm:cooperatives.calcEyebrow")}</span>
            <h3>{t("farm:cooperatives.calcTitle")}</h3>
          </div>
          <Sparkles size={20} className="muted-icon" />
        </div>
        <p className="coop-calc-note">{t("farm:cooperatives.calcNote")}</p>
        <div className="coop-calc-grid">
          <label>{t("farm:cooperatives.quantityKg")}
            <input type="number" min="0" value={savingsCalc.qty}
              onChange={e => setSavingsCalc(s => ({ ...s, qty: e.target.value }))}
              placeholder="500" />
          </label>
          <label>{t("farm:cooperatives.unitPrice")}
            <input type="number" min="0" step="0.5" value={savingsCalc.unitPrice}
              onChange={e => setSavingsCalc(s => ({ ...s, unitPrice: e.target.value }))}
              placeholder="45" />
          </label>
        </div>
        {savings > 0 && (
          <div className="coop-savings-result">
            <div className="savings-row">
              <span>{t("farm:cooperatives.individualCost")}</span><strong>{formatCurrency(qty * unitPrice, i18n.language)}</strong>
            </div>
            <div className="savings-row">
              <span>{t("farm:cooperatives.groupCost")}</span><strong>{formatCurrency(qty * groupPrice, i18n.language)}</strong>
            </div>
            <div className="savings-row highlight">
              <span><IndianRupee size={14} /> {t("farm:cooperatives.estSavings")}</span>
              <strong className="positive">{formatCurrency(savings, i18n.language)}</strong>
            </div>
            <small className="data-source-note">{t("farm:cooperatives.calcDisclaimer")}</small>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">{t("farm:cooperatives.groupsEyebrow")}</span>
            <h3>{t("farm:cooperatives.groupsTitle")}</h3>
          </div>
          <button className="secondary-button" onClick={() => setShowCreateCoop(!showCreateCoop)}>
            <Plus size={14} /> {t("farm:cooperatives.createGroup")}
          </button>
        </div>

        {showCreateCoop && (
          <div className="coop-create-form">
            <div className="fm-form-grid">
              <label>{t("farm:cooperatives.groupName")}
                <input value={coopForm.name} onChange={e => setCoopForm(f => ({ ...f, name: e.target.value }))} placeholder={t("farm:cooperatives.groupPlaceholder")} />
              </label>
              <label>{t("farm:cooperatives.district")}
                <select value={coopForm.district} onChange={e => setCoopForm(f => ({ ...f, district: e.target.value }))}>
                  {DISTRICTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </label>
              <label className="fm-notes">{t("farm:cooperatives.description")}
                <textarea rows={2} value={coopForm.description}
                  onChange={e => setCoopForm(f => ({ ...f, description: e.target.value }))}
                  placeholder={t("farm:cooperatives.descPlaceholder")} />
              </label>
            </div>
            <div className="fm-form-actions">
              <button className="primary-button" disabled={createMut.isPending || !coopForm.name.trim()} onClick={() => createMut.mutate(coopForm)}>
                <Check size={14} /> {t("farm:cooperatives.createBtn")}
              </button>
              <button className="secondary-button" onClick={() => setShowCreateCoop(false)}>{t("common:cancel")}</button>
            </div>
          </div>
        )}

        {listQuery.isLoading ? (
          <div className="feature-empty"><RefreshCw size={18} className="spin" /><span>{t("farm:cooperatives.loading")}</span></div>
        ) : (listQuery.data ?? []).length === 0 ? (
          <div className="feature-empty">
            <UsersRound size={24} />
            <strong>{t("farm:cooperatives.emptyTitle")}</strong>
            <span>{t("farm:cooperatives.emptyDesc")}</span>
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
                      <small>{coop.district} · {t("farm:cooperatives.members", { count: coop.memberCount })}</small>
                      {coop.description && <p>{coop.description}</p>}
                    </div>
                  </div>
                  <div className="coop-card-right">
                    {isMember ? (
                      <span className="coop-member-badge"><Check size={12} /> {t("farm:cooperatives.memberBadge")}</span>
                    ) : (
                      <button className="primary-button" disabled={joinMut.isPending} onClick={() => joinMut.mutate({ coopId: coop.id })}>
                        {t("farm:cooperatives.joinGroup")} <ChevronRight size={13} />
                      </button>
                    )}
                    {isMember && (
                      <button className="secondary-button" onClick={() => setShowBulkForm(coop.id)}>
                        <Package size={13} /> {t("farm:cooperatives.bulkRequest")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showBulkForm !== null && (
        <div className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">{t("farm:cooperatives.bulkEyebrow")}</span>
              <h3>{t("farm:cooperatives.bulkTitle")}</h3>
            </div>
            <button className="icon-button" onClick={() => setShowBulkForm(null)} aria-label={t("common:close")}><X size={17} /></button>
          </div>
          <div className="fm-form-grid">
            <label>{t("farm:cooperatives.itemName")}
              <input value={bulkForm.itemName} onChange={e => setBulkForm(f => ({ ...f, itemName: e.target.value }))} placeholder={t("farm:cooperatives.itemPlaceholder")} />
            </label>
            <label>{t("farm:cooperatives.quantityKg")}
              <input type="number" min="1" value={bulkForm.quantityKg} onChange={e => setBulkForm(f => ({ ...f, quantityKg: e.target.value }))} placeholder="1000" />
            </label>
            <label>{t("farm:cooperatives.targetPrice")}
              <input type="number" min="0" value={bulkForm.unitPrice} onChange={e => setBulkForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="38" />
            </label>
            <label>{t("farm:cooperatives.preferredVendor")}
              <input value={bulkForm.preferredVendor} onChange={e => setBulkForm(f => ({ ...f, preferredVendor: e.target.value }))} placeholder={t("farm:cooperatives.vendorPlaceholder")} />
            </label>
          </div>
          <div className="fm-form-actions">
            <button
              className="primary-button"
              disabled={bulkMut.isPending || !bulkForm.itemName.trim() || !bulkForm.quantityKg}
              onClick={() => bulkMut.mutate({ coopId: showBulkForm, itemName: bulkForm.itemName, quantityKg: Number(bulkForm.quantityKg), unitPrice: Number(bulkForm.unitPrice) || 0, preferredVendor: bulkForm.preferredVendor || null })}
            >
              <Check size={14} /> {t("farm:cooperatives.submitBulk")}
            </button>
            <button className="secondary-button" onClick={() => setShowBulkForm(null)}>{t("common:cancel")}</button>
          </div>
        </div>
      )}

      {(bulkListQuery.data ?? []).length > 0 && (
        <div className="panel">
          <div className="panel-title">
            <div><span className="eyebrow">{t("farm:cooperatives.activeBulkEyebrow")}</span><h3>{t("farm:cooperatives.activeBulkTitle")}</h3></div>
          </div>
          <div className="coop-bulk-list">
            {(bulkListQuery.data ?? []).map((req: { id: number; itemName: string; quantityKg: number; unitPrice: number; status: string; preferredVendor: string | null }) => (
              <div key={req.id} className="coop-bulk-item">
                <Package size={15} />
                <div>
                  <strong>{req.itemName}</strong>
                  <small>{req.quantityKg} {t("common:kg")} · {formatCurrency(req.unitPrice, i18n.language)}/{t("common:kg")} · <span className={`coop-status ${req.status}`}>{req.status}</span></small>
                  {req.preferredVendor && <small>{req.preferredVendor}</small>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
