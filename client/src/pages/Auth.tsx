import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, HelpCircle, KeyRound, LoaderCircle, LockKeyhole, Phone, ShieldCheck, Sprout, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import ThemeToggle from "@/components/ThemeToggle";

const OAUTH_TIMEOUT_MS = 15_000;
const OAUTH_MAX_ATTEMPTS = 3;
const OAUTH_RETRY_COOLDOWN_MS = 60_000;
const OAUTH_ATTEMPTS_KEY = "namma-rytha-oauth-attempts";
const OAUTH_PENDING_KEY = "namma-rytha-oauth-pending";

function track(event: string, properties?: Record<string, string>) {
  try {
    const key = "namma-rytha-funnel";
    const events = JSON.parse(sessionStorage.getItem(key) || "[]");
    events.push({ event, properties, path: window.location.pathname, timestamp: new Date().toISOString() });
    sessionStorage.setItem(key, JSON.stringify(events.slice(-100)));
  } catch {}
  const umami = (window as Window & { umami?: { track: (name: string, data?: Record<string, string>) => void } }).umami;
  umami?.track(event, properties);
}

function readAttemptCount() {
  try {
    const raw = sessionStorage.getItem(OAUTH_ATTEMPTS_KEY) || "0";
    const parsed = JSON.parse(raw) as { count?: number; startedAt?: number };
    if (parsed.startedAt && Date.now() - parsed.startedAt >= OAUTH_RETRY_COOLDOWN_MS) { sessionStorage.removeItem(OAUTH_ATTEMPTS_KEY); return 0; }
    return Math.min(Number(parsed.count ?? Number(raw) ?? 0), OAUTH_MAX_ATTEMPTS);
  } catch { return 0; }
}

