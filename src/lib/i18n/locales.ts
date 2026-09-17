// The languages the onboarding dialog offers. `label` is the language's own
// name (so people recognise it), `en` is the English name for the picker's
// search/tooltips, and `rtl` switches the page to right-to-left.
//
// All UI strings are translated; guide/home *content* translation is a separate
// later pass (it will be machine-translated and cached), so those stay English.

export type LocaleCode =
  | "en" | "ru" | "fil" | "zh" | "es" | "id" | "fr" | "de" | "th" | "ar" | "pt" | "ja"
  | "ko" | "vi" | "tr" | "hi" | "it" | "pl" | "nl" | "sv" | "uk" | "fa" | "ms";

export interface LocaleInfo {
  code: LocaleCode;
  label: string;
  en: string;
  rtl?: boolean;
}

export const LOCALES: LocaleInfo[] = [
  { code: "en", label: "English", en: "English" },
  { code: "ru", label: "Русский", en: "Russian" },
  { code: "fil", label: "Filipino", en: "Filipino" },
  { code: "zh", label: "中文", en: "Chinese" },
  { code: "es", label: "Español", en: "Spanish" },
  { code: "id", label: "Bahasa Indonesia", en: "Indonesian" },
  { code: "fr", label: "Français", en: "French" },
  { code: "de", label: "Deutsch", en: "German" },
  { code: "th", label: "ไทย", en: "Thai" },
  { code: "ar", label: "العربية", en: "Arabic", rtl: true },
  { code: "pt", label: "Português", en: "Portuguese" },
  { code: "ja", label: "日本語", en: "Japanese" },
  { code: "ko", label: "한국어", en: "Korean" },
  { code: "vi", label: "Tiếng Việt", en: "Vietnamese" },
  { code: "tr", label: "Türkçe", en: "Turkish" },
  { code: "hi", label: "हिन्दी", en: "Hindi" },
  { code: "it", label: "Italiano", en: "Italian" },
  { code: "pl", label: "Polski", en: "Polish" },
  { code: "nl", label: "Nederlands", en: "Dutch" },
  { code: "sv", label: "Svenska", en: "Swedish" },
  { code: "uk", label: "Українська", en: "Ukrainian" },
  { code: "fa", label: "فارسی", en: "Persian", rtl: true },
  { code: "ms", label: "Bahasa Melayu", en: "Malay" },
];

const CODES = new Set(LOCALES.map((l) => l.code));

export function normalizeLocale(value: unknown): LocaleCode {
  const v = typeof value === "string" ? value.toLowerCase().split("-")[0] : "";
  return (CODES.has(v as LocaleCode) ? v : "en") as LocaleCode;
}

export function isRtl(code: string) {
  return !!LOCALES.find((l) => l.code === code)?.rtl;
}
