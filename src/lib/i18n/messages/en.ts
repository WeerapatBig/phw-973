// The English baseline. Every other language falls back to these keys, so a
// missing translation shows English rather than a blank or a raw key.
const en = {
  "nav.home": "Home",
  "nav.guide": "Guide",
  "nav.rules": "Rules",
  "nav.discord": "Discord",

  "profile.title": "Language & name",
  "profile.guest": "Guest",

  "onb.welcome": "Welcome to Phoenix of War 973",
  "onb.langTitle": "Choose your language",
  "onb.langHint": "You can change this anytime from the top bar.",
  "onb.continue": "Continue",
  "onb.nameTitle": "Who are you?",
  "onb.nameHint": "This name appears on your comments and hearts. It is stored only in this browser.",
  "onb.namePlaceholder": "Your in-game name",
  "onb.start": "Start",
  "onb.back": "Back",
  "onb.skip": "Skip",

  "hub.categories": "Categories",
  "hub.searchPlaceholder": "Search all guides…",
  "hub.resultsOne": "1 guide found",
  "hub.resultsMany": "{n} guides found",
  "hub.resultsFor": "Results for “{q}” across every category.",
  "hub.noMatch": "No guides match “{q}”.",
  "hub.untitledCategory": "(untitled category)",
  "hub.untitledGuide": "(untitled guide)",
  "hub.noGuides": "This category has no guides yet.",
  "hub.nothingYet": "Nothing has been written here yet.",
  "hub.commentsOne": "1 comment",
  "hub.commentsMany": "{n} comments",
  "hub.prevPage": "Previous",
  "hub.nextPage": "Next",
  "hub.pageOf": "Page {page} of {total}",

  "reader.breadcrumbGuide": "Guide",
  "reader.breadcrumbCategory": "Category",
  "reader.backToGuide": "Back to Guide",
  "reader.loadingComments": "Loading comments…",

  "heart.heart": "Heart",
  "heart.hearted": "Hearted",
  "heart.heartTitle": "Heart this guide",
  "heart.unheartTitle": "Remove your heart",

  "cmt.title": "Comments",
  "cmt.note": "Be kind and stay on topic. You can edit or delete your own comments at any time.",
  "cmt.namePlaceholder": "Your name (shown on your comments)",
  "cmt.bodyPlaceholder": "Add a comment, tip or question…",
  "cmt.post": "Post comment",
  "cmt.posting": "Posting…",
  "cmt.reply": "Reply",
  "cmt.save": "Save",
  "cmt.cancel": "Cancel",
  "cmt.edit": "Edit",
  "cmt.delete": "Delete",
  "cmt.deleted": "This comment was deleted.",
  "cmt.empty": "No comments yet — be the first.",
  "cmt.edited": "edited",
  "cmt.justNow": "just now",
  "cmt.minutes": "{n}m ago",
  "cmt.hours": "{n}h ago",
  "cmt.days": "{n}d ago",
  "cmt.confirmDelete": "Delete this comment?",
  "cmt.confirmDeleteThread": "Delete this comment and all of its replies?",
};

export type MessageKey = keyof typeof en;
export type Dict = Record<MessageKey, string>;

export default en;
