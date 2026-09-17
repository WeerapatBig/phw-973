"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  isRtl,
  messagesFor,
  normalizeLocale,
  translate,
  type Dict,
  type LocaleCode,
  type MessageKey,
} from "@/lib/i18n";

export const LANG_COOKIE = "phw.lang";
export const DONE_KEY = "phw.onboarded";
export const OPEN_EVENT = "phw:open-profile";
export const CHANGED_EVENT = "phw:profile-changed";

type LocaleContextValue = {
  locale: LocaleCode;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  setLocale: (code: LocaleCode) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyHtml(locale: LocaleCode) {
  const root = document.documentElement;
  root.lang = locale;
  root.dir = isRtl(locale) ? "rtl" : "ltr";
}

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: LocaleCode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<LocaleCode>(() =>
    normalizeLocale(initialLocale)
  );
  const [dict, setDict] = useState<Dict>(() => messagesFor(initialLocale));

  const setLocale = useCallback(
    (code: LocaleCode) => {
      const next = normalizeLocale(code);
      setLocaleState(next);
      setDict(messagesFor(next));
      try {
        window.localStorage.setItem(LANG_COOKIE, next);
        document.cookie = `${LANG_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
        applyHtml(next);
        router.refresh();
      } catch {
        // Storage can be unavailable (private mode); the UI still switches.
      }
    },
    [router]
  );


  // Keep <html lang/dir> correct on first paint too.
  useEffect(() => {
    applyHtml(locale);
  }, [locale]);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      translate(dict, key, vars),
    [dict]
  );

  const value = useMemo(
    () => ({ locale, t, setLocale }),
    [locale, t, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}

export function useT() {
  return useLocale().t;
}
