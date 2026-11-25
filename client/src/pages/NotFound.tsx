import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation("dashboard");
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <Card className="w-full max-w-lg shadow-lg border" style={{ borderColor: "var(--border)", borderRadius: "var(--radius-lg)", background: "var(--card)" }}>
        <CardContent className="pt-8 pb-8 px-6 text-center">
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: "var(--amber-soft)" }} />
              <AlertCircle className="relative h-14 w-14" style={{ color: "var(--amber-strong)" }} />
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-2" style={{ color: "var(--foreground)" }}>{t("notFound.code")}</h1>
          <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--foreground)" }}>{t("notFound.title")}</h2>
          <p className="mb-7 leading-relaxed text-sm" style={{ color: "var(--muted-foreground)" }}>{t("notFound.description")}</p>

          <div id="not-found-button-group" className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => setLocation("/")}
              className="primary-button"
            >
              <Home className="w-4 h-4" />
              {t("notFound.goHome")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
