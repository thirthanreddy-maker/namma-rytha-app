import { useEffect, useState } from "react";
import { ArrowRight, Check, ChevronDown, Droplets, Leaf, Menu, Phone, ShieldCheck, Sprout, TrendingUp, X } from "lucide-react";
import { Link } from "wouter";
import { startLogin } from "@/const";
import ThemeToggle from "@/components/ThemeToggle";

const languages = {
  English: {
    navFeatures: "Features", navHow: "How it works", navSignIn: "Sign in", heroKicker: "A calmer day on the farm", heroTitle: "Make every farm decision with more confidence.", heroBody: "Namma Rytha brings weather, irrigation, soil health, crop checks, and market rates together in one simple workspace for Indian farmers.", start: "Create your free account", see: "See how it works", data: "Your data stays yours", lowBandwidth: "Works on low-bandwidth networks", previewGreeting: "GOOD MORNING, RAVI", previewTitle: "Your farm at a glance", previewDate: "Tuesday · 15 September 2026", moisture: "SOIL MOISTURE", healthy: "Healthy range", rate: "TOMATO RATE", week: "+8.4% this week", advisory: "FARM ADVISORY", advisoryText: "Irrigate tomato plot within 4 hours", rain: "28° · 40% rain", synced: "● Sensors synced", proofOne: "One workspace", proofOneText: "for the decisions that matter every day", proofTwo: "Made for India", proofTwoText: "with local crops, weather, and market context", proofThree: "Simple by design", proofThreeText: "for phone-first, low-bandwidth field work", what: "WHAT YOU CAN DO", sectionTitle: "Less guessing. More knowing.", sectionBody: "Bring your daily farm signals into one clear view, so you can spend less time switching between apps and more time acting at the right moment.", irrigateTitle: "Irrigate with timing", irrigateText: "Combine soil moisture and rain probability to decide when to water—and when to wait.", cropTitle: "Check crop health", cropText: "Upload a crop photo for a careful first check, with low-confidence cases flagged for review.", sellTitle: "Sell with context", sellText: "See nearby mandi rates and recent movement before planning your next sale.", fieldUse: "Built for field use", startKicker: "START IN A FEW MINUTES", howTitle: "A clearer rhythm for every season.", howBody: "Set up your farm once. Namma Rytha keeps the useful signals close at hand, even when the network is not.", stepOne: "Add your farm", stepOneText: "Choose your location, crops, and plots.", stepTwo: "See today’s priorities", stepTwoText: "Weather, moisture, tasks, and market signals in one view.", stepThree: "Act with confidence", stepThreeText: "Use simple recommendations and keep a history over time.", ready: "READY WHEN YOU ARE", ctaTitle: "Give your farm a calmer, clearer day.", footer: "Built for farmers. Designed for real field conditions.", restore: "Restore account", support: "Support",
  },
  Kannada: {
    navFeatures: "ಸೌಲಭ್ಯಗಳು", navHow: "ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ", navSignIn: "ಲಾಗಿನ್", heroKicker: "ಹೊಲದ ದಿನಚರಿ ಸುಲಭವಾಗಲಿ", heroTitle: "ಪ್ರತಿ ಕೃಷಿ ನಿರ್ಧಾರಕ್ಕೂ ನಂಬಿಕೆ ಇರಲಿ.", heroBody: "ಹವಾಮಾನ, ನೀರಾವರಿ, ಮಣ್ಣಿನ ಆರೋಗ್ಯ, ಬೆಳೆ ಪರೀಕ್ಷೆ ಮತ್ತು ಮಾರುಕಟ್ಟೆ ದರಗಳನ್ನು ಒಂದೇ ಸರಳ ಸ್ಥಳದಲ್ಲಿ ನೋಡಿ.", start: "ಉಚಿತ ಖಾತೆ ತೆರೆಯಿರಿ", see: "ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ ನೋಡಿ", data: "ನಿಮ್ಮ ಮಾಹಿತಿ ನಿಮ್ಮದೇ", lowBandwidth: "ಕಡಿಮೆ ನೆಟ್‌ವರ್ಕ್‌ನಲ್ಲೂ ಕೆಲಸ ಮಾಡುತ್ತದೆ", previewGreeting: "ಶುಭೋದಯ, ರವಿ", previewTitle: "ನಿಮ್ಮ ಹೊಲದ ಒಂದು ನೋಟ", previewDate: "ಮಂಗಳವಾರ · 15 ಸೆಪ್ಟೆಂಬರ್ 2026", moisture: "ಮಣ್ಣಿನ ತೇವಾಂಶ", healthy: "ಆರೋಗ್ಯಕರ ಮಟ್ಟ", rate: "ಟೊಮೆಟೊ ದರ", week: "ಈ ವಾರ +8.4%", advisory: "ಕೃಷಿ ಸಲಹೆ", advisoryText: "4 ಗಂಟೆಗಳೊಳಗೆ ಟೊಮೆಟೊ ಪ್ಲಾಟ್‌ಗೆ ನೀರು ನೀಡಿ", rain: "28° · 40% ಮಳೆ", synced: "● ಸೆನ್ಸರ್‌ಗಳು ಸಿಂಕ್ ಆಗಿವೆ", proofOne: "ಒಂದೇ ಕಾರ್ಯಕ್ಷೇತ್ರ", proofOneText: "ಪ್ರತಿದಿನದ ಮುಖ್ಯ ನಿರ್ಧಾರಗಳಿಗಾಗಿ", proofTwo: "ಭಾರತಕ್ಕಾಗಿ ನಿರ್ಮಿತ", proofTwoText: "ಸ್ಥಳೀಯ ಬೆಳೆ, ಹವಾಮಾನ ಮತ್ತು ಮಾರುಕಟ್ಟೆ ಮಾಹಿತಿಯೊಂದಿಗೆ", proofThree: "ಸರಳ ವಿನ್ಯಾಸ", proofThreeText: "ಫೋನ್ ಮತ್ತು ಕಡಿಮೆ ನೆಟ್‌ವರ್ಕ್‌ಗಾಗಿ", what: "ನೀವು ಮಾಡಬಹುದಾದದ್ದು", sectionTitle: "ಊಹೆ ಕಡಿಮೆ. ತಿಳುವಳಿಕೆ ಹೆಚ್ಚು.", sectionBody: "ನಿಮ್ಮ ಹೊಲದ ದೈನಂದಿನ ಮಾಹಿತಿಯನ್ನು ಒಂದೇ ಸ್ಪಷ್ಟ ಸ್ಥಳದಲ್ಲಿ ನೋಡಿ ಮತ್ತು ಸರಿಯಾದ ಸಮಯದಲ್ಲಿ ಕ್ರಮ ಕೈಗೊಳ್ಳಿ.", irrigateTitle: "ಸರಿಯಾದ ಸಮಯದಲ್ಲಿ ನೀರಾವರಿ", irrigateText: "ಮಣ್ಣಿನ ತೇವಾಂಶ ಮತ್ತು ಮಳೆಯ ಸಾಧ್ಯತೆಯನ್ನು ನೋಡಿ ನೀರು ಹಾಕಬೇಕೇ ಅಥವಾ ಕಾಯಬೇಕೇ ಎಂದು ನಿರ್ಧರಿಸಿ.", cropTitle: "ಬೆಳೆ ಆರೋಗ್ಯ ಪರಿಶೀಲಿಸಿ", cropText: "ಬೆಳೆ ಚಿತ್ರದ ಮೂಲಕ ಮೊದಲ ಪರಿಶೀಲನೆ ಮಾಡಿ; ಕಡಿಮೆ ನಂಬಿಕೆಯ ಫಲಿತಾಂಶಗಳನ್ನು ತಜ್ಞರ ಪರಿಶೀಲನೆಗೆ ಕಳುಹಿಸಿ.", sellTitle: "ಮಾಹಿತಿಯೊಂದಿಗೆ ಮಾರಾಟ ಮಾಡಿ", sellText: "ಬೆಳೆ ಮಾರಾಟದ ಮೊದಲು ಹತ್ತಿರದ ಮಂಡಿ ದರ ಮತ್ತು ಇತ್ತೀಚಿನ ಬದಲಾವಣೆಗಳನ್ನು ನೋಡಿ.", fieldUse: "ಹೊಲದ ಬಳಕೆಗೆ ನಿರ್ಮಿತ", startKicker: "ಕೆಲವೇ ನಿಮಿಷಗಳಲ್ಲಿ ಪ್ರಾರಂಭಿಸಿ", howTitle: "ಪ್ರತಿ ಋತುವಿಗೂ ಸ್ಪಷ್ಟವಾದ ಕ್ರಮ.", howBody: "ನಿಮ್ಮ ಹೊಲವನ್ನು ಒಮ್ಮೆ ಹೊಂದಿಸಿ. ನೆಟ್‌ವರ್ಕ್ ಇಲ್ಲದಿದ್ದರೂ ಮುಖ್ಯ ಮಾಹಿತಿಯನ್ನು ಹತ್ತಿರದಲ್ಲೇ ಇಡಿ.", stepOne: "ನಿಮ್ಮ ಹೊಲ ಸೇರಿಸಿ", stepOneText: "ಸ್ಥಳ, ಬೆಳೆ ಮತ್ತು ಪ್ಲಾಟ್ ಆಯ್ಕೆಮಾಡಿ.", stepTwo: "ಇಂದಿನ ಆದ್ಯತೆ ನೋಡಿ", stepTwoText: "ಹವಾಮಾನ, ತೇವಾಂಶ, ಕೆಲಸಗಳು ಮತ್ತು ಮಾರುಕಟ್ಟೆ ದರ ಒಂದೇ ನೋಟದಲ್ಲಿ.", stepThree: "ಆತ್ಮವಿಶ್ವಾಸದಿಂದ ಕ್ರಮ ಕೈಗೊಳ್ಳಿ", stepThreeText: "ಸರಳ ಸಲಹೆಗಳನ್ನು ಬಳಸಿ ಮತ್ತು ಕಾಲಕ್ರಮದಲ್ಲಿ ಇತಿಹಾಸ ಉಳಿಸಿ.", ready: "ನೀವು ಸಿದ್ಧರಾಗಿದ್ದೀರಿ", ctaTitle: "ನಿಮ್ಮ ಹೊಲದ ದಿನವನ್ನು ಇನ್ನಷ್ಟು ಸರಳವಾಗಿಸಿ.", footer: "ರೈತರಿಗಾಗಿ. ನಿಜವಾದ ಹೊಲದ ಪರಿಸ್ಥಿತಿಗಳಿಗೆ ವಿನ್ಯಾಸಗೊಳಿಸಲಾಗಿದೆ.", restore: "ಖಾತೆ ಮರುಸ್ಥಾಪಿಸಿ", support: "ಸಹಾಯ",
  },
  Hindi: {
    navFeatures: "सुविधाएँ", navHow: "यह कैसे काम करता है", navSignIn: "साइन इन", heroKicker: "खेत का दिन थोड़ा आसान", heroTitle: "हर खेती के फैसले में भरोसा रखें।", heroBody: "मौसम, सिंचाई, मिट्टी, फसल जांच और मंडी भाव एक ही आसान जगह पर देखें।", start: "मुफ्त खाता बनाएं", see: "यह कैसे काम करता है", data: "आपका डेटा आपका है", lowBandwidth: "कम नेटवर्क में भी काम करता है", previewGreeting: "सुप्रभात, रवि", previewTitle: "आपके खेत की एक झलक", previewDate: "मंगलवार · 15 सितंबर 2026", moisture: "मिट्टी की नमी", healthy: "स्वस्थ स्तर", rate: "टमाटर का भाव", week: "इस सप्ताह +8.4%", advisory: "खेत की सलाह", advisoryText: "4 घंटे के भीतर टमाटर वाले खेत में सिंचाई करें", rain: "28° · 40% बारिश", synced: "● सेंसर सिंक हो गए", proofOne: "एक ही कार्यक्षेत्र", proofOneText: "हर दिन के जरूरी फैसलों के लिए", proofTwo: "भारत के लिए बनाया गया", proofTwoText: "स्थानीय फसल, मौसम और मंडी जानकारी के साथ", proofThree: "सरल डिजाइन", proofThreeText: "फोन और कम नेटवर्क वाले खेतों के लिए", what: "आप क्या कर सकते हैं", sectionTitle: "अनुमान कम। जानकारी ज्यादा।", sectionBody: "अपने खेत की रोज़ की जानकारी एक जगह देखें और सही समय पर कार्रवाई करें।", irrigateTitle: "सही समय पर सिंचाई", irrigateText: "मिट्टी की नमी और बारिश की संभावना देखकर तय करें कि पानी देना है या इंतजार करना है।", cropTitle: "फसल का स्वास्थ्य जांचें", cropText: "फसल की फोटो से पहली जांच करें और कम भरोसे वाले मामलों को विशेषज्ञ के पास भेजें।", sellTitle: "जानकारी के साथ बेचें", sellText: "फसल बेचने से पहले पास की मंडी के भाव और हाल के बदलाव देखें।", fieldUse: "खेत में उपयोग के लिए बनाया गया", startKicker: "कुछ ही मिनटों में शुरू करें", howTitle: "हर मौसम के लिए आसान लय।", howBody: "अपने खेत को एक बार सेट करें। नेटवर्क न होने पर भी जरूरी संकेत पास रखें।", stepOne: "अपना खेत जोड़ें", stepOneText: "अपनी जगह, फसल और प्लॉट चुनें।", stepTwo: "आज की प्राथमिकताएं देखें", stepTwoText: "मौसम, नमी, काम और मंडी भाव एक ही जगह देखें।", stepThree: "भरोसे के साथ काम करें", stepThreeText: "सरल सलाह लें और समय के साथ अपना इतिहास रखें।", ready: "जब आप तैयार हों", ctaTitle: "अपने खेत का दिन और शांत, साफ बनाएं।", footer: "किसानों के लिए बनाया गया। खेत की असली परिस्थितियों के लिए डिजाइन किया गया।", restore: "खाता पुनर्स्थापित करें", support: "सहायता",
  },
} as const;

