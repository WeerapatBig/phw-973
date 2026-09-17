"use client";

import type { HomeDoc } from "@/lib/types";
import HomeView from "./HomeView";
import { TranslateProgress } from "./TranslateProgress";
import { useTranslatedDoc } from "./useTranslatedDoc";

export function TranslatedHome({
  source,
  translated,
}: {
  source: HomeDoc;
  translated: HomeDoc | null;
}) {
  const { doc, loading } = useTranslatedDoc<HomeDoc>("home", source, translated);
  return (
    <>
      <HomeView home={doc} />
      <TranslateProgress active={loading} />
    </>
  );
}
