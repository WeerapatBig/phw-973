// Legacy stats helper module.
export function setupHint(err: { code?: string } | null | undefined): string | null {
  return err?.code === "42P01"
    ? "Tables are not set up yet. Run supabase/schema.sql in the Supabase SQL editor."
    : null;
}
