"use client";

import Link from "next/link";
import type { HomeDoc } from "@/lib/types";
import { assetUrl } from "@/lib/assets";

// The home page markup, kept in a client component so it can re-render with a
// translated document (see TranslatedHome).
export default function HomeView({ home }: { home: HomeDoc }) {
  return (
    <>
      <div className="hero">
        <div className="wrap">
          <p className="sub">{home.hero.sub}</p>
          <h1>{home.hero.title}</h1>
          <p className="motto">
            {home.hero.motto}
            <span>{home.hero.tagline}</span>
          </p>
          <div className="btn-row">
            <Link className="btn btn-primary" href={home.hero.primaryHref}>
              {home.hero.primaryLabel}
            </Link>
            <Link className="btn btn-ghost" href={home.hero.ghostHref}>
              {home.hero.ghostLabel}
            </Link>
          </div>
        </div>
      </div>

      <section id="hub">
        <div className="wrap">
          <p className="eyebrow">{home.hub.eyebrow}</p>
          <h2>{home.hub.title}</h2>
          <p className="lead">{home.hub.lead}</p>
          <div className="grid" style={{ marginTop: 24 }}>
            {home.hub.links.map((l, i) => (
              <Link className="card hub-link" href={l.href} key={i}>
                <h3>{l.label}</h3>
                <p>{l.note}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="start-here">
        <div className="wrap">
          <div className="hub-cta">
            <div>
              <h3>{home.hub.startHere.title}</h3>
              <p>{home.hub.startHere.text}</p>
            </div>
            <Link className="btn btn-primary" href={home.hub.startHere.href}>
              {home.hub.startHere.label}
            </Link>
          </div>
        </div>
      </section>

      <section id="about">
        <div className="wrap split">
          <div>
            <p className="eyebrow">{home.about.eyebrow}</p>
            <h2>{home.about.title}</h2>
            <p className="lead">{home.about.lead}</p>
          </div>
          <img
            className="split-art"
            src={assetUrl(home.about.image)}
            width={900}
            height={900}
            decoding="async"
            alt={home.about.imageAlt}
          />
        </div>
      </section>

      <section id="join">
        <div className="wrap">
          <p className="eyebrow">{home.join.eyebrow}</p>
          <h2>{home.join.title}</h2>
          <dl className="facts">
            {home.join.facts.map((f, i) => (
              <div key={i} style={{ display: "contents" }}>
                <dt>{f.term}</dt>
                <dd>{f.detail}</dd>
              </div>
            ))}
          </dl>
          <div
            className="btn-row"
            style={{ justifyContent: "flex-start", marginTop: 28 }}
          >
            <a
              className="btn btn-primary"
              href={home.join.primaryHref}
              target="_blank"
              rel="noopener"
            >
              {home.join.primaryLabel}
            </a>
            <Link className="btn btn-ghost" href={home.join.ghostHref}>
              {home.join.ghostLabel}
            </Link>
          </div>
          <p className="lead" style={{ marginTop: 24 }}>
            {home.join.footerNote}
          </p>
        </div>
      </section>
    </>
  );
}
