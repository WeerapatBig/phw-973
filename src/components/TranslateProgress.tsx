"use client";

import { useEffect, useRef, useState } from "react";

// A small circular progress ring, pinned to the bottom-right above everything
// else, shown while a content translation is being fetched. There is no real
// progress signal from the server (it is a single request), so the ring eases
// towards 90% and completes when the request resolves.
const R = 20;
const C = 2 * Math.PI * R;

export function TranslateProgress({ active }: { active: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [pct, setPct] = useState(0);
  const frame = useRef<number | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (active) {
      if (hide.current) {
        clearTimeout(hide.current);
        hide.current = null;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      setPct(8);
      const tick = () => {
        setPct((p) => (p >= 90 ? p : p + (90 - p) * 0.012));
        frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
      return () => {
        if (frame.current) cancelAnimationFrame(frame.current);
      };
    }

    if (frame.current) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    setPct(100);
    hide.current = setTimeout(() => setMounted(false), 320);
    return () => {
      if (hide.current) clearTimeout(hide.current);
    };
  }, [active]);

  if (!mounted) return null;
  const shown = Math.round(pct);

  return (
    <div className="tprog" role="progressbar" aria-label="Translating" aria-valuemin={0} aria-valuemax={100} aria-valuenow={shown}>
      <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
        <circle className="tprog-track" cx="24" cy="24" r={R} fill="none" strokeWidth="3" />
        <circle
          className="tprog-bar"
          cx="24"
          cy="24"
          r={R}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct / 100)}
        />
      </svg>
      <span className="tprog-num">{shown}</span>
    </div>
  );
}
