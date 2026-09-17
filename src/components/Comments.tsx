"use client";

import { useEffect, useState } from "react";
import type { CommentNode } from "@/lib/types";
import { MAX_DEPTH } from "@/lib/comments";
import { getName, setName as rememberName } from "@/lib/client-token";
import { HeartIcon, ReplyIcon } from "./icons";
import { useT } from "./i18n/LocaleProvider";

type Handlers = {
  onPost: (body: string, parentId: string | null, author: string) => Promise<void>;
  onEdit: (id: string, body: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onHeart: (id: string) => Promise<void>;
};

type TFn = ReturnType<typeof useT>;

function ago(iso: string, t: TFn): string {
  const ts = new Date(iso).getTime();
  if (!ts) return "";
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return t("cmt.justNow");
  const m = s / 60;
  if (m < 60) return t("cmt.minutes", { n: Math.floor(m) });
  const h = m / 60;
  if (h < 24) return t("cmt.hours", { n: Math.floor(h) });
  const d = h / 24;
  if (d < 7) return t("cmt.days", { n: Math.floor(d) });
  return new Date(iso).toLocaleDateString();
}

function Composer({
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus,
}: {
  submitLabel: string;
  onSubmit: (body: string, author: string) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(getName());
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSubmit(text, name);
      rememberName(name.trim());
      setText("");
    } catch {
      // The parent shows the error; keep the text so nothing is lost.
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="cmt-form" onSubmit={submit}>
      <input
        className="adm-field cmt-name"
        type="text"
        value={name}
        maxLength={40}
        placeholder={t("cmt.namePlaceholder")}
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        className="adm-field cmt-box"
        rows={3}
        value={text}
        maxLength={4000}
        placeholder={t("cmt.bodyPlaceholder")}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="cmt-form-actions">
        {onCancel ? (
          <button type="button" className="btn-sm" onClick={onCancel}>
            {t("cmt.cancel")}
          </button>
        ) : null}
        <button type="submit" className="btn-sm primary" disabled={sending || !text.trim()}>
          {sending ? t("cmt.posting") : submitLabel}
        </button>
      </div>
    </form>
  );
}

function CommentView({
  c,
  depth,
  handlers,
  busy,
}: {
  c: CommentNode;
  depth: number;
  handlers: Handlers;
  busy: boolean;
}) {
  const t = useT();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const indent = Math.min(depth, MAX_DEPTH) * 26;

  return (
    <div className="cmt" style={{ marginLeft: indent }}>
      <div className="cmt-head">
        <span className="cmt-avatar" aria-hidden="true">
          {(c.author || "?").charAt(0).toUpperCase()}
        </span>
        <span className="cmt-author">{c.author}</span>
        <span className="cmt-time">{ago(c.createdAt, t)}</span>
        {c.edited && !c.deleted ? (
          <span className="cmt-edited">{t("cmt.edited")}</span>
        ) : null}
      </div>

      {c.deleted ? (
        <p className="cmt-body cmt-gone">{t("cmt.deleted")}</p>
      ) : editing ? (
        <Composer
          submitLabel={t("cmt.save")}
          autoFocus
          onCancel={() => setEditing(false)}
          onSubmit={async (body) => {
            await handlers.onEdit(c.id, body);
            setEditing(false);
          }}
        />
      ) : (
        <p className="cmt-body">{c.body}</p>
      )}

      {!c.deleted ? (
        <div className="cmt-actions">
          <button
            type="button"
            className={"cmt-act" + (c.hearted ? " on" : "")}
            onClick={() => handlers.onHeart(c.id)}
            disabled={busy}
            aria-pressed={!!c.hearted}
            title={c.hearted ? t("heart.unheartTitle") : t("heart.heartTitle")}
          >
            <HeartIcon filled={!!c.hearted} />
            {c.hearts > 0 ? c.hearts : ""}
          </button>
          <button
            type="button"
            className="cmt-act"
            onClick={() => setReplying((v) => !v)}
            disabled={busy}
          >
            <ReplyIcon /> {t("cmt.reply")}
          </button>
          {c.mine ? (
            <>
              <button
                type="button"
                className="cmt-act"
                onClick={() => setEditing(true)}
                disabled={busy}
              >
                {t("cmt.edit")}
              </button>
              <button
                type="button"
                className="cmt-act danger"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(t("cmt.confirmDelete"))) handlers.onDelete(c.id);
                }}
              >
                {t("cmt.delete")}
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {replying ? (
        <Composer
          submitLabel={t("cmt.reply")}
          autoFocus
          onCancel={() => setReplying(false)}
          onSubmit={async (body, author) => {
            await handlers.onPost(body, c.id, author);
            setReplying(false);
          }}
        />
      ) : null}

      {c.replies.map((r) => (
        <CommentView key={r.id} c={r} depth={depth + 1} handlers={handlers} busy={busy} />
      ))}
    </div>
  );
}

export function Comments({
  comments,
  count,
  handlers,
  busy,
  error,
}: {
  comments: CommentNode[];
  count: number;
  handlers: Handlers;
  busy: boolean;
  error: string;
}) {
  const t = useT();
  return (
    <section className="cmt-section" aria-label={t("cmt.title")}>
      <h2>
        {t("cmt.title")} <span className="cmt-count">{count}</span>
      </h2>
      <p className="cmt-note">{t("cmt.note")}</p>

      {error ? <p className="adm-err">{error}</p> : null}

      <Composer
        submitLabel={t("cmt.post")}
        onSubmit={(body, author) => handlers.onPost(body, null, author)}
      />

      {comments.length === 0 ? (
        <p className="wip">{t("cmt.empty")}</p>
      ) : (
        <div className="cmt-list">
          {comments.map((c) => (
            <CommentView key={c.id} c={c} depth={0} handlers={handlers} busy={busy} />
          ))}
        </div>
      )}
    </section>
  );
}
