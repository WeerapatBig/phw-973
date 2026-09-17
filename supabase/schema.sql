-- Phoenix of War 973 — Supabase setup
-- Run this once in the Supabase SQL editor.
--
-- Tables hold the site content as JSONB documents. Each table has exactly one
-- row (id = 1). `version` is the optimistic-lock counter the admin editor uses
-- so two officers never silently overwrite each other.
--
-- The public pages read these tables with the service role key; writes only
-- happen through the /api/admin/* routes after the admin password is checked.
-- Row Level Security is therefore left OFF. Do not put a row in these tables
-- that you would not want every visitor to be able to read.

create table if not exists public.guide (
  id         int primary key default 1 check (id = 1),
  doc        jsonb not null,
  version    int  not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.home (
  id         int primary key default 1 check (id = 1),
  doc        jsonb not null,
  version    int  not null default 1,
  updated_at timestamptz not null default now()
);

-- Seed the single rows (the app falls back to built-in defaults until `npm run seed`
-- pushes the real content, so this is only to keep the tables well-formed).
insert into public.guide (id, doc, version)
values (1, '{}'::jsonb, 1)
on conflict (id) do nothing;

insert into public.home (id, doc, version)
values (1, '{}'::jsonb, 1)
on conflict (id) do nothing;

-- Alliance rules. Same document shape as `guide` (groups -> sections -> blocks),
-- so the same editor and renderer serve it.
create table if not exists public.rules (
  id         int primary key default 1 check (id = 1),
  doc        jsonb not null,
  version    int  not null default 1,
  updated_at timestamptz not null default now()
);

insert into public.rules (id, doc, version)
values (1, '{}'::jsonb, 1)
on conflict (id) do nothing;

-- Announcements the officers post. doc holds { items: NewsItem[] }.
create table if not exists public.news (
  id         int primary key default 1 check (id = 1),
  doc        jsonb not null,
  version    int  not null default 1,
  updated_at timestamptz not null default now()
);

insert into public.news (id, doc, version)
values (1, '{"items":[]}'::jsonb, 1)
on conflict (id) do nothing;

-- Scheduled alliance events, stored in UTC. doc holds { events: EventItem[] }.
create table if not exists public.events (
  id         int primary key default 1 check (id = 1),
  doc        jsonb not null,
  version    int  not null default 1,
  updated_at timestamptz not null default now()
);

insert into public.events (id, doc, version)
values (1, '{"events":[]}'::jsonb, 1)
on conflict (id) do nothing;

-- Member comments and replies. Unlike the content tables this is a real
-- relational table, because many visitors write to it at once and each row
-- carries an owner. `guide_id` names a section and `category_id` its group;
-- together they identify one guide. `parent_id` is set for replies, so deleting
-- a parent removes its whole thread.
--
-- `token_hash` is sha256 of a random token kept in the commenter's browser. It
-- is how a member can edit/delete their own comment without an account. It is
-- never sent to a browser.
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  category_id text not null,
  guide_id   text not null,
  parent_id  uuid references public.comments(id) on delete cascade,
  author     text not null,
  token_hash text not null,
  body       text not null,
  hidden     boolean not null default false,
  deleted    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comments_guide_idx
  on public.comments (category_id, guide_id, created_at);

-- One heart per person (browser) per thing. `target_type` is 'guide' or
-- 'comment'; for a guide, `target_id` is "category/guide". The unique index is
-- what makes a heart a toggle instead of a counter anyone can inflate.
create table if not exists public.reactions (
  id          bigint generated always as identity primary key,
  target_type text not null check (target_type in ('guide', 'comment')),
  target_id   text not null,
  token_hash  text not null,
  created_at  timestamptz not null default now(),
  unique (target_type, target_id, token_hash)
);

create index if not exists reactions_target_idx
  on public.reactions (target_type, target_id);

-- Machine translations of the content documents, produced on demand with the
-- Gemini API and cached forever. One row per (scope, locale): `scope` is the
-- content table ('guide' | 'home' | 'rules'), `payload` is the translated
-- document (same shape as the source). `source_hash` ties the row to a specific
-- revision of the English content, so editing a guide in /admin invalidates its
-- translations automatically and they are generated again on the next visit.
-- Because every visitor reads this table, the number of API calls scales with
-- (documents x languages actually used) -- never with the number of users.
create table if not exists public.translations (
  scope       text not null,
  ref         text not null default 'root',
  locale      text not null,
  source_hash text not null,
  payload     jsonb not null,
  generated_at timestamptz not null default now(),
  primary key (scope, ref, locale)
);

create index if not exists translations_locale_idx
  on public.translations (locale);

-- A tiny per-day counter guarding the free Gemini quota. Every API call bumps
-- it; once it passes TRANSLATE_DAILY_MAX the app stops calling Gemini and keeps
-- serving English until the next day. Atomic so parallel requests cannot race.
create table if not exists public.translation_usage (
  day   date primary key default current_date,
  calls integer not null default 0
);

create or replace function public.bump_translation_usage()
returns integer
language sql
as $$
  insert into public.translation_usage (day, calls)
  values (current_date, 1)
  on conflict (day) do update set calls = public.translation_usage.calls + 1
  returning calls;
$$;


-- Storage bucket for images uploaded from the editor. Public = anyone can read
-- the image URLs (which is what we want for a public site). Writes still require
-- the service role key via /api/admin/upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', true, 3145728, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do nothing;