export default function Auth() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode") || "signin";
  const oauthError = params.get("oauthError");
  const [authMode, setAuthMode] = useState<"signin" | "register" | "restore">(mode === "register" || mode === "restore" ? mode : "signin");
  const [method, setMethod] = useState<"secure" | "phone">("secure");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthTimedOut, setOauthTimedOut] = useState(false);
  const [oauthAttempts, setOauthAttempts] = useState(readAttemptCount);
  const [troubleshootingOpen, setTroubleshootingOpen] = useState(false);
  const sendOtpMutation = trpc.auth.phoneOtpSend.useMutation();
  const verifyOtpMutation = trpc.auth.phoneOtpVerify.useMutation();

  useEffect(() => {
    if (!oauthLoading) return;
    const timeoutId = window.setTimeout(() => {
      setOauthLoading(false);
      setOauthTimedOut(true);
      setError("Secure sign-in took too long to respond. Check your connection, then try again.");
      try { sessionStorage.removeItem(OAUTH_PENDING_KEY); } catch {}
      track("auth_oauth_timeout", { attempts: String(oauthAttempts) });
    }, OAUTH_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [oauthLoading, oauthAttempts]);

  useEffect(() => {
    if (!troubleshootingOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setTroubleshootingOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [troubleshootingOpen]);

  useEffect(() => {
    if (oauthAttempts < OAUTH_MAX_ATTEMPTS) return;
    const cooldownId = window.setTimeout(() => {
      try { sessionStorage.removeItem(OAUTH_ATTEMPTS_KEY); } catch {}
      setOauthAttempts(0);
      setError("");
    }, OAUTH_RETRY_COOLDOWN_MS);
    return () => window.clearTimeout(cooldownId);
  }, [oauthAttempts]);

  const switchMode = (next: typeof authMode) => {
    setAuthMode(next);
    setError("");
    setNotice("");
    setOauthTimedOut(false);
    setLocation(`/auth?mode=${next}`);
    track("auth_mode_view", { mode: next });
  };

  const beginOAuth = () => {
    setError("");
    setOauthTimedOut(false);
    if (oauthAttempts >= OAUTH_MAX_ATTEMPTS) {
      setError("You’ve reached the secure sign-in retry limit. Wait a moment, check your browser cookies, or use Phone OTP instead.");
      setTroubleshootingOpen(true);
      return;
    }
    const nextAttempts = oauthAttempts + 1;
    setOauthAttempts(nextAttempts);
    setOauthLoading(true);
    try {
      sessionStorage.setItem(OAUTH_ATTEMPTS_KEY, JSON.stringify({ count: nextAttempts, startedAt: Date.now() }));
      sessionStorage.setItem(OAUTH_PENDING_KEY, String(Date.now()));
    } catch {}
    try {
      track("auth_oauth_click", { mode: authMode, attempt: String(nextAttempts) });
      startLogin("/app");
    } catch (startError) {
      setOauthLoading(false);
      try { sessionStorage.removeItem(OAUTH_PENDING_KEY); } catch {}
      setError(startError instanceof Error ? startError.message : "Secure sign-in is not configured yet.");
    }
  };

  const sendOtp = async () => {
    setError("");
    if (!/^\+?[0-9 ()-]{10,}$/.test(phone)) { setError("Enter a valid phone number with country code."); return; }
    try {
      const result = await sendOtpMutation.mutateAsync({ phone });
      setOtpSent(true);
      setNotice(`A verification code was sent to ${result.phoneMasked}.`);
      track("auth_phone_otp_requested", { mode: authMode });
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "SMS verification is temporarily unavailable. Configure Redis and Twilio to enable phone sign-in.");
    }
  };

  const verifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) { setError("Enter the 6-digit code sent to your phone."); return; }
    try {
      await verifyOtpMutation.mutateAsync({ phone, code: otp });
      track("auth_phone_otp_submitted", { mode: authMode });
      window.location.href = "/app?welcome=1";
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "We could not verify that code right now.");
    }
  };

  const oauthMessage = oauthError === "provider" ? "Sign-in was cancelled or declined. You can try again whenever you’re ready." : oauthError === "missing" ? "The sign-in response was incomplete. Please start again." : oauthError === "server" ? "We couldn’t finish signing you in. Please try again." : "";
  const timeoutMessage = oauthTimedOut ? "Secure sign-in took too long to respond. You can retry once your connection is stable." : "";
  const friendlyMessage = oauthMessage || timeoutMessage;
  const secureButtonLabel = oauthAttempts >= OAUTH_MAX_ATTEMPTS ? "Retry limit reached" : friendlyMessage ? "Try secure sign-in again" : "Continue securely";

  return <main className="auth-page"><div className="auth-shell"><div className="auth-topline"><Link href="/" className="auth-back"><ArrowLeft size={16} /> Back to Namma Rytha</Link><ThemeToggle compact /></div><div className="auth-brand"><span className="landing-mark"><Sprout size={20} /></span><span><strong>Namma Rytha</strong><small>ನಮ್ಮ ರೈತ · Smart farming</small></span></div><section className="auth-card"><div className="auth-heading"><span className="auth-kicker">{authMode === "restore" ? "RETURNING FARMER" : "FARMER ACCESS"}</span><h1>{authMode === "register" ? "Create your farm account" : authMode === "restore" ? "Restore your account" : friendlyMessage ? "Let’s try that again" : "Welcome back to your farm"}</h1><p>{friendlyMessage || (authMode === "register" ? "Start with your farm basics. You can add plots and sensors later." : authMode === "restore" ? "Sign in securely first, then restore your account from the Profile workspace." : "Sign in to see today’s priorities, weather, and crop signals.")}</p></div>{friendlyMessage && <div className="oauth-error-card" role="alert"><span className="oauth-error-icon">!</span><span><strong>Authentication didn’t complete</strong><small>Your account is safe. Use the button below to retry secure sign-in.</small></span></div>}{authMode === "restore" && <div className="restore-callout"><KeyRound size={18} /><span><strong>Have a backup file?</strong><small>Account restoration will be available after you sign in.</small></span></div>}<div className="method-tabs" role="tablist" aria-label="Sign-in method"><button type="button" className={method === "secure" ? "active" : ""} role="tab" aria-selected={method === "secure"} onClick={() => { setMethod("secure"); setError(""); setNotice(""); }}><LockKeyhole size={15} /> Secure provider</button><button type="button" className={method === "phone" ? "active" : ""} role="tab" aria-selected={method === "phone"} onClick={() => { setMethod("phone"); setError(""); track("auth_method_select", { method: "phone" }); }}><Phone size={15} /> Phone OTP</button></div>{method === "secure" ? <div className="secure-method"><div className="secure-method-icon"><LockKeyhole size={21} /></div><h2>Use your trusted sign-in</h2><p>Continue with Google, Microsoft, or Apple. Namma Rytha never stores your provider password.</p><button className="auth-submit" type="button" onClick={beginOAuth} disabled={oauthLoading || oauthAttempts >= OAUTH_MAX_ATTEMPTS}>{oauthLoading ? <><LoaderCircle className="auth-spinner" size={17} aria-hidden="true" /><span>Opening secure sign-in…</span></> : <><span>{secureButtonLabel}</span>{oauthAttempts < OAUTH_MAX_ATTEMPTS && <ArrowRight size={17} />}</>}</button><button type="button" className="auth-help-link" onClick={() => setTroubleshootingOpen(true)}><HelpCircle size={14} /> Having trouble signing in?</button>{oauthAttempts > 0 && <small className="auth-attempt-note">{oauthAttempts >= OAUTH_MAX_ATTEMPTS ? "Retry limit reached. You can try again in about a minute." : `Retry ${oauthAttempts} of ${OAUTH_MAX_ATTEMPTS} used. We stop after ${OAUTH_MAX_ATTEMPTS} attempts to protect your account.`}</small>}</div> : <form className="auth-form" onSubmit={otpSent ? verifyOtp : (event) => { event.preventDefault(); void sendOtp(); }} noValidate><label htmlFor="auth-phone">Mobile number</label><input id="auth-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" value={phone} onChange={(event) => setPhone(event.target.value)} required />{otpSent && <><label htmlFor="auth-otp">6-digit verification code</label><input id="auth-otp" name="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="123456" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} required /></>}<button className="auth-submit" type="submit" disabled={sendOtpMutation.isPending || verifyOtpMutation.isPending}>{otpSent ? (verifyOtpMutation.isPending ? "Verifying…" : "Verify phone number") : (sendOtpMutation.isPending ? "Sending code…" : "Send verification code")} <ArrowRight size={17} /></button>{otpSent && <button type="button" className="text-action" onClick={() => { setOtpSent(false); setOtp(""); setNotice(""); }}>Use a different number</button>}<button type="button" className="auth-help-link" onClick={() => setTroubleshootingOpen(true)}><HelpCircle size={14} /> Need help with sign-in?</button></form>}{error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="form-notice" role="status"><CheckCircle2 size={16} /> {notice}</p>}<p className="auth-switch">{authMode === "register" ? "Already have an account?" : "New to Namma Rytha?"} <button type="button" onClick={() => switchMode(authMode === "register" ? "signin" : "register")}>{authMode === "register" ? "Sign in" : "Create a free account"}</button></p>{authMode !== "restore" && <button type="button" className="restore-link" onClick={() => switchMode("restore")}>Have a backup? Restore an existing account</button>}</section><div className="auth-trust"><ShieldCheck size={16} /> Your session uses encrypted, secure cookies · <Link href="/">Privacy-first farm tools</Link></div></div>{troubleshootingOpen && <div className="auth-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTroubleshootingOpen(false); }}><section className="auth-help-modal" role="dialog" aria-modal="true" aria-labelledby="auth-help-title"><button type="button" className="icon-button auth-modal-close" onClick={() => setTroubleshootingOpen(false)} aria-label="Close sign-in help"><X size={17} /></button><span className="auth-help-badge"><HelpCircle size={17} /></span><h2 id="auth-help-title">Troubleshooting sign-in</h2><p className="auth-help-intro">Try these quick fixes before starting secure sign-in again:</p><ul><li><strong>Cancelled or declined:</strong> return to the provider window and choose an account you use for Namma Rytha.</li><li><strong>Timed out:</strong> check your connection, allow pop-ups and cookies, then retry once.</li><li><strong>Redirect or cookie error:</strong> use the latest website link, keep your browser date correct, and avoid private browsing.</li><li><strong>Still stuck:</strong> switch to Phone OTP or contact the project administrator.</li></ul><div className="auth-modal-actions"><button type="button" className="secondary-button" onClick={() => setTroubleshootingOpen(false)}>Close</button><button type="button" className="primary-button" onClick={() => { setTroubleshootingOpen(false); if (oauthAttempts < OAUTH_MAX_ATTEMPTS) beginOAuth(); }}>Try again <ArrowRight size={15} /></button></div></section></div>}</main>;
}
