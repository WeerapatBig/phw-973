"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GuideDoc } from "@/lib/types";
import { groupOfSection, pickCurrent } from "@/lib/content";
import { GuideGroup } from "./GuideGroup";
import { LightboxProvider } from "./Lightbox";

const HEADER = 90;

// Guide page: collapsible table of contents, one main topic shown at a time,
// and a scroll spy that highlights whichever section you are reading. Port of
// the old guide.js.
export default function GuideViewer({ doc }: { doc: GuideDoc }) {
  const [active, setActive] = useState(0);
  const [tocOpen, setTocOpen] = useState<Record<number, boolean>>({});
  const [current, setCurrent] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<string | null>(null);
  const activeRef = useRef(0);

  // Keep the hash handler reading the latest active group without re-subscribing
  // on every group change.
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  function isNarrow() {
    return typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches;
  }

  const show = useCallback((gi: number, scrollToId?: string) => {
    setActive(gi);
    pendingScroll.current = scrollToId ?? null;
  }, []);

  const showForHash = useCallback(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const gi = id ? groupOfSection(doc, id) : -1;
    if (gi < 0) {
      show(0);
      return;
    }
    // a hash naming the group itself lands on its first section
    const g = doc.groups[gi];
    const isGroup = g.id === id;
    show(gi, isGroup ? (g.sections[0] || {}).id : id);
  }, [doc, show]);

  // Initial load + hash navigation.
  useEffect(() => {
    // Initialise from the URL hash once the page mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    showForHash();
    const onHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const gi = id ? groupOfSection(doc, id) : -1;
      if (gi < 0) return;
      if (gi !== activeRef.current) {
        const g = doc.groups[gi];
        show(gi, g.id === id ? (g.sections[0] || {}).id : id);
      } else {
        const t = document.getElementById(id);
        if (t) {
          t.scrollIntoView();
          setCurrent(id);
        }
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [doc, show, showForHash]);

  // After the active group changes, honour any pending deep link / scroll.
  useEffect(() => {
    const id = pendingScroll.current;
    pendingScroll.current = null;
    if (id) {
      const t = document.getElementById(id);
      if (t) {
        t.scrollIntoView();
        setCurrent(id);
      }
      if (window.location.hash.slice(1) !== id) {
        history.replaceState(null, "", "#" + id);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [active]);

  // Scroll spy: which section is under the sticky header?
  useEffect(() => {
    const sections = () =>
      Array.from(bodyRef.current?.querySelectorAll("section[id]") || []);
    let queued = false;
    const update = () => {
      queued = false;
      const tops = sections().map((s) => ({
        id: s.id,
        top: s.getBoundingClientRect().top,
      }));
      setCurrent(pickCurrent(tops, HEADER));
    };
    const handler = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    update();
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
    };
  }, [active]);

  const group = doc.groups[active] || { id: "empty", title: "", intro: "", sections: [] };

  const openState = (gi: number) => tocOpen[gi] ?? (gi === active && !isNarrow());

  return (
    <LightboxProvider>
      <div className="hero" style={{ padding: "64px 0 44px" }}>
        <div className="wrap">
          <p className="sub">{doc.page?.eyebrow || "Guide"}</p>
          <h1>{doc.page?.title || "Guide"}</h1>
          {group.intro ? (
            <p
              className="motto"
              style={{ fontSize: 17, color: "var(--muted)", maxWidth: "60ch" }}
              dangerouslySetInnerHTML={{ __html: group.intro }}
            />
          ) : null}
        </div>
      </div>

      <section>
        <div className="wrap guide-layout">
          <aside className="toc">
            <p>Contents</p>
            {doc.groups.map((g, gi) => {
              const open = openState(gi);
              return (
                <div key={g.id} className={`toc-group${open ? " open" : ""}`}>
                  <button
                    type="button"
                    className="toc-group-head"
                    aria-expanded={open}
                    onClick={() => {
                      if (gi === active) {
                        setTocOpen((o) => ({ ...o, [gi]: !open }));
                        return;
                      }
                      show(gi, (g.sections[0] || {}).id);
                    }}
                  >
                    <span className="toc-caret">›</span>
                    <span>{g.title || "(untitled topic)"}</span>
                  </button>
                  <div className="toc-links">
                    {g.sections.map((s) => (
                      <a
                        key={s.id}
                        href={`#${s.id}`}
                        data-section={s.id}
                        aria-current={current === s.id ? "true" : undefined}
                      >
                        {s.nav || s.title}
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </aside>

          <div className="guide-body" ref={bodyRef}>
            <GuideGroup group={group} />
          </div>
        </div>
      </section>
    </LightboxProvider>
  );
}