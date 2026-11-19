import { useMemo, useState } from "react";
import { CalendarDays, Check, CircleDollarSign, Droplets, Gauge, Leaf, Plus, Sprout, ThermometerSun, TrendingUp, Waves } from "lucide-react";
import { getIrrigationRecommendation } from "@/lib/capstoneLogic";
import { trpc } from "@/lib/trpc";
import CropCycleWizard from "./CropCycleWizard";

const initialTasks = [
  { id: 1, title: "Check tomato moisture sensor", meta: "Today · Plot A", done: false },
  { id: 2, title: "Apply compost around plants", meta: "Tomorrow · 2 bags", done: false },
  { id: 3, title: "Scout for leaf miner", meta: "After rain · Plot A", done: false },
];

const initialExpenses = [
  { label: "Seed & nursery", amount: 8400 },
  { label: "Fertilizer & crop care", amount: 14200 },
  { label: "Labour", amount: 22000 },
];

type Props = {
  soilMoisture: number;
  rainProbability: number;
  temperature: number;
  selectedPlot: string;
  onToast: (message: string) => void;
};

export default function CapstoneWorkspace({ soilMoisture, rainProbability, temperature, selectedPlot, onToast }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [showExpense, setShowExpense] = useState(false);
  const [draft, setDraft] = useState({ label: "", amount: "" });
  const [showCycleForm, setShowCycleForm] = useState(false);
  const [cycleDraft, setCycleDraft] = useState({ plotId: "", crop: "Tomato", sowingDate: "2026-09-01", expectedHarvestDate: "2026-10-29" });
  const plotsQuery = trpc.farm.plots.list.useQuery();
  const readingsQuery = trpc.sensors.readings.useQuery();
  const tasksQuery = trpc.farm.planning.tasks.useQuery();
  const financeQuery = trpc.farm.finance.summary.useQuery();
  const cyclesQuery = trpc.farm.cycles.list.useQuery();
  const marketInput = useMemo(() => ({ commodity: "Tomato" }), []);
  const marketQuery = trpc.market.current.useQuery(marketInput);
  const trpcUtils = trpc.useUtils();
  const createCycleMutation = trpc.farm.cycles.create.useMutation({ onSuccess: () => { void trpcUtils.farm.cycles.list.invalidate(); setShowCycleForm(false); onToast("Crop cycle saved to your calendar."); }, onError: (error) => onToast(error.message) });
  const threshold = selectedPlot.includes("Ragi") ? 38 : 35;
  const persistedReading = readingsQuery.data?.[0];
  const displayedMoisture = persistedReading?.moisture ?? soilMoisture;
  const recommendation = useMemo(() => getIrrigationRecommendation(displayedMoisture, threshold, rainProbability), [displayedMoisture, rainProbability, threshold]);
  const totalCost = expenses.reduce((sum, item) => sum + item.amount, 0);
  const persistedTasks = tasksQuery.data?.length ? tasksQuery.data.map((task) => ({ id: task.id, title: task.title, meta: `${task.status === "completed" ? "Completed" : "Due"} · ${new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`, done: task.status === "completed" })) : tasks;
  const completed = persistedTasks.filter((task) => task.done).length;
  const trackedCost = financeQuery.data ? financeQuery.data.expenses : totalCost;
  const addExpense = () => {
    const amount = Number(draft.amount);
    if (!draft.label.trim() || !amount || amount < 0) return;
    setExpenses((current) => [...current, { label: draft.label.trim(), amount }]);
    setDraft({ label: "", amount: "" });
    setShowExpense(false);
    onToast("Expense added to the farm plan.");
  };
  const createCycle = () => {
    const plotId = Number(cycleDraft.plotId || plotsQuery.data?.[0]?.id);
    if (!plotId) { onToast("Add a plot before creating a crop cycle."); return; }
    createCycleMutation.mutate({ plotId, crop: cycleDraft.crop, sowingDate: cycleDraft.sowingDate, expectedHarvestDate: cycleDraft.expectedHarvestDate });
  };

  return (
    <div className="capstone-workspace">
      <div className="capstone-banner">
        <div><span className="eyebrow light"><span className="live-dot" /> CAPSTONE FIELD LAB</span><h2>Make every field decision measurable.</h2><p>One command center for sensors, water, farm work, and crop economics.</p></div>
        <div className="capstone-banner-mark"><Sprout size={28} /></div>
      </div>
      <div className="capstone-grid capstone-grid-main">
        <section className="panel capstone-cycle-card"><div className="panel-title"><div><span className="eyebrow">PERSISTENT CROP CYCLE</span><h3>Season milestones</h3><p>{cyclesQuery.data?.length ? `${cyclesQuery.data.length} cycle${cyclesQuery.data.length === 1 ? "" : "s"} saved in MySQL` : "Create your first crop cycle"}</p></div><Sprout className="muted-icon" size={21} /></div>{cyclesQuery.data?.length ? <div className="capstone-cycle-row"><span className="sensor-badge tomato">T</span><span><strong>{cyclesQuery.data[0]?.crop}</strong><small>Sowing {new Date(cyclesQuery.data[0]!.sowingDate).toLocaleDateString("en-IN")} · Harvest {new Date(cyclesQuery.data[0]!.expectedHarvestDate).toLocaleDateString("en-IN")}</small></span><b className="sensor-good">{cyclesQuery.data[0]?.scheduleCronTaskUid ? "Scheduled" : "Active"}</b></div> : <p className="capstone-muted-copy">Persist the season dates once, then use the calendar and irrigation scheduler around them.</p>}{showCycleForm ? <CropCycleWizard plots={plotsQuery.data ?? []} draft={cycleDraft} isPending={createCycleMutation.isPending} onChange={setCycleDraft} onCancel={() => setShowCycleForm(false)} onSubmit={createCycle} /> : <button className="secondary-button" onClick={() => setShowCycleForm(true)}>Create crop cycle <Plus size={15} /></button>}</section>
        <section className="panel capstone-market-card"><div className="panel-title"><div><span className="eyebrow">LIVE MANDI FEED</span><h3>Tomato price signal</h3><p>{marketQuery.data?.source === "ceda-agmarknet" ? "CEDA Agmarknet · live provider" : "Demo fallback · add CEDA API key"}</p></div><TrendingUp className="muted-icon" size={21} /></div><div className="capstone-market-list">{(marketQuery.data?.records ?? []).slice(0, 3).map((row) => <div key={row.mandi}><span><strong>{row.mandi}</strong><small>{row.arrivalDate || "Latest available"}</small></span><b>₹{row.modalPrice.toLocaleString("en-IN")}<small>/ quintal</small></b></div>)}</div><button className="panel-link" onClick={() => onToast(marketQuery.data?.configured ? "Market feed refreshed from the configured provider." : "Connect CEDA_AGMARKNET_API_KEY for live mandi prices.")}>Refresh market signal <TrendingUp size={14} /></button></section>
      </div>

      <div className="capstone-grid capstone-grid-four">
        <div className="capstone-stat"><span className="capstone-stat-icon blue"><Gauge size={17} /></span><small>SOIL MOISTURE</small><strong>{displayedMoisture}%</strong><em>{persistedReading ? "Persistent sensor reading" : "Plot A · simulated sensor"}</em></div>
        <div className="capstone-stat"><span className="capstone-stat-icon amber"><ThermometerSun size={17} /></span><small>TEMPERATURE</small><strong>{temperature}°C</strong><em>Local weather station</em></div>
        <div className="capstone-stat"><span className="capstone-stat-icon green"><Waves size={17} /></span><small>WATER SAVED</small><strong>1,240 L</strong><em>18% better this week</em></div>
        <div className="capstone-stat"><span className="capstone-stat-icon purple"><TrendingUp size={17} /></span><small>ESTIMATED PROFIT</small><strong>₹82,400</strong><em>Tomato · current scenario</em></div>
      </div>

      <div className="capstone-grid capstone-grid-main">
        <section className={`panel capstone-recommendation ${recommendation.tone}`}>
          <div className="panel-title"><div><span className="eyebrow">EXPLAINABLE IRRIGATION</span><h3>{recommendation.label}</h3></div><Droplets size={23} /></div>
          <p>{recommendation.detail}</p>
          <div className="capstone-facts"><span>Moisture <strong>{displayedMoisture}%</strong></span><span>Trigger <strong>{threshold}%</strong></span><span>Rain chance <strong>{rainProbability}%</strong></span></div>
          <div className="capstone-actions"><button className="primary-button" onClick={() => onToast(recommendation.tone === "amber" ? "Irrigation task added for Plot A." : "Recommendation saved to your farm plan.")}>{recommendation.tone === "amber" ? "Schedule irrigation" : "Save recommendation"}</button><button className="secondary-button" onClick={() => onToast("Sensor calibration check added.")}>Check sensor</button></div>
        </section>

        <section className="panel capstone-sensor-panel">
          <div className="panel-title"><div><span className="eyebrow">IOT SENSOR NETWORK</span><h3>Plot health at a glance</h3></div><span className="sensor-online"><span className="online-dot" /> 2 online</span></div>
          <div className="capstone-sensor-list"><div className="capstone-sensor-row"><span className="sensor-badge tomato">T</span><span><strong>{plotsQuery.data?.[0]?.name ?? "Plot A · Tomato"}</strong><small>Moisture {displayedMoisture}% · battery {persistedReading?.battery ?? 86}%</small></span><b className="sensor-good">{persistedReading ? "Online" : "Demo"}</b></div><div className="capstone-sensor-row"><span className="sensor-badge ragi">R</span><span><strong>{plotsQuery.data?.[1]?.name ?? "Plot B · Ragi"}</strong><small>Moisture 58% · battery 74%</small></span><b className="sensor-good">Stable</b></div></div>
          <div className="capstone-chart"><span style={{ height: "72%" }} /><span style={{ height: "58%" }} /><span style={{ height: "64%" }} /><span style={{ height: "48%" }} /><span style={{ height: "54%" }} /><span style={{ height: `${Math.max(25, displayedMoisture * 1.1)}%` }} /></div><small className="data-source-note">Last sync just now · {persistedReading ? "database sensor reading" : "simulated sensor mode"}</small>
        </section>
      </div>

      <div className="capstone-grid capstone-grid-main">
        <section className="panel"><div className="panel-title"><div><span className="eyebrow">SEASON PLAN · TOMATO</span><h3>Next field actions</h3><p>{completed} of {persistedTasks.length} actions complete</p></div><CalendarDays className="muted-icon" size={21} /></div><div className="capstone-task-list">{persistedTasks.map((task) => <button className={`capstone-task ${task.done ? "done" : ""}`} key={task.id} onClick={() => setTasks((current) => current.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))}><span className="capstone-task-check">{task.done && <Check size={13} />}</span><span><strong>{task.title}</strong><small>{task.meta}</small></span></button>)}</div><button className="panel-link" onClick={() => { setTasks((current) => [...current, { id: Date.now(), title: "Review crop stage with agronomist", meta: "Added now · Plot A", done: false }]); onToast("New crop task added."); }}><Plus size={14} /> Add crop-cycle task</button></section>

        <section className="panel"><div className="panel-title"><div><span className="eyebrow">CROP ECONOMICS</span><h3>Profit planner</h3><p>Track the cost of this season</p></div><CircleDollarSign className="muted-icon" size={21} /></div><div className="capstone-finance-total"><div><small>TRACKED COST</small><strong>₹{trackedCost.toLocaleString("en-IN")}</strong></div><span className="positive">{financeQuery.data ? `₹${financeQuery.data.profit.toLocaleString("en-IN")} net` : "+8.4% value trend"}</span></div><div className="capstone-expense-list">{expenses.map((expense) => <div key={expense.label}><span>{expense.label}</span><strong>₹{expense.amount.toLocaleString("en-IN")}</strong></div>)}</div>{showExpense ? <div className="capstone-expense-form"><input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="Expense name" /><input value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} inputMode="numeric" placeholder="Amount ₹" /><button className="primary-button" onClick={addExpense}>Add</button></div> : <button className="secondary-button full-width" onClick={() => setShowExpense(true)}>Log an expense <Plus size={15} /></button>}</section>
      </div>

      <div className="capstone-next-step"><Leaf size={18} /><span><strong>Next capstone milestone:</strong> connect a real sensor feed, persist plot data in MySQL, and add agronomist/admin roles on top of this workspace.</span><button onClick={() => onToast("The next milestone is queued for implementation.")}>View roadmap</button></div>
    </div>
  );
}
