"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GuideDoc, HomeDoc } from "@/lib/types";
import { normalize, normalizeHome, normalizeRules, slug } from "@/lib/content";
import { GuideEditor } from "./editor/GuideEditor";
import { HomeEditor } from "./editor/HomeEditor";
import { CommentsAdmin } from "./editor/CommentsAdmin";
import { Manual } from "./editor/Manual";
import { GuideGroup } from "@/components/GuideGroup";
import { LightboxProvider } from "@/components/Lightbox";

type Tab = "guide" | "rules" | "home" | "comments";
type View = "help" | "edit";

async function post(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const r = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, data };
}

export default function AdminPage() {
  const [phase, setPhase] = useState<"login" | "editor">("login");
  const [pw, setPw] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [busyLogin, setBusyLogin] = useState(false);

  const [guide, setGuide] = useState<GuideDoc | null>(null);
  const [guideVer, setGuideVer] = useState<number | null>(null);
  const [rules, setRules] = useState<GuideDoc | null>(null);
  const [rulesVer, setRulesVer] = useState<number | null>(null);
  const [home, setHome] = useState<HomeDoc | null>(null);
  const [homeVer, setHomeVer] = useState<number | null>(null);

  const [tab, setTab] = useState<Tab>("guide");
  const [view, setView] = useState<View>("help");
  const [gIdx, setGIdx] = useState(0);
  const [secIdx, setSecIdx] = useState(0);

  const [stateMsg, setStateMsg] = useState("");
  const [dirty, setDirty] = useState(false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Tab | null>(null);
  // The editor edits the loaded document in place, so a state change is what
  // makes React show it. Bumping this on every edit guarantees a re-render even
  // when `dirty` and the status message are already set.
  const [, bump] = useState(0);

  function touch() {
    setDirty(true);
    setStateMsg("Unsaved changes");
    bump((n) => n + 1);
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusyLogin(true);
    setLoginErr("");
    const pw = loginPw;
    const { ok, data } = await post("/api/admin/load", { password: pw });
    if (!ok) {
      setBusyLogin(false);
      const msg = String(data?.error || "Could not load the site content.");
      setLoginErr(/password/i.test(msg) ? "Wrong password." : msg);
      return;
    }
    setPw(pw);
    const g = (data.guide as { doc?: unknown; version?: number | null } | null) ?? null;
    const h = (data.home as { doc?: unknown; version?: number | null } | null) ?? null;
    const r = (data.rules as { doc?: unknown; version?: number | null } | null) ?? null;
    setGuide(normalize(g?.doc ?? null));
    setGuideVer(g?.version ?? null);
    setHome(normalizeHome(h?.doc ?? null));
    setHomeVer(h?.version ?? null);
    setRules(normalizeRules(r?.doc ?? null));
    setRulesVer(r?.version ?? null);
    setGIdx(0);
    setSecIdx(0);
    setTab("guide");
    setView("help");
    setPhase("editor");
  }

  async function save() {
    if (tab === "comments") return;
    const target = tab;
    const doc = target === "guide" ? guide : target === "rules" ? rules : home;
    const version = target === "guide" ? guideVer : target === "rules" ? rulesVer : homeVer;
    if (!doc) return;
    setErr("");
    setSaving(true);

    if (target === "guide" || target === "rules") {
      (doc as GuideDoc).groups.forEach((g) => {
        if (!g.id) g.id = slug(g.title);
        g.sections.forEach((s) => {
          if (!s.id) s.id = slug(s.title);
        });
      });
    }
    const { ok, status, data } = await post("/api/admin/save", {
      password: pw,
      target,
      doc,
      version: version ?? undefined,
    });
    setSaving(false);
    if (!ok) {
      const msg = String(data?.error || `Something went wrong (HTTP ${status || "unknown"}).`);
      setStateMsg("Not saved");
      if (/conflict/i.test(msg)) {
        setErr(
          "Someone else saved changes while you were editing. " +
            "Copy anything you need, then reload this page to get their version."
        );
      } else {
        setErr("Could not save: " + msg);
      }
      return;
    }
    if (target === "guide") setGuideVer(data.version as number);
    else if (target === "rules") setRulesVer(data.version as number);
    else setHomeVer(data.version as number);
    setStateMsg("Published — the site is live");
    setDirty(false);
  }

  function signOut() {
    if (dirty && !window.confirm("You have unsaved changes. Sign out anyway?")) return;
    window.location.reload();
  }

  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);

  if (phase === "login") {
    return (
      <div className="adm-login">
        <h1>Phoenix of War 973</h1>
        <p>Officer access</p>
        <form onSubmit={login}>
          <input
            className="adm-field"
            type="password"
            value={loginPw}
            onChange={(e) => setLoginPw(e.target.value)}
            placeholder="Admin password"
            autoComplete="current-password"
            required
          />
          <p className="adm-err">{loginErr}</p>
          <button className="btn-sm primary" style={{ width: "100%", padding: 12 }} type="submit" disabled={busyLogin}>
            {busyLogin ? "Checking…" : "Unlock"}
          </button>
        </form>
        <p style={{ marginTop: 28 }}>
          <Link href="/">&larr; Back to the site</Link>
        </p>
      </div>
    );
  }

  const showTab = (t: Tab) => {
    setTab(t);
    setView(t === "guide" ? view : "edit");
    setGIdx(0);
    setSecIdx(0);
    setErr("");
  };

  const heading =
    view === "help" && tab === "guide"
      ? "How to use this editor"
      : tab === "rules"
        ? "Alliance rules editor"
        : tab === "home"
          ? "Home page editor"
          : tab === "comments"
            ? "Comments moderation"
            : "Guide editor";

  return (
    <div className="adm-shell">
      <div className="adm-bar">
        <h1>{heading}</h1>
        {dirty ? (
          <span className="adm-state dirty">{stateMsg}</span>
        ) : (
          <span className="adm-state">{stateMsg}</span>
        )}
        <span className="adm-spacer" />
        <div className="adm-tabs">
          <button
            type="button"
            className={"btn-sm" + (tab === "guide" ? " primary" : "")}
            onClick={() => showTab("guide")}
          >
            Guide
          </button>
          <button
            type="button"
            className={"btn-sm" + (tab === "rules" ? " primary" : "")}
            onClick={() => showTab("rules")}
          >
            Rules
          </button>
          <button
            type="button"
            className={"btn-sm" + (tab === "home" ? " primary" : "")}
            onClick={() => showTab("home")}
          >
            Home
          </button>
          <button
            type="button"
            className={"btn-sm" + (tab === "comments" ? " primary" : "")}
            onClick={() => showTab("comments")}
          >
            Comments
          </button>
        </div>
        {tab === "guide" ? (
          <button type="button" className="btn-sm" onClick={() => { setView("help"); window.scrollTo(0, 0); }}>
            Help
          </button>
        ) : null}
        {tab !== "comments" ? (
          <button
            type="button"
            className="btn-sm"
            onClick={() => setPreview((p) => (p ? null : tab))}
          >
            Preview
          </button>
        ) : null}
        <button
          type="button"
          className="btn-sm primary"
          onClick={save}
          disabled={!dirty || saving || tab === "comments"}
        >
          {saving ? "Saving…" : (
            <>
              Save<span className="wide-only"> &amp; publish</span>
            </>
          )}
        </button>
        {tab === "guide" && view === "help" ? (
          <button type="button" className="btn-sm primary" onClick={() => setView("edit")}>
            Start<span className="wide-only"> editing</span> &rarr;
          </button>
        ) : null}
        <button type="button" className="btn-sm" onClick={signOut}>
          <span className="wide-only">Sign out</span>
          <span className="narrow-only">Exit</span>
        </button>
      </div>

      <p className="adm-err">{err}</p>

      {tab === "guide" && view === "help" ? (
        <Manual />
      ) : tab === "guide" && guide ? (
        <GuideEditor
          doc={guide}
          touch={touch}
          password={pw}
          onError={setErr}
          group={gIdx}
          current={secIdx}
          setGroup={setGIdx}
          setCurrent={setSecIdx}
        />
      ) : tab === "rules" && rules ? (
        <GuideEditor
          doc={rules}
          touch={touch}
          password={pw}
          onError={setErr}
          group={gIdx}
          current={secIdx}
          setGroup={setGIdx}
          setCurrent={setSecIdx}
        />
      ) : tab === "comments" ? (
        <CommentsAdmin password={pw} onError={setErr} />
      ) : home ? (
        <HomeEditor doc={home} touch={touch} password={pw} onError={setErr} />
      ) : null}

      {preview && home ? (
        <LightboxProvider>
          <dialog
            className="lb"
            open
            onKeyDown={(e) => {
              if (e.key === "Escape") setPreview(null);
            }}
          >
            <div className="lb-bar">
              <strong style={{ flex: 1, font: "600 14px var(--font-body)" }}>
                Preview — this is how the page will look
              </strong>
              <button type="button" className="lb-btn lb-close" onClick={() => setPreview(null)}>
                &times;
              </button>
            </div>
            <div style={{ overflow: "auto", padding: "28px 20px" }}>
              <div className="wrap">
                {preview === "guide" && guide ? (
                  <div className="guide-body">
                    <GuideGroup group={guide.groups[gIdx] || { id: "empty", title: "", sections: [] }} />
                  </div>
                ) : preview === "rules" && rules ? (
                  <div className="guide-body">
                    <GuideGroup group={rules.groups[gIdx] || { id: "empty", title: "", sections: [] }} />
                  </div>
                ) : (
                  <HomePreview doc={home} />
                )}
              </div>
            </div>
          </dialog>
        </LightboxProvider>
      ) : null}
    </div>
  );
}

