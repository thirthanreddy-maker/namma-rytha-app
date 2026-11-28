import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Suspense, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { changeAppLanguage, normalizeLangCode } from "./i18n";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Home from "./pages/Home";

function RouteLoading() {
  const { t } = useTranslation("dashboard");
  return <div className="app-loading" role="status" aria-live="polite"><span className="loading-mark">✦</span><strong>{t("routeLoading")}</strong></div>;
}

function LanguageSync() {
  const { user } = useAuth();
  const syncedRef = useRef<number | null>(null);
  useEffect(() => {
    if (!user?.id || !user.preferredLanguage) return;
    if (syncedRef.current === user.id) return;
    syncedRef.current = user.id;
    const savedLocal = localStorage.getItem("namma-rytha-i18n-lang");
    if (!savedLocal) {
      void changeAppLanguage(normalizeLangCode(user.preferredLanguage));
    }
  }, [user?.id, user?.preferredLanguage]);
  return null;
}

function ProtectedHome() {
  const { loading, user } = useAuth();
  useEffect(() => { if (!loading && !user) window.location.replace("/auth?mode=signin"); }, [loading, user]);
  if (loading || !user) return <RouteLoading />;
  return <Home />;
}

function Router() {
  return <Suspense fallback={<RouteLoading />}><Switch><Route path="/" component={Landing} /><Route path="/auth" component={Auth} /><Route path="/app" component={ProtectedHome} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch></Suspense>;
}

function App() { return <ErrorBoundary><ThemeProvider defaultTheme="dark" switchable><TooltipProvider><LanguageSync /><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
export default App;
