// Everything the admin editor uploads lands in the Supabase Storage "uploads"
// bucket, and documents store it as the object's public URL. This module tells
// one of those URLs apart from the images the site already ships with
// (public/img/...) or external links, so cleanup code can remove old objects
// from the bucket without ever touching local or third-party files.

import type { Block } from "./types";

const UPLOAD_MARKER = "/storage/v1/object/public/uploads/";

// The object path inside the uploads bucket, or null when `src` is not one of
// our uploads. Callers must gate on this before any Storage remove(), because
// handing remove() a path that is not ours would be at best a no-op and at
// worst destructive.
export function uploadObjectPath(src?: string): string | null {
  if (!src) return null;
  const s = src.trim();
  const i = s.indexOf(UPLOAD_MARKER);
  if (i < 0) return null;
  const rest = s.slice(i + UPLOAD_MARKER.length).split("?")[0];
  return rest || null;
}

// Every image a list of blocks points at through a figures block. Used when a
// topic, section or block is deleted so its uploaded images are removed from
// the storage bucket along with it.
export function figSrcs(blocks: Block[]): string[] {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type !== "figures") continue;
    for (const f of b.items) {
      if (f.src) out.push(f.src);
    }
  }
  return out;
}