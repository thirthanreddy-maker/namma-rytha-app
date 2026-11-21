import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Sprout, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import ThemeToggle from "@/components/ThemeToggle";

export default function Auth() {
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
      setError("Please enter your email or username.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }
    if (authMode === "register" && !name.trim()) {
      setError("Please enter your name.");
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
      setError(err?.message || "Sign-in failed. Please try again.");
    }
  };

  const handleDemoAccess = async () => {
    setError("");
    try {
      await demoLoginMutation.mutateAsync();
      window.location.href = "/app?welcome=1";
    } catch (err: any) {
      setError(err?.message || "Demo access failed.");
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-topline">
          <Link href="/" className="auth-back">
            <ArrowLeft size={16} /> Back to Namma Rytha
          </Link>
          <ThemeToggle compact />
        </div>

        <div className="auth-brand">
          <span className="landing-mark">
            <Sprout size={20} />
          </span>
          <span>
            <strong>Namma Rytha</strong>
            <small>ನಮ್ಮ ರೈತ · Smart farming</small>
          </span>
        </div>

        <section className="auth-card">
          <div className="auth-heading">
            <span className="auth-kicker">
              {authMode === "register" ? "NEW FARMER" : "FARMER ACCESS"}
            </span>
            <h1>
              {authMode === "register"
                ? "Create your farm account"
                : "Welcome back to your farm"}
            </h1>
            <p>
              {authMode === "register"
                ? "Sign up with your username and password to get started."
                : "Sign in with your username or email and password."}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleStandardAuth} noValidate>
            {authMode === "register" && (
              <>
                <label htmlFor="auth-name">Your Full Name</label>
                <input
                  id="auth-name"
                  name="name"
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </>
            )}

            <label htmlFor="auth-identifier">Email or Username</label>
            <input
              id="auth-identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              placeholder="e.g. farmer@gmail.com or ramesh"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />

            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={authMode === "register" ? "new-password" : "current-password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              className="auth-submit"
              type="submit"
              disabled={loginMutation.isPending || demoLoginMutation.isPending}
            >
              <span>{loginMutation.isPending ? "Signing in…" : authMode === "register" ? "Create Account" : "Sign In"}</span>
              <ArrowRight size={17} />
            </button>
          </form>

          <div style={{ margin: "20px 0 16px", textAlign: "center", position: "relative" }}>
            <hr style={{ border: "none", borderTop: "1px solid var(--border-color, #e5e7eb)" }} />
            <span
              style={{
                position: "absolute",
                top: "-10px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "var(--card-bg, #fff)",
                padding: "0 12px",
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              or
            </span>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={handleDemoAccess}
            disabled={loginMutation.isPending || demoLoginMutation.isPending}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px 16px",
              borderRadius: "8px",
              border: "1px solid #10b981",
              background: "#ecfdf5",
              color: "#065f46",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Sparkles size={16} />
            <span>{demoLoginMutation.isPending ? "Entering..." : "Continue as Demo Farmer (Instant Access)"}</span>
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
              ? "Already have an account?"
              : "New to Namma Rytha?"}{" "}
            <button
              type="button"
              onClick={() =>
                switchMode(authMode === "register" ? "signin" : "register")
              }
            >
              {authMode === "register" ? "Sign in" : "Create a free account"}
            </button>
          </p>
        </section>

        <div className="auth-trust">
          <ShieldCheck size={16} /> Your session is encrypted with standard session cookies ·{" "}
          <Link href="/">Privacy-first farm tools</Link>
        </div>
      </div>
    </main>
  );
}
