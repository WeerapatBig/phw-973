"use client";

import { useEffect, useRef } from "react";
import type { GuideDoc } from "@/lib/types";
import { BLOCK_LABELS, BLOCK_TYPES, blankBlock, move, slug } from "@/lib/content";
import { assetUrl } from "@/lib/assets";
import { BlockEditor } from "./BlockEditor";
import { Dropzone, IconButton, Labelled, RichText, Select, TextInput } from "./fields";

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

  // on a phone the topic list would push the editor off-screen, so fold it away
  useEffect(() => {
    if (detailsRef.current)
      detailsRef.current.open = !window.matchMedia("(max-width: 820px)").matches;
  }, []);

  const select = (gi: number, si: number) => {
    setGroup(gi);
    setCurrent(si);
  };

  const g = doc.groups[group];
  const curSections = g?.sections || [];
  const s = curSections[current];

  function addSection() {
    const title = window.prompt("Name of the new section:");
    if (!title) return;
    g.sections.push({ id: slug(title), nav: title, title, blocks: [] });
    setCurrent(g.sections.length - 1);
    touch();
  }

  function addTopic() {
    const title = window.prompt("Name of the new main topic (for example: Guide Season 4):");
    if (!title) return;
    doc.groups.push({ id: slug(title), title, intro: "", sections: [] });
    setGroup(doc.groups.length - 1);
    setCurrent(0);
    touch();
  }

  function deleteTopic() {
    const g = curGroupRef();
    if (doc.groups.length < 2) {
      window.alert("There has to be at least one topic.");
      return;
    }
    if (!window.confirm(`Delete the topic "${g.title}" and all ${g.sections.length} of its sections?`)) return;
    doc.groups.splice(group, 1);
    setGroup(Math.max(0, group - 1));
    setCurrent(0);
    touch();
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
            {doc.groups.map((gg, gi) => (
              <div key={gi}>
                <button
                  type="button"
                  className={"adm-grp-btn" + (gi === group ? " on" : "")}
                  onClick={() => select(gi, 0)}
                >
                  <span>{gg.title || "(untitled topic)"}</span>
                </button>
                {gi === group ? (
                  <>
                    {gg.sections.map((sec, si) => (
                      <button
                        type="button"
                        key={si}
                        className={"adm-sec-btn" + (si === current ? " on" : "")}
                        onClick={() => select(gi, si)}
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
            ))}
          </div>
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
                    if (move(doc.groups, group, -1)) {
                      setGroup(group - 1);
                      touch();
                    }
                  }}
                >
                  ▲
                </IconButton>
                <IconButton
                  disabled={group === doc.groups.length - 1}
                  onClick={() => {
                    if (move(doc.groups, group, 1)) {
                      setGroup(group + 1);
                      touch();
                    }
                  }}
                >
                  ▼
                </IconButton>
                <IconButton danger title="Delete this whole topic" onClick={deleteTopic}>
                  ×
                </IconButton>
              </div>
              <Labelled text="Topic name">
                <TextInput value={g.title} onChange={(v) => { g.title = v; touch(); }} />
              </Labelled>
              <div className="adm-label">Intro shown under the title</div>
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
                      onClick={() => {
                        if (!window.confirm(`Delete the section "${s.title}" and everything in it?`)) return;
                        curSections.splice(current, 1);
                        setCurrent(Math.max(0, current - 1));
                        touch();
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
                      onPath={(p) => { s.cover = p; touch(); }}
                    >
                      {s.cover ? "Replace the card image" : "Drop a card image here, or click to choose one"}
                    </Dropzone>
                    {s.cover ? (
                      <button
                        type="button"
                        className="btn-sm"
                        style={{ marginTop: 8 }}
                        onClick={() => { s.cover = ""; touch(); }}
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
                          setGroup(to);
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
                          onClick={() => {
                            if (!window.confirm(`Delete this ${label}?`)) return;
                            s.blocks.splice(i, 1);
                            touch();
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