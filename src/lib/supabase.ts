import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-side client. Uses the service role key, so it can read and write
// without Row Level Security. NEVER import this file from a client component or
// an event handler — it would ship the service role key to the browser.
//
// Returns null when the env vars are not set (e.g. a fresh checkout before the
// .env is created) so pages degrade to their built-in defaults instead of
// throwing.

let cached: SupabaseClient | null | undefined;

export function serverClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    cached = null;
    return cached;
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export type GuideRow = { id: number; doc: unknown; version: number; updated_at: string };
export type HomeRow = { id: number; doc: unknown; version: number; updated_at: string };

export type ContentTable = "guide" | "home" | "rules" | "news" | "events";

// Load one content row, or null if it does not exist yet (never throw).
export async function loadRow<T = Record<string, unknown>>(
  table: ContentTable
): Promise<{ doc: T; version: number } | null> {
  const sb = serverClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from(table)
    .select("doc, version")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return null;
  return { doc: data.doc as T, version: data.version };
}