import { NextResponse } from "next/server";
import { passwordOk, saveContent, type ContentTarget } from "@/lib/admin";
import { validGuideDoc } from "@/lib/validate";

// Commits the edited guide or home document back to Supabase. Refused unless
// the document is still at the version the editor loaded, so two officers
// editing at once cannot silently overwrite each other.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!passwordOk(body.password)) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const target = body.target as ContentTarget;
  const targets: ContentTarget[] = ["guide", "home", "rules", "news", "events"];
  if (!targets.includes(target)) {
    return NextResponse.json({ error: "Missing or unknown target" }, { status: 400 });
  }
  if ((target === "guide" || target === "rules") && !validGuideDoc(body.doc)) {
    return NextResponse.json({ error: `Missing or malformed ${target} document` }, { status: 400 });
  }
  if (target !== "guide" && target !== "rules" && (!body.doc || typeof body.doc !== "object")) {
    return NextResponse.json({ error: `Missing or malformed ${target} document` }, { status: 400 });
  }
  if (body.version !== undefined && typeof body.version !== "number") {
    return NextResponse.json({ error: "Missing file version — reload the editor" }, { status: 400 });
  }

  let version: number | null;
  try {
    version = await saveContent(target, body.doc, (body.version as number) ?? null);
  } catch {
    return NextResponse.json({ error: "Could not write to the database" }, { status: 500 });
  }

  if (version === null && (body.version as number) != null) {
    return NextResponse.json(
      { error: "conflict: the content changed since you loaded it" },
      { status: 409 }
    );
  }

  return NextResponse.json({ version });
}