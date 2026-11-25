import { useState } from "react";
import { ArrowRight, Check, Droplets, Leaf, Menu, Phone, ShieldCheck, Sprout, TrendingUp, X } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";

function track(event: string, properties?: Record<string, string>) {
  const payload = { event, properties, path: window.location.pathname, timestamp: new Date().toISOString() };
  try {
    const key = "namma-rytha-funnel";
    const events = JSON.parse(localStorage.getItem(key) || "[]");
    events.push(payload);
    localStorage.setItem(key, JSON.stringify(events.slice(-100)));
  } catch {}
  const umami = (window as Window & { umami?: { track: (name: string, data?: Record<string, string>) => void } }).umami;
  umami?.track(event, properties);
}

export default function Landing() {
  const { t, i18n } = useTranslation(["dashboard", "navigation"]);
  const [menuOpen, setMenuOpen] = useState(false);

  const begin = (source: string) => {
    track("landing_cta_click", { source, language: i18n.language });
    window.location.href = "/auth?mode=register";
  };

  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Primary navigation">
        <Link href="/" className="landing-brand" onClick={() => track("brand_click")}>
          <span className="landing-mark"><Sprout size={20} /></span>
          <span>
            <strong>{t("navigation:brandName")}</strong>
            <small>{t("navigation:brandSub")}</small>
          </span>
        </Link>
        <div className={`landing-links ${menuOpen ? "is-open" : ""}`}>
          <a href="#features" onClick={() => track("nav_features_click")}>{t("dashboard:landing.navFeatures")}</a>
          <a href="#how-it-works" onClick={() => track("nav_how_click")}>{t("dashboard:landing.navHow")}</a>
          <button className="landing-signin mobile-signin" onClick={() => { track("signin_click", { source: "nav" }); window.location.href = "/auth?mode=signin"; }}>
            {t("dashboard:landing.navSignIn")}
          </button>
        </div>
        <div className="landing-actions">
          <ThemeToggle compact />
          <LanguageSwitcher compact onChanged={(lang) => track("language_change", { language: lang })} />
          <button className="landing-signin desktop-signin" onClick={() => { track("signin_click", { source: "nav" }); window.location.href = "/auth?mode=signin"; }}>
            {t("dashboard:landing.navSignIn")}
          </button>
          <button className="menu-toggle" aria-label={menuOpen ? t("dashboard:landing.closeMenu") : t("dashboard:landing.openMenu")} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="hero-copy">
          <span className="landing-eyebrow"><span className="eyebrow-dot" /> {t("dashboard:landing.heroKicker")}</span>
          <h1>{t("dashboard:landing.heroTitle")}</h1>
          <p>{t("dashboard:landing.heroBody")}</p>
          <div className="hero-actions">
            <button className="landing-primary" onClick={() => begin("hero")}>{t("dashboard:landing.start")} <ArrowRight size={17} /></button>
            <a className="landing-secondary" href="#how-it-works" onClick={() => track("how_it_works_click")}>{t("dashboard:landing.see")}</a>
          </div>
          <div className="hero-trust">
            <span><ShieldCheck size={16} /> {t("dashboard:landing.data")}</span>
            <span><Phone size={15} /> {t("dashboard:landing.lowBandwidth")}</span>
          </div>
        </div>
        <div className="hero-visual" aria-label={t("dashboard:landing.previewTitle")}>
          <div className="sun-orb" /><div className="field-line field-one" /><div className="field-line field-two" /><div className="field-line field-three" />
          <div className="dashboard-preview">
            <div className="preview-top"><span><Sprout size={15} /> {t("navigation:brandName")}</span><span className="preview-avatar">R</span></div>
            <div className="preview-welcome">
              <small>{t("dashboard:landing.previewGreeting")}</small>
              <strong>{t("dashboard:landing.previewTitle")}</strong>
              <span>{t("dashboard:landing.previewDate")}</span>
            </div>
            <div className="preview-grid">
              <div className="preview-card preview-green"><Droplets size={17} /><small>{t("dashboard:landing.moisture")}</small><strong>46%</strong><span>{t("dashboard:landing.healthy")}</span></div>
              <div className="preview-card preview-blue"><TrendingUp size={17} /><small>{t("dashboard:landing.rate")}</small><strong>₹2,840</strong><span className="up">{t("dashboard:landing.week")}</span></div>
            </div>
            <div className="preview-advisory">
              <span className="advisory-icon"><Leaf size={16} /></span>
              <span><small>{t("dashboard:landing.advisory")}</small><strong>{t("dashboard:landing.advisoryText")}</strong></span>
              <ArrowRight size={16} />
            </div>
          </div>
          <span className="floating-note note-weather">{t("dashboard:landing.rain")}</span>
          <span className="floating-note note-sensor">{t("dashboard:landing.synced")}</span>
        </div>
      </section>

      <section className="landing-proof" aria-label={t("dashboard:landing.what")}>
        <div><strong>{t("dashboard:landing.proofOne")}</strong><span>{t("dashboard:landing.proofOneText")}</span></div>
        <div><strong>{t("dashboard:landing.proofTwo")}</strong><span>{t("dashboard:landing.proofTwoText")}</span></div>
        <div><strong>{t("dashboard:landing.proofThree")}</strong><span>{t("dashboard:landing.proofThreeText")}</span></div>
      </section>

      <section className="landing-section" id="features">
        <div className="section-heading">
          <span className="landing-eyebrow">{t("dashboard:landing.what")}</span>
          <h2>{t("dashboard:landing.sectionTitle")}</h2>
          <p>{t("dashboard:landing.sectionBody")}</p>
        </div>
        <div className="feature-cards">
          <Feature icon={Droplets} title={t("dashboard:landing.irrigateTitle")} text={t("dashboard:landing.irrigateText")} tone="green" fieldUse={t("dashboard:landing.fieldUse")} />
          <Feature icon={Leaf} title={t("dashboard:landing.cropTitle")} text={t("dashboard:landing.cropText")} tone="amber" fieldUse={t("dashboard:landing.fieldUse")} />
          <Feature icon={TrendingUp} title={t("dashboard:landing.sellTitle")} text={t("dashboard:landing.sellText")} tone="blue" fieldUse={t("dashboard:landing.fieldUse")} />
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div>
          <span className="landing-eyebrow light">{t("dashboard:landing.startKicker")}</span>
          <h2>{t("dashboard:landing.howTitle")}</h2>
          <p>{t("dashboard:landing.howBody")}</p>
          <button className="landing-primary light-button" onClick={() => begin("how_it_works")}>{t("dashboard:landing.start")} <ArrowRight size={17} /></button>
        </div>
        <ol className="steps">
          <li><span>01</span><div><strong>{t("dashboard:landing.stepOne")}</strong><p>{t("dashboard:landing.stepOneText")}</p></div></li>
          <li><span>02</span><div><strong>{t("dashboard:landing.stepTwo")}</strong><p>{t("dashboard:landing.stepTwoText")}</p></div></li>
          <li><span>03</span><div><strong>{t("dashboard:landing.stepThree")}</strong><p>{t("dashboard:landing.stepThreeText")}</p></div></li>
        </ol>
      </section>

      <section className="landing-cta">
        <div><span className="landing-eyebrow">{t("dashboard:landing.ready")}</span><h2>{t("dashboard:landing.ctaTitle")}</h2></div>
        <button className="landing-primary" onClick={() => begin("footer")}>{t("dashboard:landing.start")} <ArrowRight size={17} /></button>
      </section>

      <footer className="landing-footer">
        <span>© 2026 {t("navigation:brandName")}</span>
        <span>{t("dashboard:landing.footer")}</span>
        <span><a href="/auth?mode=restore" onClick={() => track("restore_click", { source: "footer" })}>{t("dashboard:landing.restore")}</a> · <a href="mailto:support@namma-rytha.example">{t("dashboard:landing.support")}</a></span>
      </footer>
    </main>
  );
}

function Feature({ icon: Icon, title, text, tone, fieldUse }: { icon: typeof Droplets; title: string; text: string; tone: string; fieldUse: string }) {
  return (
    <article className={`landing-feature ${tone}`}>
      <span className="feature-icon-large"><Icon size={21} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      <span className="feature-check"><Check size={14} /> {fieldUse}</span>
    </article>
  );
}
