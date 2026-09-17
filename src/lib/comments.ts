import type { CommentNode, FlatComment } from "./types";

// Nest a flat list of comments into their threads. Pure so it can be unit
// checked. Order is by creation time, oldest first, at every level.
export function buildCommentTree(flat: FlatComment[]): CommentNode[] {
  const nodes = new Map<string, CommentNode>();
  for (const c of flat) {
    nodes.set(c.id, {
      id: c.id,
      parentId: c.parentId ?? null,
      author: c.author,
      body: c.body,
      hearts: c.hearts || 0,
      hearted: c.hearted,
      mine: c.mine,
      edited: c.edited,
      deleted: c.deleted,
      createdAt: c.createdAt,
      replies: [],
    });
  }

  const roots: CommentNode[] = [];
  for (const c of flat) {
    const node = nodes.get(c.id)!;
    const parent = c.parentId ? nodes.get(c.parentId) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }

  const byTime = (a: CommentNode, b: CommentNode) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
  const sortDeep = (list: CommentNode[]) => {
    list.sort(byTime);
    for (const n of list) sortDeep(n.replies);
  };
  sortDeep(roots);
  return roots;
}

// Total comments in a thread, replies included.
export function countComments(nodes: CommentNode[]): number {
  return nodes.reduce((n, c) => n + 1 + countComments(c.replies), 0);
}

// How many levels deep a thread may nest before the UI stops indenting. Replies
// beyond this are still shown, just at the deepest indent.
export const MAX_DEPTH = 4;

// Trim and tidy a comment body before it is stored. Newlines are kept (people
// write lists), runs of blank lines are collapsed, and the length is capped so
// one comment cannot fill the database.
export function cleanCommentBody(raw: string, max = 4000): string {
  const s = String(raw ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return s.length > max ? s.slice(0, max).trimEnd() : s;
}

// Display name: trimmed, capped, and never empty.
export function cleanAuthor(raw: string, max = 40): string {
  const s = String(raw ?? "").replace(/\s+/g, " ").trim();
  return (s || "Anonymous").slice(0, max);
}
