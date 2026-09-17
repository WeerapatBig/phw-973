import { createHash, timingSafeEqual } from "node:crypto";
import { serverClient, type GuideRow, type HomeRow } from "./supabase";

// Constant-time compare against ADMIN_PASSWORD. Hash both sides first so
// lengths always match — comparing raw strings would leak the password length
// through timing.
export function passwordOk(given: unknown) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = createHash("sha256").update(String(given ?? "")).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export type ContentTarget = "guide" | "home" | "rules" | "news" | "events";

// Optimistic-locked write: only succeeds if the row is still at `version`.
// Returns the new version, or null when someone else changed it first.
export async function saveContent(
  target: ContentTarget,
  doc: unknown,
  version: number | null
): Promise<number | null> {
  const sb = serverClient();
  if (!sb) return null;

  const table = sb.from(target);
  if (version == null) {
    // Row does not exist yet (pre-seed). Insert it as version 1.
    const { data, error } = await table
      .upsert({ id: 1, doc, version: 1, updated_at: new Date().toISOString() }, { onConflict: "id" })
      .select("version")
      .single();
    if (error) throw error;
    return data.version as number;
  }

  const { data, error } = await table
    .update({ doc, version: version + 1, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .eq("version", version)
    .select("version")
    .maybeSingle();
  if (error) throw error;
  return data ? (data.version as number) : null;
}

export type { GuideRow, HomeRow };