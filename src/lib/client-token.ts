// A random id kept in the browser. It is how a commenter proves a comment is
// theirs (to edit or delete it) and how a heart cannot be given twice, without
// asking anyone to make an account. It never leaves this device.

const TOKEN_KEY = "phw.token";
const NAME_KEY = "phw.name";

export function getToken(): string {
  if (typeof window === "undefined") return "";
  let t = window.localStorage.getItem(TOKEN_KEY);
  if (!t || t.length < 16) {
    const rand =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    t = rand + "-" + Math.random().toString(36).slice(2);
    window.localStorage.setItem(TOKEN_KEY, t);
  }
  return t;
}

export function getName(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(NAME_KEY) || "";
}

export function setName(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NAME_KEY, name);
}
