import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import enNavigation from "./locales/en/navigation.json";
import enDashboard from "./locales/en/dashboard.json";
import enAuthentication from "./locales/en/authentication.json";
import enFarm from "./locales/en/farm.json";
import enCrop from "./locales/en/crop.json";
import enIrrigation from "./locales/en/irrigation.json";
import enMarket from "./locales/en/market.json";
import enCommunity from "./locales/en/community.json";
import enReports from "./locales/en/reports.json";
import enSettings from "./locales/en/settings.json";
import enNotifications from "./locales/en/notifications.json";
import enValidation from "./locales/en/validation.json";

import knCommon from "./locales/kn/common.json";
import knNavigation from "./locales/kn/navigation.json";
import knDashboard from "./locales/kn/dashboard.json";
import knAuthentication from "./locales/kn/authentication.json";
import knFarm from "./locales/kn/farm.json";
import knCrop from "./locales/kn/crop.json";
import knIrrigation from "./locales/kn/irrigation.json";
import knMarket from "./locales/kn/market.json";
import knCommunity from "./locales/kn/community.json";
import knReports from "./locales/kn/reports.json";
import knSettings from "./locales/kn/settings.json";
import knNotifications from "./locales/kn/notifications.json";
import knValidation from "./locales/kn/validation.json";

import hiCommon from "./locales/hi/common.json";
import hiNavigation from "./locales/hi/navigation.json";
import hiDashboard from "./locales/hi/dashboard.json";
import hiAuthentication from "./locales/hi/authentication.json";
import hiFarm from "./locales/hi/farm.json";
import hiCrop from "./locales/hi/crop.json";
import hiIrrigation from "./locales/hi/irrigation.json";
import hiMarket from "./locales/hi/market.json";
import hiCommunity from "./locales/hi/community.json";
import hiReports from "./locales/hi/reports.json";
import hiSettings from "./locales/hi/settings.json";
import hiNotifications from "./locales/hi/notifications.json";
import hiValidation from "./locales/hi/validation.json";

import teCommon from "./locales/te/common.json";
import teNavigation from "./locales/te/navigation.json";
import teDashboard from "./locales/te/dashboard.json";
import teAuthentication from "./locales/te/authentication.json";
import teFarm from "./locales/te/farm.json";
import teCrop from "./locales/te/crop.json";
import teIrrigation from "./locales/te/irrigation.json";
import teMarket from "./locales/te/market.json";
import teCommunity from "./locales/te/community.json";
import teReports from "./locales/te/reports.json";
import teSettings from "./locales/te/settings.json";
import teNotifications from "./locales/te/notifications.json";
import teValidation from "./locales/te/validation.json";

import taCommon from "./locales/ta/common.json";
import taNavigation from "./locales/ta/navigation.json";
import taDashboard from "./locales/ta/dashboard.json";
import taAuthentication from "./locales/ta/authentication.json";
import taFarm from "./locales/ta/farm.json";
import taCrop from "./locales/ta/crop.json";
import taIrrigation from "./locales/ta/irrigation.json";
import taMarket from "./locales/ta/market.json";
import taCommunity from "./locales/ta/community.json";
import taReports from "./locales/ta/reports.json";
import taSettings from "./locales/ta/settings.json";
import taNotifications from "./locales/ta/notifications.json";
import taValidation from "./locales/ta/validation.json";

export type AppLangCode = "en" | "kn" | "hi" | "te" | "ta";
export type AppLangName = "English" | "Kannada" | "Hindi" | "Telugu" | "Tamil";

export const SUPPORTED_LANGUAGES: Array<{
  code: AppLangCode;
  name: AppLangName;
  nativeLabel: string;
  localeTag: string;
  speechTag: string;
}> = [
  { code: "en", name: "English", nativeLabel: "English", localeTag: "en-IN", speechTag: "en-IN" },
  { code: "kn", name: "Kannada", nativeLabel: "ಕನ್ನಡ", localeTag: "kn-IN", speechTag: "kn-IN" },
  { code: "hi", name: "Hindi", nativeLabel: "हिन्दी", localeTag: "hi-IN", speechTag: "hi-IN" },
  { code: "te", name: "Telugu", nativeLabel: "తెలుగు", localeTag: "te-IN", speechTag: "te-IN" },
  { code: "ta", name: "Tamil", nativeLabel: "தமிழ்", localeTag: "ta-IN", speechTag: "ta-IN" },
];

export const LANG_CODE_TO_NAME: Record<AppLangCode, AppLangName> = {
  en: "English",
  kn: "Kannada",
  hi: "Hindi",
  te: "Telugu",
  ta: "Tamil",
};

export const LANG_NAME_TO_CODE: Record<string, AppLangCode> = {
  English: "en",
  Kannada: "kn",
  Hindi: "hi",
  Telugu: "te",
  Tamil: "ta",
  en: "en",
  kn: "kn",
  hi: "hi",
  te: "te",
  ta: "ta",
};

export const LOCALE_TAGS: Record<AppLangCode, string> = {
  en: "en-IN",
  kn: "kn-IN",
  hi: "hi-IN",
  te: "te-IN",
  ta: "ta-IN",
};

