"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ModComment = {
  id: string;
  categoryId: string;
  guideId: string;
  guideTitle: string;
  categoryTitle: string;
  author: string;
  body: string;
  hidden: boolean;
  deleted: boolean;
  createdAt: string;
  hearts: number;
};

// Officer view of every comment. Hide keeps a comment for the record but takes
// it off the site; delete removes it and any replies for real.
export function CommentsAdmin({
  password,
  onError,
}: {
  password: string;
  onError: (msg: string) => void;
}) {
  const [rows, setRows] = useState<ModComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, action: "list" }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) throw new Error(data?.error || "Could not load comments.");
      setRows(data.comments as ModComment[]);
      onError("");
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [password, onError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function act(id: string, action: "hide" | "unhide" | "delete") {
    if (action === "delete" && !window.confirm("Delete this comment and all of its replies?")) return;
    setBusy(id);
    try {
      const r = await fetch("/api/admin/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password, action, id }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) throw new Error(data?.error || "Could not update the comment.");
      await load();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  if (loading) return <p className="wip">Loading comments…</p>;
  if (rows.length === 0) return <p className="wip">No comments yet.</p>;

  return (
    <div className="adm-mod">
      <p className="help-lead">
        Every comment on every guide, newest first. {rows.length} total.
      </p>
      {rows.map((c) => (
        <div key={c.id} className={"adm-mod-row" + (c.hidden ? " hidden" : "")}>
          <div className="adm-mod-head">
            <span className="cmt-avatar" aria-hidden="true">
              {(c.author || "?").charAt(0).toUpperCase()}
            </span>
            <strong>{c.author}</strong>
            <span className="adm-mod-guide">
              <Link
                href={`/guide/${encodeURIComponent(c.categoryId)}/${encodeURIComponent(c.guideId)}`}
                target="_blank"
                rel="noopener"
              >
                {c.categoryTitle} / {c.guideTitle}
              </Link>
            </span>
            <span className="adm-mod-time">{new Date(c.createdAt).toLocaleString()}</span>
            {c.hidden ? <span className="adm-mod-tag">hidden</span> : null}
          </div>
          <p className="adm-mod-body">{c.body || <em>(empty)</em>}</p>
          <div className="adm-mod-actions">
            <span className="adm-mod-hearts">{c.hearts} hearts</span>
            <button
              type="button"
              className="btn-sm"
              disabled={busy === c.id}
              onClick={() => act(c.id, c.hidden ? "unhide" : "hide")}
            >
              {c.hidden ? "Show again" : "Hide"}
            </button>
            <button
              type="button"
              className="btn-sm danger"
              disabled={busy === c.id}
              onClick={() => act(c.id, "delete")}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
