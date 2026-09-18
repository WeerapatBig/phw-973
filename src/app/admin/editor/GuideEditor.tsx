"use client";

import { useEffect, useRef, useState } from "react";
import type { Block, GuideDoc } from "@/lib/types";
import { BLOCK_LABELS, BLOCK_TYPES, blankBlock, move, slug } from "@/lib/content";
import { assetUrl } from "@/lib/assets";
import { figSrcs } from "@/lib/uploads";
import { BlockEditor } from "./BlockEditor";
import { Dropzone, IconButton, Labelled, RichText, Select, TextInput, deleteStoredImage } from "./fields";

import { useDialogs } from "./dialog";
import { useToasts } from "./toast";

// Remove a section's uploaded images from the bucket too when the section
// itself is deleted. `cover` plus every figures block it holds.
function sectionSrcs(s: { cover?: string; blocks?: Block[] }): string[] {
  const out: string[] = [];
  if (s.cover) out.push(s.cover);
  for (const src of figSrcs(s.blocks || [])) out.push(src);
  return out;
}

// The admin topic list shows the newest topics first and paginates 10 at a
// time; keep the number in sync with the sidebar pagination below.
const TOPICS_PER_PAGE = 5;

export function GuideEditor({
  doc,
  touch,
  password,
  onError,
  group,
  current,
  setGroup,
  setCurrent,
}: {
  doc: GuideDoc;
  touch: () => void;
  password: string;
  onError: (msg: string) => void;
  group: number;
  current: number;
  setGroup: (g: number) => void;
  setCurrent: (c: number) => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const ask = useDialogs();
  const notify = useToasts();
  const [tocPage, setTocPage] = useState(0);

  const topicPages = Math.max(1, Math.ceil(doc.groups.length / TOPICS_PER_PAGE));
  const topicPage = Math.min(tocPage, topicPages - 1);
  const visibleGroups = doc.groups.slice(
    topicPage * TOPICS_PER_PAGE,
    topicPage * TOPICS_PER_PAGE + TOPICS_PER_PAGE
  );

  // on a phone the topic list would push the editor off-screen, so fold it away
  useEffect(() => {
    if (detailsRef.current)
      detailsRef.current.open = !window.matchMedia("(max-width: 820px)").matches;
  }, []);

  // Move to a topic and keep the sidebar paginated onto the page that holds it.
  const jump = (gi: number) => {
    setGroup(gi);
    setTocPage(Math.floor(gi / TOPICS_PER_PAGE));
  };

  // Keep the "pinned topics first" ordering after any reorder, add or pin
  // change, then return the editor to the topic we were working on.
  function resort(currentId: string) {
    doc.groups.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
    const ni = doc.groups.findIndex((gg) => gg.id === currentId);
    jump(ni >= 0 ? ni : 0);
    touch();
  }

  const select = (gi: number, si: number) => {
    jump(gi);
    setCurrent(si);
  };

  const g = doc.groups[group];
  const curSections = g?.sections || [];
  const s = curSections[current];

  async function addSection() {
    const title = await ask.prompt({
      title: "New section",
      label: "Section name",
      placeholder: "For example: Features & Notes",
      yesLabel: "Add section",
    });
    if (!title) return;
    g.sections.push({ id: slug(title), nav: title, title, blocks: [] });
    setCurrent(g.sections.length - 1);
    touch();
    notify("Section added");
  }

  async function addTopic() {
    const title = await ask.prompt({
      title: "New main topic",
      label: "Topic name",
      placeholder: "For example: Guide Season 4",
      yesLabel: "Add topic",
    });
    if (!title) return;
    doc.groups.unshift({ id: slug(title), title, intro: "", sections: [] });
    resort(doc.groups[0].id);
    setCurrent(0);
    notify("Topic added");
  }

  async function deleteTopic() {
    const g = curGroupRef();
    if (doc.groups.length < 2) {
      void ask.alert("Cannot delete", "There has to be at least one topic.");
      return;
    }
    const ok = await ask.confirm({
      title: "Delete topic",
      message: `Delete the topic "${g.title}" and all ${g.sections.length} of its sections?`,
      yesLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    for (const sec of g.sections) {
      for (const src of sectionSrcs(sec)) void deleteStoredImage(src, password);
    }
    doc.groups.splice(group, 1);
    jump(Math.max(0, group - 1));
    setCurrent(0);
    touch();
    notify("Topic deleted");
  }

  function curGroupRef() {
    return doc.groups[group];
  }

  return (
    <div className="adm-cols">
      <aside className="adm-side">
        <details ref={detailsRef}>
          <summary>Topics &amp; sections</summary>
          <div>
            {visibleGroups.map((gg, gi) => {
              const abs = topicPage * TOPICS_PER_PAGE + gi;
              return (
                <div key={abs}>
                  <button
                    type="button"
                    className={"adm-grp-btn" + (abs === group ? " on" : "") + (gg.pinned ? " pinned" : "")}
                    onClick={() => select(abs, 0)}
                  >
                    <span>{gg.title || "(untitled topic)"}</span>
                  </button>
                  {abs === group ? (
                    <>
                      {gg.sections.map((sec, si) => (
                        <button
                          type="button"
                          key={si}
                          className={"adm-sec-btn" + (si === current ? " on" : "")}
                          onClick={() => select(abs, si)}
                        >
                          <span>{sec.title || "(untitled)"}</span>
                        </button>
                      ))}
                      <button type="button" className="adm-sec-btn adm-sec-add" onClick={addSection}>
                        + Add section here
                      </button>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
          {topicPages > 1 ? (
            <div className="adm-toc-pager">
              <button
                type="button"
                disabled={topicPage === 0}
                onClick={() => setTocPage((p) => Math.max(0, p - 1))}
              >
                « Prev
              </button>
              <span className="adm-toc-page-num">
                {topicPage + 1} / {topicPages}
              </span>
              <button
                type="button"
                disabled={topicPage + 1 >= topicPages}
                onClick={() => setTocPage((p) => Math.min(topicPages - 1, p + 1))}
              >
                Next »
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className="btn-sm"
            style={{ width: "100%", marginTop: 16 }}
            onClick={addTopic}
          >
            + New main topic
          </button>
        </details>
      </aside>

      <div>
        {!g ? (
          <p className="adm-empty">No topic selected.</p>
        ) : (
          <>
            {/* the topic itself */}
            <div className="adm-block">
              <div className="adm-block-head">
                <span className="adm-kind">Main topic</span>
                <IconButton
                  disabled={group === 0}
                  onClick={() => {
                    const id = doc.groups[group].id;
                    if (move(doc.groups, group, -1)) {
                      resort(id);
                    }
                  }}
                >
                  ▲
                </IconButton>
                <IconButton
                  disabled={group === doc.groups.length - 1}
                  onClick={() => {
                    const id = doc.groups[group].id;
                    if (move(doc.groups, group, 1)) {
                      resort(id);
                    }
                  }}
                >
                  ▼
                </IconButton>
                <IconButton danger title="Delete this whole topic" onClick={deleteTopic}>
                  ×
                </IconButton>
                <button
                  type="button"
                  className={"btn-sm" + (g.pinned ? " primary" : "")}
                  style={{ marginLeft: "auto" }}
                  onClick={() => {
                    g.pinned = !g.pinned;
                    resort(g.id);
                    notify(g.pinned ? "Topic pinned" : "Topic unpinned");
                  }}
                >
                  {g.pinned ? "Unpin" : "Pin"}
                </button>
              </div>
              <Labelled text="Topic name">
                <TextInput value={g.title} onChange={(v) => { g.title = v; touch(); }} />
              </Labelled>
              <div className="adm-label">Description — shown at the top of this topic</div>
              <RichText value={g.intro} rows={2} onChange={(v) => { g.intro = v; touch(); }} />
            </div>

            {!s ? (
              <p className="adm-empty">This topic has no sections yet — add one on the left.</p>
            ) : (
              <>
                {/* section header controls */}
                <div className="adm-block">
                  <div className="adm-block-head">
                    <span className="adm-kind">Section</span>
                    <IconButton
                      disabled={current === 0}
                      onClick={() => {
                        if (move(curSections, current, -1)) {
                          setCurrent(current - 1);
                          touch();
                        }
                      }}
                    >
                      ▲
                    </IconButton>
                    <IconButton
                      disabled={current === curSections.length - 1}
                      onClick={() => {
                        if (move(curSections, current, 1)) {
                          setCurrent(current + 1);
                          touch();
                        }
                      }}
                    >
                      ▼
                    </IconButton>
                    <IconButton
                      danger
                      title="Delete this whole section"
                      onClick={async () => {
                        const ok = await ask.confirm({
                          title: "Delete section",
                          message: `Delete the section "${s.title}" and everything in it?`,
                          yesLabel: "Delete",
                          danger: true,
                        });
                        if (!ok) return;
                        for (const src of sectionSrcs(s)) void deleteStoredImage(src, password);
                        curSections.splice(current, 1);
                        setCurrent(Math.max(0, current - 1));
                        touch();
                        notify("Section deleted");
                      }}
                    >
                      ×
                    </IconButton>
                  </div>
                  <Labelled text="Title">
                    <TextInput value={s.title} onChange={(v) => { s.title = v; touch(); }} />
                  </Labelled>
                  <Labelled text="Menu label">
                    <TextInput
                      value={s.nav}
                      placeholder="Shown on the category card list"
                      onChange={(v) => { s.nav = v; touch(); }}
                    />
                  </Labelled>
                  <Labelled text="Card summary">
                    <TextInput
                      value={s.summary}
                      placeholder="One line shown on the guide card (blank = first paragraph)"
                      onChange={(v) => { s.summary = v; touch(); }}
                    />
                  </Labelled>
                  <div className="adm-label">Card image (blank = first image in the guide)</div>
                  <div className="adm-sub">
                    {s.cover ? (
                      <img className="adm-thumb" src={assetUrl(s.cover)} alt="" />
                    ) : null}
                    <Dropzone
                      password={password}
                      onError={onError}
                      onPath={(p) => {
                        deleteStoredImage(s.cover, password);
                        s.cover = p;
                        touch();
                      }}
                    >
                      {s.cover ? "Replace the card image" : "Drop a card image here, or click to choose one"}
                    </Dropzone>
                    {s.cover ? (
                      <button
                        type="button"
                        className="btn-sm"
                        style={{ marginTop: 8 }}
                        onClick={() => {
                          deleteStoredImage(s.cover, password);
                          s.cover = "";
                          touch();
                        }}
                      >
                        Remove image
                      </button>
                    ) : null}
                  </div>
                  {doc.groups.length > 1 ? (
                    <Labelled text="Move to topic">
                      <Select
                        options={doc.groups.map((gg, gi) => [String(gi), gg.title || "(untitled)"] as [string, string])}
                        value={String(group)}
                        onChange={(v) => {
                          const to = Number(v);
                          if (to === group) return;
                          const moved = curSections.splice(current, 1)[0];
                          doc.groups[to].sections.push(moved);
                          jump(to);
                          setCurrent(doc.groups[to].sections.length - 1);
                          touch();
                        }}
                      />
                    </Labelled>
                  ) : null}
                </div>

                {/* blocks */}
                {(s.blocks || []).map((b, i) => {
                  const label = BLOCK_LABELS[b.type] || b.type;
                  return (
                    <div className="adm-block" key={i}>
                      <div className="adm-block-head">
                        <span className="adm-kind">{label}</span>
                        <IconButton
                          disabled={i === 0}
                          onClick={() => {
                            if (move(s.blocks, i, -1)) {
                              touch();
                            }
                          }}
                        >
                          ▲
                        </IconButton>
                        <IconButton
                          disabled={i === (s.blocks || []).length - 1}
                          onClick={() => {
                            if (move(s.blocks, i, 1)) {
                              touch();
                            }
                          }}
                        >
                          ▼
                        </IconButton>
                        <IconButton
                          danger
                          onClick={async () => {
                            const ok = await ask.confirm({
                              title: "Delete block",
                              message: `Delete this ${label}?`,
                              yesLabel: "Delete",
                              danger: true,
                            });
                            if (!ok) return;
                            for (const src of figSrcs(s.blocks[i] ? [s.blocks[i]] : [])) {
                              void deleteStoredImage(src, password);
                            }
                            s.blocks.splice(i, 1);
                            touch();
                            notify("Block deleted");
                          }}
                        >
                          ×
                        </IconButton>
                      </div>
                      <BlockEditor b={b} touch={touch} password={password} onError={onError} />
                    </div>
                  );
                })}

                {/* add-block buttons */}
                <div className="adm-add">
                  {BLOCK_TYPES.map((t) => (
                    <button
                      type="button"
                      className="btn-sm"
                      key={t}
                      onClick={() => {
                        s.blocks.push(blankBlock(t));
                        touch();
                        window.scrollTo(0, document.body.scrollHeight);
                      }}
                    >
                      + {BLOCK_LABELS[t]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}