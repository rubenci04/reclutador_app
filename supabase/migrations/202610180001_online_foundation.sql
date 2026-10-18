-- CODEX-006A. No client may write authoritative state, including the host.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  status text not null default 'WAITING' check (status in ('WAITING','READY','IN_PROGRESS','FINISHED','CANCELLED')),
  version integer not null default 0 check (version >= 0),
  check (expires_at > created_at)
);
create table public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  seat smallint not null check (seat in (1,2)),
  name text not null check (char_length(name) between 1 and 24 and name = btrim(name) and name !~ '[[:cntrl:]]'),
  ready boolean not null default false,
  primary key (room_id, user_id), unique (room_id, seat)
);
create table public.room_settings (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  mode text not null default 'GLOBAL' check (mode = 'GLOBAL'),
  catalog_version text not null default 'global-150-3de32b4' check (catalog_version = 'global-150-3de32b4'),
  rules_version text not null default 'online-lobby-v1' check (rules_version = 'online-lobby-v1'),
  budget integer not null default 100 check (budget = 100),
  starters integer not null default 11 check (starters = 11),
  substitutes boolean not null default false check (not substitutes),
  discards integer not null default 3 check (discards = 3)
);
create table public.game_state (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  phase text not null default 'LOBBY' check (phase in ('LOBBY','COIN_TOSS','AUCTION','TEAM_ORGANIZATION','STRATEGY_SELECTION','STRATEGY_REVEAL','SIMULATING','MATCH_RESULT')),
  deadline_at timestamptz,
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object')
);
create table private.room_secrets (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  invite_code text not null unique default (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  seed uuid not null default gen_random_uuid()
);
create table public.participant_private (
  room_id uuid not null,
  user_id uuid not null,
  strategy jsonb,
  primary key (room_id, user_id),
  foreign key (room_id, user_id) references public.room_members(room_id,user_id) on delete cascade
);
create table public.game_actions (
  room_id uuid not null references public.rooms(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  action_id uuid not null,
  action_type text not null,
  payload jsonb not null,
  resulting_version integer not null,
  created_at timestamptz not null default now(),
  primary key (actor_id, action_id)
);
-- SECURITY DEFINER prevents recursive RLS on room_members; no arbitrary user argument.
create function public.is_room_member(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.room_members where room_id = target and user_id = auth.uid());
$$;
revoke all on function public.is_room_member(uuid) from public, anon;
grant execute on function public.is_room_member(uuid) to authenticated;

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_settings enable row level security;
alter table public.game_state enable row level security;
alter table public.game_actions enable row level security;
alter table public.participant_private enable row level security;
alter table private.room_secrets enable row level security;
create policy members_read on public.rooms for select to authenticated using (public.is_room_member(id));
create policy members_read on public.room_members for select to authenticated using (public.is_room_member(room_id));
create policy members_read on public.room_settings for select to authenticated using (public.is_room_member(room_id));
create policy members_read on public.game_state for select to authenticated using (public.is_room_member(room_id));
-- The command ledger is server-only: future commands may contain private selections.
create policy own_private_read on public.participant_private for select to authenticated using (user_id = auth.uid() and public.is_room_member(room_id));
revoke all on public.rooms, public.room_members, public.room_settings, public.game_state, public.game_actions, public.participant_private from public, anon, authenticated;
grant select on public.rooms, public.room_members, public.room_settings, public.game_state, public.participant_private to authenticated;
