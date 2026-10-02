-- Recipes for Ninjas: accounts, household profiles, favorites, history, email.
-- Run once in Supabase: SQL Editor -> paste -> Run. Safe to re-run (idempotent where possible).
-- Every table has row-level security: a signed-in user only ever sees rows of their own household.


-- One household per account owner; other accounts can be added as members later.
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Our kitchen',
  size int check (size between 1 and 20),
  appliances text[] not null default '{}',           -- creami, juicer, blender, wood-fire
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  primary key (household_id, user_id)
);

-- People in the household (Julian, Charlyne, Leanne, Noah...). Not separate logins.
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  color text,
  diet text[] not null default '{}',                 -- vegetarian, vegan, dairy-free, gluten-free...
  allergies text[] not null default '{}',            -- free words: peanut, tree nut, egg...
  dislikes text[] not null default '{}',             -- free words: mushroom, coconut...
  goals text[] not null default '{}',                -- healthy, protein, quick
  meal_types text[] not null default '{}',           -- breakfast, lunch, dinner, snack, dessert, drink
  cook_minutes int check (cook_minutes between 5 and 600),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

create table if not exists public.likes (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  recipe_key text not null check (recipe_key ~ '^[a-z-]+/[a-z0-9-]+$'),   -- "creami/tropical-fruit-whip"
  created_at timestamptz not null default now(),
  primary key (profile_id, recipe_key)
);

create table if not exists public.cooked (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  recipe_key text not null check (recipe_key ~ '^[a-z-]+/[a-z0-9-]+$'),
  cooked_at timestamptz not null default now()
);
create index if not exists cooked_profile_time on public.cooked (profile_id, cooked_at desc);

-- Per-account settings, including consent. Email and text consent are separate.
create table if not exists public.account_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_consent boolean not null default false,
  email_consent_at timestamptz,
  sms_consent boolean not null default false,
  sms_consent_at timestamptz,
  phone text,
  email_frequency text not null default 'weekly' check (email_frequency in ('daily','weekly')),
  email_weekday int not null default 0 check (email_weekday between 0 and 6),   -- 0 = Sunday
  send_hour int not null default 16 check (send_hour between 0 and 23),
  timezone text not null default 'America/New_York',
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  onboarded boolean not null default false,
  updated_at timestamptz not null default now()
);

-- What we emailed, so ideas rotate. Written only by the server (service role).
create table if not exists public.email_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_keys text[] not null,
  sent_at timestamptz not null default now(),
  provider_id text
);
create index if not exists email_log_user_time on public.email_log (user_id, sent_at desc);

-- ---------- helpers ----------
create or replace function public.is_member(h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_members m where m.household_id = h and m.user_id = auth.uid());
$$;

create or replace function public.profile_household(p uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from public.profiles where id = p;
$$;

-- New owner automatically becomes a member of their household.
create or replace function public.add_owner_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.household_members (household_id, user_id, role) values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists households_owner on public.households;
create trigger households_owner after insert on public.households for each row execute function public.add_owner_member();

-- ---------- row-level security ----------
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.profiles enable row level security;
alter table public.likes enable row level security;
alter table public.cooked enable row level security;
alter table public.account_settings enable row level security;
alter table public.email_log enable row level security;

drop policy if exists households_select on public.households;
drop policy if exists households_insert on public.households;
drop policy if exists households_update on public.households;
drop policy if exists households_delete on public.households;
create policy households_select on public.households for select using (owner_id = auth.uid() or public.is_member(id));
create policy households_insert on public.households for insert with check (owner_id = auth.uid());
create policy households_update on public.households for update using (public.is_member(id)) with check (public.is_member(id));
create policy households_delete on public.households for delete using (owner_id = auth.uid());

drop policy if exists members_select on public.household_members;
create policy members_select on public.household_members for select using (user_id = auth.uid() or public.is_member(household_id));

drop policy if exists profiles_all on public.profiles;
create policy profiles_all on public.profiles for all using (public.is_member(household_id)) with check (public.is_member(household_id));

drop policy if exists likes_all on public.likes;
create policy likes_all on public.likes for all using (public.is_member(public.profile_household(profile_id))) with check (public.is_member(public.profile_household(profile_id)));

drop policy if exists cooked_all on public.cooked;
create policy cooked_all on public.cooked for all using (public.is_member(public.profile_household(profile_id))) with check (public.is_member(public.profile_household(profile_id)));

drop policy if exists settings_own on public.account_settings;
create policy settings_own on public.account_settings for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists email_log_own on public.email_log;
create policy email_log_own on public.email_log for select using (user_id = auth.uid());
-- no insert/update policy: only the service role (server) writes email_log
