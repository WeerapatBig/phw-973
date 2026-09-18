"use client";

import { useRef, useState } from "react";
import { useToasts } from "./toast";
import { uploadObjectPath } from "@/lib/uploads";

// The widest the site ever shows an image is about 700px, so 1600 is already
// generous on a retina screen. Shrinking here keeps phone screenshots (often
// 5-10 MB) under the upload limit AND keeps the guide fast for readers.
const MAX_EDGE = 1600;
const MAX_UPLOAD = 3 * 1024 * 1024; // decoded bytes; base64 adds ~33% on the wire

/* ---------------- small field builders ---------------- */

export function Labelled({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="adm-row">
      <span className="adm-label">{text}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className="adm-field"
      type="text"
      value={value || ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Checkbox({
  text,
  checked,
  onChange,
}: {
  text: string;
  checked?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="adm-check">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{text}</span>
    </label>
  );
}

export function Select({
  options,
  value,
  onChange,
}: {
  options: [string, string][];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select className="adm-field" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

// textarea with a tiny Bold/Italic toolbar so officers never type a tag
export function RichText({
  value,
  onChange,
  rows,
}: {
  value?: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  const ta = useRef<HTMLTextAreaElement>(null);

  function wrap(tag: "strong" | "em") {
    const el = ta.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    if (s === e) {
      el.focus();
      return;
    }
    const sel = el.value.slice(s, e);
    const next = el.value.slice(0, s) + `<${tag}>${sel}</${tag}>` + el.value.slice(e);
    onChange(next);
    el.focus();
    requestAnimationFrame(() => {
      el.selectionStart = s;
      el.selectionEnd = e + tag.length * 2 + 5;
    });
  }

  return (
    <div>
      <div className="adm-fmt">
        <button type="button" onClick={() => wrap("strong")}>
          B
        </button>
        <button
          type="button"
          onClick={() => wrap("em")}
          style={{ fontStyle: "italic" }}
        >
          I
        </button>
        <em>select text, then B or I</em>
      </div>
      <textarea
        ref={ta}
        className="adm-field"
        rows={rows}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function IconButton({
  children,
  onClick,
  disabled,
  danger,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      className={`adm-icon${danger ? " danger" : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

/* ---------------- image upload ---------------- */

// Best-effort removal of an earlier upload from the Storage bucket. Skipped for
// local public/img files and external URLs. Callers deliberately do not await
// this: if the delete fails the leftover file is harmless, and an edit should
// never be blocked on cleanup.
export async function deleteStoredImage(
  src: string | undefined,
  password: string
): Promise<void> {
  if (!uploadObjectPath(src)) return;
  try {
    await fetch("/api/admin/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password, src }),
    });
  } catch {
    // cleanup is best-effort
  }
}

function shrink(file: File): Promise<{ blob: Blob; ext: string }> {
  // Animated GIFs would lose their animation on a canvas — send them as they are.
  if (file.type === "image/gif") {
    return Promise.resolve({ blob: file, ext: "gif" });
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file could not be read as an image."));
    };
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      // webp keeps transparency and is much smaller; jpeg only if webp is refused.
      c.toBlob((blob) => {
        if (blob && blob.type === "image/webp") return resolve({ blob, ext: "webp" });
        c.toBlob(
          (jpeg) => {
            if (!jpeg) return reject(new Error("The image could not be converted."));
            resolve({ blob: jpeg, ext: "jpg" });
          },
          "image/jpeg",
          0.85
        );
      }, "image/webp", 0.85);
    };
    img.src = url;
  });
}

async function doUpload(file: File, password: string): Promise<string> {
  if (!/^image\//.test(file.type)) {
    throw new Error("That file is not an image.");
  }
  const out = await shrink(file);
  if (out.blob.size > MAX_UPLOAD) {
    throw new Error("Even after shrinking, this image is over 3 MB. Please save it as a JPG first.");
  }
  const name = file.name.replace(/\.[^.]*$/, "") + "." + out.ext;
  const b64 = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("Could not read the file."));
    fr.onload = () => resolve(String(fr.result).split(",")[1]);
    fr.readAsDataURL(out.blob);
  });
  const r = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password, filename: name, base64: b64 }),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = data?.error || `Upload failed (HTTP ${r.status}). Try a smaller image.`;
    throw new Error(msg);
  }
  return data.path as string;
}

export function Dropzone({
  password,
  onPath,
  onError,
  children,
}: {
  password: string;
  onPath: (p: string) => void;
  onError: (msg: string) => void;
  children?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const notify = useToasts();

  function take(file: File | null) {
    if (!file) return;
    setBusy(true);
    doUpload(file, password)
      .then((p) => {
        setBusy(false);
        onPath(p);
        notify("Image added — press Save & publish to keep it");
      })
      .catch((e) => {
        setBusy(false);
        onError(e.message || String(e));
      });
  }

  return (
    <div
      className={`adm-drop${over ? " over" : ""}`}
      onClick={() => picker.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files[0]);
      }}
    >
      {busy ? "Uploading…" : children ?? "Drop an image here, or click to choose one"}
      <input
        ref={picker}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          take(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </div>
  );
}