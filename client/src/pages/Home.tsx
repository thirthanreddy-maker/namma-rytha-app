import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Bug,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  CloudRain,
  CloudSun,
  Droplets,
  FlaskConical,
  Gauge,
  IndianRupee,
  Inbox,
  Languages,
  Layers,
  Leaf,
  LogIn,
  Megaphone,
  MapPin,
  MessageCircle,
  Menu,
  Microscope,
  MoreHorizontal,
  Plus,
  Radio,
  Recycle,
  RefreshCw,
  Satellite,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sprout,
  ThermometerSun,
  TrendingUp,
  Upload,
  UsersRound,
  UserRound,
  Volume2,
  WalletCards,
  Wheat,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast as sonnerToast } from "sonner";
import { useTranslation } from "react-i18next";
import { changeAppLanguage, formatCurrency, formatDate, LANG_CODE_TO_NAME, normalizeLangCode, type AppLangName } from "@/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { MapView } from "@/components/Map";
import ThemeToggle from "@/components/ThemeToggle";
import CapstoneWorkspace from "@/components/CapstoneWorkspace";
import CapstoneAdvancedViews from "@/components/CapstoneAdvancedViews";
import FarmerProfile from "@/components/FarmerProfile";
import CommunityWorkspace from "@/components/CommunityWorkspace";
import AnnouncementsWorkspace from "@/components/AnnouncementsWorkspace";
import DigitalTwinWorkspace from "@/components/features/DigitalTwinWorkspace";
import DiseaseRiskWorkspace from "@/components/features/DiseaseRiskWorkspace";
import WaterBudgetPlanner from "@/components/features/WaterBudgetPlanner";
import MandiNegotiationWorkspace from "@/components/features/MandiNegotiationWorkspace";
import CropProfitSimulator from "@/components/features/CropProfitSimulator";
import SatelliteHealthWorkspace from "@/components/features/SatelliteHealthWorkspace";
import WasteExchangeWorkspace from "@/components/features/WasteExchangeWorkspace";
import LocalIntelligenceWorkspace from "@/components/features/LocalIntelligenceWorkspace";
import CropFailureWorkspace from "@/components/features/CropFailureWorkspace";
import FarmMemoryWorkspace from "@/components/features/FarmMemoryWorkspace";
import CropRotationWorkspace from "@/components/features/CropRotationWorkspace";
import CooperativeWorkspace from "@/components/features/CooperativeWorkspace";
import TraceabilityWorkspace from "@/components/features/TraceabilityWorkspace";
import FinancialForecastWorkspace from "@/components/features/FinancialForecastWorkspace";
import SensorDashboard from "@/components/features/SensorDashboard";

