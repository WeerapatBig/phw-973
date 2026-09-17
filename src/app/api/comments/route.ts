import { guideKey } from "@/lib/content";
import { cleanAuthor, cleanCommentBody } from "@/lib/comments";
import { clientIp, hashToken, rateLimit, readToken } from "@/lib/limits";
import { serverClient } from "@/lib/supabase";
import { guideExists, setupHint } from "@/lib/stats";

// Comments for one guide: read the thread, post, edit, delete. Every write
// carries the browser's device token; only its owner (or an officer, from the
// admin routes) can change a comment.

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  parent_id: string | null;
  author: string;
  body: string;
  deleted: boolean;
  created_at: string;
  updated_at: string;
  token_hash: string;
};

async function loadState(category: string, guide: string, tokenHash: string) {
  const sb = serverClient()!;

  const { data: rows, error } = await sb
    .from("comments")
    .select("id, parent_id, author, body, deleted, created_at, updated_at, token_hash")
    .eq("category_id", category)
    .eq("guide_id", guide)
    .eq("hidden", false)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const list = (rows || []) as Row[];
  const ids = list.map((r) => r.id);

  const heartCount = new Map<string, number>();
  const myHeart = new Set<string>();
  if (ids.length) {
    const { data: hearts } = await sb
      .from("reactions")
      .select("target_id, token_hash")
      .eq("target_type", "comment")
      .in("target_id", ids);
    for (const h of hearts || []) {
      heartCount.set(h.target_id, (heartCount.get(h.target_id) || 0) + 1);
      if (tokenHash && h.token_hash === tokenHash) myHeart.add(h.target_id);
    }
  }

  const key = guideKey(category, guide);
  const { data: guideHearts } = await sb
    .from("reactions")
    .select("token_hash")
    .eq("target_type", "guide")
    .eq("target_id", key);
  const guideList = guideHearts || [];

  const comments = list.map((r) => ({
    id: r.id,
    parentId: r.parent_id,
    author: r.author,
    body: r.deleted ? "" : r.body,
    hearts: heartCount.get(r.id) || 0,
    hearted: !!tokenHash && myHeart.has(r.id),
    mine: !!tokenHash && r.token_hash === tokenHash,
    edited: r.updated_at !== r.created_at,
    deleted: r.deleted,
    createdAt: r.created_at,
  }));

  return {
    comments,
    count: comments.filter((c) => !c.deleted).length,
    guideHearts: guideList.length,
    hearted: !!tokenHash && guideList.some((h) => h.token_hash === tokenHash),
  };
}

function state(res: Awaited<ReturnType<typeof loadState>>) {
  return Response.json(res);
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? b : {};
  } catch {
    return {};
  }
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = str(url.searchParams.get("category"));
  const guide = str(url.searchParams.get("guide"));
  if (!category || !guide) return Response.json({ error: "Missing guide." }, { status: 400 });
  if (!serverClient()) return Response.json({ error: "Comments are not configured." }, { status: 503 });

  const token = readToken(req);
  try {
    return state(await loadState(category, guide, token ? hashToken(token) : ""));
  } catch {
    // The tables likely have not been created yet; the page should still render.
    return Response.json({ comments: [], count: 0, guideHearts: 0, hearted: false });
  }
}

export async function POST(req: Request) {
  const sb = serverClient();
  if (!sb) return Response.json({ error: "Comments are not configured." }, { status: 503 });

  const token = readToken(req);
  if (!token) return Response.json({ error: "Your browser could not be identified. Reload the page." }, { status: 400 });
  if (!rateLimit(`c:${clientIp(req)}`, 8, 60_000))
    return Response.json({ error: "You are commenting very fast. Try again in a minute." }, { status: 429 });

  const body = await readBody(req);
  const category = str(body.category);
  const guide = str(body.guide);
  const parentId = str(body.parentId) || null;
  const author = cleanAuthor(str(body.author));
  const text = cleanCommentBody(str(body.body));
  if (!category || !guide) return Response.json({ error: "Missing guide." }, { status: 400 });
  if (!text) return Response.json({ error: "Write something first." }, { status: 400 });
  if (!(await guideExists(category, guide)))
    return Response.json({ error: "That guide no longer exists." }, { status: 404 });

  if (parentId) {
    const { data: parent } = await sb
      .from("comments")
      .select("id, category_id, guide_id, deleted")
      .eq("id", parentId)
      .maybeSingle();
    if (!parent || parent.category_id !== category || parent.guide_id !== guide || parent.deleted)
      return Response.json({ error: "That comment is no longer available." }, { status: 400 });
  }

  const { error } = await sb.from("comments").insert({
    category_id: category,
    guide_id: guide,
    parent_id: parentId,
    author,
    token_hash: hashToken(token),
    body: text,
  });
  if (error)
    return Response.json(
      { error: setupHint(error) || "Could not save the comment." },
      { status: error.code === "42P01" ? 503 : 500 }
    );

  return state(await loadState(category, guide, hashToken(token)));
}

export async function PATCH(req: Request) {
  const sb = serverClient();
  if (!sb) return Response.json({ error: "Comments are not configured." }, { status: 503 });

  const token = readToken(req);
  if (!token) return Response.json({ error: "Not allowed." }, { status: 403 });
  if (!rateLimit(`e:${clientIp(req)}`, 20, 60_000))
    return Response.json({ error: "Slow down a moment." }, { status: 429 });

  const body = await readBody(req);
  const id = str(body.id);
  const text = cleanCommentBody(str(body.body));
  if (!id || !text) return Response.json({ error: "Nothing to update." }, { status: 400 });

  const { data: row } = await sb
    .from("comments")
    .select("id, category_id, guide_id, token_hash, deleted")
    .eq("id", id)
    .maybeSingle();
  if (!row || row.token_hash !== hashToken(token) || row.deleted)
    return Response.json({ error: "You can only edit your own comment." }, { status: 403 });

  const { error } = await sb
    .from("comments")
    .update({ body: text, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return Response.json({ error: "Could not update the comment." }, { status: 500 });

  return state(await loadState(row.category_id, row.guide_id, row.token_hash));
}

export async function DELETE(req: Request) {
  const sb = serverClient();
  if (!sb) return Response.json({ error: "Comments are not configured." }, { status: 503 });

  const token = readToken(req);
  if (!token) return Response.json({ error: "Not allowed." }, { status: 403 });

  const body = await readBody(req);
  const id = str(body.id);
  if (!id) return Response.json({ error: "Nothing to delete." }, { status: 400 });

  const { data: row } = await sb
    .from("comments")
    .select("id, category_id, guide_id, token_hash, deleted")
    .eq("id", id)
    .maybeSingle();
  if (!row || row.token_hash !== hashToken(token))
    return Response.json({ error: "You can only delete your own comment." }, { status: 403 });

  const { count } = await sb
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", id);

  if (count && count > 0) {
    // Keep the row so the replies above it do not disappear, but blank it out.
    await sb
      .from("comments")
      .update({ deleted: true, body: "", updated_at: new Date().toISOString() })
      .eq("id", id);
  } else {
    await sb.from("comments").delete().eq("id", id);
  }

  return state(await loadState(row.category_id, row.guide_id, row.token_hash));
}
