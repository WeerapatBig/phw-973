"use client";

import type { GuideDoc } from "@/lib/types";
import GuideViewer from "./GuideViewer";
import { TranslateProgress } from "./TranslateProgress";
import { useTranslatedDoc } from "./useTranslatedDoc";

export function TranslatedGuideViewer({
  source,
  translated,
}: {
  source: GuideDoc;
  translated: GuideDoc | null;
}) {
  const { doc, loading } = useTranslatedDoc<GuideDoc>("rules", source, translated);
  const withPage: GuideDoc = {
    ...doc,
    page: {
      eyebrow: doc.page?.eyebrow || "Alliance",
      title: doc.page?.title || "Alliance rules",
    },
  };
  return (
    <>
      <GuideViewer doc={withPage} />
      <TranslateProgress active={loading} />
    </>
  );
}