declare global {
  interface Window {
    SpeechRecognition?: new () => { lang: string; interimResults: boolean; continuous: boolean; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
    webkitSpeechRecognition?: Window["SpeechRecognition"];
  }
}

const navItems = [
  { label: "Overview", icon: Activity },
  { label: "Digital Twin", icon: Layers },
  { label: "My Farm", icon: Sprout },
  { label: "Satellite health", icon: Satellite },
  { label: "Irrigation", icon: Droplets },
  { label: "IoT sensors", icon: Radio },
  { label: "Soil health", icon: FlaskConical },
  { label: "Diagnose crop", icon: ScanLine },
  { label: "Crop rotation", icon: RefreshCw },
  { label: "Failure analysis", icon: Microscope },
  { label: "Market rates", icon: TrendingUp },
  { label: "Profit planner", icon: WalletCards },
  { label: "Financial forecast", icon: IndianRupee },
  { label: "Farm memory", icon: BookOpen },
  { label: "Cooperatives", icon: UsersRound },
  { label: "Traceability", icon: ScanLine },
  { label: "Waste exchange", icon: Recycle },
  { label: "Local alerts", icon: Radio },
  { label: "Announcements", icon: Megaphone },
  { label: "Community", icon: MessageCircle },
  { label: "Field lab", icon: Sprout },
  { label: "Crop calendar", icon: CalendarDays },
  { label: "Agronomist inbox", icon: UsersRound },
  { label: "Admin insights", icon: BarChart3 },
  { label: "Analytics", icon: BarChart3 },
  { label: "Notifications", icon: Bell },
  { label: "Profile", icon: UserRound },
];

const copy = {
  English: {
    greeting: "Good morning, Ravi",
    subtitle: "Here’s what your farm needs today.",
    today: "Tuesday, 15 September 2026",
    overview: "Overview",
    weather: "Weather today",
    advisory: "Farm advisory",
    irrigate: "Irrigation",
    soil: "Soil health",
    diagnosis: "Crop diagnosis",
    market: "Market rates",
    profit: "Profit estimate",
    viewDetails: "View details",
    useVoice: "Listen to advice",
  },
  Kannada: {
    greeting: "ಶುಭೋದಯ, ರವಿ",
    subtitle: "ಇಂದು ನಿಮ್ಮ ಹೊಲಕ್ಕೆ ಬೇಕಾದ ಕೆಲಸಗಳು ಇಲ್ಲಿವೆ.",
    today: "ಮಂಗಳವಾರ, 15 ಸೆಪ್ಟೆಂಬರ್ 2026",
    overview: "ಅವಲೋಕನ",
    weather: "ಇಂದಿನ ಹವಾಮಾನ",
    advisory: "ಕೃಷಿ ಸಲಹೆ",
    irrigate: "ನೀರಾವರಿ",
    soil: "ಮಣ್ಣಿನ ಆರೋಗ್ಯ",
    diagnosis: "ಬೆಳೆ ರೋಗ ಪರೀಕ್ಷೆ",
    market: "ಮಾರುಕಟ್ಟೆ ದರ",
    profit: "ಲಾಭದ ಅಂದಾಜು",
    viewDetails: "ವಿವರಗಳನ್ನು ನೋಡಿ",
    useVoice: "ಸಲಹೆ ಕೇಳಿ",
  },
  Hindi: {
    greeting: "सुप्रभात, रवि",
    subtitle: "आज आपके खेत के लिए जरूरी काम यहाँ हैं।",
    today: "मंगलवार, 15 सितंबर 2026",
    overview: "अवलोकन",
    weather: "आज का मौसम",
    advisory: "खेत की सलाह",
    irrigate: "सिंचाई",
    soil: "मिट्टी का स्वास्थ्य",
    diagnosis: "फसल जांच",
    market: "मंडी भाव",
    profit: "लाभ का अनुमान",
    viewDetails: "विवरण देखें",
    useVoice: "सलाह सुनें",
  },
};

type Language = keyof typeof copy;
type AssistantLanguage = Language | "Hindi" | "Telugu" | "Tamil";
type ViewName = (typeof navItems)[number]["label"];
const SCROLL_STORAGE_KEY = "namma-rytha-dashboard-scroll";

const marketRows = [
  { crop: "Tomato", mandi: "Kolar APMC", price: "₹2,840", change: "+8.4%", trend: "up", distance: "18 km" },
  { crop: "Tomato", mandi: "Bengaluru APMC", price: "₹2,610", change: "+4.1%", trend: "up", distance: "52 km" },
  { crop: "Tomato", mandi: "Chikkaballapur", price: "₹2,480", change: "−1.6%", trend: "down", distance: "31 km" },
];

const initialTasks = [
  { title: "Irrigate tomato plot", detail: "Before 6:00 PM · 35 min", icon: Droplets, tone: "blue", done: false },
  { title: "Apply compost around plants", detail: "Due today · 2 bags", icon: Leaf, tone: "green", done: false },
  { title: "Scout for leaf miner", detail: "Suggested after rain", icon: Bug, tone: "amber", done: false },
];
const plotOptions = ["Plot A · Tomato", "Plot B · Ragi"];
const cropStages = ["Seedling", "Flowering", "Fruiting", "Tillering"] as const;
type CropName = "Tomato" | "Ragi";
type CropStage = (typeof cropStages)[number];
type Thresholds = Record<CropName, Record<CropStage, number>>;
const defaultThresholds: Thresholds = { Tomato: { Seedling: 38, Flowering: 35, Fruiting: 40, Tillering: 35 }, Ragi: { Seedling: 35, Flowering: 40, Fruiting: 42, Tillering: 38 } };
const thresholdPresets: Array<{ name: string; crop: CropName; summary: string; values: Record<CropStage, number> }> = [
  { name: "Tomato · balanced", crop: "Tomato", summary: "Recommended for flowering and fruiting in loamy soil", values: { Seedling: 38, Flowering: 35, Fruiting: 40, Tillering: 35 } },
  { name: "Ragi · rainfed", crop: "Ragi", summary: "Conservative profile for rainfed plots", values: { Seedling: 35, Flowering: 40, Fruiting: 42, Tillering: 38 } },
];
const farmOverlays = {
  weather: { label: "Weather", color: "#5b9bb5", detail: "28° · 40% rain" },
  irrigation: { label: "Irrigation", color: "#3f91b3", detail: "46% soil moisture" },
  soil: { label: "Soil sensors", color: "#a97219", detail: "72 / 100 health" },
} as const;
type OverlayName = keyof typeof farmOverlays;

export default function Home() {
  const { user } = useAuth();
  const { t: tr, i18n } = useTranslation([
    "common",
    "navigation",
    "dashboard",
    "farm",
    "crop",
    "irrigation",
    "market",
    "community",
    "reports",
    "settings",
    "notifications",
    "validation",
  ]);
  const currentLangName: AppLangName = LANG_CODE_TO_NAME[normalizeLangCode(i18n.language)];
  const [activeView, setActiveView] = useState<ViewName>("Overview");
  const scrollPositions = useRef<Partial<Record<ViewName, number>>>({});
  const sidebarTouchStartX = useRef<number | null>(null);
  const edgeTouchStart = useRef<{ x: number; y: number } | null>(null);
  const language: Language = currentLangName === "Kannada" || currentLangName === "Hindi" ? currentLangName : "English";
  const setLanguage = (next: string) => { void changeAppLanguage(next); };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("welcome") !== "1") return;
    sonnerToast.success(`Welcome${user?.name ? `, ${user.name}` : ""}!`, { description: "Your farm workspace is ready for today." });
    try { sessionStorage.removeItem("namma-rytha-oauth-attempts"); sessionStorage.removeItem("namma-rytha-oauth-pending"); } catch {}
    url.searchParams.delete("welcome");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [user?.name]);
  const [showPlotModal, setShowPlotModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantLanguage, setAssistantLanguage] = useState<AssistantLanguage>(currentLangName);
  useEffect(() => {
    setAssistantLanguage(currentLangName);
  }, [currentLangName]);
  const [assistantMessages, setAssistantMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [showPrintReport, setShowPrintReport] = useState(false);
  const [toast, setToast] = useState("");
  const [tasks, setTasks] = useState<typeof initialTasks>(() => {
    try {
      const saved = localStorage.getItem("namma-rytha-tasks");
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialTasks;
    } catch {
      return initialTasks;
    }
  });
  const [customTask, setCustomTask] = useState({ title: "", detail: "" });
  const [expenses, setExpenses] = useState<Array<{ label: string; amount: number }>>(() => {
    try {
      const saved = localStorage.getItem("namma-rytha-expenses");
      return saved ? JSON.parse(saved) : [{ label: "Seed & nursery", amount: 8400 }, { label: "Fertilizer & crop care", amount: 14200 }, { label: "Labour", amount: 22000 }, { label: "Water & transport", amount: 20000 }];
    } catch {
      return [{ label: "Seed & nursery", amount: 8400 }, { label: "Fertilizer & crop care", amount: 14200 }, { label: "Labour", amount: 22000 }, { label: "Water & transport", amount: 20000 }];
    }
  });
  const [expenseDraft, setExpenseDraft] = useState({ label: "", amount: "" });
  const [diagnosisSubmitted, setDiagnosisSubmitted] = useState(false);
  const [plotName, setPlotName] = useState("");
  const [diagnosisImage, setDiagnosisImage] = useState("");
  const [diagnosisVisualHints, setDiagnosisVisualHints] = useState<{ greenPct: number; yellowPct: number; brownSpotPct: number } | undefined>(undefined);
  const [selectedPlot, setSelectedPlot] = useState(plotOptions[0]);
  const [liveLocation, setLiveLocation] = useState({ lat: 13.135, lng: 78.132 });
  const mapRef = useRef<google.maps.Map | null>(null);
  const locationMarker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const overlayMarkers = useRef<Record<OverlayName, google.maps.marker.AdvancedMarkerElement[]>>({ weather: [], irrigation: [], soil: [] });
  const overlayCircles = useRef<Record<OverlayName, google.maps.Circle[]>>({ weather: [], irrigation: [], soil: [] });
  const moistureHeatmap = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const [overlayVisibility, setOverlayVisibility] = useState<Record<OverlayName, boolean>>({ weather: true, irrigation: true, soil: true });
  const [mapCropFilter, setMapCropFilter] = useState<"All crops" | CropName>("All crops");
  const [sensorTooltip, setSensorTooltip] = useState<null | { crop: CropName; plot: string; moisture: number; temperature: number; health: number; updated: string; trend: number[] }>(null);
  const [settingsCrop, setSettingsCrop] = useState<CropName>("Tomato");
  const [settingsStage, setSettingsStage] = useState<CropStage>("Flowering");
  const [thresholds, setThresholds] = useState<Thresholds>(() => { try { return JSON.parse(localStorage.getItem("namma-rytha-thresholds") || "null") || defaultThresholds; } catch { return defaultThresholds; } });
  const [diagnosisResult, setDiagnosisResult] = useState<null | {
    likelyCondition: string;
    category: string;
    confidence: number;
    severity: string;
    explanation: string;
    immediateActions: string[];
    preventionSteps: string[];
    needsAgronomist: boolean;
    safetyNote: string;
    disclaimer: string;
    imageKey: string;
    plotName: string;
    crop: string;
  }>(null);
  const [analysisStatus, setAnalysisStatus] = useState("Ready to analyze");
  const [reviewRequested, setReviewRequested] = useState(false);
  const trpcUtils = trpc.useUtils();
  const [plotCrop, setPlotCrop] = useState("Tomato");
  const [plotArea, setPlotArea] = useState("1");
  const [notificationPhone, setNotificationPhone] = useState("");
  const [notificationChannel, setNotificationChannel] = useState<"in_app" | "sms" | "whatsapp">("in_app");
  const [profileName, setProfileName] = useState("Ravi Kumar");
  const [profileLocation, setProfileLocation] = useState("Kolar district, Karnataka");
  const [profileLanguage, setProfileLanguage] = useState<AppLangName>("English");
  useEffect(() => {
    if (!user || activeView !== "Profile") return;
    setProfileName(user.name ?? "Farmer");
    setProfileLocation(user.farmLocation ?? "Kolar district, Karnataka");
    setProfileLanguage(LANG_CODE_TO_NAME[normalizeLangCode(user.preferredLanguage)]);
    setNotificationPhone(user.phoneNumber ?? "");
    setNotificationChannel(user.notificationChannel ?? "in_app");
  }, [user, activeView]);
  const createPlotMutation = trpc.farm.plots.create.useMutation({ onSuccess: (plot) => { void trpcUtils.farm.plots.list.invalidate(); void trpcUtils.digitalTwin.overview.invalidate(); void trpcUtils.irrigationIntel.budgetPlan.invalidate(); void trpcUtils.satellite.insights.invalidate(); setShowPlotModal(false); if (plot.ingestToken) void navigator.clipboard?.writeText(plot.ingestToken); notify(`${plotName || "New plot"} saved. Device token copied for sensor setup.`); setPlotName(""); setPlotCrop("Tomato"); setPlotArea("1"); }, onError: (error) => notify(error.message) });
  const notificationPreferencesMutation = trpc.farm.notifications.preferences.useMutation({ onSuccess: () => { void trpcUtils.auth.me.invalidate(); notify("Notification preferences saved."); }, onError: (error) => notify(error.message) });
  const notificationTestMutation = trpc.farm.notifications.test.useMutation({ onSuccess: (result) => notify(result.message), onError: (error) => notify(error.message) });
  const profileMutation = trpc.auth.profile.useMutation({ onSuccess: (updatedUser) => { trpcUtils.auth.me.setData(undefined, updatedUser); void changeAppLanguage(updatedUser.preferredLanguage); notify(tr("notifications:toasts.profileSaved")); }, onError: (error) => notify(error.message) });
  const avatarMutation = trpc.auth.avatar.useMutation({ onSuccess: (updatedUser) => { trpcUtils.auth.me.setData(undefined, updatedUser); notify("Profile photo updated."); }, onError: (error) => notify(error.message) });
  const alertHistoryQuery = trpc.auth.alertHistory.useQuery(undefined, { enabled: activeView === "Profile" && Boolean(user), refetchOnWindowFocus: false });
  const signInHistoryQuery = trpc.auth.signInHistory.useQuery(undefined, { enabled: activeView === "Profile" && Boolean(user), refetchOnWindowFocus: false });
  const alertRetryMutation = trpc.auth.alertRetry.useMutation({ onSuccess: (result) => { void alertHistoryQuery.refetch(); notify(result.message); }, onError: (error) => { void alertHistoryQuery.refetch(); notify(error.message); } });
  useEffect(() => {
    if (!user || activeView !== "Profile") return;
    setProfileName(user.name ?? "Ravi Kumar");
    setProfileLocation(user.farmLocation ?? "Kolar district, Karnataka");
    setProfileLanguage(user.preferredLanguage === "Kannada" || user.preferredLanguage === "Hindi" ? user.preferredLanguage : "English");
    setNotificationPhone(user.phoneNumber ?? "");
    setNotificationChannel(user.notificationChannel ?? "in_app");
  }, [user, activeView]);
  const diagnosisMutation = trpc.crop.diagnose.useMutation({
    onMutate: () => {
      setAnalysisStatus("Uploading and securing your photo...");
      setReviewRequested(false);
    },
    onSuccess: (result) => {
      setDiagnosisResult(result);
      setDiagnosisSubmitted(true);
      setAnalysisStatus("Analysis complete");
      void trpcUtils.crop.history.invalidate();
      notify("AI crop check complete. Review the confidence and safety notes.");
    },
    onError: (error) => {
      setAnalysisStatus("We could not complete the analysis");
      notify(error.message);
    },
  });
  const reviewMutation = trpc.crop.requestReview.useMutation({
    onSuccess: (result) => {
      setReviewRequested(true);
      notify(result.message);
    },
    onError: (error) => notify(error.message),
  });
  const historyInput = useMemo(() => ({ plotName: selectedPlot }), [selectedPlot]);
  const historyQuery = trpc.crop.history.useQuery(historyInput);
  const weatherInput = useMemo(() => ({ lat: liveLocation.lat, lng: liveLocation.lng }), [liveLocation.lat, liveLocation.lng]);
  const weatherQuery = trpc.weather.current.useQuery(weatherInput, { refetchInterval: 5 * 60 * 1000 });
  const sensorHistoryQuery = trpc.sensors.moistureHistory.useQuery(weatherInput, { refetchInterval: 5 * 60 * 1000 });
  const plotsQuery = trpc.farm.plots.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const farmTodayQuery = trpc.dashboard.farmToday.useQuery(undefined, { refetchOnWindowFocus: false });
  const markTodayDoneMut = trpc.dashboard.markActionDone.useMutation({
    onSuccess: () => {
      void trpcUtils.dashboard.farmToday.invalidate();
      void trpcUtils.farm.planning.tasks.invalidate();
      notify("Action marked complete.");
    },
    onError: (error) => notify(error.message),
  });
  const farmerDisplayName = user?.name?.trim() || "Farmer";
  const farmerInitial = farmerDisplayName.charAt(0).toUpperCase();
  const farmerLocationDisplay = user?.farmLocation?.trim() || "Kolar district, Karnataka";
  const totalAcresDisplay = useMemo(() => {
    const list = plotsQuery.data ?? [];
    if (list.length === 0) return "2.4 acres";
    const sum = list.reduce((acc, p) => acc + Number(p.areaAcres || 0), 0);
    return `${Number(sum.toFixed(1))} acres · ${list.length} plot${list.length === 1 ? "" : "s"}`;
  }, [plotsQuery.data]);
  const todayFormatted = useMemo(
    () => formatDate(new Date(), i18n.language, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    [i18n.language],
  );
  const inboxQuery = trpc.assistant.inbox.useQuery();
  const markInboxReadMutation = trpc.assistant.markRead.useMutation({ onSuccess: () => void trpcUtils.assistant.inbox.invalidate() });
  const unreadInbox = Array.isArray(inboxQuery.data) ? inboxQuery.data.filter((item) => item.agronomistReply && !item.readAt).length : 0;
  const soilMoisture = selectedPlot === plotOptions[0] ? 46 : 58;
  const selectedCrop: CropName = selectedPlot.includes("Ragi") ? "Ragi" : "Tomato";
  const selectedStage: CropStage = selectedCrop === "Tomato" ? "Flowering" : "Tillering";
  const moistureThreshold = thresholds[selectedCrop][selectedStage];
  const targetMoisture = moistureThreshold + 15;
  const rainProbability = weatherQuery.data?.rainProbability ?? 40;
  const irrigationRecommendation = soilMoisture < moistureThreshold
    ? rainProbability >= 50 ? { status: "WAIT FOR RAIN", tone: "blue", title: "Rain may cover your irrigation", detail: `${soilMoisture}% moisture · ${rainProbability}% rain chance. Recheck the plot after the rain window.` } : { status: "IRRIGATE SOON", tone: "amber", title: "Irrigate this plot within 4 hours", detail: `${soilMoisture}% moisture is below your ${moistureThreshold}% threshold. Apply a short cycle and recheck tomorrow.` }
    : soilMoisture < targetMoisture && rainProbability >= 50 ? { status: "DELAY IRRIGATION", tone: "blue", title: "Hold irrigation for now", detail: `${soilMoisture}% moisture is adequate and rain chance is ${rainProbability}%. Save water and reassess after the forecast window.` }
    : { status: "MOISTURE OK", tone: "green", title: "No irrigation needed yet", detail: `${soilMoisture}% moisture is within the ${moistureThreshold}–${targetMoisture}% target range. Keep monitoring the plot sensor.` };
  const assistantMutation = trpc.assistant.ask.useMutation({ onSuccess: (result) => setAssistantMessages((current) => [...current, { role: "assistant", text: result.answer }]), onError: (error) => setAssistantMessages((current) => [...current, { role: "assistant", text: error.message }]) });
  const audioMutation = trpc.assistant.transcribeAudio.useMutation();
  const escalateMutation = trpc.assistant.escalate.useMutation({ onSuccess: (result) => setAssistantMessages((current) => [...current, { role: "assistant", text: result.message }]), onError: (error) => setAssistantMessages((current) => [...current, { role: "assistant", text: error.message }]) });
  const askAssistant = (question: string) => { const trimmed = question.trim(); if (!trimmed || assistantMutation.isPending) return; setAssistantMessages((current) => [...current, { role: "user", text: trimmed }]); assistantMutation.mutate({ question: trimmed, language: assistantLanguage, crop: selectedCrop, stage: selectedStage, soilMoisture, threshold: moistureThreshold, recommendation: irrigationRecommendation.detail, temperature: weatherQuery.data?.temperature ?? 28, rainProbability }); };
  const escalateAssistant = (question: string) => { if (!question.trim() || escalateMutation.isPending) return; escalateMutation.mutate({ question: question.trim(), crop: selectedCrop, language: assistantLanguage }); };
  const submitInboxRequest = (question: string, crop: string, imageDataUrl?: string) => { escalateMutation.mutate({ question, crop, language: assistantLanguage, imageDataUrl }); void inboxQuery.refetch(); };
  const transcribeAudio = async (audioDataUrl: string) => { const result = await audioMutation.mutateAsync({ audioDataUrl, language: assistantLanguage }); return result.text; };

  useEffect(() => {
    if (!diagnosisMutation.isPending) return;
    const statuses = ["Uploading and securing your photo...", "Checking leaf shape and visible symptoms...", "Comparing against crop health patterns...", "Preparing simple next steps..."];
    let index = 0;
    setAnalysisStatus(statuses[index]);
    const timer = window.setInterval(() => {
      index = (index + 1) % statuses.length;
      setAnalysisStatus(statuses[index]);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [diagnosisMutation.isPending]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => setLiveLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => notify("Location access is unavailable. Showing your saved farm area."),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 12_000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (locationMarker.current) locationMarker.current.position = liveLocation;
  }, [liveLocation]);

  useEffect(() => {
    localStorage.setItem("namma-rytha-thresholds", JSON.stringify(thresholds));
  }, [thresholds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    (Object.keys(farmOverlays) as OverlayName[]).forEach((name) => {
      overlayMarkers.current[name].forEach((marker, index) => { const cropMatches = name === "weather" || mapCropFilter === "All crops" || (mapCropFilter === "Tomato" ? index === 0 : index === 1); marker.map = overlayVisibility[name] && cropMatches ? map : null; });
      overlayCircles.current[name].forEach((circle, index) => { const cropMatches = name === "weather" || mapCropFilter === "All crops" || (mapCropFilter === "Tomato" ? index === 0 : index === 1); circle.setMap(overlayVisibility[name] && cropMatches ? map : null); });
    });
    if (moistureHeatmap.current && "setMap" in moistureHeatmap.current) {
      (moistureHeatmap.current as unknown as { setMap: (m: google.maps.Map | null) => void }).setMap(overlayVisibility.soil ? map : null);
    }
  }, [overlayVisibility, mapCropFilter]);

  const setupMapOverlays = (map: google.maps.Map) => {
    if (!window.google?.maps) return;
    const points: Record<OverlayName, Array<{ lat: number; lng: number; title: string; radius: number }>> = {
      weather: [{ lat: liveLocation.lat + 0.003, lng: liveLocation.lng + 0.002, title: `Weather station · ${weatherQuery.data?.temperature ?? 28}° · ${rainProbability}% rain`, radius: 420 }],
      irrigation: [{ lat: liveLocation.lat + 0.001, lng: liveLocation.lng - 0.002, title: "Plot A irrigation · soil moisture 46%", radius: 105 }, { lat: liveLocation.lat - 0.0015, lng: liveLocation.lng + 0.0015, title: "Plot B irrigation · soil moisture 58%", radius: 90 }],
      soil: [{ lat: liveLocation.lat - 0.002, lng: liveLocation.lng - 0.001, title: "Plot A soil sensor · health 72/100", radius: 125 }, { lat: liveLocation.lat - 0.0025, lng: liveLocation.lng + 0.002, title: "Plot B soil sensor · health 74/100", radius: 105 }],
    };
    (Object.keys(points) as OverlayName[]).forEach((name) => {
      const color = farmOverlays[name].color;
      overlayMarkers.current[name] = points[name].map((point, index) => { const marker = new google.maps.marker.AdvancedMarkerElement({ map, position: point, title: point.title }); if (name === "soil") google.maps.event.addListener(marker, "click", () => { const plot = index === 0 ? "Plot A · Tomato" : "Plot B · Ragi"; const live = sensorHistoryQuery.data?.plots[plot]; setSensorTooltip({ crop: index === 0 ? "Tomato" : "Ragi", plot, moisture: live?.moisture ?? (index === 0 ? 46 : 58), temperature: weatherQuery.data?.temperature ?? 28, health: index === 0 ? 72 : 74, updated: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), trend: live?.values ?? (index === 0 ? [58, 53, 55, 49, 46, 50, 46] : [62, 60, 57, 55, 58, 56, 58]) }); }); return marker; });
      overlayCircles.current[name] = points[name].map((point) => new google.maps.Circle({ map, center: point, radius: point.radius, fillColor: color, fillOpacity: name === "weather" ? 0.08 : 0.15, strokeColor: color, strokeOpacity: 0.55, strokeWeight: 1.5 }));
    });
    const HeatmapCtor = google.maps.visualization?.HeatmapLayer as unknown as (new (opts: Record<string, unknown>) => google.maps.visualization.HeatmapLayer) | undefined;
    if (HeatmapCtor) {
      moistureHeatmap.current = new HeatmapCtor({ map, data: points.soil.map((point, index) => ({ location: new google.maps.LatLng(point.lat, point.lng), weight: index === 0 ? 0.46 : 0.58 })), radius: 55, opacity: 0.72, gradient: ["rgba(0, 0, 255, 0)", "#2e86ab", "#58b7a0", "#f2c14e", "#e4572e"] });
    }
  };

  const t = copy[language];
  const completedTasks = useMemo(() => tasks.filter((task) => task.done).length, [tasks]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const speakAdvice = () => {
    const advice = irrigationRecommendation.status === "IRRIGATE SOON" ? "Your tomato plot is dry. Irrigate within four hours and check the soil tomorrow." : irrigationRecommendation.status === "WAIT FOR RAIN" ? "Rain is likely. Hold irrigation and check the plot after the rain." : "Your soil moisture is healthy. No irrigation is needed yet.";
    if (!window.speechSynthesis) { notify("Voice playback is not supported in this browser."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(advice);
    utterance.lang = language === "Kannada" ? "kn-IN" : language === "Hindi" ? "hi-IN" : "en-IN";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
    notify("Reading your farm advice aloud.");
  };

  const goTo = (view: ViewName) => {
    scrollPositions.current[activeView] = window.scrollY;
    try { sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(scrollPositions.current)); } catch { /* Storage can be unavailable in private browsing. */ }
    setActiveView(view);
    setSidebarOpen(false);
  };

  const resetScrollPositions = () => {
    scrollPositions.current = {};
    try { sessionStorage.removeItem(SCROLL_STORAGE_KEY); } catch { /* Ignore unavailable storage. */ }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    notify("Saved section positions reset.");
  };

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (saved) scrollPositions.current = JSON.parse(saved) as Partial<Record<ViewName, number>>;
    } catch { /* Ignore malformed or unavailable session storage. */ }
  }, []);

  useEffect(() => {
    const position = scrollPositions.current[activeView] ?? 0;
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top: position, left: 0, behavior: "auto" }));
    const persistCurrentPosition = () => {
      scrollPositions.current[activeView] = window.scrollY;
      try { sessionStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(scrollPositions.current)); } catch { /* Ignore unavailable storage. */ }
    };
    window.addEventListener("scroll", persistCurrentPosition, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      persistCurrentPosition();
      window.removeEventListener("scroll", persistCurrentPosition);
    };
  }, [activeView]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [sidebarOpen]);

  const handleSidebarTouchStart = (event: TouchEvent<HTMLElement>) => {
    sidebarTouchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const handleSidebarTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const startX = sidebarTouchStartX.current;
    const endX = event.changedTouches[0]?.clientX ?? startX;
    sidebarTouchStartX.current = null;
    if (startX !== null && endX !== undefined && startX - endX > 60) setSidebarOpen(false);
  };

  const handleShellTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (sidebarOpen || window.innerWidth > 960) { edgeTouchStart.current = null; return; }
    const touch = event.touches[0];
    edgeTouchStart.current = touch && touch.clientX <= 28 ? { x: touch.clientX, y: touch.clientY } : null;
  };
  const handleShellTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = edgeTouchStart.current;
    edgeTouchStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch || sidebarOpen || window.innerWidth > 960) return;
    const deltaX = touch.clientX - start.x;
    const deltaY = Math.abs(touch.clientY - start.y);
    if (deltaX > 60 && deltaX > deltaY) setSidebarOpen(true);
  };

  const toggleTask = (index: number) => {
    setTasks((current: any[]) => {
      const updated = current.map((task, i) => (i === index ? { ...task, done: !task.done } : task));
      try { localStorage.setItem("namma-rytha-tasks", JSON.stringify(updated)); } catch {}
      return updated;
    });
  };
  const addTask = () => {
    if (!customTask.title.trim()) return;
    setTasks((current: any[]) => {
      const updated = [...current, { title: customTask.title.trim(), detail: customTask.detail.trim() || "Added to your farm plan", icon: CalendarDays, tone: "purple", done: false }];
      try { localStorage.setItem("namma-rytha-tasks", JSON.stringify(updated)); } catch {}
      return updated;
    });
    setCustomTask({ title: "", detail: "" });
    setShowTaskModal(false);
    notify("Task added to your farm plan.");
  };
  const addExpense = () => {
    const amount = Number(expenseDraft.amount);
    if (!expenseDraft.label.trim() || !amount) return;
    setExpenses((current) => {
      const updated = [...current, { label: expenseDraft.label.trim(), amount }];
      try { localStorage.setItem("namma-rytha-expenses", JSON.stringify(updated)); } catch {}
      return updated;
    });
    setExpenseDraft({ label: "", amount: "" });
    setShowExpenseModal(false);
    notify("Expense added to your profit plan.");
  };

  const renderOverview = () => (
    <>
      <section className="hero-grid">
        <div className="hero-card">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-content">
            <div className="eyebrow light"><span className="live-dot" /> {tr("dashboard:hero.pulseLive")}</div>
            <h1>{tr("dashboard:hero.greeting", { name: farmerDisplayName })}</h1>
            <p>{tr("dashboard:hero.subtitle")}</p>
            <div className="hero-meta"><MapPin size={15} /> {farmerLocationDisplay} · {totalAcresDisplay} <span className="meta-divider" /> {todayFormatted}</div>
            <button className="hero-button" onClick={speakAdvice}><Volume2 size={16} /> {tr("dashboard:hero.listenAdvice")}</button>
          </div>
          <div className="hero-weather">
            <CloudSun size={43} strokeWidth={1.6} />
            <strong>{weatherQuery.data?.temperature ?? 28}°</strong>
            <span>{rainProbability >= 50 ? tr("dashboard:hero.rainExpected") : tr("dashboard:hero.partlyCloudy")}</span>
            <small>{tr("dashboard:hero.rainHumidity", { rain: rainProbability, humidity: weatherQuery.data?.humidity ?? 68 })}</small>
          </div>
        </div>
        <div className="priority-card">
          <div className="card-heading"><div><span className="eyebrow">{tr("dashboard:hero.attentionNeeded")}</span><h3>{tr("dashboard:hero.protectCropTitle")}</h3></div><CircleAlert className="alert-icon" size={23} /></div>
          <p>{tr("dashboard:hero.protectCropBody")}</p>
          <div className="priority-footer"><span><Clock3 size={14} /> {tr("dashboard:hero.recommendedBy")}</span><button onClick={() => goTo("Diagnose crop")}>{tr("dashboard:hero.inspectCrop")} <ChevronRight size={15} /></button></div>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard icon={Droplets} label={tr("dashboard:metrics.waterSaved")} value="1,240 L" note={tr("dashboard:metrics.waterSavedNote")} trend="up" tone="blue" />
        <MetricCard icon={IndianRupee} label={tr("dashboard:metrics.expectedValue")} value="₹1.84L" note={tr("dashboard:metrics.expectedValueNote")} trend="up" tone="green" />
        <MetricCard icon={Gauge} label={tr("dashboard:metrics.soilScore")} value="72 / 100" note={tr("dashboard:metrics.soilScoreNote")} trend="neutral" tone="amber" />
        <MetricCard icon={ShieldCheck} label={tr("dashboard:metrics.cropHealth")} value={tr("dashboard:metrics.healthy")} note={tr("dashboard:metrics.lastChecked")} trend="neutral" tone="purple" />
      </section>

      <section className="panel today-actions-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">{tr("dashboard:farmToday.eyebrow")}</span>
            <h3>{tr("dashboard:farmToday.title")}</h3>
          </div>
          <span className="status-pill green">{tr("dashboard:farmToday.pendingCount", { count: (farmTodayQuery.data ?? []).filter((a) => !a.completed).length })}</span>
        </div>
        <div className="today-actions-list">
          {(farmTodayQuery.data ?? []).map((action) => (
            <div key={action.id} className={`today-action-card ${action.completed ? "is-done" : ""}`}>
              <div className="today-action-row">
                <span className={`today-action-priority ${action.priority}`}>{tr(`dashboard:farmToday.priorities.${action.priority}`)}</span>
                <div className="today-action-copy">
                  <strong>{action.activity}</strong>
                  <small>{action.plotName} · {action.suggestedTime}</small>
                  <p>{action.reason}</p>
                </div>
                <button
                  className={action.completed ? "secondary-button" : "primary-button"}
                  disabled={action.completed || markTodayDoneMut.isPending}
                  onClick={() => markTodayDoneMut.mutate({ actionId: action.id, taskId: action.taskId })}
                >
                  <Check size={14} /> {action.completed ? tr("common:done") : tr("common:markDone")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="section-row"><div><span className="eyebrow">{tr("dashboard:day.eyebrow")}</span><h2>{tr("dashboard:day.title")}</h2></div><button className="text-button" onClick={() => goTo("My Farm")}>{tr("dashboard:day.openPlan")} <ArrowUpRight size={15} /></button></div>
      <section className="content-grid">
        <div className="panel task-panel">
          <div className="panel-title"><div><h3>{tr("dashboard:day.todaysPlan")}</h3><p>{tr("dashboard:day.actionsComplete", { done: completedTasks, total: tasks.length })}</p></div><span className="progress-ring">{tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%</span></div>
          <div className="task-list">
            {tasks.map((task, index) => <button className={`task-row ${task.done ? "is-done" : ""}`} key={task.title} onClick={() => toggleTask(index)}><span className={`task-icon ${task.tone}`}><task.icon size={18} /></span><span className="task-copy"><strong>{task.title}</strong><small>{task.detail}</small></span><span className="task-check">{task.done ? <Check size={15} /> : <ChevronRight size={17} />}</span></button>)}
          </div>
          <button className="panel-link" onClick={() => setShowTaskModal(true)}>{tr("dashboard:day.addTask")} <Plus size={14} /></button>
        </div>
        <div className="panel weather-panel">
          <div className="panel-title"><div><h3>{tr("dashboard:day.weatherTitle")}</h3><p>{tr("dashboard:day.weatherSub", { location: farmerLocationDisplay })}</p></div><CloudRain size={22} className="muted-icon" /></div>
          <div className="temperature-row"><div><strong>{weatherQuery.data?.temperature ?? 28}°</strong><span>{tr("dashboard:day.feelsLike", { temp: (weatherQuery.data?.temperature ?? 28) + 2 })}</span></div><div className="rain-chip"><CloudRain size={16} /> {tr("dashboard:day.rainChance", { rain: rainProbability })}</div></div>
          <div className="forecast-row"><Forecast day={tr("dashboard:day.now")} temp={`${weatherQuery.data?.temperature ?? 28}°`} icon={CloudSun} active /><Forecast day="3 PM" temp="29°" icon={CloudSun} /><Forecast day="6 PM" temp="25°" icon={CloudRain} /><Forecast day="9 PM" temp="23°" icon={CloudRain} /><Forecast day="12 AM" temp="22°" icon={CloudRain} /></div>
          <div className="weather-note"><ThermometerSun size={16} /><span>{tr("dashboard:day.goodWindow")}</span></div>
        </div>
      </section>

      <section className="content-grid lower-grid">
        <div className="panel market-panel">
          <div className="panel-title"><div><span className="eyebrow">{tr("dashboard:marketSnapshot.eyebrow")}</span><h3>{tr("dashboard:marketSnapshot.title")}</h3><p>{tr("dashboard:marketSnapshot.updatedSource")}</p></div><button className="icon-button" onClick={() => notify(tr("notifications:toasts.marketRefreshed"))} aria-label={tr("common:refresh")}><RefreshCw size={17} /></button></div>
          <div className="market-highlight"><div><small>{tr("dashboard:marketSnapshot.bestNearby")}</small><strong>{formatCurrency(2840, i18n.language)} <em>{tr("common:perQuintal")}</em></strong></div><span className="positive"><ArrowUpRight size={15} /> 8.4%</span><div className="sparkline"><span /><span /><span /><span /><span /><span /><span /></div></div>
          <div className="mini-table">{marketRows.map((row) => <div className="mini-row" key={row.mandi}><span><strong>{row.mandi}</strong><small>{tr("dashboard:marketSnapshot.away", { distance: row.distance })}</small></span><strong>{row.price}</strong><span className={row.trend === "up" ? "positive" : "negative"}>{row.change}</span></div>)}</div>
          <button className="panel-link" onClick={() => goTo("Market rates")}>{tr("dashboard:marketSnapshot.compareAll")} <ArrowUpRight size={14} /></button>
        </div>
        <div className="panel diagnosis-panel">
          <div className="panel-title"><div><span className="eyebrow">{tr("dashboard:quickDiagnosis.eyebrow")}</span><h3>{tr("dashboard:quickDiagnosis.title")}</h3><p>{tr("dashboard:quickDiagnosis.subtitle")}</p></div><span className="diagnosis-badge"><ScanLine size={14} /> {tr("dashboard:quickDiagnosis.aiAssist")}</span></div>
          {diagnosisResult ? <div className="diagnosis-result"><div className="result-top"><span className={`status-pill ${diagnosisResult.needsAgronomist ? "amber" : "green"}`}>{diagnosisResult.needsAgronomist ? tr("dashboard:quickDiagnosis.agronomistReview") : tr("dashboard:quickDiagnosis.aiFirstCheck")}</span><strong>{tr("dashboard:quickDiagnosis.confidence", { pct: Math.round(diagnosisResult.confidence * 100) })}</strong></div><h4>{diagnosisResult.likelyCondition}</h4><p>{diagnosisResult.explanation}</p><div className="result-columns"><div><small>{tr("dashboard:quickDiagnosis.doNow")}</small>{diagnosisResult.immediateActions.slice(0, 2).map((action) => <span key={action}><CheckCircle2 size={13} /> {action}</span>)}</div><div><small>{tr("dashboard:quickDiagnosis.safetyNote")}</small><span><ShieldCheck size={13} /> {diagnosisResult.safetyNote}</span></div></div><div className="result-actions">{reviewRequested ? <span className="review-confirmed"><CheckCircle2 size={15} /> {tr("dashboard:quickDiagnosis.manualRequested")}</span> : <button className="review-button" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ imageKey: diagnosisResult.imageKey, crop: diagnosisResult.crop, aiCondition: diagnosisResult.likelyCondition, aiConfidence: diagnosisResult.confidence, farmerNote: "Farmer is unsure about the AI diagnosis and requests an agronomist review." })}><UsersRound size={14} /> {reviewMutation.isPending ? tr("dashboard:quickDiagnosis.sendingRequest") : tr("dashboard:quickDiagnosis.requestReview")}</button>}<button onClick={() => { setDiagnosisResult(null); setDiagnosisSubmitted(false); setDiagnosisImage(""); setReviewRequested(false); }}>{tr("dashboard:quickDiagnosis.checkAnother")}</button></div><em>{diagnosisResult.disclaimer}</em></div> : <button className="upload-drop" onClick={() => setShowDiagnosisModal(true)}><span className="upload-icon"><Camera size={21} /></span><strong>{tr("dashboard:quickDiagnosis.scanNow")}</strong><span>{tr("dashboard:quickDiagnosis.offlineNote")}</span><small><Upload size={13} /> {tr("dashboard:quickDiagnosis.compressNote")}</small></button>}
        </div>
      </section>
    </>
  );

  const renderFeature = () => {
    if (activeView === "Digital Twin") return <FeaturePage fullWidth eyebrow={tr("farm:digitalTwin.pageEyebrow")} title={tr("farm:digitalTwin.pageTitle")} description={tr("farm:digitalTwin.pageDescription")} icon={Layers} tone="green"><DigitalTwinWorkspace lat={liveLocation.lat} lng={liveLocation.lng} onToast={notify} onOpenAddPlot={() => setShowPlotModal(true)} /></FeaturePage>;
    if (activeView === "IoT sensors") return <FeaturePage fullWidth eyebrow={tr("irrigation:iot.pageEyebrow")} title={tr("irrigation:iot.pageTitle")} description={tr("irrigation:iot.pageDescription")} icon={Radio} tone="blue"><SensorDashboard onToast={notify} /></FeaturePage>;
    if (activeView === "Crop rotation") return <FeaturePage fullWidth eyebrow={tr("crop:cropRotation.pageEyebrow")} title={tr("crop:cropRotation.pageTitle")} description={tr("crop:cropRotation.pageDescription")} icon={RefreshCw} tone="green"><CropRotationWorkspace onToast={notify} /></FeaturePage>;
    if (activeView === "Farm memory") return <FeaturePage fullWidth eyebrow={tr("farm:farmMemory.pageEyebrow")} title={tr("farm:farmMemory.pageTitle")} description={tr("farm:farmMemory.pageDescription")} icon={BookOpen} tone="amber"><FarmMemoryWorkspace onToast={notify} /></FeaturePage>;
    if (activeView === "Financial forecast") return <FeaturePage fullWidth eyebrow={tr("market:forecast.pageEyebrow")} title={tr("market:forecast.pageTitle")} description={tr("market:forecast.pageDescription")} icon={IndianRupee} tone="green"><FinancialForecastWorkspace onToast={notify} /></FeaturePage>;
    if (activeView === "Cooperatives") return <FeaturePage fullWidth eyebrow={tr("farm:cooperatives.pageEyebrow")} title={tr("farm:cooperatives.pageTitle")} description={tr("farm:cooperatives.pageDescription")} icon={UsersRound} tone="blue"><CooperativeWorkspace onToast={notify} /></FeaturePage>;
    if (activeView === "Traceability") return <FeaturePage fullWidth eyebrow={tr("farm:traceability.pageEyebrow")} title={tr("farm:traceability.pageTitle")} description={tr("farm:traceability.pageDescription")} icon={ScanLine} tone="purple"><TraceabilityWorkspace onToast={notify} /></FeaturePage>;
    if (activeView === "Satellite health") return <FeaturePage fullWidth eyebrow={tr("farm:satellite.pageEyebrow")} title={tr("farm:satellite.pageTitle")} description={tr("farm:satellite.pageDescription")} icon={Satellite} tone="blue"><SatelliteHealthWorkspace lat={liveLocation.lat} lng={liveLocation.lng} /></FeaturePage>;
    if (activeView === "Waste exchange") return <FeaturePage fullWidth eyebrow={tr("farm:wasteExchange.pageEyebrow")} title={tr("farm:wasteExchange.pageTitle")} description={tr("farm:wasteExchange.pageDescription")} icon={Recycle} tone="green"><WasteExchangeWorkspace onToast={notify} /></FeaturePage>;
    if (activeView === "Local alerts") return <FeaturePage fullWidth eyebrow={tr("farm:localAlerts.pageEyebrow")} title={tr("farm:localAlerts.pageTitle")} description={tr("farm:localAlerts.pageDescription")} icon={Radio} tone="amber"><LocalIntelligenceWorkspace lat={liveLocation.lat} lng={liveLocation.lng} onToast={notify} /></FeaturePage>;
    if (activeView === "Failure analysis") return <FeaturePage fullWidth eyebrow={tr("crop:failureAnalysis.pageEyebrow")} title={tr("crop:failureAnalysis.pageTitle")} description={tr("crop:failureAnalysis.pageDescription")} icon={Microscope} tone="purple"><CropFailureWorkspace /></FeaturePage>;
    if (activeView === "Announcements") return <FeaturePage eyebrow={tr("community:announcements.pageEyebrow")} title={tr("community:announcements.pageTitle")} description={tr("community:announcements.pageDescription")} icon={Megaphone} tone="amber"><AnnouncementsWorkspace isAdmin={user?.role === "admin"} onToast={notify} onNavigate={(view) => goTo(view as ViewName)} /></FeaturePage>;
    if (activeView === "Community") return <FeaturePage eyebrow={tr("community:community.pageEyebrow")} title={tr("community:community.pageTitle")} description={tr("community:community.pageDescription")} icon={MessageCircle} tone="green"><CommunityWorkspace onToast={notify} /></FeaturePage>;
    if (activeView === "Crop calendar" || activeView === "Agronomist inbox" || activeView === "Admin insights") return <FeaturePage eyebrow={activeView === "Crop calendar" ? tr("farm:cropCalendar.eyebrow") : activeView === "Agronomist inbox" ? tr("community:inbox.pageEyebrow") : tr("reports:admin.pageEyebrow")} title={tr(`navigation:items.${activeView}`)} description={tr("farm:cropCalendar.description")} icon={activeView === "Crop calendar" ? CalendarDays : activeView === "Agronomist inbox" ? UsersRound : BarChart3} tone={activeView === "Crop calendar" ? "green" : activeView === "Agronomist inbox" ? "purple" : "blue"}><CapstoneAdvancedViews view={activeView} onToast={notify} /></FeaturePage>;
    if (activeView === "Field lab") return <FeaturePage fullWidth eyebrow={tr("farm:fieldLab.pageEyebrow")} title={tr("farm:fieldLab.pageTitle")} description={tr("farm:fieldLab.pageDescription")} icon={Sprout} tone="green"><CapstoneWorkspace soilMoisture={soilMoisture} rainProbability={rainProbability} temperature={weatherQuery.data?.temperature ?? 28} selectedPlot={selectedPlot} onToast={notify} /></FeaturePage>;
    if (activeView === "Irrigation") return <FeaturePage fullWidth eyebrow={tr("irrigation:pageEyebrow")} title={tr("irrigation:pageTitle")} description={tr("irrigation:pageDescription")} icon={Droplets} tone="blue"><div className="feature-content"><div className={`recommendation-card ${irrigationRecommendation.tone === "blue" ? "blue-card" : irrigationRecommendation.tone === "amber" ? "cream-card" : "green-card"}`}><div className="recommendation-top"><span className={`status-pill ${irrigationRecommendation.tone}`}><span className="pulse-dot" /> {tr(`irrigation:statuses.${irrigationRecommendation.status}`)}</span><CloudSun size={30} /></div><h3>{irrigationRecommendation.title}</h3><p>{irrigationRecommendation.detail}</p><div className="recommendation-facts"><span>{tr("irrigation:soilMoisture")} <strong>{soilMoisture}%</strong></span><span>{tr("irrigation:rainChance")} <strong>{rainProbability}%</strong></span><span>{tr("irrigation:weather")} <strong>{weatherQuery.data?.temperature ?? 28}°</strong></span></div><div className="recommendation-actions"><button className="primary-button" onClick={() => notify(tr("notifications:toasts.taskAdded"))}>{tr("irrigation:saveRec")}</button><button className="secondary-button" onClick={() => setShowPrintReport(true)}>{tr("irrigation:exportPdf")}</button><button className="secondary-button" onClick={() => notify(tr("irrigation:enterManually"))}>{tr("irrigation:enterManually")}</button></div><small className="data-source-note">{weatherQuery.data?.source === "live" ? tr("irrigation:liveOpenMeteo") : tr("irrigation:savedFallback")} · {tr("common:updated")} {weatherQuery.data?.fetchedAt ? new Date(weatherQuery.data.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : tr("common:justNow")}</small></div><ChartCard title={tr("irrigation:chartTitle", { plot: selectedPlot })} labels={["09 Sep", "10", "11", "12", "13", "14", tr("dashboard:day.now")]} values={[68, 57, 51, 43, 54, 49, soilMoisture]} color="blue" /></div><WaterBudgetPlanner lat={liveLocation.lat} lng={liveLocation.lng} onToast={notify} /></FeaturePage>;
    if (activeView === "Soil health") return <FeaturePage eyebrow={tr("crop:soilHealth.pageEyebrow")} title={tr("crop:soilHealth.pageTitle")} description={tr("crop:soilHealth.pageDescription")} icon={FlaskConical} tone="amber"><div className="soil-summary"><div className="soil-score"><div className="score-circle"><strong>72</strong><span>/100</span></div><div><span className="status-pill green">{tr("crop:soilHealth.goodBalance")}</span><h3>{tr("crop:soilHealth.keepOrganic")}</h3><p>{tr("crop:soilHealth.phHealthy")}</p></div></div><div className="nutrient-grid"><Nutrient label={tr("crop:soilHealth.nitrogen")} value={tr("crop:soilHealth.low")} amount="118 kg/ha" tone="amber" /><Nutrient label={tr("crop:soilHealth.phosphorus")} value={tr("crop:soilHealth.adequate")} amount="42 kg/ha" tone="green" /><Nutrient label={tr("crop:soilHealth.potassium")} value={tr("crop:soilHealth.good")} amount="188 kg/ha" tone="blue" /><Nutrient label={tr("crop:soilHealth.phLevel")} value={tr("crop:soilHealth.healthy")} amount="6.8 pH" tone="purple" /></div></div><div className="recommendation-card cream-card"><div className="recommendation-top"><span className="eyebrow">{tr("crop:soilHealth.nextActionEyebrow")}</span><Leaf size={25} /></div><h3>{tr("crop:soilHealth.applyCompost")}</h3><p>{tr("crop:soilHealth.compostDesc")}</p><button className="primary-button" onClick={() => notify(tr("notifications:toasts.taskAdded"))}>{tr("crop:soilHealth.addToPlan")} <Plus size={16} /></button></div></FeaturePage>;
    if (activeView === "Diagnose crop") return <FeaturePage fullWidth eyebrow={tr("crop:diagnose.pageEyebrow")} title={tr("crop:diagnose.pageTitle")} description={tr("crop:diagnose.pageDescription")} icon={ScanLine} tone="purple"><div className="feature-content"><button className="diagnose-hero" onClick={() => setShowDiagnosisModal(true)}><span className="scan-corners"><Camera size={28} /></span><strong>{tr("crop:diagnose.uploadHero")}</strong><span>{tr("crop:diagnose.uploadTap")}</span><small>{tr("crop:diagnose.uploadLimit")}</small></button><div className="case-history"><div className="panel-title"><div><span className="eyebrow">{tr("crop:diagnose.timelineEyebrow")}</span><h3>{tr("crop:diagnose.historyTitle")}</h3><p>{tr("crop:diagnose.historySub")}</p></div><div className="history-filter"><select value={selectedPlot} onChange={(event) => setSelectedPlot(event.target.value)}>{plotOptions.map((plot) => <option key={plot}>{plot}</option>)}</select><span>{tr("crop:diagnose.checksCount", { count: historyQuery.data?.length ?? 0 })}</span></div></div><DiagnosisHistory items={historyQuery.data ?? []} loading={historyQuery.isLoading} /></div></div><DiseaseRiskWorkspace selectedPlot={selectedPlot} lat={liveLocation.lat} lng={liveLocation.lng} historyItems={historyQuery.data ?? []} /></FeaturePage>;
    if (activeView === "Market rates") return <FeaturePage fullWidth eyebrow={tr("market:rates.pageEyebrow")} title={tr("market:rates.pageTitle")} description={tr("market:rates.pageDescription")} icon={TrendingUp} tone="green"><div className="market-toolbar"><div className="search-box"><Search size={17} /><input placeholder={tr("market:rates.searchPlaceholder")} defaultValue="Tomato" /></div><button className="secondary-button"><MapPin size={16} /> {tr("market:rates.nearMe")}</button><button className="secondary-button"><CalendarDays size={16} /> {tr("market:rates.today")}</button></div><div className="market-table"><div className="market-table-head"><span>{tr("market:rates.colMandi")}</span><span>{tr("market:rates.colModalPrice")}</span><span>{tr("market:rates.colChange")}</span><span>{tr("market:rates.colDistance")}</span></div>{marketRows.map((row) => <div className="market-table-row" key={row.mandi}><span><strong>{row.mandi}</strong><small>{tr("common:crops.Tomato")} · {tr("market:rates.allVarieties")}</small></span><strong className="table-price">{row.price}<small>{tr("common:perQuintal")}</small></strong><span className={row.trend === "up" ? "positive" : "negative"}>{row.change}</span><span>{row.distance}</span><button className="tiny-button" onClick={() => notify(`${row.mandi}`)}><Plus size={14} /></button></div>)}</div><div className="market-disclaimer"><CircleAlert size={16} /><span>{tr("market:rates.disclaimer")}</span></div><MandiNegotiationWorkspace trackedExpensesTotal={expenses.reduce((sum, item) => sum + item.amount, 0)} onToast={notify} /></FeaturePage>;
    if (activeView === "Profit planner") return <FeaturePage fullWidth eyebrow={tr("market:profit.pageEyebrow")} title={tr("market:profit.pageTitle")} description={tr("market:profit.pageDescription")} icon={WalletCards} tone="green"><div className="profit-layout"><div className="profit-card"><span className="eyebrow">{tr("market:profit.expectedScenario")}</span><div className="profit-value">{formatCurrency(82400, i18n.language)}</div><span className="profit-label">{tr("market:profit.estNetProfit")}</span><div className="profit-breakdown"><div><span>{tr("market:profit.totalCost")}</span><strong>{formatCurrency(expenses.reduce((sum, item) => sum + item.amount, 0), i18n.language)}</strong></div><div><span>{tr("market:profit.expectedRevenue")}</span><strong>{formatCurrency(147000, i18n.language)}</strong></div><div><span>{tr("market:profit.breakEvenPrice")}</span><strong>₹1,245/q</strong></div></div></div><div className="cost-list"><div className="panel-title"><div><h3>{tr("market:profit.costAssumptions")}</h3><p>{tr("common:crops.Tomato")} · {totalAcresDisplay}</p></div><button className="icon-button" onClick={() => setShowExpenseModal(true)} aria-label={tr("market:profit.logExpense")}><Plus size={17} /></button></div>{expenses.map((expense) => <CostRow key={expense.label} label={expense.label} value={formatCurrency(expense.amount, i18n.language)} />)}<button className="secondary-button full-width" onClick={() => setShowExpenseModal(true)}>{tr("market:profit.logExpense")} <Plus size={15} /></button><button className="primary-button full-width" onClick={() => notify(tr("notifications:toasts.taskAdded"))}>{tr("market:profit.saveScenario")}</button></div></div><CropProfitSimulator /></FeaturePage>;
    if (activeView === "Analytics") return <FeaturePage eyebrow={tr("reports:analytics.pageEyebrow")} title={tr("reports:analytics.pageTitle")} description={tr("reports:analytics.pageDescription")} icon={BarChart3} tone="blue"><div className="metric-grid"><MetricCard icon={CheckCircle2} label={tr("reports:analytics.tasksCompleted")} value={`${completedTasks}/${tasks.length}`} note={tr("reports:analytics.thisWeek")} trend="up" tone="green" /><MetricCard icon={IndianRupee} label={tr("reports:analytics.trackedExpenses")} value={formatCurrency(expenses.reduce((sum, item) => sum + item.amount, 0), i18n.language)} note={tr("reports:analytics.acrossAllPlots")} trend="neutral" tone="amber" /><MetricCard icon={TrendingUp} label={tr("reports:analytics.cropValueTrend")} value="+8.4%" note={tr("reports:analytics.vsLastWeek")} trend="up" tone="blue" /></div><ChartCard title={tr("reports:analytics.chartTitle")} labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]} values={[42, 54, 48, 67, 72, 76, 84]} color="blue" /><div className="panel"><div className="panel-title"><div><h3>{tr("reports:analytics.recommendedFocus")}</h3><p>{tr("reports:analytics.focusSub")}</p></div><Sparkles size={20} /></div><div className="recommendation-facts"><span>{tr("reports:analytics.bestAction")} <strong>{tr("reports:analytics.finishIrrigation")}</strong></span><span>{tr("reports:analytics.strongestCrop")} <strong>{tr("common:crops.Tomato")}</strong></span><span>{tr("reports:analytics.nextReview")} <strong>{tr("reports:analytics.tomorrowMorning")}</strong></span></div></div></FeaturePage>;
    if (activeView === "Notifications") return <FeaturePage eyebrow={tr("notifications:pageEyebrow")} title={tr("notifications:pageTitle")} description={tr("notifications:pageDescription")} icon={Bell} tone="amber"><div className="notification-settings-layout"><div className="panel"><NotificationCenter rainProbability={rainProbability} temperature={weatherQuery.data?.temperature ?? 28} onClose={() => setActiveView("Overview")} /></div><section className="panel notification-preferences"><div className="panel-title"><div><span className="eyebrow">{tr("notifications:deliveryEyebrow")}</span><h3>{tr("notifications:deliveryTitle")}</h3><p>{tr("notifications:deliverySub")}</p></div><Bell className="muted-icon" size={21} /></div><label>{tr("notifications:phoneLabel")}<input value={notificationPhone} onChange={(event) => setNotificationPhone(event.target.value)} placeholder="+919876543210" /></label><label>{tr("notifications:channelLabel")}<select value={notificationChannel} onChange={(event) => setNotificationChannel(event.target.value as typeof notificationChannel)}><option value="in_app">{tr("notifications:inAppOnly")}</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option></select></label><div className="notification-preference-actions"><button className="primary-button" onClick={() => notificationPreferencesMutation.mutate({ phoneNumber: notificationPhone || null, notificationChannel })} disabled={notificationPreferencesMutation.isPending}>{tr("settings:profilePage.savePrefs")}</button>{notificationChannel !== "in_app" && <button className="secondary-button" onClick={() => notificationTestMutation.mutate({ channel: notificationChannel, phoneNumber: notificationPhone })} disabled={notificationTestMutation.isPending}>{tr("settings:profilePage.sendTest")}</button>}</div><small className="data-source-note">{tr("notifications:twilioDisclaimer")}</small></section></div></FeaturePage>;
    if (activeView === "Profile") return <FeaturePage eyebrow={tr("settings:profilePage.pageEyebrow")} title={tr("settings:profilePage.pageTitle")} description={tr("settings:profilePage.pageDescription")} icon={UserRound} tone="green"><FarmerProfile name={profileName} location={profileLocation} language={profileLanguage} avatarUrl={user?.avatarUrl ?? null} phone={notificationPhone} channel={notificationChannel} profileSaving={profileMutation.isPending} avatarSaving={avatarMutation.isPending} saving={notificationPreferencesMutation.isPending} testing={notificationTestMutation.isPending} alertHistory={alertHistoryQuery.data ?? []} alertHistoryLoading={alertHistoryQuery.isLoading} signInHistory={signInHistoryQuery.data ?? []} signInHistoryLoading={signInHistoryQuery.isLoading} retryingId={alertRetryMutation.isPending ? alertRetryMutation.variables?.id ?? null : null} onNameChange={setProfileName} onLocationChange={setProfileLocation} onLanguageChange={setProfileLanguage} onAvatarUpload={(imageDataUrl) => avatarMutation.mutate({ imageDataUrl })} onPhoneChange={setNotificationPhone} onChannelChange={setNotificationChannel} onProfileSave={() => profileMutation.mutate({ name: profileName, farmLocation: profileLocation, preferredLanguage: profileLanguage })} onSave={() => notificationPreferencesMutation.mutate({ phoneNumber: notificationPhone || null, notificationChannel })} onTest={() => notificationTestMutation.mutate({ channel: notificationChannel as "sms" | "whatsapp", phoneNumber: notificationPhone })} onRetry={(id) => alertRetryMutation.mutate({ id })} onToast={notify} onResetScrollPositions={resetScrollPositions} /></FeaturePage>;
    return <FeaturePage eyebrow={tr("farm:myFarm.eyebrow")} title={tr("farm:myFarm.title")} description={tr("farm:myFarm.description")} icon={Sprout} tone="green"><div className="farm-overview"><div className="farm-map live-map"><MapView initialCenter={liveLocation} initialZoom={14} onMapReady={(map) => { mapRef.current = map; if (window.google?.maps?.marker) { locationMarker.current = new google.maps.marker.AdvancedMarkerElement({ map, position: liveLocation, title: tr("farm:myFarm.liveLocation") }); } setupMapOverlays(map); }} /><div className="map-live-chip"><span className="online-dot" /> {tr("farm:myFarm.liveLocation")}</div><select className="map-crop-filter" value={mapCropFilter} onChange={(event) => setMapCropFilter(event.target.value as typeof mapCropFilter)}><option value="All crops">{tr("farm:myFarm.allCrops")}</option><option value="Tomato">{tr("common:crops.Tomato")}</option><option value="Ragi">{tr("common:crops.Ragi")}</option></select><div className="map-overlay-controls">{(Object.keys(farmOverlays) as OverlayName[]).map((name) => <button key={name} className={`overlay-toggle ${overlayVisibility[name] ? "active" : ""}`} onClick={() => setOverlayVisibility((current) => ({ ...current, [name]: !current[name] }))}><span style={{ backgroundColor: farmOverlays[name].color }} /> {name === "weather" ? tr("farm:myFarm.weather") : name === "irrigation" ? tr("farm:myFarm.irrigation") : tr("farm:myFarm.soilSensors")}</button>)}</div><div className="map-label label-one"><MapPin size={14} /> Plot A · {tr("common:crops.Tomato")}</div><div className="map-label label-two"><MapPin size={14} /> Plot B · {tr("common:crops.Ragi")}</div><div className="heatmap-legend"><span>{tr("farm:myFarm.heatmapTitle")}</span><div className="heatmap-gradient" /><div className="heatmap-labels"><small>{tr("farm:myFarm.dry")}</small><small>{tr("farm:myFarm.optimal")}</small><small>{tr("farm:myFarm.wet")}</small></div></div>{sensorTooltip && <div className="sensor-tooltip"><button onClick={() => setSensorTooltip(null)} aria-label={tr("common:close")}><X size={13} /></button><span className="eyebrow">{tr("farm:myFarm.sensorDetail")}</span><strong>{sensorTooltip.plot}</strong><div className="sensor-reading"><span>{tr("farm:myFarm.moisture")} <b>{sensorTooltip.moisture}%</b></span><span>{tr("farm:myFarm.health")} <b>{sensorTooltip.health}/100</b></span><span>{tr("farm:myFarm.temp")} <b>{sensorTooltip.temperature}°</b></span></div><span className="sensor-chart-title">{tr("farm:myFarm.trend7d")}</span><div className="sensor-chart">{sensorTooltip.trend.map((value, index) => <span key={`${value}-${index}`} style={{ height: `${Math.max(18, value * 1.25)}%` }} title={`${value}%`} />)}</div><div className="sensor-chart-labels"><small>−6d</small><small>{tr("dashboard:day.now")}</small></div><small>{tr("common:updated")} {sensorTooltip.updated} · {tr("farm:myFarm.tapMarker")}</small></div>}</div><div className="farm-details"><div className="farm-detail-header"><div><span className="eyebrow">{farmerLocationDisplay.toUpperCase()}</span><h3>{totalAcresDisplay}</h3><p><MapPin size={14} /> {farmerLocationDisplay}</p></div><button className="secondary-button" onClick={() => setShowPlotModal(true)}><Plus size={16} /> {tr("farm:myFarm.addPlot")}</button></div><div className="overlay-insights"><OverlayInsight name={tr("farm:myFarm.weather")} detail={tr("farm:myFarm.weatherDetail", { temp: weatherQuery.data?.temperature ?? 28, rain: rainProbability })} tone="weather" /><OverlayInsight name={tr("farm:myFarm.irrigation")} detail={tr("farm:myFarm.irrigationDetail", { status: tr(`irrigation:statuses.${irrigationRecommendation.status}`), moisture: soilMoisture })} tone="irrigation" /><OverlayInsight name={tr("farm:myFarm.soilSensors")} detail={tr("farm:myFarm.soilDetail")} tone="soil" /></div><div className="plot-list"><div className="plot-card"><span className="plot-avatar tomato">T</span><div><strong>Plot A · {tr("common:crops.Tomato")}</strong><small>1.6 {tr("common:acres")} · {tr("common:stages.Flowering")}</small></div><span className="plot-health">{tr("dashboard:metrics.healthy")} · 86%</span><ChevronRight size={16} /></div><div className="plot-card"><span className="plot-avatar ragi">R</span><div><strong>Plot B · {tr("common:crops.Ragi")}</strong><small>0.8 {tr("common:acres")} · {tr("common:stages.Tillering")}</small></div><span className="plot-health">{tr("crop:soilHealth.good")} · 74%</span><ChevronRight size={16} /></div></div></div></div></FeaturePage>;
  };

  return (
    <div className="app-shell" onTouchStart={handleShellTouchStart} onTouchEnd={handleShellTouchEnd}>
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} onTouchStart={handleSidebarTouchStart} onTouchEnd={handleSidebarTouchEnd}>
        <div className="brand"><div className="brand-mark"><Sprout size={22} /></div><div><strong>{tr("navigation:brandName")}</strong><span>{tr("navigation:brandSub")}</span></div><button className="close-sidebar" onClick={() => setSidebarOpen(false)} aria-label={tr("navigation:closeMenu")}><X size={18} /></button></div>
        <div className="sidebar-scroll-hint">{tr("navigation:scrollHint")}</div>
        <nav className="side-nav"><span className="nav-caption">{tr("navigation:workspaceCaption")}</span>{navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activeView === label ? "active" : ""}`} onClick={() => goTo(label)}><Icon size={18} /><span>{tr(`navigation:items.${label}`)}</span>{label === "Diagnose crop" && <span className="nav-dot" />}</button>)}</nav>
        <div className="sidebar-bottom"><button className="nav-item" onClick={() => notify(tr("navigation:helpOpeningSoon"))}><BookOpen size={18} /><span>{tr("navigation:farmerLearning")}</span></button><button className="nav-item" onClick={() => setShowSettingsPanel(true)}><Settings size={18} /><span>{tr("navigation:settings")}</span></button><div className="offline-card"><div className="offline-row"><span className="online-dot" /> <strong>{tr("navigation:offlineReady")}</strong><MoreHorizontal size={15} /></div><p>{tr("navigation:offlineDesc")}</p></div><button className="profile-row" onClick={() => goTo("Profile")}><span className="profile-avatar">{farmerInitial}</span><span><strong>{farmerDisplayName}</strong><small>{farmerLocationDisplay}</small></span><MoreHorizontal size={18} /></button></div>
      </aside>
      {sidebarOpen && <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label={tr("navigation:closeMenu")} />}
      <div className="main-area">
        <header className="topbar"><button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label={tr("navigation:openMenu")}><Menu size={21} /></button><div className="mobile-brand"><div className="brand-mark"><Sprout size={19} /></div><strong>{tr("navigation:brandName")}</strong></div><div className="topbar-actions"><span className="sync-status"><span className="online-dot" /> {tr("navigation:syncedAgo")}</span><ThemeToggle compact /><LanguageSwitcher compact onChanged={(_, nativeLabel) => notify(tr("notifications:toasts.languageChanged", { language: nativeLabel }))} /><button className="notification-button" onClick={() => setInboxOpen(true)} aria-label={tr("navigation:items.Agronomist inbox")}><Bell size={19} />{unreadInbox > 0 && <span>{unreadInbox}</span>}</button><button className="top-profile" onClick={() => goTo("Profile")} aria-label={tr("navigation:items.Profile")}>{farmerInitial}</button></div></header>
        <main className="page-content"><div className="breadcrumb"><span>{tr("navigation:farmerWorkspace")}</span><ChevronRight size={14} /><strong>{tr(`navigation:items.${activeView}`)}</strong></div>{activeView === "Overview" ? renderOverview() : renderFeature()}</main>{notificationOpen && <NotificationCenter rainProbability={rainProbability} temperature={weatherQuery.data?.temperature ?? 28} onClose={() => setNotificationOpen(false)} />}
        <button className="assistant-launcher" onClick={() => setAssistantOpen((open) => !open)}><SparklesIcon /><span>{tr("dashboard:assistant.launcher")}</span></button>{assistantOpen && <FarmerAssistant language={assistantLanguage} setLanguage={setAssistantLanguage} messages={assistantMessages} loading={assistantMutation.isPending} escalating={escalateMutation.isPending} onAsk={askAssistant} onEscalate={escalateAssistant} onTranscribeAudio={transcribeAudio} onClose={() => setAssistantOpen(false)} />}
      </div>
      {showSettingsPanel && <ThresholdSettings crop={settingsCrop} stage={settingsStage} thresholds={thresholds} presets={thresholdPresets} setCrop={setSettingsCrop} setStage={setSettingsStage} onChange={(value) => setThresholds((current) => ({ ...current, [settingsCrop]: { ...current[settingsCrop], [settingsStage]: value } }))} onApplyPreset={(preset) => setThresholds((current) => ({ ...current, [preset.crop]: preset.values }))} onClose={() => setShowSettingsPanel(false)} />}
      {showPrintReport && <PrintableIrrigationReport plot={selectedPlot} crop={selectedCrop} stage={selectedStage} moisture={soilMoisture} threshold={moistureThreshold} recommendation={irrigationRecommendation} temperature={weatherQuery.data?.temperature ?? 28} rainProbability={rainProbability} fetchedAt={weatherQuery.data?.fetchedAt} />}
      {showTaskModal && <Modal title={tr("dashboard:modals.addTaskTitle")} onClose={() => setShowTaskModal(false)}><label>{tr("dashboard:modals.taskName")}<input value={customTask.title} onChange={(event) => setCustomTask((current) => ({ ...current, title: event.target.value }))} placeholder={tr("dashboard:modals.taskPlaceholder")} /></label><label>{tr("dashboard:modals.taskWhen")}<input value={customTask.detail} onChange={(event) => setCustomTask((current) => ({ ...current, detail: event.target.value }))} placeholder={tr("dashboard:modals.taskWhenPlaceholder")} /></label><button className="primary-button full-width" onClick={addTask}>{tr("dashboard:modals.saveReminder")} <Check size={16} /></button></Modal>}
      {showExpenseModal && <Modal title={tr("dashboard:modals.addExpenseTitle")} onClose={() => setShowExpenseModal(false)}><label>{tr("dashboard:modals.expenseCategory")}<input value={expenseDraft.label} onChange={(event) => setExpenseDraft((current) => ({ ...current, label: event.target.value }))} placeholder={tr("dashboard:modals.expensePlaceholder")} /></label><label>{tr("dashboard:modals.expenseAmount")}<input type="number" value={expenseDraft.amount} onChange={(event) => setExpenseDraft((current) => ({ ...current, amount: event.target.value }))} placeholder="1500" /></label><button className="primary-button full-width" onClick={addExpense}>{tr("dashboard:modals.saveExpense")} <Check size={16} /></button></Modal>}
      {showPlotModal && <Modal title={tr("dashboard:modals.addPlotTitle")} onClose={() => setShowPlotModal(false)}><label>{tr("dashboard:modals.plotName")}<input value={plotName} onChange={(event) => setPlotName(event.target.value)} placeholder={tr("dashboard:modals.plotPlaceholder")} /></label><label>{tr("dashboard:modals.growingCrop")}<select value={plotCrop} onChange={(event) => setPlotCrop(event.target.value)}><option value="Tomato">{tr("common:crops.Tomato")}</option><option value="Ragi">{tr("common:crops.Ragi")}</option><option value="Maize">{tr("common:crops.Maize")}</option></select></label><label>{tr("dashboard:modals.areaAcres")}<input type="number" min="1" value={plotArea} onChange={(event) => setPlotArea(event.target.value)} /></label><button className="primary-button full-width" disabled={createPlotMutation.isPending} onClick={() => createPlotMutation.mutate({ name: plotName || "New plot", crop: plotCrop, areaAcres: Number(plotArea), soilType: "Loamy", growthStage: "Seedling" })}>{createPlotMutation.isPending ? tr("common:saving") : tr("dashboard:modals.savePlot")} <Check size={16} /></button></Modal>}
      {showDiagnosisModal && <DiagnosisModal image={diagnosisImage} setImage={setDiagnosisImage} setVisualHints={setDiagnosisVisualHints} loading={diagnosisMutation.isPending} status={analysisStatus} selectedPlot={selectedPlot} onClose={() => setShowDiagnosisModal(false)} onSubmit={(crop, plotName, symptoms, language) => { setSelectedPlot(plotName); setShowDiagnosisModal(false); diagnosisMutation.mutate({ imageDataUrl: diagnosisImage, crop, plotName, symptoms, language, visualHints: diagnosisVisualHints }); }} />}
      {inboxOpen && <AgronomistInbox requests={inboxQuery.data ?? []} loading={inboxQuery.isLoading} onRead={(id) => markInboxReadMutation.mutate({ id })} onSubmit={submitInboxRequest} onClose={() => setInboxOpen(false)} />}
      {toast && <div className="toast"><CheckCircle2 size={17} /> {toast}</div>}
    </div>
  );
}

function SparklesIcon() { return <Sparkles size={16} />; }

function FarmerAssistant({ language, setLanguage, messages, loading, escalating, onAsk, onEscalate, onTranscribeAudio, onClose }: { language: AssistantLanguage; setLanguage: (language: AssistantLanguage) => void; messages: Array<{ role: "user" | "assistant"; text: string }>; loading: boolean; escalating: boolean; onAsk: (question: string) => void; onEscalate: (question: string) => void; onTranscribeAudio: (audioDataUrl: string) => Promise<string>; onClose: () => void }) {
  const { t } = useTranslation(["dashboard", "validation"]);
  const [question, setQuestion] = useState("");
  const [recording, setRecording] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const lastSpokenCountRef = useRef(0);
  const recognitionRef = useRef<InstanceType<NonNullable<Window["SpeechRecognition"]>> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const languageCode: Record<AssistantLanguage, string> = { English: "en-IN", Kannada: "kn-IN", Hindi: "hi-IN", Telugu: "te-IN", Tamil: "ta-IN" };
  const rawPrompts = t("dashboard:assistant.quickPrompts", { returnObjects: true });
  const quickPrompts = Array.isArray(rawPrompts) ? (rawPrompts as string[]) : [];

  const submit = (overrideQuestion?: string) => {
    const q = (overrideQuestion ?? question).trim();
    if (!q) return;
    onAsk(q);
    if (!overrideQuestion) setQuestion("");
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageCode[language];
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!autoSpeak) return;
    if (messages.length > lastSpokenCountRef.current) {
      lastSpokenCountRef.current = messages.length;
      const latest = messages[messages.length - 1];
      if (latest?.role === "assistant") speak(latest.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, autoSpeak]);

  const startRecorderFallback = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setQuestion("Voice input is unavailable on this browser.");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    chunksRef.current = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          setQuestion("Transcribing voice note…");
          const text = await onTranscribeAudio(String(reader.result));
          setQuestion(text);
        } catch {
          setQuestion("We could not transcribe that voice note. Please try again.");
        }
      };
      reader.readAsDataURL(new Blob(chunksRef.current, { type: "audio/webm" }));
    };
    recorderRef.current = recorder;
    setRecording(true);
    recorder.start();
  };

  const toggleVoice = async () => {
    if (recording) {
      recognitionRef.current?.stop();
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      await startRecorderFallback();
      return;
    }
    const recognition = new Recognition();
    recognition.lang = languageCode[language];
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      setQuestion(transcript);
    };
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    setRecording(true);
    recognition.start();
  };

  const escalate = () => {
    onEscalate(question || messages.filter((message) => message.role === "user").at(-1)?.text || "Farmer needs help with a farm recommendation.");
    setQuestion("");
  };

  useEffect(() => () => { recognitionRef.current?.stop(); recorderRef.current?.stop(); window.speechSynthesis?.cancel(); }, []);

  return (
    <div className="assistant-panel">
      <div className="notification-head">
        <div><span className="eyebrow">{t("dashboard:assistant.eyebrow")}</span><h3>{t("dashboard:assistant.title")}</h3></div>
        <button onClick={onClose} aria-label={t("common:close")}><X size={17} /></button>
      </div>
      <div className="assistant-toolbar">
        <label>{t("dashboard:assistant.replyLanguage")}
          <select value={language} onChange={(event) => { const next = event.target.value as AssistantLanguage; setLanguage(next); void changeAppLanguage(next); }}>
            <option value="English">English</option><option value="Kannada">ಕನ್ನಡ</option><option value="Hindi">हिन्दी</option><option value="Telugu">తెలుగు</option><option value="Tamil">தமிழ்</option>
          </select>
        </label>
        <label className="assistant-autospeak">
          <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} /> {t("dashboard:assistant.autoSpeak")}
        </label>
        <button className="escalate-button" onClick={escalate} disabled={escalating}><UsersRound size={13} /> {escalating ? t("common:sending") : t("dashboard:assistant.askAgronomist")}</button>
      </div>
      <p className="assistant-context"><Sparkles size={13} /> {t("dashboard:assistant.contextHint", { language })}</p>
      <div className="assistant-quick-prompts">
        {quickPrompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => submit(prompt)} disabled={loading}>
            {prompt}
          </button>
        ))}
      </div>
      <div className="assistant-messages">
        {messages.length === 0 ? (
          <div className="assistant-empty">{t("dashboard:assistant.emptyPrompt")}</div>
        ) : (
          messages.map((message, index) => (
            <div className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}>
              {message.text}
              {message.role === "assistant" && (
                <button className="speak-button" onClick={() => speak(message.text)} aria-label={t("dashboard:assistant.readAloud")}>
                  <Volume2 size={13} />
                </button>
              )}
            </div>
          ))
        )}
        {loading && <div className="assistant-message assistant">{t("dashboard:assistant.thinking")}</div>}
      </div>
      <div className="assistant-input">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") submit(); }}
          placeholder={recording ? t("dashboard:assistant.listening") : t("dashboard:assistant.placeholder", { language })}
        />
        <button className={`voice-button ${recording ? "recording" : ""}`} onClick={toggleVoice} aria-label={recording ? t("dashboard:assistant.listening") : t("dashboard:assistant.placeholder", { language })}>
          <MicIcon />
        </button>
        <button onClick={() => submit()} disabled={loading || !question.trim()} aria-label={t("common:submit")}>
          <ArrowUpRight size={16} />
        </button>
      </div>
    </div>
  );
}

function MicIcon() { return <span className="mic-icon">●</span>; }

function AgronomistInbox({ requests, loading, onRead, onSubmit, onClose }: { requests: Array<{ id: number; crop: string; farmerNote: string | null; agronomistReply: string | null; status: string; updatedAt: Date | string; readAt: Date | string | null }>; loading: boolean; onRead: (id: number) => void; onSubmit: (question: string, crop: string, imageDataUrl?: string) => void; onClose: () => void }) { const { t, i18n } = useTranslation(["community", "common"]); const [question, setQuestion] = useState(""); const [crop, setCrop] = useState("Tomato"); const [photo, setPhoto] = useState(""); const fileRef = useRef<HTMLInputElement>(null); const choosePhoto = (file?: File) => { if (!file || !file.type.match(/^image\/(jpeg|png|webp)$/) || file.size > 8 * 1024 * 1024) return; const reader = new FileReader(); reader.onload = () => setPhoto(String(reader.result)); reader.readAsDataURL(file); }; const submit = () => { if (!question.trim()) return; onSubmit(question.trim(), crop, photo || undefined); setQuestion(""); setPhoto(""); }; return <div className="inbox-backdrop"><section className="inbox-panel"><div className="notification-head"><div><span className="eyebrow">{t("community:inbox.humanSupport")}</span><h3>{t("community:inbox.pageTitle")}</h3></div><button onClick={onClose} aria-label={t("common:close")}><X size={17} /></button></div><p className="settings-help">{t("community:inbox.subtitle")}</p><div className="inbox-composer"><span className="eyebrow">{t("community:inbox.newQuestion")}</span><select value={crop} onChange={(event) => setCrop(event.target.value)}><option value="Tomato">{t("common:crops.Tomato")}</option><option value="Ragi">{t("common:crops.Ragi")}</option><option value="Maize">{t("common:crops.Maize")}</option><option value="Chilli">{t("common:crops.Chilli")}</option></select><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={t("community:inbox.placeholder")} rows={3} /><div className="inbox-compose-actions"><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => choosePhoto(event.target.files?.[0])} /><button className={`attach-photo-button ${photo ? "attached" : ""}`} onClick={() => fileRef.current?.click()}><Camera size={14} /> {photo ? t("community:inbox.photoAttached") : t("community:inbox.attachPhoto")}</button><button className="primary-button" disabled={!question.trim()} onClick={submit}>{t("community:inbox.sendToAgronomist")} <ArrowUpRight size={14} /></button></div></div>{loading ? <div className="inbox-empty"><RefreshCw size={18} className="spin" /> {t("community:inbox.loading")}</div> : requests.length === 0 ? <div className="inbox-empty"><Inbox size={24} /><strong>{t("community:inbox.emptyTitle")}</strong><span>{t("community:inbox.emptySub")}</span></div> : <div className="inbox-list">{requests.map((request) => <article className={`inbox-item ${request.agronomistReply && !request.readAt ? "unread" : ""}`} key={request.id}><div className="inbox-item-top"><span className="inbox-crop"><Wheat size={13} /> {request.crop}</span><small>{formatDate(request.updatedAt, i18n.language, { day: "2-digit", month: "short" })}</small></div><strong>{request.agronomistReply ? t("community:inbox.responseTitle") : t("community:inbox.sentTitle")}</strong><p>{request.agronomistReply || request.farmerNote || t("community:inbox.waitingReply")}</p><div className="inbox-item-footer"><span className={`inbox-status ${request.status}`}>{request.agronomistReply ? t("community:inbox.answered") : request.status}</span>{request.agronomistReply && !request.readAt && <button onClick={() => onRead(request.id)}>{t("community:inbox.markRead")}</button>}</div></article>)}</div>}</section></div>; }

function NotificationCenter({ rainProbability, temperature, onClose }: { rainProbability: number; temperature: number; onClose: () => void }) { const { t } = useTranslation(["notifications", "common"]); const severe = rainProbability >= 70; return <div className="notification-center"><div className="notification-head"><div><span className="eyebrow">{t("notifications:centerEyebrow")}</span><h3>{t("notifications:centerTitle")}</h3></div><button onClick={onClose} aria-label={t("common:close")}><X size={17} /></button></div><div className="notification-item irrigation-alert"><span className="notification-icon"><Droplets size={16} /></span><div><strong>{t("notifications:scheduledCheckTitle")}</strong><p>{t("notifications:scheduledCheckDesc")}</p><small>{t("notifications:scheduledCheckMeta")}</small></div></div><div className={`notification-item ${severe ? "severe-alert" : "weather-alert"}`}><span className="notification-icon"><CloudRain size={16} /></span><div><strong>{severe ? t("notifications:severeWarning") : t("notifications:weatherWatch")}</strong><p>{severe ? t("notifications:severeDesc", { rain: rainProbability }) : t("notifications:watchDesc", { temp: temperature, rain: rainProbability })}</p><small>{t("notifications:liveForecastMeta")}</small></div></div><button className="notification-footer" onClick={onClose}>{t("notifications:markSeen")}</button></div>; }

function ThresholdSettings({ crop, stage, thresholds, presets, setCrop, setStage, onChange, onApplyPreset, onClose }: { crop: CropName; stage: CropStage; thresholds: Thresholds; presets: typeof thresholdPresets; setCrop: (crop: CropName) => void; setStage: (stage: CropStage) => void; onChange: (value: number) => void; onApplyPreset: (preset: (typeof thresholdPresets)[number]) => void; onClose: () => void }) { const { t } = useTranslation(["settings", "common"]); return <div className="settings-backdrop"><section className="settings-panel"><div className="notification-head"><div><span className="eyebrow">{t("settings:thresholds.eyebrow")}</span><h3>{t("settings:thresholds.title")}</h3></div><button onClick={onClose} aria-label={t("common:close")}><X size={17} /></button></div><p className="settings-help">{t("settings:thresholds.help")}</p><div className="preset-heading"><span className="eyebrow">{t("settings:thresholds.presetsEyebrow")}</span><small>{t("settings:thresholds.presetsSub")}</small></div><div className="preset-list">{presets.map((preset) => <button className="preset-card" key={preset.name} onClick={() => { onApplyPreset(preset); setCrop(preset.crop); }}><strong>{preset.name}</strong><small>{preset.summary}</small><span>{t("settings:thresholds.applyPreset")} <ArrowUpRight size={12} /></span></button>)}</div><label>{t("common:crop")}<select value={crop} onChange={(event) => setCrop(event.target.value as CropName)}><option value="Tomato">{t("common:crops.Tomato")}</option><option value="Ragi">{t("common:crops.Ragi")}</option></select></label><label>{t("settings:thresholds.growthStage")}<select value={stage} onChange={(event) => setStage(event.target.value as CropStage)}>{cropStages.map((item) => <option key={item} value={item}>{t(`common:stages.${item}`)}</option>)}</select></label><label>{t("settings:thresholds.minThreshold")} <strong className="threshold-value">{thresholds[crop][stage]}%</strong><input type="range" min="20" max="70" value={thresholds[crop][stage]} onChange={(event) => onChange(Number(event.target.value))} /></label><div className="settings-tip"><Leaf size={15} /> {t("settings:thresholds.tip")}</div><button className="primary-button full-width" onClick={onClose}>{t("settings:thresholds.saveThreshold")}</button></section></div>; }

function PrintableIrrigationReport({ plot, crop, stage, moisture, threshold, recommendation, temperature, rainProbability }: { plot: string; crop: CropName; stage: CropStage; moisture: number; threshold: number; recommendation: { status: string; title: string; detail: string }; temperature: number; rainProbability: number; fetchedAt?: string }) { const { t, i18n } = useTranslation(["reports", "navigation", "common"]); useEffect(() => { const timer = window.setTimeout(() => window.print(), 80); return () => window.clearTimeout(timer); }, []); return <article className="print-report"><div className="print-brand"><Sprout size={24} /><strong>{t("navigation:brandName")}</strong></div><span className="eyebrow">{t("reports:printable.eyebrow")}</span><h1>{plot}</h1><p>{t("reports:printable.generated", { date: formatDate(new Date(), i18n.language) })}</p><div className="print-grid"><div><small>{t("reports:printable.cropStage")}</small><strong>{crop} · {stage}</strong></div><div><small>{t("reports:printable.soilMoisture")}</small><strong>{moisture}%</strong></div><div><small>{t("reports:printable.triggerThreshold")}</small><strong>{threshold}%</strong></div><div><small>{t("reports:printable.weather")}</small><strong>{temperature}° · {rainProbability}% {t("reports:printable.rain")}</strong></div></div><div className="print-recommendation"><span className="status-pill green">{recommendation.status}</span><h2>{recommendation.title}</h2><p>{recommendation.detail}</p></div><p className="print-footnote">{t("reports:printable.footnote")}</p></article>; }

function OverlayInsight({ name, detail, tone }: { name: string; detail: string; tone: string }) { return <div className={`overlay-insight ${tone}`}><span className="overlay-swatch" /><div><strong>{name}</strong><small>{detail}</small></div><span className="insight-live">LIVE</span></div>; }

function MetricCard({ icon: Icon, label, value, note, trend, tone }: { icon: typeof Activity; label: string; value: string; note: string; trend: string; tone: string }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={19} /></div><span>{label}</span><strong>{value}</strong><small className={trend === "up" ? "positive" : "muted-text"}>{trend === "up" && <ArrowUpRight size={13} />}{note}</small></div>;
}

function Forecast({ day, temp, icon: Icon, active = false }: { day: string; temp: string; icon: typeof CloudSun; active?: boolean }) { return <div className={`forecast-item ${active ? "active" : ""}`}><span>{day}</span><Icon size={19} /><strong>{temp}</strong></div>; }

function FeaturePage({ eyebrow, title, description, icon: Icon, tone, fullWidth = false, children }: { eyebrow: string; title: string; description: string; icon: typeof Activity; tone: string; fullWidth?: boolean; children: React.ReactNode }) { return <><section className="feature-intro"><div className={`feature-icon ${tone}`}><Icon size={24} /></div><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div></section><div className={`feature-content${fullWidth ? " feature-content-wide" : ""}`}>{children}</div></>; }

function ChartCard({ title, labels, values, color }: { title: string; labels: string[]; values: number[]; color: string }) { return <div className="panel chart-panel"><div className="panel-title"><div><h3>{title}</h3><p>Last updated a few minutes ago</p></div><BarChart3 size={20} className="muted-icon" /></div><div className={`chart chart-${color}`}>{values.map((value, index) => <div className="chart-column" key={`${labels[index]}-${value}`}><span style={{ height: `${value}%` }} /><small>{labels[index]}</small></div>)}</div></div>; }

function Nutrient({ label, value, amount, tone }: { label: string; value: string; amount: string; tone: string }) { return <div className="nutrient"><span className={`nutrient-dot ${tone}`} /><span><small>{label}</small><strong>{value}</strong></span><em>{amount}</em></div>; }

function CostRow({ label, value }: { label: string; value: string }) { return <div className="cost-row"><span>{label}</span><strong>{value}</strong><button aria-label={`Edit ${label}`}><MoreHorizontal size={16} /></button></div>; }

function DiagnosisHistory({ items, loading }: { items: Array<{ id: number; crop: string; likelyCondition: string; confidence: number; severity: string; needsAgronomist: number; createdAt: Date | string }>; loading: boolean }) {
  const { t, i18n } = useTranslation(["crop"]);
  if (loading) return <div className="history-empty"><RefreshCw size={18} className="spin" /><span>{t("crop:diagnose.loadingHistory")}</span></div>;
  if (items.length === 0) return <div className="history-empty"><ScanLine size={21} /><strong>{t("crop:diagnose.emptyTitle")}</strong><span>{t("crop:diagnose.emptySub")}</span></div>;
  return <div className="history-list">{items.map((item) => { const needsReview = item.needsAgronomist === 1; return <div className="history-item" key={item.id}><div className={`history-marker ${needsReview ? "review" : item.severity === "high" ? "high" : "healthy"}`}><ScanLine size={14} /></div><div className="history-main"><div className="history-meta"><span>{formatDate(item.createdAt, i18n.language)}</span><span>·</span><span>{item.crop}</span><span className={`history-status ${needsReview ? "review" : item.severity === "high" ? "risk" : "ok"}`}>{needsReview ? t("crop:diagnose.needsReview") : item.severity === "high" ? t("crop:diagnose.highAttention") : t("crop:diagnose.monitor")}</span></div><strong>{item.likelyCondition}</strong><p>{Math.round(item.confidence)}% · {item.severity}</p></div><ChevronRight size={16} className="history-chevron" /></div>; })}</div>;
}

function DiagnosisModal({ image, setImage, setVisualHints, loading, status, selectedPlot, onClose, onSubmit }: { image: string; setImage: (value: string) => void; setVisualHints?: (hints: { greenPct: number; yellowPct: number; brownSpotPct: number }) => void; loading: boolean; status: string; selectedPlot: string; onClose: () => void; onSubmit: (crop: string, plotName: string, symptoms: string, language: "English" | "Kannada" | "Hindi" | "Telugu" | "Tamil") => void }) {
  const { t, i18n } = useTranslation(["crop", "common"]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [crop, setCrop] = useState("Tomato");
  const [plotName, setPlotName] = useState(selectedPlot);
  const [symptoms, setSymptoms] = useState("");
  const [language, setLanguage] = useState<"English" | "Kannada" | "Hindi" | "Telugu" | "Tamil">(LANG_CODE_TO_NAME[normalizeLangCode(i18n.language)]);
  const [fileName, setFileName] = useState("");

  const handleFile = (file?: File) => {
    if (!file) return;
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
          setImage(compressedDataUrl);
          setFileName(`${file.name.replace(/\.[^/.]+$/, "")}-optimized.jpg`);

          // Sample compressed 64x64 patch to compute visual chlorophyll/chlorosis/spot hints
          try {
            const sample = document.createElement("canvas");
            sample.width = 64;
            sample.height = 64;
            const sctx = sample.getContext("2d");
            if (sctx && setVisualHints) {
              sctx.drawImage(img, 0, 0, 64, 64);
              const px = sctx.getImageData(0, 0, 64, 64).data;
              let green = 0, yellow = 0, brown = 0;
              const total = 64 * 64;
              for (let i = 0; i < px.length; i += 4) {
                const r = px[i]!, g = px[i + 1]!, b = px[i + 2]!;
                if (g > r + 12 && g > b + 12) green++;
                else if (r > 140 && g > 130 && b < 95) yellow++;
                else if (r > 65 && r < 145 && g < 105 && b < 85 && r > g) brown++;
              }
              setVisualHints({
                greenPct: Math.round((green / total) * 100),
                yellowPct: Math.round((yellow / total) * 100),
                brownSpotPct: Math.round((brown / total) * 100),
              });
            }
          } catch {}
        } else {
          setImage(String(reader.result));
          setFileName(file.name);
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return <Modal title={loading ? t("crop:diagnose.modalLoadingTitle") : t("crop:diagnose.modalStartTitle")} onClose={onClose}><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => handleFile(event.target.files?.[0])} />{loading ? <div className="analysis-progress"><div className="analysis-orbit"><ScanLine size={28} /></div><strong>{status}</strong><span>{t("crop:diagnose.keepOpen")}</span><div className="progress-track"><span /></div><small>{t("crop:diagnose.usuallyTakes")}</small></div> : <><button className={`modal-upload ${image ? "has-image" : ""}`} onClick={() => fileInput.current?.click()}><Camera size={24} /><strong>{image ? t("crop:diagnose.photoReady") : t("crop:diagnose.chooseClearPhoto")}</strong><span>{fileName || t("crop:diagnose.naturalLight")}</span><span className="modal-upload-action"><Upload size={16} /> {image ? t("crop:diagnose.chooseAnotherBtn") : t("crop:diagnose.choosePhotoBtn")}</span></button><label>{t("crop:diagnose.cropPlot")}<select value={plotName} onChange={(event) => setPlotName(event.target.value)}>{plotOptions.map((plot) => <option key={plot}>{plot}</option>)}</select></label><label>{t("common:crop")}<select value={crop} onChange={(event) => setCrop(event.target.value)}><option value="Tomato">{t("common:crops.Tomato")}</option><option value="Ragi">{t("common:crops.Ragi")}</option><option value="Maize">{t("common:crops.Maize")}</option><option value="Chilli">{t("common:crops.Chilli")}</option></select></label><label>{t("crop:diagnose.whatNotice")}<textarea value={symptoms} onChange={(event) => setSymptoms(event.target.value)} placeholder={t("crop:diagnose.symptomsPlaceholder")} rows={3} /></label><label>{t("crop:diagnose.resultLanguage")}<select value={language} onChange={(event) => setLanguage(event.target.value as typeof language)}><option value="English">English</option><option value="Kannada">ಕನ್ನಡ</option><option value="Hindi">हिन्दी</option><option value="Telugu">తెలుగు</option><option value="Tamil">தமிழ்</option></select></label><button className="primary-button full-width" disabled={!image} onClick={() => onSubmit(crop, plotName, symptoms, language)}>{t("crop:diagnose.sendForCheck")} <ScanLine size={16} /></button><small className="modal-note"><ShieldCheck size={13} /> {t("crop:diagnose.disclaimerNote")}</small></>}</Modal>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-header"><h3>{title}</h3><button onClick={onClose} aria-label="Close"><X size={19} /></button></div>{children}</div></div>; }
