"use client";

import { HeartIcon } from "./icons";
import { useT } from "./i18n/LocaleProvider";

export function HeartButton({
  active,
  count,
  onClick,
  disabled,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  disabled?: boolean;
}) {
  const t = useT();
  return (
    <button
      type="button"
      className={"heart-btn" + (active ? " on" : "")}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={active ? t("heart.unheartTitle") : t("heart.heartTitle")}
    >
      <HeartIcon filled={active} />
      <span className="heart-count">{count}</span>
      <span className="heart-label">
        {active ? t("heart.hearted") : t("heart.heart")}
      </span>
    </button>
  );
}
