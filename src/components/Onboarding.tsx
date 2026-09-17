"use client";

import { useEffect, useState } from "react";
import { LOCALES, type LocaleCode } from "@/lib/i18n";
import { getName, setName } from "@/lib/client-token";
import { Flag } from "./Flag";
import {
  CHANGED_EVENT,
  DONE_KEY,
  OPEN_EVENT,
  useLocale,
} from "./i18n/LocaleProvider";

// First-visit onboarding: pick a language, then say who you are. The language
// applies live as soon as it is clicked; the name is what comments and hearts
// are signed with. Both live only in this browser.
export function Onboarding() {
  const { locale, t, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setNameState] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNameState(getName());
    try {
      if (window.localStorage.getItem(DONE_KEY) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
    const onOpen = () => {
      setNameState(getName());
      setStep(1);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  function finish() {
    setName(name.trim());
    try {
      window.localStorage.setItem(DONE_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
    window.dispatchEvent(new Event(CHANGED_EVENT));
  }

  function skip() {
    try {
      window.localStorage.setItem(DONE_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
    window.dispatchEvent(new Event(CHANGED_EVENT));
  }

  if (!open) return null;

  return (
    <div
      className="onb-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t("onb.welcome")}
      onKeyDown={(e) => {
        if (e.key === "Escape") skip();
      }}
    >
      <div className="onb">
        <p className="onb-brand">
          Phoenix of War <span>973</span>
        </p>

        {step === 1 ? (
          <>
            <h2>{t("onb.langTitle")}</h2>
            <p className="onb-hint">{t("onb.langHint")}</p>
            <div className="onb-langs">
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  className={"onb-lang" + (l.code === locale ? " on" : "")}
                  aria-pressed={l.code === locale}
                  onClick={() => setLocale(l.code as LocaleCode)}
                >
                  <Flag code={l.code} />
                  <span className="onb-lang-text">
                    <span className="onb-lang-name">{l.label}</span>
                    <span className="onb-lang-en">{l.en}</span>
                  </span>
                </button>
              ))}
            </div>
            <div className="onb-actions">
              <button type="button" className="btn-sm" onClick={skip}>
                {t("onb.skip")}
              </button>
              <button
                type="button"
                className="btn-sm primary"
                onClick={() => setStep(2)}
              >
                {t("onb.continue")}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>{t("onb.nameTitle")}</h2>
            <p className="onb-hint">{t("onb.nameHint")}</p>
            <input
              className="adm-field onb-name"
              type="text"
              autoFocus
              maxLength={40}
              value={name}
              placeholder={t("onb.namePlaceholder")}
              onChange={(e) => setNameState(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") finish();
              }}
            />
            <div className="onb-actions">
              <button type="button" className="btn-sm" onClick={() => setStep(1)}>
                {t("onb.back")}
              </button>
              <button type="button" className="btn-sm primary" onClick={finish}>
                {t("onb.start")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
