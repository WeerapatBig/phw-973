"use client";

import { useEffect, useState } from "react";
import { getName } from "@/lib/client-token";
import { CHANGED_EVENT, OPEN_EVENT, useT } from "./i18n/LocaleProvider";
import { GlobeIcon } from "./icons";

// Header control: shows who you are and reopens the language/name dialog.
export function ProfileButton() {
  const t = useT();
  const [name, setName] = useState("");

  useEffect(() => {
    const sync = () => setName(getName());
    sync();
    window.addEventListener(CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const title = t("profile.title");
  return (
    <button
      type="button"
      className="profile-btn"
      title={title}
      aria-label={title}
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
    >
      <GlobeIcon />
      <span className="profile-name">{name || t("profile.guest")}</span>
    </button>
  );
}
