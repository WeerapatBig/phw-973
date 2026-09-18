export function assetUrl(src?: string): string | undefined {
  if (!src) return src;
  const s = src.trim();
  if (!s) return s;
  if (/^https?:\/\//i.test(s) || /^data:/i.test(s) || s.startsWith("/")) return s;
  return "/" + s;
}