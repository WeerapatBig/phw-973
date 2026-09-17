import { NextResponse } from "next/server";
import { passwordOk } from "@/lib/admin";
import { loadRow } from "@/lib/supabase";

// Returns the current guide and home documents plus each one's version (the
// optimistic-lock counter). The public pages read these directly; this route
// exists so the editor can load after proving the admin password.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!passwordOk(body.password)) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const [guide, home, rules] = await Promise.all([
    loadRow("guide"),
    loadRow("home"),
    loadRow("rules"),
  ]);
  if (!guide && !home && !rules) {
    return NextResponse.json(
      {
        error:
          "Could not read the content tables. Run supabase/schema.sql in the Supabase SQL editor, then `npm run seed`.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ guide, home, rules });
}