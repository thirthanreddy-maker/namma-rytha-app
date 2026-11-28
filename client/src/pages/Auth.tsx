import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Sprout, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Auth() {
  const { t } = useTranslation(["authentication", "navigation"]);
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") || "signin";

  const [authMode, setAuthMode] = useState<"signin" | "register">(
    mode === "register" ? "register" : "signin"
  );
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loginMutation = trpc.auth.login.useMutation();
  const demoLoginMutation = trpc.auth.demoLogin.useMutation();

  const switchMode = (next: "signin" | "register") => {
    setAuthMode(next);
    setError("");
    setNotice("");
    setLocation(`/auth?mode=${next}`);
  };

  const handleStandardAuth = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!identifier.trim()) {
      setError(t("authentication:errors.missingIdentifier"));
      return;
    }
    if (password.length < 4) {
      setError(t("authentication:errors.shortPassword"));
      return;
    }
    if (authMode === "register" && !name.trim()) {
      setError(t("authentication:errors.missingName"));
      return;
    }

    try {
      await loginMutation.mutateAsync({
        identifier: identifier.trim(),
        password,
        name: authMode === "register" ? name.trim() : undefined,
      });
      window.location.href = "/app?welcome=1";
    } catch (err: any) {
      setError(err?.message || t("authentication:errors.signInFailed"));
    }
  };

  const handleDemoAccess = async () => {
    setError("");
    try {
      await demoLoginMutation.mutateAsync();
      window.location.href = "/app?welcome=1";
    } catch (err: any) {
      setError(err?.message || t("authentication:errors.demoFailed"));
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-topline">
          <Link href="/" className="auth-back">
            <ArrowLeft size={16} /> {t("authentication:backHome")}
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LanguageSwitcher compact />
            <ThemeToggle compact />
          </div>
        </div>

        <div className="auth-brand">
          <span className="landing-mark">
            <Sprout size={20} />
          </span>
          <span>
            <strong>{t("navigation:brandName")}</strong>
            <small>{t("navigation:brandSub")}</small>
          </span>
        </div>

        <section className="auth-card">
          <div className="auth-heading">
            <span className="auth-kicker">
              {authMode === "register" ? t("authentication:newFarmer") : t("authentication:farmerAccess")}
            </span>
            <h1>
              {authMode === "register"
                ? t("authentication:createTitle")
                : t("authentication:welcomeTitle")}
            </h1>
            <p>
              {authMode === "register"
                ? t("authentication:createSubtitle")
                : t("authentication:signinSubtitle")}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleStandardAuth} noValidate>
            {authMode === "register" && (
              <>
                <label htmlFor="auth-name">{t("authentication:fullName")}</label>
                <input
                  id="auth-name"
                  name="name"
                  type="text"
                  placeholder={t("authentication:fullNamePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </>
            )}

            <label htmlFor="auth-identifier">{t("authentication:usernameOrEmail")}</label>
            <input
              id="auth-identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              placeholder={t("authentication:usernamePlaceholder")}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />

            <label htmlFor="auth-password">{t("authentication:password")}</label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={authMode === "register" ? "new-password" : "current-password"}
              placeholder={t("authentication:passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              className="auth-submit"
              type="submit"
              disabled={loginMutation.isPending || demoLoginMutation.isPending}
            >
              <span>{authMode === "register" ? t("authentication:createAccountBtn") : t("authentication:signInBtn")}</span>
              <ArrowRight size={17} />
            </button>
          </form>

          <div className="auth-divider">
            <span>{t("authentication:orTryDemo")}</span>
          </div>

          <button
            type="button"
            className="oauth-button"
            onClick={handleDemoAccess}
            disabled={loginMutation.isPending || demoLoginMutation.isPending}
          >
            <Sparkles size={16} />
            <span>{t("authentication:demoBtn")}</span>
          </button>

          {error && (
            <p className="form-error" role="alert" style={{ marginTop: "12px" }}>
              {error}
            </p>
          )}
          {notice && (
            <p className="form-notice" role="status" style={{ marginTop: "12px" }}>
              <CheckCircle2 size={16} /> {notice}
            </p>
          )}

          <p className="auth-switch" style={{ marginTop: "16px" }}>
            {authMode === "register"
              ? t("authentication:alreadyHaveAccount")
              : t("authentication:newToRytha")}{" "}
            <button
              type="button"
              onClick={() =>
                switchMode(authMode === "register" ? "signin" : "register")
              }
            >
              {authMode === "register" ? t("authentication:signInLink") : t("authentication:registerLink")}
            </button>
          </p>
        </section>

        <div className="auth-trust">
          <ShieldCheck size={16} /> {t("authentication:dataProtected")}
        </div>
      </div>
    </main>
  );
}
