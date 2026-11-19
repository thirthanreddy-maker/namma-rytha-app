import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { lazy, Suspense, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";

const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Home = lazy(() => import("./pages/Home"));

function RouteLoading() { return <div className="app-loading" role="status" aria-live="polite"><span className="loading-mark">✦</span><strong>Loading Namma Rytha…</strong></div>; }

function ProtectedHome() {
  const { loading, user } = useAuth();
  useEffect(() => { if (!loading && !user) window.location.replace("/auth?mode=signin"); }, [loading, user]);
  if (loading || !user) return <RouteLoading />;
  return <Home />;
}

function Router() {
  return <Suspense fallback={<RouteLoading />}><Switch><Route path="/" component={Landing} /><Route path="/auth" component={Auth} /><Route path="/app" component={ProtectedHome} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch></Suspense>;
}

function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light" switchable><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>; }
export default App;
