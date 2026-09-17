"use client";

import type { GuideDoc } from "@/lib/types";
import { findGuide } from "@/lib/content";
import GuideReader from "./GuideReader";
import { TranslateProgress } from "./TranslateProgress";
import { useTranslatedDoc } from "./useTranslatedDoc";

export function TranslatedGuideReader({
  source,
  translated,
  category,
  sectionId,
  initialComments,
  initialHearts,
}: {
  source: GuideDoc;
  translated: GuideDoc | null;
  category: string;
  sectionId: string;
  initialComments: number;
  initialHearts: number;
}) {
  const { doc, loading } = useTranslatedDoc<GuideDoc>("guide", source, translated);
  const found = findGuide(doc, category, sectionId);
  if (!found) return null;
  return (
    <>
      <GuideReader
        category={category}
        group={found.group}
        section={found.section}
        initialComments={initialComments}
        initialHearts={initialHearts}
      />
      <TranslateProgress active={loading} />
    </>
  );
}
