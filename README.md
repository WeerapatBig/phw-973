# Phoenix of War 973 — alliance site

A Next.js (React) app, with all site content stored in Supabase instead of the
repo. The guide and the home page are both editable from `/admin` and go live the
moment an officer saves — no commits, no redeploys.

```
src/app/(site)/page.tsx                  Home hub (server-rendered, reads Supabase)
src/app/(site)/guide/page.tsx            Guide hub: category sidebar + guide cards
src/app/(site)/guide/[category]/[guide]  One guide, with hearts and comments
src/app/(site)/rules/page.tsx            Alliance rules (same shape as the guide)
src/app/admin/page.tsx                   Officer editor — guide + rules + home + comments
src/app/api/admin/*                      load / save / upload / comment moderation
src/app/api/comments/route.ts            Read/post/edit/delete comments
src/app/api/reactions/route.ts           Toggle a heart on a guide or comment
src/components/                          Header, footer, block renderers, guide hub, comments
src/components/Onboarding.tsx            First-visit language + name dialog (also in the header)
src/lib/                                 Supabase client, content types, shared helpers
src/lib/i18n/                            UI translations (23 locales) + locale provider
supabase/schema.sql                      Database + storage setup (safe to re-run)
content/guide.json                       Seed fixture (the content when this was static)
public/img/                              The existing images (repo-relative paths still work)
scripts/                                 seed.ts (push content to Supabase), check.ts (tests)
```

## How it works

- The site content lives in one-row tables: `guide`, `home`, `rules` (and
  `news`/`events` as those pages come online). The public pages read them on
  every request with the service-role key, so no caching lag.
- The editor at `/admin` requires the shared admin password, which is verified
  in the route handlers (never in the browser). Saves carry the version the
  editor loaded; if someone else saved first, the write is refused (409) instead
  of silently overwriting them.
- Image uploads go to a public Supabase Storage bucket and come back as absolute
  URLs. The old images in `public/img/` keep their repo-relative references.

## Guide hub, hearts and comments

- `/guide` shows a category sidebar and a card per guide (cover image + summary,
  falling back to the guide's first image/paragraph). Cards link to
  `/guide/<category>/<guide>`, a single scrollable article.
- A search box under the categories filters the cards in real time. It searches
  every guide's text (title, summary, paragraphs, lists, tables, captions) across
  all categories, not just the active one, and each result is labelled with its
  category.
- Readers can heart a guide or a comment. A heart is keyed by a random device
  token kept in `localStorage` (`phw.token`); the database only ever stores the
  token's SHA-256 hash, so hearts are one-per-device without an account.
- Comments support replies (threaded up to four levels). Commenting asks for a
  display name (remembered per browser) and never creates an account.
- Officers moderate from `/admin` → **Comments**: hide, unhide or delete any
  comment. Hidden comments stay in the thread but show as removed; `deleted`
  rows are dropped from the public view entirely.

## Languages and first-visit onboarding

- On a first visit the site opens a short dialog: pick one of 23 languages (the
  UI switches instantly), then enter the display name used for comments and
  hearts. It is stored only in the browser (`phw.lang`, `phw.name`,
  `phw.onboarded`). The header's language/name control reopens it at any time.
- The chosen language is mirrored into the `phw.lang` cookie, so a server-render
  already uses the right language (and `dir="rtl"` for Arabic and Persian) with
  no flash. English is the fallback for any missing key.
- UI chrome is translated; guide and home *content* stays English for now — a
  later pass will machine-translate it on demand and cache it in Supabase.

## One-time setup

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
   If the database already exists from before comments were added, re-run it:
   it is written with `create table if not exists`, so it only adds what is
   missing (`comments`, `reactions`) and never touches your content.
2. Copy `.env.example` to `.env` locally and fill in the project URL and the
   **service role** key (Project Settings → API). The service role key must
   never end up in client-side code — it only exists on the server.
3. Seed the content:
   ```bash
   npm run seed          # requires the .env above
   ```

Then run the checks and the app:

```bash
npm install
npm run check           # sanity-checks the content logic (and the data shapes)
npm run dev             # http://localhost:3000  — /admin for the editor
```

The editor password defaults to nothing locally until you set `ADMIN_PASSWORD`:

```
ADMIN_PASSWORD=a-long-passphrase npm run dev
```

## Deploying to Vercel

Push this repo and import it in Vercel (framework preset: Next.js, no extra
config). Set these environment variables in the project settings:

| Name | Value |
|------|-------|
| `SUPABASE_URL` | `https://<project>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | the service role key from Project Settings → API |
| `ADMIN_PASSWORD` | the passphrase officers type on `/admin` — make it long |

**Never put the password or the service role key in a file in this repo.** They
belong only in Vercel's environment variables. The service role key can read and
write every table, so treat it like a master password.

## Safe to know

- Every save is optimistic-locked, so two officers editing at once get a
  "reload" message instead of the second one silently clobbering the first.
- The database has no history like git had. Make a habit of saving often; a
  badly deleted topic can only be recovered from a backup, not from the past.
- The rich-text fields allow a small set of HTML (`<strong>`, `<em>`) and render
  as-is. Only officers who know the admin password can publish, so treat the
  password accordingly.
- Uploaded images are limited to PNG / JPG / WEBP / GIF, and the filename is
  rebuilt server-side so an upload cannot escape the bucket.
- `content/guide.json` is kept as the seed fixture; the live source of truth is
  Supabase.