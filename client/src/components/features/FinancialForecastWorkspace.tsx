import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import {
  TrendingUp, IndianRupee, RefreshCw, Sparkles, ChevronDown, ChevronUp,
  Calendar, CircleAlert
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { formatCurrency } from "@/i18n";

type Props = { onToast: (msg: string) => void };

type ForecastData = {
  crop: string;
  plotName: string;
  seasons: Array<{
    label: string;
    month: number;
    conservative: number;
    expected: number;
    optimistic: number;
    cumulativeCost: number;
  }>;
  totalInvestment: number;
  conservativeProfit: number;
  expectedProfit: number;
  optimisticProfit: number;
  assumptions: string[];
  dataMode: "live" | "estimated";
};

export default function FinancialForecastWorkspace({ onToast }: Props) {
  const { t, i18n } = useTranslation(["market", "farm", "common"]);
  const [form, setForm] = useState({
    crop: "Tomato",
    plotName: "Plot A",
    areaAcres: "2",
    season: "Kharif 2026",
  });
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const plotsQuery = trpc.farm.plots.list.useQuery();

  const forecastMut = trpc.finance.forecast.useMutation({
    onSuccess: (data) => setForecast(data as ForecastData),
    onError: (e) => onToast(e.message),
  });

  const submit = () => {
    forecastMut.mutate({
      crop: form.crop.trim(),
      plotName: form.plotName.trim(),
      areaAcres: Number(form.areaAcres),
      season: form.season,
    });
  };

  const plotOptions = (plotsQuery.data ?? []).map((p: { name: string; crop: string }) => p);

  const chartData = forecast?.seasons.map(s => ({
    name: s.label,
    [t("market:forecast.conservativeProfit")]: s.conservative,
    [t("market:forecast.expectedProfit")]: s.expected,
    [t("market:forecast.optimisticProfit")]: s.optimistic,
    [t("market:profit.totalCost")]: -s.cumulativeCost,
  })) ?? [];

  return (
    <div className="financial-forecast-workspace">
      <div className="panel ff-form-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">{t("market:forecast.eyebrow")}</span>
            <h3>{t("market:forecast.title")}</h3>
          </div>
          <TrendingUp size={21} className="muted-icon" />
        </div>
        <div className="ff-form-grid">
          <label>{t("common:crop")}
            <input value={form.crop} onChange={e => setForm(f => ({ ...f, crop: e.target.value }))} placeholder="Tomato" />
          </label>
          <label>{t("farm:farmMemory.plotName")}
            {plotOptions.length > 0 ? (
              <select value={form.plotName} onChange={e => {
                const plot = plotOptions.find((p: { name: string }) => p.name === e.target.value);
                setForm(f => ({ ...f, plotName: e.target.value, crop: plot?.crop ?? f.crop }));
              }}>
                {plotOptions.map((p: { name: string }) => <option key={p.name}>{p.name}</option>)}
              </select>
            ) : (
              <input value={form.plotName} onChange={e => setForm(f => ({ ...f, plotName: e.target.value }))} placeholder="Plot A" />
            )}
          </label>
          <label>{t("common:acres")}
            <input type="number" min="0.25" step="0.25" value={form.areaAcres} onChange={e => setForm(f => ({ ...f, areaAcres: e.target.value }))} />
          </label>
          <label>{t("market:forecast.season")}
            <select value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))}>
              <option>Kharif 2026</option>
              <option>Rabi 2026-27</option>
              <option>Kharif 2027</option>
              <option>Rabi 2027-28</option>
            </select>
          </label>
        </div>
        <button className="primary-button" disabled={forecastMut.isPending} onClick={submit}>
          {forecastMut.isPending
            ? <><RefreshCw size={15} className="spin" /> {t("market:forecast.buildingBtn")}</>
            : <><Sparkles size={15} /> {t("market:forecast.generateBtn")}</>
          }
        </button>
      </div>

      {forecast && (
        <>
          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-icon amber"><IndianRupee size={19} /></div>
              <span>{t("market:forecast.totalInvestment")}</span>
              <strong>{formatCurrency(forecast.totalInvestment, i18n.language)}</strong>
              <small className="muted-text">{form.areaAcres} {t("common:acres")}</small>
            </div>
            <div className="metric-card">
              <div className="metric-icon blue"><TrendingUp size={19} /></div>
              <span>{t("market:forecast.conservativeProfit")}</span>
              <strong className={forecast.conservativeProfit >= 0 ? "positive" : "negative"}>
                {formatCurrency(Math.abs(forecast.conservativeProfit), i18n.language)}
              </strong>
              <small className="muted-text">{t("market:forecast.conservativeSub")}</small>
            </div>
            <div className="metric-card">
              <div className="metric-icon green"><TrendingUp size={19} /></div>
              <span>{t("market:forecast.expectedProfit")}</span>
              <strong className={forecast.expectedProfit >= 0 ? "positive" : "negative"}>
                {formatCurrency(Math.abs(forecast.expectedProfit), i18n.language)}
              </strong>
              <small className="muted-text">{t("market:forecast.expectedSub")}</small>
            </div>
            <div className="metric-card">
              <div className="metric-icon purple"><TrendingUp size={19} /></div>
              <span>{t("market:forecast.optimisticProfit")}</span>
              <strong className={forecast.optimisticProfit >= 0 ? "positive" : "negative"}>
                {formatCurrency(Math.abs(forecast.optimisticProfit), i18n.language)}
              </strong>
              <small className="muted-text">{t("market:forecast.optimisticSub")}</small>
            </div>
          </div>

          <div className="panel chart-panel">
            <div className="panel-title">
              <div>
                <span className="eyebrow">{t("market:forecast.cashFlowEyebrow", { season: form.season })}</span>
                <h3>{forecast.crop} · {forecast.plotName}</h3>
              </div>
              <Calendar size={20} className="muted-icon" />
            </div>
            <div className="ff-chart-container">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `₹${Math.abs(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value, i18n.language), ""]} />
                  <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />
                  <Legend />
                  <Line type="monotone" dataKey={t("market:forecast.conservativeProfit")} stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey={t("market:forecast.expectedProfit")} stroke="#247b58" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey={t("market:forecast.optimisticProfit")} stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey={t("market:profit.totalCost")} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <small className="data-source-note">
              {forecast.dataMode === "estimated" ? t("market:forecast.benchmarkNote") : t("market:forecast.liveNote")}
            </small>
          </div>

          <div className="panel ff-assumptions">
            <div className="ff-assumptions-header" onClick={() => setShowAssumptions(!showAssumptions)}>
              <div>
                <span className="eyebrow">{t("market:forecast.modelTransparency")}</span>
                <h3>{t("market:forecast.assumptionsTitle")}</h3>
              </div>
              {showAssumptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
            {showAssumptions && (
              <div className="ff-assumptions-list">
                {forecast.assumptions.map((a, i) => (
                  <div key={i} className="ff-assumption-item">
                    <CircleAlert size={13} />
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {!forecast && !forecastMut.isPending && (
        <div className="feature-empty">
          <TrendingUp size={28} />
          <strong>{t("market:forecast.emptyTitle")}</strong>
          <span>{t("market:forecast.emptyDesc")}</span>
        </div>
      )}
    </div>
  );
}
