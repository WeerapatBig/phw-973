import type { Metadata } from "next";
import { normalize } from "@/lib/content";
import { loadRow } from "@/lib/supabase";
import { allStats } from "@/lib/stats";
import { getLocale } from "@/lib/i18n/server";
import { localized } from "@/lib/translation";
import { TranslatedGuideBrowser } from "@/components/TranslatedGuideBrowser";

export const metadata: Metadata = {
  title: "Guide — Phoenix of War 973",
  description:
    "Phoenix of War 973 — browse the alliance guide by category: features, Nien, the map, policies, skills and heroes.",
  openGraph: {
    title: "Guide — Phoenix of War 973",
    description:
      "Browse the alliance guide by category: Nien, the map, season policies, season skills and season heroes.",
  },
};

export const dynamic = "force-dynamic";

export default async function GuidePage() {
  const row = await loadRow<Record<string, unknown>>("guide");
  const doc = normalize(row?.doc ?? null);
  const stats = await allStats();
  const locale = await getLocale();
  const { source, translated } = await localized("guide", doc, locale);
  return <TranslatedGuideBrowser source={source} translated={translated} stats={stats} />;
}
