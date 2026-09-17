import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findGuide, normalize } from "@/lib/content";
import { loadRow } from "@/lib/supabase";
import { guideStats } from "@/lib/stats";
import { getLocale } from "@/lib/i18n/server";
import { localized } from "@/lib/translation";
import { TranslatedGuideReader } from "@/components/TranslatedGuideReader";

export const dynamic = "force-dynamic";

// Route segments are already decoded by the router, but a stray "%" should
// never crash the page.
function seg(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

type Params = { params: Promise<{ category: string; guide: string }> };

async function loadGuide(category: string, guide: string) {
  const row = await loadRow<Record<string, unknown>>("guide");
  const doc = normalize(row?.doc ?? null);
  return findGuide(doc, category, guide);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category, guide } = await params;
  const found = await loadGuide(seg(category), seg(guide));
  if (!found) return { title: "Guide — Phoenix of War 973" };
  const title = `${found.section.title} — Phoenix of War 973`;
  const description = found.section.summary || `Phoenix of War 973 — ${found.section.title}.`;
  return { title, description, openGraph: { title, description } };
}

export default async function GuideArticlePage({ params }: Params) {
  const { category, guide } = await params;
  const cat = seg(category);
  const gid = seg(guide);
  const row = await loadRow<Record<string, unknown>>("guide");
  const doc = normalize(row?.doc ?? null);
  const found = findGuide(doc, cat, gid);
  if (!found) notFound();

  const stats = await guideStats(cat, gid);
  const locale = await getLocale();
  const { source, translated } = await localized("guide", doc, locale);
  return (
    <TranslatedGuideReader
      source={source}
      translated={translated}
      category={cat}
      sectionId={gid}
      initialComments={stats.comments}
      initialHearts={stats.hearts}
    />
  );
}
