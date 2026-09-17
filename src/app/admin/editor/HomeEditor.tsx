"use client";

import type { HomeDoc, HomeFact, HubLink } from "@/lib/types";
import { Dropzone, Labelled, TextInput } from "./fields";
import { assetUrl } from "@/lib/assets";

function HubLinks({
  links,
  touch,
}: {
  links: HubLink[];
  touch: () => void;
}) {
  return (
    <div className="adm-block">
      <span className="adm-kind" style={{ flex: "none", marginBottom: 12 }}>
        Quick links shown on the home hub
      </span>
      {links.map((l, i) => (
        <div className="adm-sub" key={i}>
          <Labelled text="Label">
            <TextInput value={l.label} onChange={(v) => { l.label = v; touch(); }} />
          </Labelled>
          <Labelled text="Link">
            <TextInput value={l.href} onChange={(v) => { l.href = v; touch(); }} />
          </Labelled>
          <Labelled text="Note">
            <TextInput value={l.note} onChange={(v) => { l.note = v; touch(); }} />
          </Labelled>
          <button
            type="button"
            className="btn-sm danger"
            onClick={() => {
              links.splice(i, 1);
              touch();
            }}
          >
            Remove link
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn-sm"
        onClick={() => {
          links.push({ label: "", href: "", note: "" });
          touch();
        }}
      >
        + Add link
      </button>
    </div>
  );
}

function FactList({
  facts,
  touch,
}: {
  facts: HomeFact[];
  touch: () => void;
}) {
  return (
    <div className="adm-block">
      <span className="adm-kind" style={{ flex: "none", marginBottom: 12 }}>
        Facts (term : detail)
      </span>
      {facts.map((f, i) => (
        <div className="adm-sub" key={i}>
          <Labelled text="Term">
            <TextInput value={f.term} onChange={(v) => { f.term = v; touch(); }} />
          </Labelled>
          <Labelled text="Detail">
            <textarea
              className="adm-field"
              rows={2}
              value={f.detail}
              onChange={(e) => { f.detail = e.target.value; touch(); }}
            />
          </Labelled>
          <button
            type="button"
            className="btn-sm danger"
            onClick={() => {
              facts.splice(i, 1);
              touch();
            }}
          >
            Remove fact
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn-sm"
        onClick={() => {
          facts.push({ term: "", detail: "" });
          touch();
        }}
      >
        + Add fact
      </button>
    </div>
  );
}

export function HomeEditor({
  doc,
  touch,
  password,
  onError,
}: {
  doc: HomeDoc;
  touch: () => void;
  password: string;
  onError: (msg: string) => void;
}) {
  return (
    <div>
      <div className="adm-label" style={{ marginBottom: 4 }}>
        Hero
      </div>
      <div className="adm-block">
        <Labelled text="Eyebrow">
          <TextInput value={doc.hero.sub} onChange={(v) => { doc.hero.sub = v; touch(); }} />
        </Labelled>
        <Labelled text="Title">
          <TextInput value={doc.hero.title} onChange={(v) => { doc.hero.title = v; touch(); }} />
        </Labelled>
        <Labelled text="Motto">
          <TextInput value={doc.hero.motto} onChange={(v) => { doc.hero.motto = v; touch(); }} />
        </Labelled>
        <Labelled text="Tagline">
          <TextInput value={doc.hero.tagline} onChange={(v) => { doc.hero.tagline = v; touch(); }} />
        </Labelled>
        <Labelled text="Button 1 label">
          <TextInput value={doc.hero.primaryLabel} onChange={(v) => { doc.hero.primaryLabel = v; touch(); }} />
        </Labelled>
        <Labelled text="Button 1 link">
          <TextInput value={doc.hero.primaryHref} onChange={(v) => { doc.hero.primaryHref = v; touch(); }} />
        </Labelled>
        <Labelled text="Button 2 label">
          <TextInput value={doc.hero.ghostLabel} onChange={(v) => { doc.hero.ghostLabel = v; touch(); }} />
        </Labelled>
        <Labelled text="Button 2 link">
          <TextInput value={doc.hero.ghostHref} onChange={(v) => { doc.hero.ghostHref = v; touch(); }} />
        </Labelled>
      </div>

      <div className="adm-label" style={{ marginBottom: 4 }}>
        About
      </div>
      <div className="adm-block">
        <Labelled text="Eyebrow">
          <TextInput value={doc.about.eyebrow} onChange={(v) => { doc.about.eyebrow = v; touch(); }} />
        </Labelled>
        <Labelled text="Title">
          <TextInput value={doc.about.title} onChange={(v) => { doc.about.title = v; touch(); }} />
        </Labelled>
        <Labelled text="Text">
          <textarea
            className="adm-field"
            rows={5}
            value={doc.about.lead}
            onChange={(e) => { doc.about.lead = e.target.value; touch(); }}
          />
        </Labelled>
        <Labelled text="Image alt">
          <TextInput value={doc.about.imageAlt} onChange={(v) => { doc.about.imageAlt = v; touch(); }} />
        </Labelled>
        {doc.about.image ? (
          <img className="adm-thumb" src={assetUrl(doc.about.image)} alt="" />
        ) : null}
        <Dropzone
          password={password}
          onError={onError}
          onPath={(p) => { doc.about.image = p; touch(); }}
        />
      </div>

      <div className="adm-label" style={{ marginBottom: 4 }}>
        Home hub
      </div>
      <div className="adm-block">
        <Labelled text="Eyebrow">
          <TextInput value={doc.hub.eyebrow} onChange={(v) => { doc.hub.eyebrow = v; touch(); }} />
        </Labelled>
        <Labelled text="Title">
          <TextInput value={doc.hub.title} onChange={(v) => { doc.hub.title = v; touch(); }} />
        </Labelled>
        <Labelled text="Intro">
          <textarea
            className="adm-field"
            rows={2}
            value={doc.hub.lead}
            onChange={(e) => { doc.hub.lead = e.target.value; touch(); }}
          />
        </Labelled>
      </div>

      <HubLinks links={doc.hub.links} touch={touch} />

      <div className="adm-block">
        <span className="adm-kind" style={{ flex: "none", marginBottom: 12 }}>
          New-member box
        </span>
        <Labelled text="Title">
          <TextInput value={doc.hub.startHere.title} onChange={(v) => { doc.hub.startHere.title = v; touch(); }} />
        </Labelled>
        <Labelled text="Text">
          <textarea
            className="adm-field"
            rows={3}
            value={doc.hub.startHere.text}
            onChange={(e) => { doc.hub.startHere.text = e.target.value; touch(); }}
          />
        </Labelled>
        <Labelled text="Button label">
          <TextInput value={doc.hub.startHere.label} onChange={(v) => { doc.hub.startHere.label = v; touch(); }} />
        </Labelled>
        <Labelled text="Button link">
          <TextInput value={doc.hub.startHere.href} onChange={(v) => { doc.hub.startHere.href = v; touch(); }} />
        </Labelled>
      </div>

      <FactList
        facts={doc.join.facts}
        touch={touch}
      />

      <div className="adm-label" style={{ marginBottom: 4 }}>
        Join section
      </div>
      <div className="adm-block">
        <Labelled text="Eyebrow">
          <TextInput value={doc.join.eyebrow} onChange={(v) => { doc.join.eyebrow = v; touch(); }} />
        </Labelled>
        <Labelled text="Title">
          <TextInput value={doc.join.title} onChange={(v) => { doc.join.title = v; touch(); }} />
        </Labelled>
        <Labelled text="Button label">
          <TextInput value={doc.join.primaryLabel} onChange={(v) => { doc.join.primaryLabel = v; touch(); }} />
        </Labelled>
        <Labelled text="Button link">
          <TextInput value={doc.join.primaryHref} onChange={(v) => { doc.join.primaryHref = v; touch(); }} />
        </Labelled>
        <Labelled text="Secondary button label">
          <TextInput value={doc.join.ghostLabel} onChange={(v) => { doc.join.ghostLabel = v; touch(); }} />
        </Labelled>
        <Labelled text="Secondary button link">
          <TextInput value={doc.join.ghostHref} onChange={(v) => { doc.join.ghostHref = v; touch(); }} />
        </Labelled>
        <Labelled text="Footer note">
          <textarea
            className="adm-field"
            rows={2}
            value={doc.join.footerNote}
            onChange={(e) => { doc.join.footerNote = e.target.value; touch(); }}
          />
        </Labelled>
      </div>
    </div>
  );
}