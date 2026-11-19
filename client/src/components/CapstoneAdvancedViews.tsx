import { CalendarDays, CheckCircle2, ClipboardList, LockKeyhole, MessageCircle, ShieldCheck, Sprout, TrendingUp, UsersRound } from "lucide-react";
import { trpc } from "@/lib/trpc";

type View = "Crop calendar" | "Agronomist inbox" | "Admin insights";

export default function CapstoneAdvancedViews({ view, onToast }: { view: View; onToast: (message: string) => void }) {
  if (view === "Crop calendar") return <CropCalendar onToast={onToast} />;
  if (view === "Agronomist inbox") return <AgronomistInbox onToast={onToast} />;
  return <AdminInsights />;
}

function CropCalendar({ onToast }: { onToast: (message: string) => void }) {
  const tasksQuery = trpc.farm.planning.tasks.useQuery();
  const cyclesQuery = trpc.farm.cycles.list.useQuery();
  const scheduleMutation = trpc.farm.cycles.scheduleIrrigation.useMutation({ onSuccess: () => { void cyclesQuery.refetch(); onToast("Daily irrigation checks are scheduled for 08:00 UTC."); }, onError: (error) => onToast(error.message) });
  const tasks = tasksQuery.data ?? [];
  const grouped = tasks.reduce<Record<string, typeof tasks>>((groups, task) => {
    const date = new Date(task.dueDate).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });
    (groups[date] ??= []).push(task);
    return groups;
  }, {});
  return <div className="advanced-view"><div className="advanced-header"><div className="advanced-icon green"><CalendarDays size={23} /></div><div><span className="eyebrow">SEASON PLANNER</span><h2>Crop calendar that works around the weather.</h2><p>Tasks, irrigation, scouting, and harvest milestones in one seasonal timeline.</p></div><span className="advanced-badge"><Sprout size={13} /> Tomato · Week 7</span></div><div className="season-progress"><div><span>Tomato crop cycle</span><strong>Day 48 of 92</strong></div><div className="season-track"><span style={{ width: "52%" }} /></div><small>Flowering stage · expected harvest 29 Oct 2026</small>{cyclesQuery.data?.[0] && <button className="secondary-button schedule-button" disabled={scheduleMutation.isPending || Boolean(cyclesQuery.data[0].scheduleCronTaskUid)} onClick={() => scheduleMutation.mutate({ id: cyclesQuery.data![0]!.id, cron: "0 0 8 * * *" })}>{cyclesQuery.data[0].scheduleCronTaskUid ? "Irrigation checks scheduled" : scheduleMutation.isPending ? "Scheduling…" : "Schedule daily irrigation checks"}</button>}</div><div className="calendar-columns"><div className="calendar-timeline"><div className="timeline-label">THIS WEEK</div>{Object.keys(grouped).length === 0 ? <div className="advanced-empty"><ClipboardList size={22} /><strong>No persisted tasks yet</strong><span>Add a task from Field Lab to begin your season plan.</span></div> : Object.entries(grouped).map(([date, dayTasks]) => <div className="calendar-day" key={date}><span className="calendar-date">{date}</span>{dayTasks.map((task) => <div className={`calendar-task ${task.status === "completed" ? "completed" : ""}`} key={task.id}><span className="calendar-check">{task.status === "completed" && <CheckCircle2 size={15} />}</span><span><strong>{task.title}</strong><small>{task.detail || "Field action"}</small></span></div>)}</div>)}</div><div className="calendar-side"><span className="eyebrow">SMART SUGGESTIONS</span><h3>Plan around your crop</h3><div className="suggestion"><span className="suggestion-num">01</span><div><strong>Scout after rain</strong><p>Check lower leaves for early blight after tonight's shower.</p></div></div><div className="suggestion"><span className="suggestion-num">02</span><div><strong>Feed before fruiting</strong><p>Review nitrogen and potassium levels before the next growth stage.</p></div></div><div className="suggestion"><span className="suggestion-num">03</span><div><strong>Prepare a harvest buyer</strong><p>Compare mandi rates 10 days before your expected harvest.</p></div></div></div></div></div>;
}

