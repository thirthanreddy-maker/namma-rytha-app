import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRightLeft, BadgeIndianRupee, CheckCircle2, Scale, Truck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/i18n";

type Props = {
  trackedExpensesTotal: number;
  onToast: (message: string) => void;
};

export default function MandiNegotiationWorkspace({ trackedExpensesTotal, onToast }: Props) {
  const { t, i18n } = useTranslation(["market", "common"]);
  const [crop, setCrop] = useState("Tomato");
  const [quantityQ, setQuantityQ] = useState(45);
  const [buyerOffer, setBuyerOffer] = useState(2350);
  const [productionCost, setProductionCost] = useState(trackedExpensesTotal || 64600);
  const [transportRate, setTransportRate] = useState(3.5);

  const evalInput = useMemo(
    () => ({
      crop,
      quantityQuintals: Math.max(1, quantityQ),
      buyerOfferPerQuintal: Math.max(100, buyerOffer),
      productionCostTotal: Math.max(0, productionCost),
      transportRatePerKmPerQuintal: Math.max(0.5, transportRate),
    }),
    [crop, quantityQ, buyerOffer, productionCost, transportRate]
  );

  const evalQuery = trpc.mandi.evaluateOffer.useQuery(evalInput, { refetchOnWindowFocus: false });
  const offerHistoryQuery = trpc.mandi.offerHistory.useQuery(undefined, { refetchOnWindowFocus: false });
  const saveOfferMut = trpc.mandi.saveOffer.useMutation({
    onSuccess: () => {
      void offerHistoryQuery.refetch();
      onToast("Buyer offer saved to negotiation history.");
    },
    onError: (e) => onToast(e.message),
  });
  const data = evalQuery.data;

  return (
    <div className="rytha-module-stack" style={{ marginTop: 18 }}>
      <div className="rytha-two-col">
        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">{t("market:mandi.eyebrow")}</span>
              <h3>{t("market:mandi.title")}</h3>
              <p>{t("market:mandi.subtitle")}</p>
            </div>
            <Scale size={20} className="muted-icon" />
          </div>

          <div className="mandi-form-grid">
            <label>
              {t("market:mandi.commodity")}
              <select value={crop} onChange={(e) => setCrop(e.target.value)}>
                <option value="Tomato">{t("common:crops.Tomato")}</option>
                <option value="Ragi">{t("common:crops.Ragi")}</option>
                <option value="Maize">{t("common:crops.Maize")}</option>
                <option value="Chilli">{t("common:crops.Chilli")}</option>
                <option value="Onion">{t("common:crops.Onion")}</option>
                <option value="Groundnut">{t("common:crops.Groundnut")}</option>
              </select>
            </label>
            <label>
              {t("market:mandi.harvestQty")}
              <input type="number" min={1} value={quantityQ} onChange={(e) => setQuantityQ(Number(e.target.value))} />
            </label>
            <label>
              {t("market:mandi.buyerOffer")}
              <input type="number" min={100} step={50} value={buyerOffer} onChange={(e) => setBuyerOffer(Number(e.target.value))} />
            </label>
            <label>
              {t("market:mandi.prodCost")}
              <input type="number" min={0} step={500} value={productionCost} onChange={(e) => setProductionCost(Number(e.target.value))} />
            </label>
            <label>
              {t("market:mandi.transportRate")}
              <input type="number" min={1} step={0.5} value={transportRate} onChange={(e) => setTransportRate(Number(e.target.value))} />
            </label>
          </div>
        </section>

        <section className="panel">
          {data && (
            <>
              <div className="panel-title">
                <div>
                  <span className="eyebrow">{t("market:mandi.verdictEyebrow")}</span>
                  <h3>
                    {data.verdict === "ACCEPT"
                      ? t("market:mandi.acceptTitle")
                      : data.verdict === "COUNTER"
                        ? t("market:mandi.counterTitle", { price: formatCurrency(data.suggestedCounterPrice, i18n.language) })
                        : t("market:mandi.mandiTitle", { mandi: data.bestMandi.mandi })}
                  </h3>
                </div>
                <span className={`status-pill ${data.verdict === "ACCEPT" ? "green" : data.verdict === "COUNTER" ? "amber" : "blue"}`}>
                  {data.verdict === "ACCEPT" ? <CheckCircle2 size={13} /> : data.verdict === "COUNTER" ? <ArrowRightLeft size={13} /> : <Truck size={13} />}
                  {data.verdict.replaceAll("_", " ")}
                </span>
              </div>

              <p className="verdict-headline">{data.headline}</p>

              <div className="sim-kpi-grid">
                <div className="sim-kpi">
                  <small>{t("market:mandi.breakEven")}</small>
                  <strong>{formatCurrency(data.breakEvenPerQuintal, i18n.language)}/q</strong>
                  <span className={buyerOffer >= data.breakEvenPerQuintal ? "positive" : "negative"}>
                    {buyerOffer >= data.breakEvenPerQuintal ? t("market:mandi.aboveBreakEven") : t("market:mandi.lossAtOffer")}
                  </span>
                </div>
                <div className="sim-kpi">
                  <small>{t("market:mandi.buyerNetProfit")}</small>
                  <strong>{formatCurrency(data.buyerNetProfit, i18n.language)}</strong>
                  <span>{t("market:mandi.gross", { amount: formatCurrency(data.buyerGrossRevenue, i18n.language) })}</span>
                </div>
                <div className="sim-kpi">
                  <small>{t("market:mandi.bestMandiProfit")}</small>
                  <strong>{formatCurrency(data.bestMandi.netProfit, i18n.language)}</strong>
                  <span>{data.bestMandi.mandi}</span>
                </div>
                <div className="sim-kpi">
                  <small>{t("market:mandi.offerVsBest")}</small>
                  <strong className={data.diffVsBestMandi >= 0 ? "positive" : "negative"}>
                    {data.diffVsBestMandi >= 0 ? "+" : ""}{formatCurrency(data.diffVsBestMandi, i18n.language)}
                  </strong>
                  <span>{t("market:mandi.netDiff", { pct: data.diffPctVsBestMandi })}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  className="secondary-button"
                  style={{ flex: 1 }}
                  onClick={() => {
                    const summary = `Rytha Offer Check (${data.crop}, ${data.quantityQuintals}q): Offered ₹${data.buyerOfferPerQuintal}/q, Break-even ₹${data.breakEvenPerQuintal}/q. Verdict: ${data.verdict} (Best mandi ${data.bestMandi.mandi} net ₹${data.bestMandi.netRealization.toLocaleString("en-IN")}).`;
                    void navigator.clipboard?.writeText(summary);
                    onToast(t("market:mandi.copySummary"));
                  }}
                >
                  <BadgeIndianRupee size={15} /> {t("market:mandi.copySummary")}
                </button>
                <button
                  className="primary-button"
                  disabled={saveOfferMut.isPending}
                  onClick={() => saveOfferMut.mutate({
                    crop: data.crop,
                    quantityQ: Math.round(data.quantityQuintals),
                    buyerOfferPerQ: Math.round(data.buyerOfferPerQuintal),
                    verdict: data.verdict,
                    bestMandi: data.bestMandi.mandi,
                    netProfit: Math.round(data.buyerNetProfit),
                  })}
                >
                  {saveOfferMut.isPending ? t("common:saving") : t("market:mandi.saveOffer")}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {data && (
        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">{t("market:mandi.compareEyebrow")}</span>
              <h3>{t("market:mandi.compareTitle", { crop: t(`common:crops.${data.crop}`, { defaultValue: data.crop }) })}</h3>
              <p>{data.priceSourceLabel}</p>
            </div>
            <Truck size={19} className="muted-icon" />
          </div>
          <div className="market-table mandi-compare-table">
            <div className="mandi-compare-head">
              <span>{t("market:rates.colMandi")}</span>
              <span>{t("market:rates.colModalPrice")}</span>
              <span>{t("market:mandi.transportFee")}</span>
              <span>{t("market:mandi.netRealization")}</span>
              <span>{t("market:mandi.netProfit")}</span>
            </div>
            {data.mandiComparisons.map((row) => (
              <div key={row.mandi} className="mandi-compare-row">
                <span>
                  <strong>{row.mandi}</strong>
                  <small>{row.distanceKm} km · {formatCurrency(row.effectivePricePerQuintal, i18n.language)}/q</small>
                </span>
                <strong>{formatCurrency(row.modalPrice, i18n.language)}/q</strong>
                <span>{formatCurrency(row.transportCost + row.mandiCommission + row.spoilageLoss, i18n.language)}</span>
                <strong>{formatCurrency(row.netRealization, i18n.language)}</strong>
                <strong className={row.netProfit >= 0 ? "positive" : "negative"}>
                  {formatCurrency(row.netProfit, i18n.language)}
                </strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {(offerHistoryQuery.data ?? []).length > 0 && (
        <section className="panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">{t("market:mandi.offerLogEyebrow")}</span>
              <h3>{t("market:mandi.offerLogTitle")}</h3>
            </div>
          </div>
          <div className="saved-scenarios-list">
            {(offerHistoryQuery.data ?? []).map((o: { id: number; crop: string; quantityQ: number; buyerOfferPerQ: number; verdict: string; bestMandi: string; netProfit: number; createdAt: string | Date }) => (
              <div key={o.id} className="saved-scenario-row">
                <div>
                  <strong>{t(`common:crops.${o.crop}`, { defaultValue: o.crop })} · {o.quantityQ}q @ {formatCurrency(o.buyerOfferPerQ, i18n.language)}/q</strong>
                  <small>{o.bestMandi} · {formatDate(o.createdAt, i18n.language)}</small>
                </div>
                <span className={`status-pill ${o.verdict === "ACCEPT" ? "green" : "amber"}`}>{o.verdict.replaceAll("_", " ")}</span>
                <b>{formatCurrency(o.netProfit, i18n.language)}</b>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
