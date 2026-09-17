// The guide document stores image references as repo-relative paths
// ("img/s3/1-1.jpg") for legacy images, while new uploads are stored in Supabase
// Storage and come back as absolute URLs. Turn either into something the <img>
// tag can load no matter which page it is on.

export function assetUrl(src?: string): string | undefined {
  if (!src) return src;
  const s = src.trim();
  if (!s) return s;
  if (/^https?:\/\//i.test(s) || /^data:/i.test(s) || s.startsWith("/")) return s;
  return "/" + s;
}