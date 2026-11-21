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
  Leaf,
  LogIn,
  Megaphone,
  MapPin,
  MessageCircle,
  Menu,
  MoreHorizontal,
  Plus,
  RefreshCw,
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
import { MapView } from "@/components/Map";
import ThemeToggle from "@/components/ThemeToggle";
import CapstoneWorkspace from "@/components/CapstoneWorkspace";
import CapstoneAdvancedViews from "@/components/CapstoneAdvancedViews";
import FarmerProfile from "@/components/FarmerProfile";
import CommunityWorkspace from "@/components/CommunityWorkspace";
import AnnouncementsWorkspace from "@/components/AnnouncementsWorkspace";

declare global {
  interface Window {
    SpeechRecognition?: new () => { lang: string; interimResults: boolean; continuous: boolean; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
    webkitSpeechRecognition?: Window["SpeechRecognition"];
  }
}

const navItems = [
  { label: "Overview", icon: Activity },
  { label: "Announcements", icon: Megaphone },
  { label: "Community", icon: MessageCircle },
  { label: "Field lab", icon: Sprout },
  { label: "Crop calendar", icon: CalendarDays },
  { label: "Agronomist inbox", icon: UsersRound },
  { label: "Admin insights", icon: BarChart3 },
  { label: "My Farm", icon: Sprout },
  { label: "Irrigation", icon: Droplets },
  { label: "Soil health", icon: FlaskConical },
  { label: "Diagnose crop", icon: ScanLine },
  { label: "Market rates", icon: TrendingUp },
  { label: "Profit planner", icon: WalletCards },
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
  const [activeView, setActiveView] = useState<ViewName>("Overview");
  const scrollPositions = useRef<Partial<Record<ViewName, number>>>({});
  const sidebarTouchStartX = useRef<number | null>(null);
  const edgeTouchStart = useRef<{ x: number; y: number } | null>(null);
  const [language, setLanguage] = useState<Language>("English");
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
  const [assistantLanguage, setAssistantLanguage] = useState<AssistantLanguage>("English");
  const [assistantMessages, setAssistantMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [showPrintReport, setShowPrintReport] = useState(false);
  const [toast, setToast] = useState("");
  const [tasks, setTasks] = useState(initialTasks);
  const [customTask, setCustomTask] = useState({ title: "", detail: "" });
  const [expenses, setExpenses] = useState<Array<{ label: string; amount: number }>>([{ label: "Seed & nursery", amount: 8400 }, { label: "Fertilizer & crop care", amount: 14200 }, { label: "Labour", amount: 22000 }, { label: "Water & transport", amount: 20000 }]);
  const [expenseDraft, setExpenseDraft] = useState({ label: "", amount: "" });
  const [diagnosisSubmitted, setDiagnosisSubmitted] = useState(false);
  const [plotName, setPlotName] = useState("");
  const [diagnosisImage, setDiagnosisImage] = useState("");
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
  const [profileLanguage, setProfileLanguage] = useState<Language>("English");
  const createPlotMutation = trpc.farm.plots.create.useMutation({ onSuccess: (plot) => { void trpcUtils.farm.plots.list.invalidate(); setShowPlotModal(false); if (plot.ingestToken) void navigator.clipboard?.writeText(plot.ingestToken); notify(`${plotName || "New plot"} saved. Device token copied for sensor setup.`); setPlotName(""); setPlotCrop("Tomato"); setPlotArea("1"); }, onError: (error) => notify(error.message) });
  const notificationPreferencesMutation = trpc.farm.notifications.preferences.useMutation({ onSuccess: () => { void trpcUtils.auth.me.invalidate(); notify("Notification preferences saved."); }, onError: (error) => notify(error.message) });
  const notificationTestMutation = trpc.farm.notifications.test.useMutation({ onSuccess: (result) => notify(result.message), onError: (error) => notify(error.message) });
  const profileMutation = trpc.auth.profile.useMutation({ onSuccess: (updatedUser) => { trpcUtils.auth.me.setData(undefined, updatedUser); setLanguage(updatedUser.preferredLanguage as Language); notify("Profile details saved."); }, onError: (error) => notify(error.message) });
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
    if (moistureHeatmap.current) moistureHeatmap.current.setMap(overlayVisibility.soil ? map : null);
  }, [overlayVisibility, mapCropFilter]);

  const setupMapOverlays = (map: google.maps.Map) => {
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
    moistureHeatmap.current = new google.maps.visualization.HeatmapLayer({ map, data: points.soil.map((point, index) => ({ location: new google.maps.LatLng(point.lat, point.lng), weight: index === 0 ? 0.46 : 0.58 })), radius: 55, opacity: 0.72, gradient: ["rgba(0, 0, 255, 0)", "#2e86ab", "#58b7a0", "#f2c14e", "#e4572e"] });
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
    setTasks((current) => current.map((task, i) => (i === index ? { ...task, done: !task.done } : task)));
  };
  const addTask = () => { if (!customTask.title.trim()) return; setTasks((current) => [...current, { title: customTask.title.trim(), detail: customTask.detail.trim() || "Added to your farm plan", icon: CalendarDays, tone: "purple", done: false }]); setCustomTask({ title: "", detail: "" }); setShowTaskModal(false); notify("Task added to your farm plan."); };
  const addExpense = () => { const amount = Number(expenseDraft.amount); if (!expenseDraft.label.trim() || !amount) return; setExpenses((current) => [...current, { label: expenseDraft.label.trim(), amount }]); setExpenseDraft({ label: "", amount: "" }); setShowExpenseModal(false); notify("Expense added to your profit plan."); };

  const renderOverview = () => (
    <>
      <section className="hero-grid">
        <div className="hero-card">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-content">
            <div className="eyebrow light"><span className="live-dot" /> FARM PULSE · LIVE</div>
            <h1>{t.greeting}</h1>
            <p>{t.subtitle}</p>
            <div className="hero-meta"><MapPin size={15} /> Hegganahalli, Kolar · 2.4 acres <span className="meta-divider" /> {t.today}</div>
            <button className="hero-button" onClick={speakAdvice}><Volume2 size={16} /> {t.useVoice}</button>
          </div>
          <div className="hero-weather">
            <CloudSun size={43} strokeWidth={1.6} />
            <strong>28°</strong>
            <span>Partly cloudy</span>
            <small>Rain 40% · Humidity 68%</small>
          </div>
        </div>
        <div className="priority-card">
          <div className="card-heading"><div><span className="eyebrow">ATTENTION NEEDED</span><h3>Protect your tomato crop</h3></div><CircleAlert className="alert-icon" size={23} /></div>
          <p>Rain is likely tonight. Hold off spraying and inspect the lower leaves for early blight before sunset.</p>
          <div className="priority-footer"><span><Clock3 size={14} /> Recommended by 5:30 PM</span><button onClick={() => goTo("Diagnose crop")}>Inspect crop <ChevronRight size={15} /></button></div>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard icon={Droplets} label="Water saved this week" value="1,240 L" note="18% less than usual" trend="up" tone="blue" />
        <MetricCard icon={IndianRupee} label="Expected crop value" value="₹1.84L" note="Based on current rates" trend="up" tone="green" />
        <MetricCard icon={Gauge} label="Soil health score" value="72 / 100" note="Good · NPK balanced" trend="neutral" tone="amber" />
        <MetricCard icon={ShieldCheck} label="Crop health" value="Healthy" note="Last checked 2 hours ago" trend="neutral" tone="purple" />
      </section>

      <div className="section-row"><div><span className="eyebrow">YOUR DAY</span><h2>Small actions, stronger harvest</h2></div><button className="text-button" onClick={() => goTo("My Farm")}>Open farm plan <ArrowUpRight size={15} /></button></div>
      <section className="content-grid">
        <div className="panel task-panel">
          <div className="panel-title"><div><h3>Today’s farm plan</h3><p>{completedTasks} of {tasks.length} actions complete</p></div><span className="progress-ring">{Math.round((completedTasks / tasks.length) * 100)}%</span></div>
          <div className="task-list">
            {tasks.map((task, index) => <button className={`task-row ${task.done ? "is-done" : ""}`} key={task.title} onClick={() => toggleTask(index)}><span className={`task-icon ${task.tone}`}><task.icon size={18} /></span><span className="task-copy"><strong>{task.title}</strong><small>{task.detail}</small></span><span className="task-check">{task.done ? <Check size={15} /> : <ChevronRight size={17} />}</span></button>)}
          </div>
          <button className="panel-link" onClick={() => setShowTaskModal(true)}>Add task or reminder <Plus size={14} /></button>
        </div>
        <div className="panel weather-panel">
          <div className="panel-title"><div><h3>{t.weather}</h3><p>Hegganahalli, Kolar · IMD forecast</p></div><CloudRain size={22} className="muted-icon" /></div>
          <div className="temperature-row"><div><strong>28°</strong><span>Feels like 30°</span></div><div className="rain-chip"><CloudRain size={16} /> 40% rain</div></div>
          <div className="forecast-row"><Forecast day="NOW" temp="28°" icon={CloudSun} active /><Forecast day="3 PM" temp="29°" icon={CloudSun} /><Forecast day="6 PM" temp="25°" icon={CloudRain} /><Forecast day="9 PM" temp="23°" icon={CloudRain} /><Forecast day="12 AM" temp="22°" icon={CloudRain} /></div>
          <div className="weather-note"><ThermometerSun size={16} /><span>Good window for field work until 5:30 PM.</span></div>
        </div>
      </section>

      <section className="content-grid lower-grid">
        <div className="panel market-panel">
          <div className="panel-title"><div><span className="eyebrow">LATEST SNAPSHOT · DEMO DATA</span><h3>Tomato market rates</h3><p>Updated 15 Sep 2026 · Source: local mandi feed</p></div><button className="icon-button" onClick={() => notify("Market data refreshed.")} aria-label="Refresh market data"><RefreshCw size={17} /></button></div>
          <div className="market-highlight"><div><small>Best nearby price</small><strong>₹2,840 <em>/ quintal</em></strong></div><span className="positive"><ArrowUpRight size={15} /> 8.4%</span><div className="sparkline"><span /><span /><span /><span /><span /><span /><span /></div></div>
          <div className="mini-table">{marketRows.map((row) => <div className="mini-row" key={row.mandi}><span><strong>{row.mandi}</strong><small>{row.distance} away</small></span><strong>{row.price}</strong><span className={row.trend === "up" ? "positive" : "negative"}>{row.change}</span></div>)}</div>
          <button className="panel-link" onClick={() => goTo("Market rates")}>Compare all mandis <ArrowUpRight size={14} /></button>
        </div>
        <div className="panel diagnosis-panel">
          <div className="panel-title"><div><span className="eyebrow">CROP CARE</span><h3>Quick diagnosis</h3><p>Upload a leaf photo for an instant first check.</p></div><span className="diagnosis-badge"><ScanLine size={14} /> AI assist</span></div>
          {diagnosisResult ? <div className="diagnosis-result"><div className="result-top"><span className={`status-pill ${diagnosisResult.needsAgronomist ? "amber" : "green"}`}>{diagnosisResult.needsAgronomist ? "AGRONOMIST REVIEW" : "AI FIRST CHECK"}</span><strong>{Math.round(diagnosisResult.confidence * 100)}% confidence</strong></div><h4>{diagnosisResult.likelyCondition}</h4><p>{diagnosisResult.explanation}</p><div className="result-columns"><div><small>DO NOW</small>{diagnosisResult.immediateActions.slice(0, 2).map((action) => <span key={action}><CheckCircle2 size={13} /> {action}</span>)}</div><div><small>SAFETY NOTE</small><span><ShieldCheck size={13} /> {diagnosisResult.safetyNote}</span></div></div><div className="result-actions">{reviewRequested ? <span className="review-confirmed"><CheckCircle2 size={15} /> Manual review requested</span> : <button className="review-button" disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate({ imageKey: diagnosisResult.imageKey, crop: diagnosisResult.crop, aiCondition: diagnosisResult.likelyCondition, aiConfidence: diagnosisResult.confidence, farmerNote: "Farmer is unsure about the AI diagnosis and requests an agronomist review." })}><UsersRound size={14} /> {reviewMutation.isPending ? "Sending request..." : "Request agronomist review"}</button>}<button onClick={() => { setDiagnosisResult(null); setDiagnosisSubmitted(false); setDiagnosisImage(""); setReviewRequested(false); }}>Check another photo</button></div><em>{diagnosisResult.disclaimer}</em></div> : <button className="upload-drop" onClick={() => setShowDiagnosisModal(true)}><span className="upload-icon"><Camera size={21} /></span><strong>Scan crop now</strong><span>Photo or symptom description · works offline</span><small><Upload size={13} /> Compresses images before upload</small></button>}
        </div>
      </section>
    </>
  );

  const renderFeature = () => {
    if (activeView === "Announcements") return <FeaturePage eyebrow="APP COMMUNICATIONS" title="Keep farmers in the loop." description="Share new app capabilities, practical farm tips, and seasonal messages in one clear announcement board." icon={Megaphone} tone="amber"><AnnouncementsWorkspace isAdmin={user?.role === "admin"} onToast={notify} onNavigate={(view) => goTo(view as ViewName)} /></FeaturePage>;
    if (activeView === "Community") return <FeaturePage eyebrow="FARMER COMMUNITY" title="Grow together, one field story at a time." description="Share crop progress, practical lessons, and short reels with farmers building better seasons across India." icon={MessageCircle} tone="green"><CommunityWorkspace onToast={notify} /></FeaturePage>;
    if (activeView === "Crop calendar" || activeView === "Agronomist inbox" || activeView === "Admin insights") return <FeaturePage eyebrow={activeView === "Crop calendar" ? "CROP PLANNING" : activeView === "Agronomist inbox" ? "AGRONOMIST NETWORK" : "ADMIN CONSOLE"} title={activeView} description="A capstone workflow built on protected data, clear farmer actions, and measurable field outcomes." icon={activeView === "Crop calendar" ? CalendarDays : activeView === "Agronomist inbox" ? UsersRound : BarChart3} tone={activeView === "Crop calendar" ? "green" : activeView === "Agronomist inbox" ? "purple" : "blue"}><CapstoneAdvancedViews view={activeView} onToast={notify} /></FeaturePage>;
    if (activeView === "Field lab") return <FeaturePage fullWidth eyebrow="CAPSTONE FIELD LAB" title="Run the farm like a living system." description="Connect crop health, sensor signals, irrigation decisions, field work, and farm economics in one place." icon={Sprout} tone="green"><CapstoneWorkspace soilMoisture={soilMoisture} rainProbability={rainProbability} temperature={weatherQuery.data?.temperature ?? 28} selectedPlot={selectedPlot} onToast={notify} /></FeaturePage>;
    if (activeView === "Irrigation") return <FeaturePage eyebrow="SMART IRRIGATION" title="Water only when your crop needs it." description="Recommendations use the selected plot’s soil-moisture threshold and the latest local forecast." icon={Droplets} tone="blue"><div className={`recommendation-card ${irrigationRecommendation.tone === "blue" ? "blue-card" : irrigationRecommendation.tone === "amber" ? "cream-card" : "green-card"}`}><div className="recommendation-top"><span className={`status-pill ${irrigationRecommendation.tone}`}><span className="pulse-dot" /> {irrigationRecommendation.status}</span><CloudSun size={30} /></div><h3>{irrigationRecommendation.title}</h3><p>{irrigationRecommendation.detail}</p><div className="recommendation-facts"><span>Soil moisture <strong>{soilMoisture}%</strong></span><span>Rain chance <strong>{rainProbability}%</strong></span><span>Weather <strong>{weatherQuery.data?.temperature ?? 28}°</strong></span></div><div className="recommendation-actions"><button className="primary-button" onClick={() => notify(irrigationRecommendation.status === "IRRIGATE SOON" ? "Irrigation task added for this plot." : "Irrigation recommendation saved.")}>Save this recommendation</button><button className="secondary-button" onClick={() => setShowPrintReport(true)}>Export PDF</button><button className="secondary-button" onClick={() => notify("Manual irrigation entry opened.")}>Enter manually</button></div><small className="data-source-note">{weatherQuery.data?.source === "live" ? "Live Open-Meteo forecast" : "Saved forecast fallback"} · Updated {weatherQuery.data?.fetchedAt ? new Date(weatherQuery.data.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "just now"}</small></div><ChartCard title={`Soil moisture · ${selectedPlot}`} labels={["09 Sep", "10", "11", "12", "13", "14", "Today"]} values={[68, 57, 51, 43, 54, 49, soilMoisture]} color="blue" /></FeaturePage>;
    if (activeView === "Soil health") return <FeaturePage eyebrow="SOIL HEALTH" title="A clearer picture of your soil." description="Enter a soil test to turn laboratory numbers into practical next steps. Your current profile is based on the last test from 28 August 2026." icon={FlaskConical} tone="amber"><div className="soil-summary"><div className="soil-score"><div className="score-circle"><strong>72</strong><span>/100</span></div><div><span className="status-pill green">GOOD BALANCE</span><h3>Keep building organic matter</h3><p>Your pH is healthy. Nitrogen is slightly low for the current tomato growth stage.</p></div></div><div className="nutrient-grid"><Nutrient label="Nitrogen" value="Low" amount="118 kg/ha" tone="amber" /><Nutrient label="Phosphorus" value="Adequate" amount="42 kg/ha" tone="green" /><Nutrient label="Potassium" value="Good" amount="188 kg/ha" tone="blue" /><Nutrient label="pH level" value="Healthy" amount="6.8 pH" tone="purple" /></div></div><div className="recommendation-card cream-card"><div className="recommendation-top"><span className="eyebrow">NEXT BEST ACTION</span><Leaf size={25} /></div><h3>Apply 2 bags of compost this week</h3><p>Organic matter will improve moisture retention and support the nitrogen application planned for week 7.</p><button className="primary-button" onClick={() => notify("Compost task added to your farm plan.")}>Add to farm plan <Plus size={16} /></button></div></FeaturePage>;
    if (activeView === "Diagnose crop") return <FeaturePage eyebrow="CROP DIAGNOSIS" title="Spot problems before they spread." description="Start with a clear photo in natural light. Namma Rytha gives a confidence-labelled first check and escalates uncertain cases to an agronomist." icon={ScanLine} tone="purple"><button className="diagnose-hero" onClick={() => setShowDiagnosisModal(true)}><span className="scan-corners"><Camera size={28} /></span><strong>Upload a crop photo</strong><span>Tap to select from your phone or drag an image here</span><small>JPG or PNG · max 8 MB · data saver enabled</small></button><div className="case-history"><div className="panel-title"><div><span className="eyebrow">HEALTH TIMELINE</span><h3>Diagnosis history</h3><p>Track changes for one crop plot over time.</p></div><div className="history-filter"><select value={selectedPlot} onChange={(event) => setSelectedPlot(event.target.value)}>{plotOptions.map((plot) => <option key={plot}>{plot}</option>)}</select><span>{historyQuery.data?.length ?? 0} checks</span></div></div><DiagnosisHistory items={historyQuery.data ?? []} loading={historyQuery.isLoading} /></div></FeaturePage>;
    if (activeView === "Market rates") return <FeaturePage eyebrow="MARKET INTELLIGENCE" title="Sell with more confidence." description="Compare nearby mandi prices, distance, and recent movement before you decide where to take your harvest." icon={TrendingUp} tone="green"><div className="market-toolbar"><div className="search-box"><Search size={17} /><input placeholder="Search commodity" defaultValue="Tomato" /></div><button className="secondary-button"><MapPin size={16} /> Near me</button><button className="secondary-button"><CalendarDays size={16} /> 15 Sep</button></div><div className="market-table"><div className="market-table-head"><span>MANDI</span><span>MODAL PRICE</span><span>CHANGE</span><span>DISTANCE</span></div>{marketRows.map((row) => <div className="market-table-row" key={row.mandi}><span><strong>{row.mandi}</strong><small>Tomato · all varieties</small></span><strong className="table-price">{row.price}<small>/ quintal</small></strong><span className={row.trend === "up" ? "positive" : "negative"}>{row.change}</span><span>{row.distance}</span><button className="tiny-button" onClick={() => notify(`${row.mandi} added to your watchlist.`)}><Plus size={14} /></button></div>)}</div><div className="market-disclaimer"><CircleAlert size={16} /><span>Prices are a demo snapshot for this build. Always confirm with the mandi before transporting produce.</span></div></FeaturePage>;
    if (activeView === "Profit planner") return <FeaturePage eyebrow="CROP ECONOMICS" title="See the harvest before it happens." description="Track real expenses against expected revenue and adjust scenarios as your season changes." icon={WalletCards} tone="green"><div className="profit-layout"><div className="profit-card"><span className="eyebrow">EXPECTED SCENARIO</span><div className="profit-value">₹82,400</div><span className="profit-label">Estimated net profit</span><div className="profit-breakdown"><div><span>Total cost</span><strong>₹{expenses.reduce((sum, item) => sum + item.amount, 0).toLocaleString("en-IN")}</strong></div><div><span>Expected revenue</span><strong>₹1,47,000</strong></div><div><span>Break-even price</span><strong>₹1,245/q</strong></div></div></div><div className="cost-list"><div className="panel-title"><div><h3>Cost assumptions</h3><p>Tomato · 2.4 acres</p></div><button className="icon-button" onClick={() => setShowExpenseModal(true)} aria-label="Add expense"><Plus size={17} /></button></div>{expenses.map((expense) => <CostRow key={expense.label} label={expense.label} value={`₹${expense.amount.toLocaleString("en-IN")}`} />)}<button className="secondary-button full-width" onClick={() => setShowExpenseModal(true)}>Log an expense <Plus size={15} /></button><button className="primary-button full-width" onClick={() => notify("Profit plan saved to your farm.")}>Save this scenario</button></div></div><ChartCard title="Profit sensitivity · selling price" labels={["₹1,500", "₹1,800", "₹2,100", "₹2,400", "₹2,700"]} values={[28, 43, 58, 75, 90]} color="green" /></FeaturePage>;
    if (activeView === "Analytics") return <FeaturePage eyebrow="FARM ANALYTICS" title="See what is changing on your farm." description="Track task completion, crop value, and soil trends in one place so every decision is easier to measure." icon={BarChart3} tone="blue"><div className="metric-grid"><MetricCard icon={CheckCircle2} label="Tasks completed" value={`${completedTasks}/${tasks.length}`} note="This week" trend="up" tone="green" /><MetricCard icon={IndianRupee} label="Tracked expenses" value={`₹${expenses.reduce((sum, item) => sum + item.amount, 0).toLocaleString("en-IN")}`} note="Across all plots" trend="neutral" tone="amber" /><MetricCard icon={TrendingUp} label="Crop value trend" value="+8.4%" note="Compared with last week" trend="up" tone="blue" /></div><ChartCard title="Farm performance · last 7 days" labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]} values={[42, 54, 48, 67, 72, 76, 84]} color="blue" /><div className="panel"><div className="panel-title"><div><h3>Recommended focus</h3><p>Use these signals to plan your next field visit.</p></div><Sparkles size={20} /></div><div className="recommendation-facts"><span>Best action <strong>Finish irrigation tasks</strong></span><span>Strongest crop <strong>Tomato</strong></span><span>Next review <strong>Tomorrow morning</strong></span></div></div></FeaturePage>;
    if (activeView === "Notifications") return <FeaturePage eyebrow="FARM ALERTS" title="Stay ahead of farm changes." description="Weather, task, and crop reminders are collected here so important actions do not get missed." icon={Bell} tone="amber"><div className="notification-settings-layout"><div className="panel"><NotificationCenter rainProbability={rainProbability} temperature={weatherQuery.data?.temperature ?? 28} onClose={() => setActiveView("Overview")} /></div><section className="panel notification-preferences"><div className="panel-title"><div><span className="eyebrow">DELIVERY PREFERENCES</span><h3>Choose how we reach you</h3><p>Scheduled irrigation checks use your selected channel.</p></div><Bell className="muted-icon" size={21} /></div><label>Phone number in international format<input value={notificationPhone} onChange={(event) => setNotificationPhone(event.target.value)} placeholder="+919876543210" /></label><label>Alert channel<select value={notificationChannel} onChange={(event) => setNotificationChannel(event.target.value as typeof notificationChannel)}><option value="in_app">In-app only</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option></select></label><div className="notification-preference-actions"><button className="primary-button" onClick={() => notificationPreferencesMutation.mutate({ phoneNumber: notificationPhone || null, notificationChannel })} disabled={notificationPreferencesMutation.isPending}>Save preferences</button>{notificationChannel !== "in_app" && <button className="secondary-button" onClick={() => notificationTestMutation.mutate({ channel: notificationChannel, phoneNumber: notificationPhone })} disabled={notificationTestMutation.isPending}>Send test</button>}</div><small className="data-source-note">SMS/WhatsApp delivery requires Twilio credentials configured by the project owner. Without them, the app keeps alerts in-app.</small></section></div></FeaturePage>;
    if (activeView === "Profile") return <FeaturePage eyebrow="FARMER ACCOUNT" title="Your profile, your alert choices." description="Manage the number and delivery channel used for irrigation, weather, and crop reminders." icon={UserRound} tone="green"><FarmerProfile name={profileName} location={profileLocation} language={profileLanguage} avatarUrl={user?.avatarUrl ?? null} phone={notificationPhone} channel={notificationChannel} profileSaving={profileMutation.isPending} avatarSaving={avatarMutation.isPending} saving={notificationPreferencesMutation.isPending} testing={notificationTestMutation.isPending} alertHistory={alertHistoryQuery.data ?? []} alertHistoryLoading={alertHistoryQuery.isLoading} signInHistory={signInHistoryQuery.data ?? []} signInHistoryLoading={signInHistoryQuery.isLoading} retryingId={alertRetryMutation.isPending ? alertRetryMutation.variables?.id ?? null : null} onNameChange={setProfileName} onLocationChange={setProfileLocation} onLanguageChange={setProfileLanguage} onAvatarUpload={(imageDataUrl) => avatarMutation.mutate({ imageDataUrl })} onPhoneChange={setNotificationPhone} onChannelChange={setNotificationChannel} onProfileSave={() => profileMutation.mutate({ name: profileName, farmLocation: profileLocation, preferredLanguage: profileLanguage })} onSave={() => notificationPreferencesMutation.mutate({ phoneNumber: notificationPhone || null, notificationChannel })} onTest={() => notificationTestMutation.mutate({ channel: notificationChannel as "sms" | "whatsapp", phoneNumber: notificationPhone })} onRetry={(id) => alertRetryMutation.mutate({ id })} onToast={notify} onResetScrollPositions={resetScrollPositions} /></FeaturePage>;
    return <FeaturePage eyebrow="MY FARM" title="Your farm, in one simple view." description="Keep your fields, crop cycles, and seasonal actions organized. You can add another plot whenever you’re ready." icon={Sprout} tone="green"><div className="farm-overview"><div className="farm-map live-map"><MapView initialCenter={liveLocation} initialZoom={14} onMapReady={(map) => { mapRef.current = map; locationMarker.current = new google.maps.marker.AdvancedMarkerElement({ map, position: liveLocation, title: "Your live location" }); setupMapOverlays(map); }} /><div className="map-live-chip"><span className="online-dot" /> Live location</div><select className="map-crop-filter" value={mapCropFilter} onChange={(event) => setMapCropFilter(event.target.value as typeof mapCropFilter)}><option>All crops</option><option>Tomato</option><option>Ragi</option></select><div className="map-overlay-controls">{(Object.keys(farmOverlays) as OverlayName[]).map((name) => <button key={name} className={`overlay-toggle ${overlayVisibility[name] ? "active" : ""}`} onClick={() => setOverlayVisibility((current) => ({ ...current, [name]: !current[name] }))}><span style={{ backgroundColor: farmOverlays[name].color }} /> {farmOverlays[name].label}</button>)}</div><div className="map-label label-one"><MapPin size={14} /> Plot A · Tomato</div><div className="map-label label-two"><MapPin size={14} /> Plot B · Ragi</div><div className="heatmap-legend"><span>SOIL MOISTURE HEATMAP</span><div className="heatmap-gradient" /><div className="heatmap-labels"><small>Dry</small><small>Optimal</small><small>Wet</small></div></div>{sensorTooltip && <div className="sensor-tooltip"><button onClick={() => setSensorTooltip(null)} aria-label="Close sensor details"><X size={13} /></button><span className="eyebrow">SENSOR DETAIL</span><strong>{sensorTooltip.plot}</strong><div className="sensor-reading"><span>Moisture <b>{sensorTooltip.moisture}%</b></span><span>Health <b>{sensorTooltip.health}/100</b></span><span>Temp <b>{sensorTooltip.temperature}°</b></span></div><span className="sensor-chart-title">7-day moisture trend</span><div className="sensor-chart">{sensorTooltip.trend.map((value, index) => <span key={`${value}-${index}`} style={{ height: `${Math.max(18, value * 1.25)}%` }} title={`${value}%`} />)}</div><div className="sensor-chart-labels"><small>−6d</small><small>Today</small></div><small>Updated {sensorTooltip.updated} · Tap a sensor marker for details</small></div>}</div><div className="farm-details"><div className="farm-detail-header"><div><span className="eyebrow">HEGGANAHALLI FARM</span><h3>2.4 acres · 2 active plots</h3><p><MapPin size={14} /> Kolar district, Karnataka</p></div><button className="secondary-button" onClick={() => setShowPlotModal(true)}><Plus size={16} /> Add plot</button></div><div className="overlay-insights"><OverlayInsight name="Weather" detail={`${weatherQuery.data?.temperature ?? 28}° · ${rainProbability}% rain`} tone="weather" /><OverlayInsight name="Irrigation" detail={`${irrigationRecommendation.status} · ${soilMoisture}% moisture`} tone="irrigation" /><OverlayInsight name="Soil sensors" detail={farmOverlays.soil.detail} tone="soil" /></div><div className="plot-list"><div className="plot-card"><span className="plot-avatar tomato">T</span><div><strong>Plot A · Tomato</strong><small>1.6 acres · flowering stage</small></div><span className="plot-health">Healthy · 86%</span><ChevronRight size={16} /></div><div className="plot-card"><span className="plot-avatar ragi">R</span><div><strong>Plot B · Ragi</strong><small>0.8 acres · tillering stage</small></div><span className="plot-health">Good · 74%</span><ChevronRight size={16} /></div></div></div></div></FeaturePage>;
  };

  return (
    <div className="app-shell" onTouchStart={handleShellTouchStart} onTouchEnd={handleShellTouchEnd}>
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} onTouchStart={handleSidebarTouchStart} onTouchEnd={handleSidebarTouchEnd}>
        <div className="brand"><div className="brand-mark"><Sprout size={22} /></div><div><strong>Namma Rytha</strong><span>ನಮ್ಮ ರೈತ · Smart farming</span></div><button className="close-sidebar" onClick={() => setSidebarOpen(false)}><X size={18} /></button></div>
        <div className="sidebar-scroll-hint">Scroll for more navigation</div>
        <nav className="side-nav"><span className="nav-caption">FARM WORKSPACE</span>{navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activeView === label ? "active" : ""}`} onClick={() => goTo(label)}><Icon size={18} /><span>{label}</span>{label === "Diagnose crop" && <span className="nav-dot" />}</button>)}</nav>
        <div className="sidebar-bottom"><button className="nav-item" onClick={() => notify("Help centre is opening soon.")}><BookOpen size={18} /><span>Farmer learning</span></button><button className="nav-item" onClick={() => setShowSettingsPanel(true)}><Settings size={18} /><span>Settings</span></button><div className="offline-card"><div className="offline-row"><span className="online-dot" /> <strong>Offline ready</strong><MoreHorizontal size={15} /></div><p>Last synced 2 mins ago. Core features are available without internet.</p></div><button className="profile-row" onClick={() => goTo("Profile")}><span className="profile-avatar">R</span><span><strong>Ravi Kumar</strong><small>Farmer · Kolar</small></span><MoreHorizontal size={18} /></button></div>
      </aside>
      {sidebarOpen && <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close navigation menu" />}
      <div className="main-area">
        <header className="topbar"><button className="mobile-menu" onClick={() => setSidebarOpen(true)}><Menu size={21} /></button><div className="mobile-brand"><div className="brand-mark"><Sprout size={19} /></div><strong>Namma Rytha</strong></div><div className="topbar-actions"><span className="sync-status"><span className="online-dot" /> Synced 2 min ago</span><ThemeToggle compact /><button className="language-button" onClick={() => setLanguage(language === "English" ? "Kannada" : language === "Kannada" ? "Hindi" : "English")}><Languages size={17} /> {language} <ChevronRight size={14} /></button><button className="notification-button" onClick={() => setInboxOpen(true)} aria-label="Agronomist inbox"><Bell size={19} />{unreadInbox > 0 && <span>{unreadInbox}</span>}</button><button className="top-profile" onClick={() => goTo("Profile")} aria-label="Open farmer profile">R</button></div></header>
        <main className="page-content"><div className="breadcrumb"><span>Farmer workspace</span><ChevronRight size={14} /><strong>{activeView}</strong></div>{activeView === "Overview" ? renderOverview() : renderFeature()}</main>{notificationOpen && <NotificationCenter rainProbability={rainProbability} temperature={weatherQuery.data?.temperature ?? 28} onClose={() => setNotificationOpen(false)} />}
        <button className="assistant-launcher" onClick={() => setAssistantOpen((open) => !open)}><SparklesIcon /><span>Ask Rytha AI</span></button>{assistantOpen && <FarmerAssistant language={assistantLanguage} setLanguage={setAssistantLanguage} messages={assistantMessages} loading={assistantMutation.isPending} escalating={escalateMutation.isPending} onAsk={askAssistant} onEscalate={escalateAssistant} onTranscribeAudio={transcribeAudio} onClose={() => setAssistantOpen(false)} />}
      </div>
      {showSettingsPanel && <ThresholdSettings crop={settingsCrop} stage={settingsStage} thresholds={thresholds} presets={thresholdPresets} setCrop={setSettingsCrop} setStage={setSettingsStage} onChange={(value) => setThresholds((current) => ({ ...current, [settingsCrop]: { ...current[settingsCrop], [settingsStage]: value } }))} onApplyPreset={(preset) => setThresholds((current) => ({ ...current, [preset.crop]: preset.values }))} onClose={() => setShowSettingsPanel(false)} />}
      {showPrintReport && <PrintableIrrigationReport plot={selectedPlot} crop={selectedCrop} stage={selectedStage} moisture={soilMoisture} threshold={moistureThreshold} recommendation={irrigationRecommendation} temperature={weatherQuery.data?.temperature ?? 28} rainProbability={rainProbability} fetchedAt={weatherQuery.data?.fetchedAt} />}
      {showTaskModal && <Modal title="Add a task or reminder" onClose={() => setShowTaskModal(false)}><label>Task name<input value={customTask.title} onChange={(event) => setCustomTask((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Check tomato leaves" /></label><label>When should it happen?<input value={customTask.detail} onChange={(event) => setCustomTask((current) => ({ ...current, detail: event.target.value }))} placeholder="Tomorrow · 8:00 AM" /></label><button className="primary-button full-width" onClick={addTask}>Save reminder <Check size={16} /></button></Modal>}
      {showExpenseModal && <Modal title="Log a farm expense" onClose={() => setShowExpenseModal(false)}><label>Expense category<input value={expenseDraft.label} onChange={(event) => setExpenseDraft((current) => ({ ...current, label: event.target.value }))} placeholder="e.g. Diesel" /></label><label>Amount in rupees<input type="number" value={expenseDraft.amount} onChange={(event) => setExpenseDraft((current) => ({ ...current, amount: event.target.value }))} placeholder="1500" /></label><button className="primary-button full-width" onClick={addExpense}>Save expense <Check size={16} /></button></Modal>}
      {showPlotModal && <Modal title="Add a new plot" onClose={() => setShowPlotModal(false)}><label>Plot name<input value={plotName} onChange={(event) => setPlotName(event.target.value)} placeholder="e.g. Plot C" /></label><label>What are you growing?<select value={plotCrop} onChange={(event) => setPlotCrop(event.target.value)}><option value="Tomato">Tomato</option><option value="Ragi">Ragi</option><option value="Maize">Maize</option></select></label><label>Area in acres<input type="number" min="1" value={plotArea} onChange={(event) => setPlotArea(event.target.value)} /></label><button className="primary-button full-width" disabled={createPlotMutation.isPending} onClick={() => createPlotMutation.mutate({ name: plotName || "New plot", crop: plotCrop, areaAcres: Number(plotArea), soilType: "Loamy", growthStage: "Seedling" })}>{createPlotMutation.isPending ? "Saving…" : "Save plot"} <Check size={16} /></button></Modal>}
      {showDiagnosisModal && <DiagnosisModal image={diagnosisImage} setImage={setDiagnosisImage} loading={diagnosisMutation.isPending} status={analysisStatus} selectedPlot={selectedPlot} onClose={() => setShowDiagnosisModal(false)} onSubmit={(crop, plotName, symptoms, language) => { setSelectedPlot(plotName); setShowDiagnosisModal(false); diagnosisMutation.mutate({ imageDataUrl: diagnosisImage, crop, plotName, symptoms, language }); }} />}
      {inboxOpen && <AgronomistInbox requests={inboxQuery.data ?? []} loading={inboxQuery.isLoading} onRead={(id) => markInboxReadMutation.mutate({ id })} onSubmit={submitInboxRequest} onClose={() => setInboxOpen(false)} />}
      {toast && <div className="toast"><CheckCircle2 size={17} /> {toast}</div>}
    </div>
  );
}

function SparklesIcon() { return <Sparkles size={16} />; }

function FarmerAssistant({ language, setLanguage, messages, loading, escalating, onAsk, onEscalate, onTranscribeAudio, onClose }: { language: AssistantLanguage; setLanguage: (language: AssistantLanguage) => void; messages: Array<{ role: "user" | "assistant"; text: string }>; loading: boolean; escalating: boolean; onAsk: (question: string) => void; onEscalate: (question: string) => void; onTranscribeAudio: (audioDataUrl: string) => Promise<string>; onClose: () => void }) { const [question, setQuestion] = useState(""); const [recording, setRecording] = useState(false); const recognitionRef = useRef<InstanceType<NonNullable<Window["SpeechRecognition"]>> | null>(null); const recorderRef = useRef<MediaRecorder | null>(null); const chunksRef = useRef<Blob[]>([]); const languageCode: Record<AssistantLanguage, string> = { English: "en-IN", Kannada: "kn-IN", Hindi: "hi-IN", Telugu: "te-IN", Tamil: "ta-IN" }; const submit = () => { onAsk(question); setQuestion(""); }; const startRecorderFallback = async () => { if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setQuestion("Voice input is unavailable on this browser."); return; } const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" }); chunksRef.current = []; recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); }; recorder.onstop = async () => { stream.getTracks().forEach((track) => track.stop()); const reader = new FileReader(); reader.onloadend = async () => { try { setQuestion("Transcribing voice note…"); const text = await onTranscribeAudio(String(reader.result)); setQuestion(text); } catch { setQuestion("We could not transcribe that voice note. Please try again."); } }; reader.readAsDataURL(new Blob(chunksRef.current, { type: "audio/webm" })); }; recorderRef.current = recorder; setRecording(true); recorder.start(); }; const toggleVoice = async () => { if (recording) { recognitionRef.current?.stop(); recorderRef.current?.stop(); setRecording(false); return; } const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition; if (!Recognition) { await startRecorderFallback(); return; } const recognition = new Recognition(); recognition.lang = languageCode[language]; recognition.interimResults = false; recognition.continuous = false; recognition.onresult = (event) => { const transcript = event.results[0]?.[0]?.transcript || ""; setQuestion(transcript); }; recognition.onend = () => setRecording(false); recognitionRef.current = recognition; setRecording(true); recognition.start(); }; const speak = (text: string) => { if (!window.speechSynthesis) return; window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = languageCode[language]; utterance.rate = 0.92; window.speechSynthesis.speak(utterance); }; const escalate = () => { onEscalate(question || messages.filter((message) => message.role === "user").at(-1)?.text || "Farmer needs help with a farm recommendation."); setQuestion(""); }; useEffect(() => () => { recognitionRef.current?.stop(); recorderRef.current?.stop(); window.speechSynthesis?.cancel(); }, []); return <div className="assistant-panel"><div className="notification-head"><div><span className="eyebrow">RYTHA AI</span><h3>Farm assistant</h3></div><button onClick={onClose} aria-label="Close assistant"><X size={17} /></button></div><div className="assistant-toolbar"><label>Reply language<select value={language} onChange={(event) => setLanguage(event.target.value as AssistantLanguage)}><option>English</option><option>Kannada</option><option>Hindi</option><option>Telugu</option><option>Tamil</option></select></label><button className="escalate-button" onClick={escalate} disabled={escalating}><UsersRound size={13} /> {escalating ? "Sending…" : "Ask an agronomist"}</button></div><p className="assistant-context"><Sparkles size={13} /> Ask by voice or text about irrigation and weather.</p><div className="assistant-messages">{messages.length === 0 ? <div className="assistant-empty">Try: “Should I irrigate before the rain?”</div> : messages.map((message, index) => <div className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}>{message.text}{message.role === "assistant" && <button className="speak-button" onClick={() => speak(message.text)} aria-label="Read answer aloud"><Volume2 size={13} /></button>}</div>)}{loading && <div className="assistant-message assistant">Reviewing your farm context…</div>}</div><div className="assistant-input"><input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} placeholder={recording ? "Listening… tap mic to stop" : "Ask a farm question"} /><button className={`voice-button ${recording ? "recording" : ""}`} onClick={toggleVoice} aria-label={recording ? "Stop voice input" : "Start voice input"}><MicIcon /></button><button onClick={submit} disabled={loading || !question.trim()} aria-label="Send question"><ArrowUpRight size={16} /></button></div></div>; }

function MicIcon() { return <span className="mic-icon">●</span>; }

function AgronomistInbox({ requests, loading, onRead, onSubmit, onClose }: { requests: Array<{ id: number; crop: string; farmerNote: string | null; agronomistReply: string | null; status: string; updatedAt: Date | string; readAt: Date | string | null }>; loading: boolean; onRead: (id: number) => void; onSubmit: (question: string, crop: string, imageDataUrl?: string) => void; onClose: () => void }) { const [question, setQuestion] = useState(""); const [crop, setCrop] = useState("Tomato"); const [photo, setPhoto] = useState(""); const fileRef = useRef<HTMLInputElement>(null); const choosePhoto = (file?: File) => { if (!file || !file.type.match(/^image\/(jpeg|png|webp)$/) || file.size > 8 * 1024 * 1024) return; const reader = new FileReader(); reader.onload = () => setPhoto(String(reader.result)); reader.readAsDataURL(file); }; const submit = () => { if (!question.trim()) return; onSubmit(question.trim(), crop, photo || undefined); setQuestion(""); setPhoto(""); }; return <div className="inbox-backdrop"><section className="inbox-panel"><div className="notification-head"><div><span className="eyebrow">HUMAN SUPPORT</span><h3>Agronomist inbox</h3></div><button onClick={onClose} aria-label="Close inbox"><X size={17} /></button></div><p className="settings-help">Ask a human agronomist and attach a crop photo for field-specific guidance.</p><div className="inbox-composer"><span className="eyebrow">NEW QUESTION</span><select value={crop} onChange={(event) => setCrop(event.target.value)}><option>Tomato</option><option>Ragi</option><option>Maize</option><option>Chilli</option></select><textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Describe what you need help with…" rows={3} /><div className="inbox-compose-actions"><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => choosePhoto(event.target.files?.[0])} /><button className={`attach-photo-button ${photo ? "attached" : ""}`} onClick={() => fileRef.current?.click()}><Camera size={14} /> {photo ? "Photo attached" : "Attach crop photo"}</button><button className="primary-button" disabled={!question.trim()} onClick={submit}>Send to agronomist <ArrowUpRight size={14} /></button></div></div>{loading ? <div className="inbox-empty"><RefreshCw size={18} className="spin" /> Loading messages…</div> : requests.length === 0 ? <div className="inbox-empty"><Inbox size={24} /><strong>No agronomist messages yet</strong><span>Use the composer above when you need field-specific help.</span></div> : <div className="inbox-list">{requests.map((request) => <article className={`inbox-item ${request.agronomistReply && !request.readAt ? "unread" : ""}`} key={request.id}><div className="inbox-item-top"><span className="inbox-crop"><Wheat size={13} /> {request.crop}</span><small>{new Date(request.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</small></div><strong>{request.agronomistReply ? "Agronomist response" : "Request sent"}</strong><p>{request.agronomistReply || request.farmerNote || "Your request is waiting to be assigned."}</p><div className="inbox-item-footer"><span className={`inbox-status ${request.status}`}>{request.agronomistReply ? "Answered" : request.status}</span>{request.agronomistReply && !request.readAt && <button onClick={() => onRead(request.id)}>Mark as read</button>}</div></article>)}</div>}</section></div>; }

function NotificationCenter({ rainProbability, temperature, onClose }: { rainProbability: number; temperature: number; onClose: () => void }) { const severe = rainProbability >= 70; return <div className="notification-center"><div className="notification-head"><div><span className="eyebrow">FARM ALERTS</span><h3>Notifications</h3></div><button onClick={onClose} aria-label="Close notifications"><X size={17} /></button></div><div className="notification-item irrigation-alert"><span className="notification-icon"><Droplets size={16} /></span><div><strong>Scheduled irrigation check</strong><p>Review Plot A moisture before the next watering window.</p><small>Today · based on sensor threshold</small></div></div><div className={`notification-item ${severe ? "severe-alert" : "weather-alert"}`}><span className="notification-icon"><CloudRain size={16} /></span><div><strong>{severe ? "Severe weather warning" : "Weather watch"}</strong><p>{severe ? `Heavy rain likely (${rainProbability}%). Pause irrigation and field spraying.` : `${temperature}° currently · ${rainProbability}% rain chance in the forecast.`}</p><small>Live forecast · updated recently</small></div></div><button className="notification-footer" onClick={onClose}>Mark all as seen</button></div>; }

function ThresholdSettings({ crop, stage, thresholds, presets, setCrop, setStage, onChange, onApplyPreset, onClose }: { crop: CropName; stage: CropStage; thresholds: Thresholds; presets: typeof thresholdPresets; setCrop: (crop: CropName) => void; setStage: (stage: CropStage) => void; onChange: (value: number) => void; onApplyPreset: (preset: (typeof thresholdPresets)[number]) => void; onClose: () => void }) { return <div className="settings-backdrop"><section className="settings-panel"><div className="notification-head"><div><span className="eyebrow">FARM SETTINGS</span><h3>Moisture thresholds</h3></div><button onClick={onClose} aria-label="Close settings"><X size={17} /></button></div><p className="settings-help">Set the minimum soil moisture that should trigger an irrigation recommendation for each crop stage.</p><div className="preset-heading"><span className="eyebrow">AGRONOMIST PRESETS</span><small>Start with a recommended profile</small></div><div className="preset-list">{presets.map((preset) => <button className="preset-card" key={preset.name} onClick={() => { onApplyPreset(preset); setCrop(preset.crop); }}><strong>{preset.name}</strong><small>{preset.summary}</small><span>Apply preset <ArrowUpRight size={12} /></span></button>)}</div><label>Crop<select value={crop} onChange={(event) => setCrop(event.target.value as CropName)}><option>Tomato</option><option>Ragi</option></select></label><label>Growth stage<select value={stage} onChange={(event) => setStage(event.target.value as CropStage)}>{cropStages.map((item) => <option key={item}>{item}</option>)}</select></label><label>Minimum moisture threshold <strong className="threshold-value">{thresholds[crop][stage]}%</strong><input type="range" min="20" max="70" value={thresholds[crop][stage]} onChange={(event) => onChange(Number(event.target.value))} /></label><div className="settings-tip"><Leaf size={15} /> Recommendations use this value together with live rain probability.</div><button className="primary-button full-width" onClick={onClose}>Save threshold</button></section></div>; }

function PrintableIrrigationReport({ plot, crop, stage, moisture, threshold, recommendation, temperature, rainProbability, fetchedAt }: { plot: string; crop: CropName; stage: CropStage; moisture: number; threshold: number; recommendation: { status: string; title: string; detail: string }; temperature: number; rainProbability: number; fetchedAt?: string }) { useEffect(() => { const timer = window.setTimeout(() => window.print(), 80); return () => window.clearTimeout(timer); }, []); return <article className="print-report"><div className="print-brand"><Sprout size={24} /><strong>Namma Rytha</strong></div><span className="eyebrow">IRRIGATION RECOMMENDATION REPORT</span><h1>{plot}</h1><p>Generated {new Date().toLocaleString()}</p><div className="print-grid"><div><small>CROP / STAGE</small><strong>{crop} · {stage}</strong></div><div><small>SOIL MOISTURE</small><strong>{moisture}%</strong></div><div><small>TRIGGER THRESHOLD</small><strong>{threshold}%</strong></div><div><small>WEATHER</small><strong>{temperature}° · {rainProbability}% rain</strong></div></div><div className="print-recommendation"><span className="status-pill green">{recommendation.status}</span><h2>{recommendation.title}</h2><p>{recommendation.detail}</p></div><p className="print-footnote">Weather source: Open-Meteo live forecast{fetchedAt ? ` · Last updated ${new Date(fetchedAt).toLocaleString()}` : ""}. This recommendation is advisory; inspect the plot before irrigating.</p></article>; }

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
  if (loading) return <div className="history-empty"><RefreshCw size={18} className="spin" /><span>Loading this plot’s health timeline...</span></div>;
  if (items.length === 0) return <div className="history-empty"><ScanLine size={21} /><strong>No checks saved for this plot yet</strong><span>Upload the first crop photo to start tracking changes over time.</span></div>;
  return <div className="history-list">{items.map((item) => { const needsReview = item.needsAgronomist === 1; return <div className="history-item" key={item.id}><div className={`history-marker ${needsReview ? "review" : item.severity === "high" ? "high" : "healthy"}`}><ScanLine size={14} /></div><div className="history-main"><div className="history-meta"><span>{new Date(item.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span><span>·</span><span>{item.crop}</span><span className={`history-status ${needsReview ? "review" : item.severity === "high" ? "risk" : "ok"}`}>{needsReview ? "Needs review" : item.severity === "high" ? "High attention" : "Monitor"}</span></div><strong>{item.likelyCondition}</strong><p>{Math.round(item.confidence)}% confidence · {item.severity} severity</p></div><ChevronRight size={16} className="history-chevron" /></div>; })}</div>;
}

function DiagnosisModal({ image, setImage, loading, status, selectedPlot, onClose, onSubmit }: { image: string; setImage: (value: string) => void; loading: boolean; status: string; selectedPlot: string; onClose: () => void; onSubmit: (crop: string, plotName: string, symptoms: string, language: "English" | "Kannada" | "Hindi" | "Telugu" | "Tamil") => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [crop, setCrop] = useState("Tomato");
  const [plotName, setPlotName] = useState(selectedPlot);
  const [symptoms, setSymptoms] = useState("");
  const [language, setLanguage] = useState<"English" | "Kannada" | "Hindi" | "Telugu" | "Tamil">("English");
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
        } else {
          setImage(String(reader.result));
          setFileName(file.name);
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return <Modal title={loading ? "Analyzing your crop photo" : "Start a crop check"} onClose={onClose}><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => handleFile(event.target.files?.[0])} />{loading ? <div className="analysis-progress"><div className="analysis-orbit"><ScanLine size={28} /></div><strong>{status}</strong><span>Our AI is checking the photo conservatively. Keep this window open.</span><div className="progress-track"><span /></div><small>Usually takes 10–20 seconds</small></div> : <><button className={`modal-upload ${image ? "has-image" : ""}`} onClick={() => fileInput.current?.click()}><Camera size={24} /><strong>{image ? "Photo ready for analysis" : "Choose a clear crop photo"}</strong><span>{fileName || "Natural light works best. Your image will be compressed before upload."}</span><span className="modal-upload-action"><Upload size={16} /> {image ? "Choose another photo" : "Choose photo"}</span></button><label>Crop plot<select value={plotName} onChange={(event) => setPlotName(event.target.value)}>{plotOptions.map((plot) => <option key={plot}>{plot}</option>)}</select></label><label>Crop<select value={crop} onChange={(event) => setCrop(event.target.value)}><option>Tomato</option><option>Ragi</option><option>Maize</option><option>Chilli</option></select></label><label>What do you notice?<textarea value={symptoms} onChange={(event) => setSymptoms(event.target.value)} placeholder="Describe spots, insects, wilting, or any change you see..." rows={3} /></label><label>Result language<select value={language} onChange={(event) => setLanguage(event.target.value as typeof language)}><option>English</option><option>Kannada</option><option>Hindi</option><option>Telugu</option><option>Tamil</option></select></label><button className="primary-button full-width" disabled={!image} onClick={() => onSubmit(crop, plotName, symptoms, language)}>Send for AI first check <ScanLine size={16} /></button><small className="modal-note"><ShieldCheck size={13} /> Low-confidence results are reviewed by an agronomist. This is not a guaranteed diagnosis.</small></>}</Modal>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-header"><h3>{title}</h3><button onClick={onClose} aria-label="Close"><X size={19} /></button></div>{children}</div></div>; }
