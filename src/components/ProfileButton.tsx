"use client";

import { LOCALES } from "@/lib/i18n";
import { OPEN_EVENT, useLocale } from "./i18n/LocaleProvider";
import { Flag } from "./Flag";

// Header control: shows currently selected language flag + name and opens language picker.
export function ProfileButton() {
  const { locale, t } = useLocale();
  const current = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  const title = t("profile.title") || "Change language";
  return (
    <button
      type="button"
      className="profile-btn"
      title={title}
      aria-label={title}
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
    >
      <Flag code={current.code} />
      <span className="profile-name">{current.label}</span>
    </button>
  );
}
