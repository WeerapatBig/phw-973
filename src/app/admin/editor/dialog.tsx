"use client";

// Styled modal that replaces the native window.prompt / confirm / alert in the
// admin editors, so every important question uses the same dialog.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type PromptReq = {
  title: string;
  label: string;
  placeholder?: string;
  initial?: string;
  yesLabel?: string;
};

type ConfirmReq = {
  title: string;
  message: React.ReactNode;
  yesLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type Dialogs = {
  prompt: (req: PromptReq) => Promise<string | null>;
  confirm: (req: ConfirmReq) => Promise<boolean>;
  alert: (title: string, message?: React.ReactNode) => Promise<void>;
};

type Slot =
  | { kind: "prompt"; req: PromptReq; resolve: (v: string | null) => void }
  | { kind: "confirm"; req: ConfirmReq; resolve: (v: boolean) => void }
  | { kind: "alert"; req: { title: string; message?: React.ReactNode }; resolve: () => void };

const DialogsCtx = createContext<Dialogs | null>(null);

export function useDialogs() {
  const d = useContext(DialogsCtx);
  if (!d) throw new Error("useDialogs must be used inside <Dialogs>.");
  return d;
}

export function Dialogs({ children }: { children: React.ReactNode }) {
  const [slot, setSlot] = useState<Slot | null>(null);
  const [value, setValue] = useState("");
  const dlg = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const safe = useRef<HTMLButtonElement>(null);

  const prompt = useCallback(
    (req: PromptReq) => {
      setValue(req.initial ?? "");
      return new Promise<string | null>((resolve) =>
        setSlot({ kind: "prompt", req, resolve })
      );
    },
    []
  );
  const confirm = useCallback(
    (req: ConfirmReq) =>
      new Promise<boolean>((resolve) => setSlot({ kind: "confirm", req, resolve })),
    []
  );
  const alert = useCallback(
    (title: string, message?: React.ReactNode) =>
      new Promise<void>((resolve) => setSlot({ kind: "alert", req: { title, message }, resolve })),
    []
  );

  const dismiss = useCallback(() => {
    if (!slot) return;
    if (slot.kind === "prompt") slot.resolve(null);
    else if (slot.kind === "confirm") slot.resolve(false);
    else slot.resolve();
    setSlot(null);
  }, [slot]);

  useEffect(() => {
    const el = dlg.current;
    if (!el || !slot) return;
    el.showModal();
    requestAnimationFrame(() => {
      if (slot.kind === "prompt") {
        field.current?.focus();
        field.current?.select();
      } else {
        safe.current?.focus();
      }
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
      }
    };
    const onCancel = (e: Event) => {
      e.preventDefault();
      dismiss();
    };
    el.addEventListener("keydown", onKey);
    el.addEventListener("cancel", onCancel);
    return () => {
      el.removeEventListener("keydown", onKey);
      el.removeEventListener("cancel", onCancel);
    };
  }, [slot, dismiss]);

  const promptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (slot?.kind !== "prompt") return;
    const v = value.trim();
    if (!v) return;
    slot.resolve(v);
    setSlot(null);
  };

  const confirmOk = () => {
    if (slot?.kind === "confirm") slot.resolve(true);
    setSlot(null);
  };

  return (
    <DialogsCtx.Provider value={{ prompt, confirm, alert }}>
      {children}
      {slot ? (
        <dialog
          ref={dlg}
          className="adm-dialog"
          onClick={(e) => {
            if (e.target === dlg.current) dismiss();
          }}
        >
          <form className="adm-dialog-box" onSubmit={promptSubmit}>
            <h3 className="adm-dialog-title">{slot.req.title}</h3>
            {slot.kind !== "prompt" && slot.req.message ? (
              <p className="adm-dialog-msg">{slot.req.message}</p>
            ) : null}
            {slot.kind === "prompt" ? (
              <label className="adm-dialog-field">
                <span className="adm-label">{slot.req.label}</span>
                <input
                  ref={field}
                  className="adm-field"
                  type="text"
                  value={value}
                  placeholder={slot.req.placeholder}
                  onChange={(e) => setValue(e.target.value)}
                />
              </label>
            ) : null}
            <div className="adm-dialog-actions">
              {slot.kind === "prompt" ? (
                <>
                  <button type="button" className="btn-sm" onClick={dismiss}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-sm primary" disabled={!value.trim()}>
                    {slot.req.yesLabel || "Create"}
                  </button>
                </>
              ) : slot.kind === "confirm" ? (
                <>
                  <button ref={safe} type="button" className="btn-sm" onClick={dismiss}>
                    {slot.req.cancelLabel || "Cancel"}
                  </button>
                  <button
                    type="button"
                    className={"btn-sm" + (slot.req.danger ? " danger" : " primary")}
                    onClick={confirmOk}
                  >
                    {slot.req.yesLabel || "Confirm"}
                  </button>
                </>
              ) : (
                <button ref={safe} type="button" className="btn-sm primary" onClick={dismiss}>
                  OK
                </button>
              )}
            </div>
          </form>
        </dialog>
      ) : null}
    </DialogsCtx.Provider>
  );
}