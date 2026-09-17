import { findGuide, guideKey, normalize } from "./content";
import { serverClient } from "./supabase";
import type { GuideStats } from "./types";

// Comment and heart totals for every guide, keyed by "category/guide". Used by
// the guide hub so each card can show its counts without a query per card.
//
// The site must keep working before the comments/reactions tables exist (a
// fresh checkout that has not run the new part of schema.sql), so any query
// error is treated as "no counts".
export async function allStats(): Promise<GuideStats> {
  const sb = serverClient();
  const out: GuideStats = {};
  if (!sb) return out;

  const bump = (key: string, field: "comments" | "hearts") => {
    (out[key] ||= { comments: 0, hearts: 0 })[field] += 1;
  };

  const comments = await sb
    .from("comments")
    .select("category_id, guide_id")
    .eq("hidden", false)
    .eq("deleted", false);
  for (const c of comments.data || []) {
    bump(guideKey(c.category_id, c.guide_id), "comments");
  }

  const reactions = await sb
    .from("reactions")
    .select("target_id")
    .eq("target_type", "guide");
  for (const r of reactions.data || []) {
    bump(r.target_id, "hearts");
  }

  return out;
}

// Totals for a single guide, for its own page's first render (the client then
// keeps them up to date).
export async function guideStats(
  categoryId: string,
  guideId: string
): Promise<{ comments: number; hearts: number }> {
  const sb = serverClient();
  if (!sb) return { comments: 0, hearts: 0 };
  const comments = await sb
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId)
    .eq("guide_id", guideId)
    .eq("hidden", false)
    .eq("deleted", false);
  const hearts = await sb
    .from("reactions")
    .select("id", { count: "exact", head: true })
    .eq("target_type", "guide")
    .eq("target_id", guideKey(categoryId, guideId));
  return { comments: comments.count || 0, hearts: hearts.count || 0 };
}

// A clear message when the comments/reactions tables are missing, rather than a
// generic failure. 42P01 is Postgres' "undefined_table".
export function setupHint(err: { code?: string } | null | undefined): string | null {
  return err?.code === "42P01"
    ? "Comments are not set up yet. Run supabase/schema.sql in the Supabase SQL editor."
    : null;
}

// Does this category/guide pair actually exist in the guide document? Writes on
// a guide page are refused unless it does, so junk ids cannot be inserted.
export async function guideExists(categoryId: string, guideId: string): Promise<boolean> {
  const sb = serverClient();
  if (!sb) return false;
  const { data } = await sb.from("guide").select("doc").eq("id", 1).maybeSingle();
  if (!data) return false;
  return !!findGuide(normalize(data.doc), categoryId, guideId);
}
