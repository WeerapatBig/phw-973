import { clientIp, hashToken, rateLimit, readToken } from "@/lib/limits";
import { serverClient } from "@/lib/supabase";
import { guideExists, setupHint } from "@/lib/stats";

// Toggle a heart. One heart per browser per thing is enforced by the unique
// index on (target_type, target_id, token_hash); this route just flips it.

export const dynamic = "force-dynamic";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function POST(req: Request) {
  const sb = serverClient();
  if (!sb) return Response.json({ error: "Not configured." }, { status: 503 });

  const token = readToken(req);
  if (!token) return Response.json({ error: "Your browser could not be identified. Reload the page." }, { status: 400 });
  if (!rateLimit(`r:${clientIp(req)}`, 60, 60_000))
    return Response.json({ error: "Too many taps. Slow down." }, { status: 429 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const targetType = str(body.targetType);
  const targetId = str(body.targetId);
  if (targetType !== "guide" && targetType !== "comment")
    return Response.json({ error: "Unknown target." }, { status: 400 });
  if (!targetId) return Response.json({ error: "Missing target." }, { status: 400 });

  if (targetType === "guide") {
    const [category, guide] = targetId.split("/");
    if (!category || !guide || !(await guideExists(category, guide)))
      return Response.json({ error: "That guide no longer exists." }, { status: 404 });
  } else {
    const { data: comment } = await sb.from("comments").select("id").eq("id", targetId).maybeSingle();
    if (!comment) return Response.json({ error: "That comment no longer exists." }, { status: 404 });
  }

  const tokenHash = hashToken(token);
  const { data: existing } = await sb
    .from("reactions")
    .select("id")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("token_hash", tokenHash)
    .maybeSingle();

  let active: boolean;
  if (existing) {
    await sb.from("reactions").delete().eq("id", existing.id);
    active = false;
  } else {
    const { error } = await sb.from("reactions").insert({
      target_type: targetType,
      target_id: targetId,
      token_hash: tokenHash,
    });
    // 23505 = the unique index beat us; either way it is now hearted.
    if (error && error.code !== "23505")
      return Response.json(
        { error: setupHint(error) || "Could not save the heart." },
        { status: error.code === "42P01" ? 503 : 500 }
      );
    active = true;
  }

  const { count } = await sb
    .from("reactions")
    .select("id", { count: "exact", head: true })
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  return Response.json({ active, count: count || 0 });
}
