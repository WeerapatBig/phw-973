"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { FlatComment, Group, Section } from "@/lib/types";
import { guideKey } from "@/lib/content";
import { buildCommentTree } from "@/lib/comments";
import { getToken } from "@/lib/client-token";
import { GuideSection } from "./GuideGroup";
import { LightboxProvider } from "./Lightbox";
import { HeartButton } from "./HeartButton";
import { Comments } from "./Comments";
import { useT } from "./i18n/LocaleProvider";

type State = {
  comments: FlatComment[];
  count: number;
  guideHearts: number;
  hearted: boolean;
};

// One guide page: the written guide, a heart, and its comment thread. The
// thread is loaded and updated in the browser so the page itself can stay
// static and read-only.
export default function GuideReader({
  category,
  group,
  section,
  initialComments,
  initialHearts,
}: {
  category: string;
  group: Group;
  section: Section;
  initialComments: number;
  initialHearts: number;
}) {
  const [data, setData] = useState<State>({
    comments: [],
    count: initialComments,
    guideHearts: initialHearts,
    hearted: false,
  });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const t = useT();
  const key = guideKey(category, section.id);

  const call = useCallback(
    async (path: string, method: string, body?: unknown) => {
      const token = getToken();
      const res = await fetch(path, {
        method,
        headers: {
          "content-type": "application/json",
          "x-phw-token": token,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Something went wrong (HTTP ${res.status}).`);
      return json;
    },
    []
  );

  useEffect(() => {
    call(`/api/comments?category=${encodeURIComponent(category)}&guide=${encodeURIComponent(section.id)}`, "GET")
      .then((s: State) => {
        setData(s);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [call, category, section.id]);

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      setError("");
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const handlers = {
    onPost: (body: string, parentId: string | null, author: string) =>
      run(async () => {
        const s: State = await call("/api/comments", "POST", {
          category,
          guide: section.id,
          parentId,
          author,
          body,
        });
        setData(s);
      }),
    onEdit: (id: string, body: string) =>
      run(async () => {
        const s: State = await call("/api/comments", "PATCH", { id, body });
        setData(s);
      }),
    onDelete: (id: string) =>
      run(async () => {
        const s: State = await call("/api/comments", "DELETE", { id });
        setData(s);
      }),
    onHeart: (id: string) =>
      run(async () => {
        const r = await call("/api/reactions", "POST", { targetType: "comment", targetId: id });
        setData((d) => ({
          ...d,
          comments: d.comments.map((c) =>
            c.id === id ? { ...c, hearts: r.count, hearted: r.active } : c
          ),
        }));
      }),
  };

  const heartGuide = () =>
    run(async () => {
      const r = await call("/api/reactions", "POST", { targetType: "guide", targetId: key });
      setData((d) => ({ ...d, guideHearts: r.count, hearted: r.active }));
    });

  const tree = buildCommentTree(data.comments);

  return (
    <LightboxProvider>
      <div className="hero gd-hero">
        <div className="wrap">
          <div className="gd-back-wrap">
            <Link href="/guide" className="gd-back-btn">
              <span className="gd-back-arrow" aria-hidden="true">
                ←
              </span>
              <span>{t("reader.backToGuide")}</span>
            </Link>
          </div>
          <nav className="gd-crumbs" aria-label={t("reader.breadcrumbGuide")}>
            <Link href="/guide">{t("reader.breadcrumbGuide")}</Link>
            <span aria-hidden="true">/</span>
            <Link href="/guide">{group.title || t("reader.breadcrumbCategory")}</Link>
          </nav>
          <h1>{section.title || t("reader.breadcrumbGuide")}</h1>
          {section.summary ? <p className="gd-summary">{section.summary}</p> : null}
          <div className="gd-tools">
            <HeartButton
              active={data.hearted}
              count={data.guideHearts}
              onClick={heartGuide}
              disabled={busy}
            />
          </div>
        </div>
      </div>

      <section>
        <div className="wrap gd-article">
          <div className="guide-body">
            <GuideSection s={section} />
          </div>
        </div>
      </section>

      <section className="gd-comments">
        <div className="wrap">
          {loaded ? (
            <Comments
              comments={tree}
              count={data.count}
              handlers={handlers}
              busy={busy}
              error={error}
            />
          ) : (
            <p className="wip">{t("reader.loadingComments")}</p>
          )}
        </div>
      </section>
    </LightboxProvider>
  );
}
