import { useMemo, useState } from "react";
import { ArrowRightLeft, BadgeIndianRupee, CheckCircle2, Scale, Truck, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

type Props = {
  trackedExpensesTotal: number;
  onToast: (message: string) => void;
};

export default function MandiNegotiationWorkspace({ trackedExpensesTotal, onToast }: Props) {
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
              <span className="eyebrow">AI MANDI NEGOTIATION ASSISTANT</span>
              <h3>Evaluate a buyer&apos;s offer</h3>
              <p>Compare farm-gate buyer offers against nearby mandis after transport & mandi fees.</p>
            </div>
            <Scale size={20} className="muted-icon" />
          </div>

          <div className="mandi-form-grid">
            <label>
              Commodity
              <select value={crop} onChange={(e) => setCrop(e.target.value)}>
                <option>Tomato</option>
                <option>Ragi</option>
                <option>Maize</option>
                <option>Chilli</option>
                <option>Onion</option>
                <option>Groundnut</option>
              </select>
            </label>
            <label>
              Harvest quantity (quintals)
              <input type="number" min={1} value={quantityQ} onChange={(e) => setQuantityQ(Number(e.target.value))} />
            </label>
            <label>
              Buyer&apos;s offered price (₹/quintal)
              <input type="number" min={100} step={50} value={buyerOffer} onChange={(e) => setBuyerOffer(Number(e.target.value))} />
            </label>
            <label>
              Season production cost (₹ total)
              <input type="number" min={0} step={500} value={productionCost} onChange={(e) => setProductionCost(Number(e.target.value))} />
            </label>
            <label>
              Transport rate (₹ / km / quintal)
              <input type="number" min={1} step={0.5} value={transportRate} onChange={(e) => setTransportRate(Number(e.target.value))} />
            </label>
          </div>
        </section>

        <section className="panel">
          {data && (
            <>
              <div className="panel-title">
                <div>
                  <span className="eyebrow">NEGOTIATION VERDICT</span>
                  <h3>
                    {data.verdict === "ACCEPT"
                      ? "Accept buyer offer"
                      : data.verdict === "COUNTER"
                        ? `Counter-offer ₹${data.suggestedCounterPrice.toLocaleString("en-IN")}/q`
                        : `Take harvest to ${data.bestMandi.mandi}`}
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
                  <small>BREAK-EVEN PRICE</small>
                  <strong>₹{data.breakEvenPerQuintal.toLocaleString("en-IN")}/q</strong>
                  <span className={buyerOffer >= data.breakEvenPerQuintal ? "positive" : "negative"}>
                    {buyerOffer >= data.breakEvenPerQuintal ? "Above break-even" : "Loss at offered price"}
                  </span>
                </div>
                <div className="sim-kpi">
                  <small>BUYER NET PROFIT</small>
                  <strong>₹{data.buyerNetProfit.toLocaleString("en-IN")}</strong>
                  <span>Gross ₹{data.buyerGrossRevenue.toLocaleString("en-IN")}</span>
                </div>
                <div className="sim-kpi">
                  <small>BEST MANDI NET PROFIT</small>
                  <strong>₹{data.bestMandi.netProfit.toLocaleString("en-IN")}</strong>
                  <span>{data.bestMandi.mandi}</span>
                </div>
                <div className="sim-kpi">
                  <small>OFFER VS BEST MANDI</small>
                  <strong className={data.diffVsBestMandi >= 0 ? "positive" : "negative"}>
                    {data.diffVsBestMandi >= 0 ? "+" : ""}₹{data.diffVsBestMandi.toLocaleString("en-IN")}
                  </strong>
                  <span>{data.diffPctVsBestMandi}% net difference</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  className="secondary-button"
                  style={{ flex: 1 }}
                  onClick={() => {
                    const summary = `Rytha Offer Check (${data.crop}, ${data.quantityQuintals}q): Offered ₹${data.buyerOfferPerQuintal}/q, Break-even ₹${data.breakEvenPerQuintal}/q. Verdict: ${data.verdict} (Best mandi ${data.bestMandi.mandi} net ₹${data.bestMandi.netRealization.toLocaleString("en-IN")}).`;
                    void navigator.clipboard?.writeText(summary);
                    onToast("Negotiation summary copied for sharing.");
                  }}
                >
                  <BadgeIndianRupee size={15} /> Copy summary
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
                  {saveOfferMut.isPending ? "Saving…" : "Save offer"}
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
              <span className="eyebrow">NET REALIZATION AFTER TRANSPORT & COMMISSION</span>
              <h3>Mandi net profit comparison ({data.crop})</h3>
              <p>{data.priceSourceLabel}</p>
            </div>
            <Truck size={19} className="muted-icon" />
          </div>
          <div className="market-table mandi-compare-table">
            <div className="mandi-compare-head">
              <span>MANDI</span>
              <span>MODAL RATE</span>
              <span>TRANSPORT + FEE</span>
              <span>NET REALIZATION</span>
              <span>NET PROFIT</span>
            </div>
            {data.mandiComparisons.map((row) => (
              <div key={row.mandi} className="mandi-compare-row">
                <span>
                  <strong>{row.mandi}</strong>
                  <small>{row.distanceKm} km · Effective ₹{row.effectivePricePerQuintal.toLocaleString("en-IN")}/q</small>
                </span>
                <strong>₹{row.modalPrice.toLocaleString("en-IN")}/q</strong>
                <span>₹{(row.transportCost + row.mandiCommission + row.spoilageLoss).toLocaleString("en-IN")}</span>
                <strong>₹{row.netRealization.toLocaleString("en-IN")}</strong>
                <strong className={row.netProfit >= 0 ? "positive" : "negative"}>
                  ₹{row.netProfit.toLocaleString("en-IN")}
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
              <span className="eyebrow">BUYER OFFER LOG</span>
              <h3>Saved negotiation checks</h3>
            </div>
          </div>
          <div className="saved-scenarios-list">
            {(offerHistoryQuery.data ?? []).map((o: { id: number; crop: string; quantityQ: number; buyerOfferPerQ: number; verdict: string; bestMandi: string; netProfit: number; createdAt: string | Date }) => (
              <div key={o.id} className="saved-scenario-row">
                <div>
                  <strong>{o.crop} · {o.quantityQ}q @ ₹{o.buyerOfferPerQ}/q</strong>
                  <small>Best mandi: {o.bestMandi} · {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</small>
                </div>
                <span className={`status-pill ${o.verdict === "ACCEPT" ? "green" : "amber"}`}>{o.verdict.replaceAll("_", " ")}</span>
                <b>₹{o.netProfit.toLocaleString("en-IN")} net</b>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
