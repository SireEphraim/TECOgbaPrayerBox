-- Prayer Box shared database and Ministry-only access
-- Run this file in Supabase Dashboard > SQL Editor as the project owner.
-- After it succeeds, add public to Settings > API > Data API > Exposed schemas
-- if your project does not already expose the public schema.

create schema if not exists private;

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  request_text text not null check (char_length(btrim(request_text)) between 1 and 4000),
  category text check (category is null or category in (
    'General', 'Health', 'Family', 'Finance', 'Relationships', 'Guidance', 'Thanksgiving'
  )),
  urgent boolean not null default false,
  status text not null default 'new' check (status in ('new', 'praying', 'answered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only project owners manage this membership list in the dashboard SQL Editor.
create table if not exists public.ministry_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table public.prayer_requests enable row level security;
alter table public.ministry_members enable row level security;

-- Data API permissions are deliberately narrow. Row Level Security below is
-- the second check and protects every call made with the browser key.
revoke all on table public.prayer_requests from anon, authenticated;
revoke all on table public.ministry_members from anon, authenticated;
grant insert on table public.prayer_requests to anon, authenticated;
grant select, update (status), delete on table public.prayer_requests to authenticated;

-- This function answers only "is the current signed-in user a member?".
-- It lives outside the exposed public schema, has no caller-controlled input,
-- and its execute permission is limited to authenticated users.
create or replace function private.is_ministry_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.ministry_members
    where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_ministry_member() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_ministry_member() to authenticated;

create or replace function public.set_prayer_request_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_prayer_request_updated_at() from public;

drop trigger if exists prayer_requests_set_updated_at on public.prayer_requests;
create trigger prayer_requests_set_updated_at
before update on public.prayer_requests
for each row execute function public.set_prayer_request_updated_at();

drop policy if exists "Anyone can submit a prayer request" on public.prayer_requests;
create policy "Anyone can submit a prayer request"
on public.prayer_requests
for insert
to anon, authenticated
with check (
  status = 'new'
  and char_length(btrim(request_text)) between 1 and 4000
);

drop policy if exists "Ministry can read prayer requests" on public.prayer_requests;
create policy "Ministry can read prayer requests"
on public.prayer_requests
for select
to authenticated
using ((select private.is_ministry_member()));

drop policy if exists "Ministry can update request status" on public.prayer_requests;
create policy "Ministry can update request status"
on public.prayer_requests
for update
to authenticated
using ((select private.is_ministry_member()))
with check ((select private.is_ministry_member()));

drop policy if exists "Ministry can remove prayer requests" on public.prayer_requests;
create policy "Ministry can remove prayer requests"
on public.prayer_requests
for delete
to authenticated
using ((select private.is_ministry_member()));

-- Add a Ministry account after creating it in Dashboard > Authentication > Users.
-- Replace the UUID below with that user's UUID. Repeat one INSERT per member.
-- insert into public.ministry_members (user_id)
-- values ('00000000-0000-0000-0000-000000000000');
