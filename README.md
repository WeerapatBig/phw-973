# Phoenix of War 973 — alliance site

Static site (no build step) plus three small Vercel functions that let officers edit
the guide from a browser.

```
index.html          Home
guide.html          Guide page — renders content/guide.json
admin.html          Officer editor (admin.js, admin.css)
content/guide.json  All guide content lives here
render.js           Turns guide.json into the page
lightbox.js         In-page image viewer (zoom / pinch / pan)
img/                Images — img/s3 are the Season 3 screenshots,
                    img/uploads is where the editor puts new ones
api/                Vercel serverless functions (load / save / upload)
dev-server.js       Local preview, stands in for api/* — never used in production
```

## Editing the guide

Officers go to `https://<the site>/admin.html`, enter the admin password, edit, then
press **Save & publish**. That commits to this repo and Vercel redeploys — the change is
live in about a minute.

Everything is versioned in git, so any bad edit can be undone by reverting the commit.

## Local preview

```bash
node dev-server.js
```

Site on <http://localhost:4173>, editor on <http://localhost:4173/admin.html>,
password `dev` (or set `ADMIN_PASSWORD`). Saves write to the files on disk instead of
committing, so it is safe to experiment.

## Deploying (one-time setup)

1. Push this folder to `WeerapatBig/phw-973`.
2. In Vercel: **Add New → Project → import the repo.** No framework, no build command,
   output directory is the repo root. Vercel picks up `api/*.js` automatically.
3. Add three **Environment Variables** in the Vercel project settings:

   | Name | Value |
   |------|-------|
   | `ADMIN_PASSWORD` | the password you hand to officers — make it a long passphrase |
   | `GITHUB_TOKEN` | a GitHub fine-grained token, repo `phw-973`, permission **Contents: Read and write** |
   | `GITHUB_REPO` | `WeerapatBig/phw-973` (optional, this is the default) |
   | `GITHUB_BRANCH` | `main` (optional, this is the default) |

4. Redeploy so the functions pick the variables up.

**Never put the password or the token in a file in this repo.** They belong only in
Vercel's environment variables — everything in this repo is readable by anyone who can
read the repo, and everything outside `api/` is readable by anyone visiting the site.

## Notes

- `api/_lib.js` verifies the password on the server for every write. The browser never
  decides whether a password is correct.
- Saves are pinned to the file version they were loaded from, so if two officers edit at
  once the second one is told to reload rather than silently overwriting the first.
- Uploads are limited to PNG / JPG / WEBP / GIF under 4 MB, and the filename is rebuilt
  server-side so an upload cannot escape `img/uploads/`.
- There is no rate limiting on the password. Use a long passphrase.
