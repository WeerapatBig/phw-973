import { NextResponse } from "next/server";
import { passwordOk } from "@/lib/admin";
import { serverClient } from "@/lib/supabase";
import { uploadObjectPath } from "@/lib/uploads";

// Deletes one image from the "uploads" storage bucket. Called by the editor
// when an officer removes or replaces an image that lives on the bucket, so
// orphaned files do not pile up. Local public/img files and external URLs are
// skipped, and an already-missing object is treated as success.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!passwordOk(body.password)) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const path = typeof body.src === "string" ? uploadObjectPath(body.src) : null;
  if (!path) {
    return NextResponse.json({ ok: true });
  }

  const sb = serverClient();
  if (!sb) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const { error } = await sb.storage.from("uploads").remove([path]);
  if (error) {
    // Nothing left to clean up is fine.
    if (/not found/i.test(error.message || "")) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      { error: error.message || "Could not delete the image" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}