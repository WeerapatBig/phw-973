"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "./i18n/LocaleProvider";
import type { LocaleCode } from "@/lib/i18n";

type Scope = "guide" | "home" | "rules";

// Survives page navigations so a translated document is shown instantly when
// the visitor returns, without waiting on another /api/translate round trip.
const docCache = new Map<string, unknown>();

function cacheKey(scope: Scope, locale: string) {
  return `${scope}:${locale}`;
}

// Keeps a content document in sync with the visitor's language. The server
// hands us the English source (always) and, when it was already cached, the
// translation for the current locale. Whenever the language changes we ask
// /api/translate for that locale and swap the rendered content in place — the
// page stays usable in English the whole time.
export function useTranslatedDoc<T>(
  scope: Scope,
  source: T,
  initial: T | null
): { doc: T; loading: boolean } {
  const { locale } = useLocale();
  const mountedLocaleRef = useRef<string | null>(null);

  // Store server-provided initial translation into memory cache for the mounted locale
  if (mountedLocaleRef.current === null) {
    mountedLocaleRef.current = locale;
    if (initial && locale !== "en") {
      docCache.set(cacheKey(scope, locale), initial);
    }
  }

  const key = cacheKey(scope, locale);

  const getDocForLocale = (): T => {
    if (locale === "en") return source;
    const known = docCache.get(key) as T | undefined;
    if (known) return known;
    return source;
  };

  const [doc, setDoc] = useState<T>(getDocForLocale);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (locale === "en") {
      setDoc(source);
      setLoading(false);
      return;
    }

    const known = docCache.get(key) as T | undefined;
    if (known) {
      setDoc(known);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    fetch("/api/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope, locale }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (!alive) return;
        setLoading(false);
        if (json?.status !== "ready" || !json.doc) return;
        docCache.set(key, json.doc as T);
        setDoc(json.doc as T);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [scope, locale, key, source]);

  return { doc, loading };
}

