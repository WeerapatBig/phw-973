"use client";

import type { GuideDoc, GuideStats } from "@/lib/types";
import GuideBrowser from "./GuideBrowser";
import { TranslateProgress } from "./TranslateProgress";
import { useTranslatedDoc } from "./useTranslatedDoc";

export function TranslatedGuideBrowser({
  source,
  translated,
  stats,
}: {
  source: GuideDoc;
  translated: GuideDoc | null;
  stats: GuideStats;
}) {
  const { doc, loading } = useTranslatedDoc<GuideDoc>("guide", source, translated);
  return (
    <>
      <GuideBrowser doc={doc} stats={stats} />
      <TranslateProgress active={loading} />
    </>
  );
}