type Language = keyof typeof languages;

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
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("namma-rytha-language") as Language) || "English");
  const [menuOpen, setMenuOpen] = useState(false);
  const t = languages[language];

  useEffect(() => {
    localStorage.setItem("namma-rytha-language", language);
    document.documentElement.lang = language === "Kannada" ? "kn" : language === "Hindi" ? "hi" : "en";
  }, [language]);

  const begin = (source: string) => {
    track("landing_cta_click", { source, language });
    window.location.href = "/auth?mode=register";
  };

  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Primary navigation">
        <Link href="/" className="landing-brand" onClick={() => track("brand_click")}><span className="landing-mark"><Sprout size={20} /></span><span><strong>Namma Rytha</strong><small>ನಮ್ಮ ರೈತ · Smart farming</small></span></Link>
        <div className={`landing-links ${menuOpen ? "is-open" : ""}`}>
          <a href="#features" onClick={() => track("nav_features_click")}>{t.navFeatures}</a>
          <a href="#how-it-works" onClick={() => track("nav_how_click")}>{t.navHow}</a>
          <button className="landing-signin mobile-signin" onClick={() => { track("signin_click", { source: "nav" }); window.location.href = "/auth?mode=signin"; }}>{t.navSignIn}</button>
        </div>
        <div className="landing-actions">
          <ThemeToggle compact />
          <label className="language-select"><span className="sr-only">Language</span><select value={language} onChange={(event) => { setLanguage(event.target.value as Language); track("language_change", { language: event.target.value }); }}><option>English</option><option>Kannada</option><option>Hindi</option></select><ChevronDown size={14} /></label>
          <button className="landing-signin desktop-signin" onClick={() => { track("signin_click", { source: "nav" }); window.location.href = "/auth?mode=signin"; }}>{t.navSignIn}</button>
          <button className="menu-toggle" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="hero-copy">
          <span className="landing-eyebrow"><span className="eyebrow-dot" /> {t.heroKicker}</span>
          <h1>{t.heroTitle}</h1>
          <p>{t.heroBody}</p>
          <div className="hero-actions"><button className="landing-primary" onClick={() => begin("hero")}>{t.start} <ArrowRight size={17} /></button><a className="landing-secondary" href="#how-it-works" onClick={() => track("how_it_works_click")}>{t.see}</a></div>
          <div className="hero-trust"><span><ShieldCheck size={16} /> {t.data}</span><span><Phone size={15} /> {t.lowBandwidth}</span></div>
        </div>
        <div className="hero-visual" aria-label="Namma Rytha dashboard preview">
          <div className="sun-orb" /><div className="field-line field-one" /><div className="field-line field-two" /><div className="field-line field-three" />
          <div className="dashboard-preview"><div className="preview-top"><span><Sprout size={15} /> Namma Rytha</span><span className="preview-avatar">R</span></div><div className="preview-welcome"><small>{t.previewGreeting}</small><strong>{t.previewTitle}</strong><span>{t.previewDate}</span></div><div className="preview-grid"><div className="preview-card preview-green"><Droplets size={17} /><small>{t.moisture}</small><strong>46%</strong><span>{t.healthy}</span></div><div className="preview-card preview-blue"><TrendingUp size={17} /><small>{t.rate}</small><strong>₹2,840</strong><span className="up">{t.week}</span></div></div><div className="preview-advisory"><span className="advisory-icon"><Leaf size={16} /></span><span><small>{t.advisory}</small><strong>{t.advisoryText}</strong></span><ArrowRight size={16} /></div></div>
          <span className="floating-note note-weather">{t.rain}</span><span className="floating-note note-sensor">{t.synced}</span>
        </div>
      </section>

      <section className="landing-proof" aria-label="Product benefits"><div><strong>{t.proofOne}</strong><span>{t.proofOneText}</span></div><div><strong>{t.proofTwo}</strong><span>{t.proofTwoText}</span></div><div><strong>{t.proofThree}</strong><span>{t.proofThreeText}</span></div></section>

      <section className="landing-section" id="features"><div className="section-heading"><span className="landing-eyebrow">{t.what}</span><h2>{t.sectionTitle}</h2><p>{t.sectionBody}</p></div><div className="feature-cards"><Feature icon={Droplets} title={t.irrigateTitle} text={t.irrigateText} tone="green" fieldUse={t.fieldUse} /><Feature icon={Leaf} title={t.cropTitle} text={t.cropText} tone="amber" fieldUse={t.fieldUse} /><Feature icon={TrendingUp} title={t.sellTitle} text={t.sellText} tone="blue" fieldUse={t.fieldUse} /></div></section>

      <section className="how-section" id="how-it-works"><div><span className="landing-eyebrow light">{t.startKicker}</span><h2>{t.howTitle}</h2><p>{t.howBody}</p><button className="landing-primary light-button" onClick={() => begin("how_it_works")}>{t.start} <ArrowRight size={17} /></button></div><ol className="steps"><li><span>01</span><div><strong>{t.stepOne}</strong><p>{t.stepOneText}</p></div></li><li><span>02</span><div><strong>{t.stepTwo}</strong><p>{t.stepTwoText}</p></div></li><li><span>03</span><div><strong>{t.stepThree}</strong><p>{t.stepThreeText}</p></div></li></ol></section>
      <section className="landing-cta"><div><span className="landing-eyebrow">{t.ready}</span><h2>{t.ctaTitle}</h2></div><button className="landing-primary" onClick={() => begin("footer")}>{t.start} <ArrowRight size={17} /></button></section>
      <footer className="landing-footer"><span>© 2026 Namma Rytha</span><span>{t.footer}</span><span><a href="/auth?mode=restore" onClick={() => track("restore_click", { source: "footer" })}>{t.restore}</a> · <a href="mailto:support@namma-rytha.example">{t.support}</a></span></footer>
    </main>
  );
}

function Feature({ icon: Icon, title, text, tone, fieldUse }: { icon: typeof Droplets; title: string; text: string; tone: string; fieldUse: string }) { return <article className={`landing-feature ${tone}`}><span className="feature-icon-large"><Icon size={21} /></span><h3>{title}</h3><p>{text}</p><span className="feature-check"><Check size={14} /> {fieldUse}</span></article>; }
