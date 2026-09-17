import { passwordOk } from "@/lib/admin";
import { findGuide, guideKey, normalize } from "@/lib/content";
import { serverClient } from "@/lib/supabase";

// Officer moderation for comments. Same admin password as the editor, sent in
// the request body so it never lands in a URL or server log.

export const dynamic = "force-dynamic";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function POST(req: Request) {
  const sb = serverClient();
  if (!sb) return Response.json({ error: "Not configured." }, { status: 503 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (!passwordOk(body.password))
    return Response.json({ error: "Wrong password." }, { status: 401 });

  const action = str(body.action) || "list";

  if (action === "hide" || action === "unhide") {
    const id = str(body.id);
    if (!id) return Response.json({ error: "Missing comment." }, { status: 400 });
    const { error } = await sb.from("comments").update({ hidden: action === "hide" }).eq("id", id);
    if (error) return Response.json({ error: "Could not update the comment." }, { status: 500 });
  } else if (action === "delete") {
    const id = str(body.id);
    if (!id) return Response.json({ error: "Missing comment." }, { status: 400 });
    const { error } = await sb.from("comments").delete().eq("id", id);
    if (error) return Response.json({ error: "Could not delete the comment." }, { status: 500 });
  } else if (action !== "list") {
    return Response.json({ error: "Unknown action." }, { status: 400 });
  }

  const { data: rows, error } = await sb
    .from("comments")
    .select("id, category_id, guide_id, author, body, hidden, deleted, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error)
    return Response.json(
      { error: "Could not read comments. Have you run the new part of schema.sql?" },
      { status: 500 }
    );

  const list = rows || [];
  const ids = list.map((r) => r.id);
  const hearts = new Map<string, number>();
  if (ids.length) {
    const { data: rs } = await sb
      .from("reactions")
      .select("target_id")
      .eq("target_type", "comment")
      .in("target_id", ids);
    for (const r of rs || []) hearts.set(r.target_id, (hearts.get(r.target_id) || 0) + 1);
  }

  const guideRow = await sb.from("guide").select("doc").eq("id", 1).maybeSingle();
  const doc = normalize(guideRow.data?.doc ?? null);
  const label = (category: string, guide: string) => {
    const found = findGuide(doc, category, guide);
    return {
      categoryTitle: found?.group.title || category,
      guideTitle: found?.section.title || guide,
      key: guideKey(category, guide),
    };
  };

  return Response.json({
    comments: list.map((r) => ({
      id: r.id,
      categoryId: r.category_id,
      guideId: r.guide_id,
      author: r.author,
      body: r.body,
      hidden: r.hidden,
      deleted: r.deleted,
      createdAt: r.created_at,
      hearts: hearts.get(r.id) || 0,
      ...label(r.category_id, r.guide_id),
    })),
  });
}
