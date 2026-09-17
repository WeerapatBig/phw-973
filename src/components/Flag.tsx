import type { ReactNode } from "react";
import type { LocaleCode } from "@/lib/i18n";

// Tiny inline flag set for the language picker. Emoji flags do not render on
// Windows, so these are drawn as plain SVG (self-contained, no network, no
// dependency). Shapes are simplified but recognisable at ~22px wide.
function starPoints(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  rot = -90
) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? inner : outer;
    const a = ((rot + i * 36) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

const FLAGS: Record<LocaleCode, ReactNode> = {
  en: (
    <>
      <rect width="24" height="16" fill="#012169" />
      <path d="M0 0 24 16M24 0 0 16" stroke="#fff" strokeWidth="3.2" />
      <path d="M0 0 24 16M24 0 0 16" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="4.6" />
      <path d="M12 0v16M0 8h24" stroke="#C8102E" strokeWidth="2.6" />
    </>
  ),
  ru: (
    <>
      <rect width="24" height="5.33" fill="#fff" />
      <rect y="5.33" width="24" height="5.34" fill="#0039A6" />
      <rect y="10.67" width="24" height="5.33" fill="#D52B1E" />
    </>
  ),
  fil: (
    <>
      <rect width="24" height="8" fill="#0038A8" />
      <rect y="8" width="24" height="8" fill="#CE1126" />
      <path d="M0 0 9 8 0 16Z" fill="#fff" />
      <circle cx="3" cy="8" r="1.2" fill="#FCD116" />
      <polygon points={starPoints(3, 4.4, 0.9, 0.4)} fill="#FCD116" />
      <polygon points={starPoints(3, 11.6, 0.9, 0.4)} fill="#FCD116" />
      <polygon points={starPoints(6.2, 8, 0.9, 0.4)} fill="#FCD116" />
    </>
  ),
  zh: (
    <>
      <rect width="24" height="16" fill="#DE2910" />
      <polygon points={starPoints(5, 5, 3, 1.2)} fill="#FFDE00" />
      <polygon points={starPoints(9.5, 2.2, 1, 0.4)} fill="#FFDE00" />
      <polygon points={starPoints(11, 4.6, 1, 0.4)} fill="#FFDE00" />
      <polygon points={starPoints(11, 7.4, 1, 0.4)} fill="#FFDE00" />
      <polygon points={starPoints(9.5, 9.8, 1, 0.4)} fill="#FFDE00" />
    </>
  ),
  es: (
    <>
      <rect width="24" height="4" fill="#AA151B" />
      <rect y="4" width="24" height="8" fill="#F1BF00" />
      <rect y="12" width="24" height="4" fill="#AA151B" />
    </>
  ),
  id: (
    <>
      <rect width="24" height="8" fill="#CE1126" />
      <rect y="8" width="24" height="8" fill="#fff" />
    </>
  ),
  fr: (
    <>
      <rect width="8" height="16" fill="#0055A4" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#EF4135" />
    </>
  ),
  de: (
    <>
      <rect width="24" height="5.33" fill="#000" />
      <rect y="5.33" width="24" height="5.34" fill="#DD0000" />
      <rect y="10.67" width="24" height="5.33" fill="#FFCE00" />
    </>
  ),
  th: (
    <>
      <rect width="24" height="16" fill="#A51931" />
      <rect y="2.67" width="24" height="2.66" fill="#F4F5F8" />
      <rect y="5.33" width="24" height="5.34" fill="#2D2A4A" />
      <rect y="10.67" width="24" height="2.66" fill="#F4F5F8" />
    </>
  ),
  ar: (
    <>
      <rect width="24" height="16" fill="#006C35" />
      <path
        d="M4 6h16M5 9.2h10.5"
        stroke="#fff"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      <path d="M13.5 11.4h6.5l-1.2 1.4" fill="#fff" />
    </>
  ),
  pt: (
    <>
      <rect width="24" height="16" fill="#DA291C" />
      <rect width="9.6" height="16" fill="#046A38" />
      <circle cx="9.6" cy="8" r="3" fill="#FFE900" />
      <circle cx="9.6" cy="8" r="1.7" fill="#DA291C" />
    </>
  ),
  ja: (
    <>
      <rect width="24" height="16" fill="#fff" />
      <circle cx="12" cy="8" r="4.8" fill="#BC002D" />
    </>
  ),
  ko: (
    <>
      <rect width="24" height="16" fill="#fff" />
      <circle cx="12" cy="8" r="3.5" fill="#CD2E3A" />
      <path d="M8.5 8a3.5 3.5 0 0 0 7 0Z" fill="#0047A0" />
      <g stroke="#000" strokeWidth="0.9">
        <path d="M3.6 4.4h3.2M3.6 5.9h3.2M17.2 4.4h3.2M17.2 5.9h3.2" />
        <path d="M3.6 10.1h3.2M3.6 11.6h3.2M17.2 10.1h3.2M17.2 11.6h3.2" />
      </g>
    </>
  ),
  vi: (
    <>
      <rect width="24" height="16" fill="#DA251D" />
      <polygon points={starPoints(12, 8, 4.6, 1.9)} fill="#FFFF00" />
    </>
  ),
  tr: (
    <>
      <rect width="24" height="16" fill="#E30A17" />
      <circle cx="9" cy="8" r="4" fill="#fff" />
      <circle cx="10.6" cy="8" r="3.2" fill="#E30A17" />
      <polygon points={starPoints(15.2, 8, 2.2, 0.9)} fill="#fff" />
    </>
  ),
  hi: (
    <>
      <rect width="24" height="5.33" fill="#FF9933" />
      <rect y="5.33" width="24" height="5.34" fill="#fff" />
      <rect y="10.67" width="24" height="5.33" fill="#138808" />
      <circle
        cx="12"
        cy="8"
        r="1.9"
        fill="none"
        stroke="#000080"
        strokeWidth="0.7"
      />
    </>
  ),
  it: (
    <>
      <rect width="8" height="16" fill="#009246" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#CE2B37" />
    </>
  ),
  pl: (
    <>
      <rect width="24" height="8" fill="#fff" />
      <rect y="8" width="24" height="8" fill="#DC143C" />
    </>
  ),
  nl: (
    <>
      <rect width="24" height="5.33" fill="#AE1C28" />
      <rect y="5.33" width="24" height="5.34" fill="#fff" />
      <rect y="10.67" width="24" height="5.33" fill="#21468B" />
    </>
  ),
  sv: (
    <>
      <rect width="24" height="16" fill="#006AA7" />
      <rect x="7" width="4" height="16" fill="#FECC00" />
      <rect y="6" width="24" height="4" fill="#FECC00" />
    </>
  ),
  uk: (
    <>
      <rect width="24" height="8" fill="#0057B7" />
      <rect y="8" width="24" height="8" fill="#FFD700" />
    </>
  ),
  fa: (
    <>
      <rect width="24" height="5.33" fill="#239F40" />
      <rect y="5.33" width="24" height="5.34" fill="#fff" />
      <rect y="10.67" width="24" height="5.33" fill="#DA0000" />
      <path
        d="M12 6.2c-1.1 1.3-1.1 3.3 0 3.5 1.1-.2 1.1-2.2 0-3.5Z"
        fill="#DA0000"
      />
    </>
  ),
  ms: (
    <>
      <rect width="24" height="16" fill="#fff" />
      <g fill="#CC0001">
        <rect width="24" height="1.14" y="0" />
        <rect y="2.29" width="24" height="1.14" />
        <rect y="4.57" width="24" height="1.14" />
        <rect y="6.86" width="24" height="1.14" />
        <rect y="9.14" width="24" height="1.14" />
        <rect y="11.43" width="24" height="1.14" />
        <rect y="13.71" width="24" height="1.14" />
      </g>
      <rect width="12" height="9" fill="#010066" />
      <circle cx="5" cy="4.5" r="2.4" fill="#FFCC00" />
      <circle cx="6.2" cy="4.5" r="1.9" fill="#010066" />
      <polygon points={starPoints(9.2, 4.5, 1.5, 0.6)} fill="#FFCC00" />
    </>
  ),
};

export function Flag({ code }: { code: LocaleCode }) {
  return (
    <svg
      className="onb-flag"
      viewBox="0 0 24 16"
      aria-hidden="true"
      focusable="false"
    >
      {FLAGS[code]}
    </svg>
  );
}