function HomePreview({ doc }: { doc: HomeDoc }) {
  return (
    <div className="lb-preview" style={{ color: "var(--text)" }}>
      <div className="hero" style={{ padding: "48px 0 36px" }}>
        <p className="sub">{doc.hero.sub}</p>
        <h1>{doc.hero.title}</h1>
        <p className="motto">
          {doc.hero.motto}
          <span>{doc.hero.tagline}</span>
        </p>
        <div className="btn-row">
          <span className="btn btn-primary">{doc.hero.primaryLabel}</span>
          <span className="btn btn-ghost">{doc.hero.ghostLabel}</span>
        </div>
      </div>
      <section id="about">
        <h2>{doc.about.title}</h2>
        <p className="lead">{doc.about.lead}</p>
      </section>
      <section>
        <p className="eyebrow">{doc.hub.eyebrow}</p>
        <h2>{doc.hub.title}</h2>
        <p className="lead">{doc.hub.lead}</p>
        <div className="grid" style={{ marginTop: 24 }}>
          {doc.hub.links.map((l, i) => (
            <div className="card" key={i}>
              <h3>{l.label}</h3>
              <p>{l.note}</p>
            </div>
          ))}
        </div>
      </section>
      <section>
        <div className="hub-cta">
          <div>
            <h3>{doc.hub.startHere.title}</h3>
            <p>{doc.hub.startHere.text}</p>
          </div>
          <span className="btn btn-primary">{doc.hub.startHere.label}</span>
        </div>
      </section>
      <section>
        <h2>{doc.join.title}</h2>
        <dl className="facts">
          {doc.join.facts.map((f, i) => (
            <div key={i} style={{ display: "contents" }}>
              <dt>{f.term}</dt>
              <dd>{f.detail}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}