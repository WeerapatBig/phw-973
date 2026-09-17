"use client";

import Link from "next/link";
import { useT } from "./i18n/LocaleProvider";
import { ProfileButton } from "./ProfileButton";

export function Header() {
  const t = useT();
  const links = [
    { href: "/", label: t("nav.home") },
    { href: "/guide", label: t("nav.guide") },
    { href: "/rules", label: t("nav.rules") },
    { href: "https://discord.gg/R8CC3CfdZ4", label: t("nav.discord"), external: true },
  ];

  return (
    <header className="site-header">
      <div className="wrap">
        <Link className="brand" href="/">
          <span className="brand-long">PHOENIX OF WAR</span>
          <span className="brand-short">PHW</span> <span className="tag">973</span>
        </Link>
        <nav className="nav">
          {links.map((l) =>
            l.external ? (
              <a key={l.href} href={l.href} target="_blank" rel="noopener">
                {l.label}
              </a>
            ) : (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            )
          )}
          <ProfileButton />
        </nav>
      </div>
    </header>
  );
}
