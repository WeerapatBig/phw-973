import { createHash } from "crypto";

// Pure helpers for translating content documents. Kept separate from the
// network/DB code so they can be unit-checked without any API key. The walker
// translates only human-readable strings and leaves ids, urls and other
// structural fields exactly as they are.

// Fields whose values are structural, not prose, and must never be translated.
export const SKIP_KEYS = new Set([
  "id",
  "key",
  "type",
  "href",
  "src",
  "url",
  "cover",
  "image",
  "anchor",
  "slug",
  "class",
  "className",
  "style",
  "variant",
  "icon",
  "bg",
  "color",
  "width",
  "height",
  "date",
  "startsAt",
  "durationMins",
  "version",
]);

export function isTranslatable(v: string): boolean {
  const s = v.trim();
  if (s.length < 2) return false;
  // Ignore anything that is only markup/entities with no actual words.
  const text = s.replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
  if (!/[A-Za-z]/.test(text)) return false;
  if (/^(https?:)?\/\//i.test(s) || /^data:/i.test(s) || /^#/.test(s) || /^\//.test(s)) return false;
  if (/^[\w.-]+\.(png|jpe?g|webp|gif|svg|avif)$/i.test(s)) return false;
  return true;
}

function collect(v: unknown, key: string | null, out: Set<string>) {
  if (typeof v === "string") {
    if (key !== null && !SKIP_KEYS.has(key) && isTranslatable(v)) out.add(v);
    return;
  }
  if (Array.isArray(v)) {
    for (const item of v) collect(item, "", out);
    return;
  }
  if (v && typeof v === "object") {
    for (const [k, value] of Object.entries(v)) collect(value, k, out);
  }
}

function apply(v: unknown, key: string | null, map: Map<string, string>): unknown {
  if (typeof v === "string") {
    if (key !== null && !SKIP_KEYS.has(key) && map.has(v)) return map.get(v)!;
    return v;
  }
  if (Array.isArray(v)) return v.map((item) => apply(item, "", map));
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, value] of Object.entries(v)) out[k] = apply(value, k, map);
    return out;
  }
  return v;
}

// Order-independent JSON so the same content always hashes the same, regardless
// of how Postgres returns the jsonb object keys.
function stable(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  const obj = v as Record<string, unknown>;
  return (
    "{" +
    Object.keys(obj)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + stable(obj[k]))
      .join(",") +
    "}"
  );
}

export function contentHash(v: unknown): string {
  return createHash("sha256").update(stable(v)).digest("hex").slice(0, 32);
}

export function collectTranslatableStrings(v: unknown): string[] {
  const unique = new Set<string>();
  collect(v, null, unique);
  return [...unique];
}

export function applyTranslationMap(
  source: unknown,
  map: Record<string, string>
): unknown {
  if (!Object.keys(map).length) return source;
  return apply(source, null, new Map(Object.entries(map)));
}

export function missingFromMap(
  strings: string[],
  map: Record<string, string>
): string[] {
  return strings.filter((s) => !map[s]);
}

export type ChunkTranslator = (
  chunk: string[],
  langName: string
) => Promise<string[]>;

// Translate a document by sending each chunk of unique strings to the supplied
// translator and substituting the results back into a copy of the original.
export async function mapTranslations(
  source: unknown,
  langName: string,
  translateChunk: ChunkTranslator,
  chunkChars = 5000
): Promise<unknown> {
  const unique = new Set<string>();
  collect(source, null, unique);
  const list = [...unique];
  if (!list.length) return source;

  const map = new Map<string, string>();
  let i = 0;
  while (i < list.length) {
    const chunk: string[] = [];
    let size = 0;
    while (i < list.length) {
      const s = list[i];
      if (chunk.length && size + s.length > chunkChars) break;
      chunk.push(s);
      size += s.length;
      i++;
    }
    const out = await translateChunk(chunk, langName);
    for (let j = 0; j < chunk.length; j++) {
      if (out[j]) map.set(chunk[j], out[j]);
    }
  }
  return apply(source, null, map);
}
