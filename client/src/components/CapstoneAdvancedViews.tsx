import { CalendarDays, CheckCircle2, ClipboardList, LockKeyhole, MessageCircle, ShieldCheck, Sprout, TrendingUp, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { formatDate, formatNumber } from "@/i18n";

type View = "Crop calendar" | "Agronomist inbox" | "Admin insights";

export default function CapstoneAdvancedViews({ view, onToast }: { view: View; onToast: (message: string) => void }) {
  if (view === "Crop calendar") return <CropCalendar onToast={onToast} />;
  if (view === "Agronomist inbox") return <AgronomistInbox onToast={onToast} />;
  return <AdminInsights />;
}

function CropCalendar({ onToast }: { onToast: (message: string) => void }) {
  const { t, i18n } = useTranslation(["farm", "common"]);
  const tasksQuery = trpc.farm.planning.tasks.useQuery();
  const cyclesQuery = trpc.farm.cycles.list.useQuery();
  const scheduleMutation = trpc.farm.cycles.scheduleIrrigation.useMutation({ onSuccess: () => { void cyclesQuery.refetch(); onToast(t("farm:cropCalendar.scheduled")); }, onError: (error) => onToast(error.message) });
  const tasks = tasksQuery.data ?? [];
  const grouped = tasks.reduce<Record<string, typeof tasks>>((groups, task) => {
    const date = formatDate(task.dueDate, i18n.language, { weekday: "short", day: "2-digit", month: "short" });
    (groups[date] ??= []).push(task);
    return groups;
  }, {});
  return <div className="advanced-view"><div className="advanced-header"><div className="advanced-icon green"><CalendarDays size={23} /></div><div><span className="eyebrow">{t("farm:cropCalendar.plannerEyebrow")}</span><h2>{t("farm:cropCalendar.plannerTitle")}</h2><p>{t("farm:cropCalendar.plannerSub")}</p></div><span className="advanced-badge"><Sprout size={13} /> {t("common:crops.Tomato")}</span></div><div className="season-progress"><div><span>{t("common:crops.Tomato")}</span><strong>Day 48 / 92</strong></div><div className="season-track"><span style={{ width: "52%" }} /></div><small>{t("common:stages.Flowering")}</small>{cyclesQuery.data?.[0] && <button className="secondary-button schedule-button" disabled={scheduleMutation.isPending || Boolean(cyclesQuery.data[0].scheduleCronTaskUid)} onClick={() => scheduleMutation.mutate({ id: cyclesQuery.data![0]!.id, cron: "0 0 8 * * *" })}>{cyclesQuery.data[0].scheduleCronTaskUid ? t("farm:cropCalendar.scheduled") : scheduleMutation.isPending ? t("common:saving") : t("farm:cropCalendar.scheduleDaily")}</button>}</div><div className="calendar-columns"><div className="calendar-timeline"><div className="timeline-label">{t("farm:cropCalendar.thisWeek")}</div>{Object.keys(grouped).length === 0 ? <div className="advanced-empty"><ClipboardList size={22} /><strong>{t("farm:cropCalendar.noTasksTitle")}</strong><span>{t("farm:cropCalendar.noTasksSub")}</span></div> : Object.entries(grouped).map(([date, dayTasks]) => <div className="calendar-day" key={date}><span className="calendar-date">{date}</span>{dayTasks.map((task) => <div className={`calendar-task ${task.status === "completed" ? "completed" : ""}`} key={task.id}><span className="calendar-check">{task.status === "completed" && <CheckCircle2 size={15} />}</span><span><strong>{task.title}</strong><small>{task.detail || ""}</small></span></div>)}</div>)}</div><div className="calendar-side"><span className="eyebrow">{t("farm:cropCalendar.suggestionsEyebrow")}</span><h3>{t("farm:cropCalendar.suggestionsTitle")}</h3><div className="suggestion"><span className="suggestion-num">01</span><div><strong>Scout after rain</strong><p>Check lower leaves for early blight after tonight's shower.</p></div></div><div className="suggestion"><span className="suggestion-num">02</span><div><strong>Feed before fruiting</strong><p>Review nitrogen and potassium levels before the next growth stage.</p></div></div><div className="suggestion"><span className="suggestion-num">03</span><div><strong>Prepare a harvest buyer</strong><p>Compare mandi rates 10 days before your expected harvest.</p></div></div></div></div></div>;
}

function AgronomistInbox({ onToast }: { onToast: (message: string) => void }) {
  const { t } = useTranslation(["community", "common"]);
  const inboxQuery = trpc.assistant.inbox.useQuery();
  const markRead = trpc.assistant.markRead.useMutation({ onSuccess: () => { void inboxQuery.refetch(); onToast(t("community:inbox.markRead")); } });
  const cases = inboxQuery.data ?? [];
  return <div className="advanced-view"><div className="advanced-header"><div className="advanced-icon purple"><UsersRound size={23} /></div><div><span className="eyebrow">{t("community:inbox.pageEyebrow")}</span><h2>{t("community:inbox.expertTitle")}</h2><p>{t("community:inbox.expertSub")}</p></div><span className="advanced-badge"><MessageCircle size={13} /> {cases.length}</span></div><div className="inbox-layout"><div className="inbox-list">{cases.length === 0 ? <div className="advanced-empty"><MessageCircle size={22} /><strong>{t("community:inbox.emptyTitle")}</strong><span>{t("community:inbox.emptySub")}</span></div> : cases.map((item) => <button className={`inbox-case ${item.readAt ? "read" : "unread"}`} key={item.id} onClick={() => !item.readAt && markRead.mutate({ id: item.id })}><span className="case-avatar"><Sprout size={16} /></span><span><strong>{item.crop || t("common:crop")}</strong><small>{item.aiCondition || t("community:inbox.sentTitle")}</small><em>{item.agronomistReply || t("community:inbox.waitingReply")}</em></span><span className={`case-status ${item.agronomistReply ? "answered" : "waiting"}`}>{item.agronomistReply ? t("community:inbox.answered") : t("common:pending")}</span></button>)}</div><div className="expert-card"><ShieldCheck size={24} /><span className="eyebrow">{t("community:inbox.safetyFirst")}</span><h3>{t("community:inbox.aiNotFinal")}</h3><p>{t("community:inbox.aiNotFinalDesc")}</p><button className="primary-button" onClick={() => onToast(t("community:inbox.startReview"))}>{t("community:inbox.startReview")}</button></div></div></div>;
}

function AdminInsights() {
  const { t, i18n } = useTranslation(["reports"]);
  const summaryQuery = trpc.admin.summary.useQuery();
  if (summaryQuery.isLoading) return <div className="advanced-view"><div className="advanced-empty"><TrendingUp size={22} /><strong>{t("reports:admin.loading")}</strong></div></div>;
  if (summaryQuery.error) return <div className="advanced-view"><div className="advanced-empty restricted"><LockKeyhole size={22} /><strong>{t("reports:admin.restrictedTitle")}</strong><span>{t("reports:admin.restrictedDesc")}</span></div></div>;
  const summary = summaryQuery.data;
  const stats = [
    { label: t("reports:admin.registeredFarmers"), value: summary?.users ?? 0, tone: "green" },
    { label: t("reports:admin.activePlots"), value: summary?.plots ?? 0, tone: "blue" },
    { label: t("reports:admin.sensorReadings"), value: summary?.sensorReadings ?? 0, tone: "purple" },
    { label: t("reports:admin.pendingCases"), value: summary?.reviewRequests ?? 0, tone: "amber" },
  ];
  return <div className="advanced-view"><div className="advanced-header"><div className="advanced-icon blue"><TrendingUp size={23} /></div><div><span className="eyebrow">{t("reports:admin.opsEyebrow")}</span><h2>{t("reports:admin.opsTitle")}</h2><p>{t("reports:admin.opsDesc")}</p></div><span className="advanced-badge"><LockKeyhole size={13} /> {t("reports:admin.adminOnly")}</span></div><div className="admin-stats">{stats.map((stat) => <div className={`admin-stat ${stat.tone}`} key={stat.label}><small>{stat.label}</small><strong>{formatNumber(stat.value, i18n.language)}</strong><span>{t("reports:admin.liveFromDb")}</span></div>)}</div><div className="admin-callout"><ShieldCheck size={19} /><div><strong>{t("reports:admin.privacyTitle")}</strong><p>{t("reports:admin.privacyDesc")}</p></div></div></div>;
}
