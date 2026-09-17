import type { GuideDoc } from "./types";

// The one definition of a usable guide document, mirroring the old api/_lib.js.
// save/route.ts and scripts/check.ts both use it so the endpoints cannot drift
// from what the editor actually sends.
export function validGuideDoc(doc: unknown): doc is GuideDoc {
  return (
    !!doc &&
    typeof doc === "object" &&
    Array.isArray((doc as GuideDoc).groups) &&
    (doc as GuideDoc).groups.every(
      (g) => g && typeof g === "object" && Array.isArray(g.sections)
    )
  );
}