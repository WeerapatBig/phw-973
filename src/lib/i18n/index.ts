import en, { type Dict } from "./messages/en";
import ru from "./messages/ru";
import fil from "./messages/fil";
import zh from "./messages/zh";
import es from "./messages/es";
import id from "./messages/id";
import fr from "./messages/fr";
import de from "./messages/de";
import th from "./messages/th";
import ar from "./messages/ar";
import pt from "./messages/pt";
import ja from "./messages/ja";
import ko from "./messages/ko";
import vi from "./messages/vi";
import tr from "./messages/tr";
import hi from "./messages/hi";
import it from "./messages/it";
import pl from "./messages/pl";
import nl from "./messages/nl";
import sv from "./messages/sv";
import uk from "./messages/uk";
import fa from "./messages/fa";
import ms from "./messages/ms";
import { normalizeLocale, type LocaleCode } from "./locales";

export { LOCALES, normalizeLocale, isRtl } from "./locales";
export type { LocaleCode, LocaleInfo } from "./locales";
export type { MessageKey, Dict } from "./messages/en";

const MESSAGES: Record<LocaleCode, Partial<Dict>> = {
  en,
  ru,
  fil,
  zh,
  es,
  id,
  fr,
  de,
  th,
  ar,
  pt,
  ja,
  ko,
  vi,
  tr,
  hi,
  it,
  pl,
  nl,
  sv,
  uk,
  fa,
  ms,
};

// The full dictionary for a locale: English underneath, the translation on top.
export function messagesFor(code: string): Dict {
  return { ...en, ...(MESSAGES[normalizeLocale(code)] || {}) };
}

// Look up one key and fill {placeholders}.
export function translate(
  dict: Dict,
  key: keyof Dict,
  vars?: Record<string, string | number>
): string {
  let s = dict[key] || en[key] || String(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}
