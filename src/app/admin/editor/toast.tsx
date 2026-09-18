"use client";

// Lightweight toast queue for the admin UI. Child components use the
// useToasts() hook; top-level handlers in the admin page (save, publish) use
// the module-level notify() so they can fire toasts without being rendered
// beneath the provider themselves.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

export type ToastType = "success" | "error" | "info";

type ToastItem = { id: number; type: ToastType; message: string };

const DURATION: Record<ToastType, number> = {
  success: 3500,
  info: 4200,
  error: 6500,
};

const ToastsCtx = createContext<(message: string, type?: ToastType) => void>(() => {});

export function useToasts() {
  return useContext(ToastsCtx);
}

let broadcaster: ((message: string, type: ToastType) => void) | null = null;

export function notify(message: string, type: ToastType = "success") {
  broadcaster?.(message, type);
}

export function Toasts({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = ++nextId.current;
    setToasts((t) => [...t.slice(-2), { id, type, message }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, DURATION[type]);
  }, []);

  useEffect(() => {
    broadcaster = show;
    return () => {
      broadcaster = null;
    };
  }, [show]);

  return (
    <ToastsCtx.Provider value={show}>
      {children}
      <div className="adm-toasts" aria-live="polite">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            className={"adm-toast " + t.type}
            onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
          >
            {t.message}
          </button>
        ))}
      </div>
    </ToastsCtx.Provider>
  );
}