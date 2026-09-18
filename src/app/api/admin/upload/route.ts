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

// Which role the current SUPABASE_SERVICE_ROLE_KEY actually carries, read from
// the JWT payload without verifying it. If the env var is missing, mis-set, or
// not a JWT, this fails open (null) and the upload itself reports the error.
// The point is to catch the common deployment mistake: SUPABASE_SERVICE_ROLE_KEY
// holding the ANON key, which Supabase Storage rejects with "new row violates
// row-level security policy". Only role "service_role" bypasses RLS.
function storedKeyRole(token: string | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  for (const enc of ["base64url", "base64"] as const) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], enc).toString("utf8"));
      return typeof payload.role === "string" ? payload.role : null;
    } catch {
      // try the lenient decoder
    }
  }
  return null;
}

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

  const role = storedKeyRole(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (role && role !== "service_role") {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY in this deployment is not Supabase's service-role secret — the upload was refused by row-level security. Copy the service_role key from Supabase → Project Settings → API, set it as SUPABASE_SERVICE_ROLE_KEY in Vercel (Settings → Environment Variables), and redeploy.",
      },
      { status: 500 }
    );
  }

  const { error } = await sb.storage.from("uploads").upload(path, bytes, {
    contentType,
    upsert: false,
    cacheControl: "3600",
  });
  if (error) {
    const hint =
      "Check that SUPABASE_SERVICE_ROLE_KEY in this deployment is the real service_role secret (Settings → API) and that the uploads bucket exists (run supabase/schema.sql in the Supabase SQL editor).";
    return NextResponse.json({ error: `${error.message || "Upload failed"}. ${hint}` }, { status: 502 });
  }

  // A bucket created by hand in the dashboard can end up private, which makes
  // the public image URL 404 for visitors even though the upload worked. The
  // service key may flip it to public; harmless when it already is.
  try {
    await sb.storage.updateBucket("uploads", { public: true });
  } catch {
    // best effort — a broken bucket is fixed once the officer runs schema.sql
  }

  const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/uploads/${path}`;
  return NextResponse.json({ path: url });
}