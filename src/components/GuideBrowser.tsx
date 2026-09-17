"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Group, GuideDoc, GuideStats, Section } from "@/lib/types";
import { coverOf, guideKey, previewText, searchGuides } from "@/lib/content";
import { assetUrl } from "@/lib/assets";
import { HeartIcon, CommentIcon } from "./icons";
import { useT } from "./i18n/LocaleProvider";

const PAGE_SIZE = 6;

function paginate<T>(items: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const clamped = Math.min(Math.max(page, 0), totalPages - 1);
  return {
    items: items.slice(clamped * PAGE_SIZE, (clamped + 1) * PAGE_SIZE),
    page: clamped,
    totalPages,
  };
}

function GuidePager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  const t = useT();
  if (totalPages <= 1) return null;
  return (
    <nav className="gb-pager" aria-label={t("hub.pageOf", { page: page + 1, total: totalPages })}>
      <button
        type="button"
        className="btn-sm"
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
      >
        {t("hub.prevPage")}
      </button>
      <span className="gb-pager-status">
        {t("hub.pageOf", { page: page + 1, total: totalPages })}
      </span>
      <button
        type="button"
        className="btn-sm"
        disabled={page >= totalPages - 1}
        onClick={() => onPage(page + 1)}
      >
        {t("hub.nextPage")}
      </button>
    </nav>
  );
}

function GuideCard({
  group,
  section,
  stats,
}: {
  group: Group;
  section: Section;
  stats: GuideStats;
}) {
  const t = useT();
  const st = stats[guideKey(group.id, section.id)];
  const blurb = previewText(section);
  const cover = coverOf(section);
  return (
    <Link
      className="gb-card"
      href={`/guide/${encodeURIComponent(group.id)}/${encodeURIComponent(section.id)}`}
    >
      <span className="gb-cover">
        {cover ? (
          <img src={assetUrl(cover)} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="gb-initial" aria-hidden="true">
            {(section.title || "?").trim().charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <span className="gb-card-body">
        <strong className="gb-card-title">{section.title || t("hub.untitledGuide")}</strong>
        {blurb ? <span className="gb-blurb">{blurb}</span> : null}
        <span className="gb-meta">
          <span>
            <CommentIcon />
            {(st?.comments || 0) === 1
              ? t("hub.commentsOne")
              : t("hub.commentsMany", { n: st?.comments || 0 })}
          </span>
          <span>
            <HeartIcon />
            {st?.hearts || 0}
          </span>
        </span>
      </span>
    </Link>
  );
}

// The guide hub. Pick a category on the left; its guides appear as cards on the
// right. The search box filters every guide in the document, across all
// categories, so a match in another category still shows up.
export default function GuideBrowser({
  doc,
  stats = {},
}: {
  doc: GuideDoc;
  stats?: GuideStats;
}) {
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const t = useT();
  const groups = doc.groups || [];
  const group = groups[active];

  const searching = query.trim().length > 0;
  const results = useMemo(() => searchGuides(doc, query), [doc, query]);
  const sections = group?.sections || [];
  const searchPage = useMemo(() => paginate(results, page), [results, page]);
  const sectionPage = useMemo(() => paginate(sections, page), [sections, page]);

  useEffect(() => {
    setPage(0);
  }, [active, query]);

  return (
    <>
      <div className="hero gb-hero" style={{ padding: "64px 0 44px" }}>
        <div className="wrap">
          <p className="sub">{doc.page?.eyebrow || "Guide"}</p>
          <h1>{doc.page?.title || "Guide"}</h1>
        </div>
      </div>

      <section>
        <div className="wrap gb-layout">
          <aside className="gb-cats" aria-label={t("hub.categories")}>
            <p className="gb-cats-title">{t("hub.categories")}</p>
            <div className="gb-search">
              <input
                type="search"
                className="gb-search-input"
                placeholder={t("hub.searchPlaceholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={t("hub.searchPlaceholder")}
              />
              {searching ? (
                <button
                  type="button"
                  className="gb-search-clear"
                  onClick={() => setQuery("")}
                  aria-label={t("cmt.cancel")}
                >
                  ×
                </button>
              ) : null}
            </div>
            {groups.map((g, gi) => (
              <button
                key={g.id}
                type="button"
                className={"gb-cat" + (!searching && gi === active ? " on" : "")}
                aria-pressed={!searching && gi === active}
                onClick={() => {
                  setQuery("");
                  setActive(gi);
                }}
              >
                <span>{g.title || t("hub.untitledCategory")}</span>
                <span className="gb-cat-count">{(g.sections || []).length}</span>
              </button>
            ))}
          </aside>

          <div className="gb-main">
            {searching ? (
              <>
                <header className="gb-head">
                  <h2>
                    {results.length === 1
                      ? t("hub.resultsOne")
                      : t("hub.resultsMany", { n: results.length })}
                  </h2>
                  <p className="gb-intro">
                    {t("hub.resultsFor", { q: query.trim() })}
                  </p>
                </header>
                {results.length === 0 ? (
                  <p className="wip">{t("hub.noMatch", { q: query.trim() })}</p>
                ) : (
                  <>
                    <div className="gb-grid">
                      {searchPage.items.map(({ group: g, section: s }) => (
                        <div key={guideKey(g.id, s.id)} className="gb-result">
                          <p className="gb-result-cat">
                            {g.title || t("hub.untitledCategory")}
                          </p>
                          <GuideCard group={g} section={s} stats={stats} />
                        </div>
                      ))}
                    </div>
                    <GuidePager
                      page={searchPage.page}
                      totalPages={searchPage.totalPages}
                      onPage={setPage}
                    />
                  </>
                )}
              </>
            ) : !group ? (
              <p className="wip">{t("hub.nothingYet")}</p>
            ) : (
              <>
                <header className="gb-head">
                  <h2>{group.title || t("hub.untitledCategory")}</h2>
                  {group.intro ? (
                    <div
                      className="gb-intro"
                      dangerouslySetInnerHTML={{ __html: group.intro }}
                    />
                  ) : null}
                </header>

                {(group.sections || []).length === 0 ? (
                  <p className="wip">{t("hub.noGuides")}</p>
                ) : (
                  <>
                    <div className="gb-grid">
                      {sectionPage.items.map((s) => (
                        <GuideCard key={s.id} group={group} section={s} stats={stats} />
                      ))}
                    </div>
                    <GuidePager
                      page={sectionPage.page}
                      totalPages={sectionPage.totalPages}
                      onPage={setPage}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
