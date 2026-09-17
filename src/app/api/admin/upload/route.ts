import { NextResponse } from "next/server";
import { passwordOk } from "@/lib/admin";
import { serverClient } from "@/lib/supabase";

const ALLOWED: Record<string, string | undefined> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};
// base64 inflates by ~33% on the wire; 3 MB decoded keeps requests sane.
const MAX_BYTES = 3 * 1024 * 1024;

// Uploads one image to the Supabase Storage "uploads" bucket and returns the
// public URL the editor stores in figures blocks.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!passwordOk(body.password)) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const { filename, base64 } = body;
  if (!filename || !base64) {
    return NextResponse.json({ error: "Missing filename or file data" }, { status: 400 });
  }

  // The filename is attacker-controlled. Take the extension, throw the rest
  // away, and build our own name so nothing lands where it should not.
  const ext = String(filename).split(".").pop()?.toLowerCase() || "";
  const contentType = ALLOWED[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Only PNG, JPG, WEBP and GIF images are allowed" }, { status: 400 });
  }

  const bytes = Buffer.from(String(base64), "base64");
  if (!bytes.length) {
    return NextResponse.json({ error: "That file appears to be empty" }, { status: 400 });
  }
  if (bytes.length > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image is larger than 3 MB after encoding — please save it smaller" },
      { status: 413 }
    );
  }

  const stem = String(filename)
    .replace(/\.[^.]*$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "image";
  const path = `${Date.now()}-${stem}.${ext}`;

  const sb = serverClient();
  if (!sb) {
    return NextResponse.json({ error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
  }

  const { error } = await sb.storage.from("uploads").upload(path, bytes, {
    contentType,
    upsert: false,
    cacheControl: "3600",
  });
  if (error) {
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 502 });
  }

  const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/uploads/${path}`;
  return NextResponse.json({ path: url });
}