function AgronomistInbox({ onToast }: { onToast: (message: string) => void }) {
  const inboxQuery = trpc.assistant.inbox.useQuery();
  const markRead = trpc.assistant.markRead.useMutation({ onSuccess: () => { void inboxQuery.refetch(); onToast("Conversation marked as read."); } });
  const cases = inboxQuery.data ?? [];
  return <div className="advanced-view"><div className="advanced-header"><div className="advanced-icon purple"><UsersRound size={23} /></div><div><span className="eyebrow">EXPERT NETWORK</span><h2>Get a second opinion when it matters.</h2><p>Track crop cases sent to agronomists and keep the full context of your farm with every request.</p></div><span className="advanced-badge"><MessageCircle size={13} /> {cases.length} conversations</span></div><div className="inbox-layout"><div className="inbox-list">{cases.length === 0 ? <div className="advanced-empty"><MessageCircle size={22} /><strong>No agronomist replies yet</strong><span>Use crop diagnosis or Ask Rytha AI to open a case.</span></div> : cases.map((item) => <button className={`inbox-case ${item.readAt ? "read" : "unread"}`} key={item.id} onClick={() => !item.readAt && markRead.mutate({ id: item.id })}><span className="case-avatar"><Sprout size={16} /></span><span><strong>{item.crop || "Crop case"}</strong><small>{item.aiCondition || "Manual review requested"}</small><em>{item.agronomistReply || "Waiting for an agronomist response"}</em></span><span className={`case-status ${item.agronomistReply ? "answered" : "waiting"}`}>{item.agronomistReply ? "Answered" : "Waiting"}</span></button>)}</div><div className="expert-card"><ShieldCheck size={24} /><span className="eyebrow">SAFETY FIRST</span><h3>AI is a first check, not a final diagnosis.</h3><p>Every uncertain crop result can be escalated with the photo, confidence score, and field history attached.</p><button className="primary-button" onClick={() => onToast("Open a crop diagnosis to start an expert review.")}>Start a crop review</button></div></div></div>;
}

function AdminInsights() {
  const summaryQuery = trpc.admin.summary.useQuery();
  if (summaryQuery.isLoading) return <div className="advanced-view"><div className="advanced-empty"><TrendingUp size={22} /><strong>Loading platform insights…</strong></div></div>;
  if (summaryQuery.error) return <div className="advanced-view"><div className="advanced-empty restricted"><LockKeyhole size={22} /><strong>Admin access required</strong><span>This dashboard is protected by the server-side role guard.</span></div></div>;
  const summary = summaryQuery.data;
  const stats = [{ label: "Registered farmers", value: summary?.users ?? 0, tone: "green" }, { label: "Active plots", value: summary?.plots ?? 0, tone: "blue" }, { label: "Sensor readings", value: summary?.sensorReadings ?? 0, tone: "purple" }, { label: "Pending expert cases", value: summary?.reviewRequests ?? 0, tone: "amber" }];
  return <div className="advanced-view"><div className="advanced-header"><div className="advanced-icon blue"><TrendingUp size={23} /></div><div><span className="eyebrow">PLATFORM OPERATIONS</span><h2>See how Namma Rytha is helping farms.</h2><p>Aggregated platform signals for administrators, with no farmer data exposed in the client.</p></div><span className="advanced-badge"><LockKeyhole size={13} /> Admin only</span></div><div className="admin-stats">{stats.map((stat) => <div className={`admin-stat ${stat.tone}`} key={stat.label}><small>{stat.label}</small><strong>{stat.value.toLocaleString("en-IN")}</strong><span>Live from database</span></div>)}</div><div className="admin-callout"><ShieldCheck size={19} /><div><strong>Privacy-aware analytics</strong><p>Only aggregate counts are shown here. Ownership checks remain enforced on every farmer-level procedure.</p></div></div></div>;
}