const STORAGE_KEY_CODE = "namma-rytha-i18n-lang";
const STORAGE_KEY_LEGACY = "namma-rytha-language";

export function normalizeLangCode(input?: string | null): AppLangCode {
  if (!input) return "en";
  return LANG_NAME_TO_CODE[input] ?? "en";
}

export function getSavedLanguageCode(): AppLangCode {
  try {
    const direct = localStorage.getItem(STORAGE_KEY_CODE);
    if (direct && direct in LANG_CODE_TO_NAME) return direct as AppLangCode;
    const legacy = localStorage.getItem(STORAGE_KEY_LEGACY);
    if (legacy) return normalizeLangCode(legacy);
  } catch {
    // Ignore storage error
  }
  return "en";
}

export function persistLanguagePreference(code: AppLangCode) {
  try {
    localStorage.setItem(STORAGE_KEY_CODE, code);
    localStorage.setItem(STORAGE_KEY_LEGACY, LANG_CODE_TO_NAME[code]);
  } catch {
    // Ignore storage error
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = code;
  }
}

export const I18N_NAMESPACES = [
  "common",
  "navigation",
  "dashboard",
  "authentication",
  "farm",
  "crop",
  "irrigation",
  "market",
  "community",
  "reports",
  "settings",
  "notifications",
  "validation",
] as const;

const resources = {
  en: {
    common: enCommon,
    navigation: enNavigation,
    dashboard: enDashboard,
    authentication: enAuthentication,
    farm: enFarm,
    crop: enCrop,
    irrigation: enIrrigation,
    market: enMarket,
    community: enCommunity,
    reports: enReports,
    settings: enSettings,
    notifications: enNotifications,
    validation: enValidation,
  },
  kn: {
    common: knCommon,
    navigation: knNavigation,
    dashboard: knDashboard,
    authentication: knAuthentication,
    farm: knFarm,
    crop: knCrop,
    irrigation: knIrrigation,
    market: knMarket,
    community: knCommunity,
    reports: knReports,
    settings: knSettings,
    notifications: knNotifications,
    validation: knValidation,
  },
  hi: {
    common: hiCommon,
    navigation: hiNavigation,
    dashboard: hiDashboard,
    authentication: hiAuthentication,
    farm: hiFarm,
    crop: hiCrop,
    irrigation: hiIrrigation,
    market: hiMarket,
    community: hiCommunity,
    reports: hiReports,
    settings: hiSettings,
    notifications: hiNotifications,
    validation: hiValidation,
  },
  te: {
    common: teCommon,
    navigation: teNavigation,
    dashboard: teDashboard,
    authentication: teAuthentication,
    farm: teFarm,
    crop: teCrop,
    irrigation: teIrrigation,
    market: teMarket,
    community: teCommunity,
    reports: teReports,
    settings: teSettings,
    notifications: teNotifications,
    validation: teValidation,
  },
  ta: {
    common: taCommon,
    navigation: taNavigation,
    dashboard: taDashboard,
    authentication: taAuthentication,
    farm: taFarm,
    crop: taCrop,
    irrigation: taIrrigation,
    market: taMarket,
    community: taCommunity,
    reports: taReports,
    settings: taSettings,
    notifications: taNotifications,
    validation: taValidation,
  },
};

const initialLang = typeof window !== "undefined" ? getSavedLanguageCode() : "en";
if (typeof document !== "undefined") {
  document.documentElement.lang = initialLang;
}

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLang,
  fallbackLng: "en",
  ns: [...I18N_NAMESPACES],
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
  saveMissing: import.meta.env.DEV,
  missingKeyHandler: import.meta.env.DEV
    ? (lngs, ns, key) => {
        console.warn(`[i18n missing key] lng=${lngs.join(",")} ns=${ns} key=${key}`);
      }
    : undefined,
});

export function changeAppLanguage(langOrCode: string) {
  const code = normalizeLangCode(langOrCode);
  persistLanguagePreference(code);
  return i18n.changeLanguage(code);
}

// ── Locale-aware formatting helpers (Asia/Kolkata) ───────────────────────────
export function getActiveLocaleTag(langCode?: string): string {
  const code = normalizeLangCode(langCode ?? i18n.language);
  return LOCALE_TAGS[code] ?? "en-IN";
}

export function formatCurrency(amount: number, langCode?: string): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(getActiveLocaleTag(langCode), {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(safe);
  } catch {
    return `₹${Math.round(safe).toLocaleString("en-IN")}`;
  }
}

export function formatNumber(value: number, langCode?: string, maximumFractionDigits = 2): string {
  const safe = Number.isFinite(value) ? value : 0;
  try {
    return new Intl.NumberFormat(getActiveLocaleTag(langCode), {
      maximumFractionDigits,
    }).format(safe);
  } catch {
    return safe.toLocaleString("en-IN");
  }
}

export function formatDate(
  value: Date | string | number,
  langCode?: string,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" },
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(getActiveLocaleTag(langCode), {
      timeZone: "Asia/Kolkata",
      ...options,
    }).format(date);
  } catch {
    return date.toLocaleDateString("en-IN", options);
  }
}

export function formatDateTime(value: Date | string | number, langCode?: string): string {
  return formatDate(value, langCode, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default i18n;
