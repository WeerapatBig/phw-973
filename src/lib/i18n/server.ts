import { cookies } from "next/headers";
import { normalizeLocale } from "./locales";

// The chosen language is mirrored into a cookie so the very first server render
// is already in the right language (no flash), while localStorage stays the
// source of truth the onboarding dialog reads and writes.
export const LANG_COOKIE = "phw.lang";

export async function getLocale() {
  const jar = await cookies();
  return normalizeLocale(jar.get(LANG_COOKIE)?.value);
}
