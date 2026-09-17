"use client";

/* eslint-disable react-hooks/exhaustive-deps -- the gesture handlers close over
   refs only, and the effect must run exactly once per mounted image. */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type LightboxItem = { src: string; caption: string };
type Point = { x: number; y: number };

const MIN = 1;
const MAX = 8;
const MOVE_SLOP = 6;

const LightboxContext = createContext<(src: string, caption: string) => void>(() => {});

export function useLightbox() {
  return useContext(LightboxContext);
}

// In-page zoomable image viewer. Port of the old lightbox.js, as a React
// dialog. Gesture handling is attached to native listeners so wheel
// preventDefault works exactly like the original.
export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = useState<LightboxItem | null>(null);

  const open = useCallback((src: string, caption: string) => {
    setItem({ src, caption });
  }, []);

  return (
    <LightboxContext.Provider value={open}>
      {children}
      {item && <LightboxDialog item={item} onClose={() => setItem(null)} />}
    </LightboxContext.Provider>
  );
}

function LightboxDialog({ item, onClose }: { item: LightboxItem; onClose: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const zLabel = useRef<HTMLSpanElement>(null);

  const scale = useRef(1);
  const tx = useRef(0);
  const ty = useRef(0);
  const pointers = useRef<Map<number, Point>>(new Map());
  const pinchDist = useRef(0);
  const panFrom = useRef<Point | null>(null);
  const downTarget = useRef<EventTarget | null>(null);
  const downAt = useRef<Point | null>(null);
  const moved = useRef(false);

  function apply() {
    if (img.current)
      img.current.style.transform = `translate(${tx.current}px,${ty.current}px) scale(${scale.current})`;
    if (zLabel.current) zLabel.current.textContent = `${Math.round(scale.current * 100)}%`;
    stage.current?.classList.toggle("is-zoomed", scale.current > 1);
  }

  function clamp() {
    if (scale.current <= 1) {
      tx.current = ty.current = 0;
      return;
    }
    if (!img.current || !stage.current) return;
    const r = img.current.getBoundingClientRect();
    const s = stage.current.getBoundingClientRect();
    const mx = Math.max(0, (r.width - s.width) / 2);
    const my = Math.max(0, (r.height - s.height) / 2);
    tx.current = Math.min(mx, Math.max(-mx, tx.current));
    ty.current = Math.min(my, Math.max(-my, ty.current));
  }

  // cx,cy in viewport px; omit to zoom on the stage centre
  function zoomAt(factor: number, cx?: number, cy?: number) {
    const next = Math.min(MAX, Math.max(MIN, scale.current * factor));
    if (next === scale.current || !stage.current) return;
    const s = stage.current.getBoundingClientRect();
    const px = (cx == null ? s.left + s.width / 2 : cx) - (s.left + s.width / 2);
    const py = (cy == null ? s.top + s.height / 2 : cy) - (s.top + s.height / 2);
    const ratio = next / scale.current;
    tx.current = px - (px - tx.current) * ratio;
    ty.current = py - (py - ty.current) * ratio;
    scale.current = next;
    clamp();
    apply();
  }

  function reset() {
    scale.current = 1;
    tx.current = ty.current = 0;
    apply();
  }

  function mid() {
    const p = Array.from(pointers.current.values());
    return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
  }
  function dist() {
    const p = Array.from(pointers.current.values());
    return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }

  function onDown(e: PointerEvent) {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      stage.current?.setPointerCapture(e.pointerId);
    } catch {
      /* never let capture break the gesture */
    }
    if (pointers.current.size === 1) {
      downTarget.current = e.target;
      downAt.current = { x: e.clientX, y: e.clientY };
      moved.current = false;
    }
    if (pointers.current.size === 2) {
      pinchDist.current = dist();
      panFrom.current = null;
      moved.current = true;
    } else if (scale.current > 1) {
      panFrom.current = { x: e.clientX - tx.current, y: e.clientY - ty.current };
    }
  }

  function onMove(e: PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (
      !moved.current &&
      downAt.current &&
      Math.hypot(e.clientX - downAt.current.x, e.clientY - downAt.current.y) > MOVE_SLOP
    ) {
      moved.current = true;
    }
    if (pointers.current.size === 2) {
      const d = dist();
      if (pinchDist.current > 0) {
        const m = mid();
        zoomAt(d / pinchDist.current, m.x, m.y);
      }
      pinchDist.current = d;
    } else if (panFrom.current) {
      tx.current = e.clientX - panFrom.current.x;
      ty.current = e.clientY - panFrom.current.y;
      clamp();
      apply();
    }
  }

  function onUp(e: PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchDist.current = 0;
    if (pointers.current.size === 0) panFrom.current = null;
  }

  // Open the dialog and attach native gesture listeners once the DOM exists.
  useEffect(() => {
    const el = dlg.current;
    const st = stage.current;
    if (!el || !st) return;
    reset();
    el.showModal();

    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "+" || e.key === "=") zoomAt(1.4);
      else if (e.key === "-") zoomAt(1 / 1.4);
      else if (e.key === "0") reset();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
    };
    const onStageClick = () => {
      if (downTarget.current === st && !moved.current) onClose();
    };
    const onDblClick = (e: MouseEvent) => {
      if (scale.current > 1) reset();
      else zoomAt(2.5, e.clientX, e.clientY);
    };

    el.addEventListener("keydown", onEscape);
    el.addEventListener("keydown", onKeyDown);
    st.addEventListener("wheel", onWheel, { passive: false });
    st.addEventListener("click", onStageClick);
    st.addEventListener("dblclick", onDblClick);
    st.addEventListener("pointerdown", onDown);
    st.addEventListener("pointermove", onMove);
    st.addEventListener("pointerup", onUp);
    st.addEventListener("pointercancel", onUp);
    st.addEventListener("pointerleave", onUp);
    return () => {
      el.removeEventListener("keydown", onEscape);
      el.removeEventListener("keydown", onKeyDown);
      st.removeEventListener("wheel", onWheel);
      st.removeEventListener("click", onStageClick);
      st.removeEventListener("dblclick", onDblClick);
      st.removeEventListener("pointerdown", onDown);
      st.removeEventListener("pointermove", onMove);
      st.removeEventListener("pointerup", onUp);
      st.removeEventListener("pointercancel", onUp);
      st.removeEventListener("pointerleave", onUp);
    };
  }, [onClose]);

  // Drop the decoded image on close; src='' would re-request the page URL.
  useEffect(() => {
    const el = dlg.current;
    if (!el) return;
    const close = () => {
      if (img.current) img.current.removeAttribute("src");
    };
    el.addEventListener("close", close);
    return () => el.removeEventListener("close", close);
  }, []);

  return (
    <dialog ref={dlg} className="lb">
      <div className="lb-bar">
        <button
          type="button"
          className="lb-btn"
          title="Zoom out (-)"
          aria-label="Zoom out"
          onClick={() => zoomAt(1 / 1.4)}
        >
          &minus;
        </button>
        <span ref={zLabel} className="lb-zoom">
          100%
        </span>
        <button type="button" className="lb-btn" title="Zoom in (+)" aria-label="Zoom in" onClick={() => zoomAt(1.4)}>
          +
        </button>
        <button type="button" className="lb-btn" title="Reset (0)" aria-label="Reset zoom" onClick={() => reset()}>
          Reset
        </button>
        <button type="button" className="lb-btn lb-close" title="Close (Esc)" aria-label="Close" onClick={onClose}>
          &times;
        </button>
      </div>
      <div ref={stage} className="lb-stage" style={{ touchAction: "none" }}>
        <img ref={img} alt="" src={item.src} />
      </div>
      <p className="lb-cap">{item.caption}</p>
    </dialog>
  );
}