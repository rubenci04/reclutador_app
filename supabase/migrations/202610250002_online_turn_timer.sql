-- Sprint 3. Online without dead ends: a time limit per turn, and claiming the win when the rival stops answering.
-- Honest scope: the server only keeps the deadline (deadline_at) and decides a claim by its own clock. Nothing is skipped
-- or played for anybody, and there is no live presence: a claim is manual and ends the match like giving up.
-- Apply after 202610250001_online_fair_coin.sql. This file can be run more than once: every object is created or replaced.

-- Limits, in one place. Change the numbers here and run the file again.
create or replace function private.online_bid_seconds() returns integer language sql immutable set search_path = '' as $$ select 120 $$;
create or replace function private.online_strategy_seconds() returns integer language sql immutable set search_path = '' as $$ select 300 $$;
create or replace function private.online_grace_seconds() returns integer language sql immutable set search_path = '' as $$ select 5 $$;

-- The deadline follows the engine phase (state->>'phase', not the grouped phase column): every write while bidding restarts
-- it (a new turn), entering the arranging phase starts the strategy limit once, and any other phase has no deadline.
create or replace function private.online_set_deadline() returns trigger
language plpgsql set search_path = '' as $$
declare engine text; prev text;
begin
  engine := new.state->>'phase'; prev := old.state->>'phase';
  if new.state->'forfeitBy' is not null then
    new.deadline_at := null;
  elsif engine = 'BIDDING' then
    new.deadline_at := now() + pg_catalog.make_interval(secs => private.online_bid_seconds());
  elsif engine = 'TEAMS_COMPLETED' then
    if prev = 'TEAMS_COMPLETED' and old.deadline_at is not null then
      new.deadline_at := old.deadline_at;
    else
      new.deadline_at := now() + pg_catalog.make_interval(secs => private.online_strategy_seconds());
    end if;
  else
    new.deadline_at := null;
  end if;
  return new;
end;
$$;
drop trigger if exists game_state_deadline on public.game_state;
create trigger game_state_deadline before update of state on public.game_state for each row execute function private.online_set_deadline();
revoke all on function private.online_bid_seconds(), private.online_strategy_seconds(), private.online_grace_seconds(), private.online_set_deadline() from public, anon, authenticated;

-- The snapshot also carries the server clock, so the countdown does not depend on the device clock.
create or replace function public.online_snapshot(p_room_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.rooms; result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_ROOM_MEMBER'; end if;
  select * into r from public.rooms where id = p_room_id for update;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_ROOM_MEMBER'; end if;
  if r.expires_at <= now() then raise exception 'ROOM_EXPIRED'; end if;
  select jsonb_build_object(
    'roomId',r.id,'hostId',r.host_id,'status',r.status,'version',r.version,
    'createdAt',r.created_at,'expiresAt',r.expires_at,'inviteCode',secret.invite_code,
    'phase',g.phase,'deadlineAt',g.deadline_at,'serverNow',now(),
    'state',g.state,'roomName',r.name,'shortCode',secret.short_code,
    -- Only whether each seat has chosen, never what.
    'strategyReady',jsonb_build_object(
      '1',exists(select 1 from public.participant_private p join public.room_members m using(room_id,user_id) where p.room_id=r.id and m.seat=1 and p.strategy is not null),
      '2',exists(select 1 from public.participant_private p join public.room_members m using(room_id,user_id) where p.room_id=r.id and m.seat=2 and p.strategy is not null)),
    'settings',jsonb_build_object('mode',s.mode,'budget',s.budget,'starters',s.starters,
      'substitutes',s.substitutes,'discards',s.discards,'catalogVersion',s.catalog_version,'rulesVersion',s.rules_version),
    'members',(select jsonb_agg(jsonb_build_object('userId',m.user_id,'name',m.name,'seat',m.seat,'ready',m.ready) order by m.seat)
      from public.room_members m where m.room_id=r.id)) into result
  from public.room_settings s join public.game_state g using(room_id) join private.room_secrets secret using(room_id) where s.room_id=r.id;
  return result;
end;
$$;

-- Claiming the win when the rival let the deadline pass. Same effect as giving up, but the one who left is recorded as forfeitBy.
create or replace function public.online_claim_timeout(p_room_id uuid, p_action_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); r public.rooms; prior public.game_actions; my_seat smallint; mine text; st jsonb; due timestamptz; late text; engine text; chosen boolean;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_action_id is null then raise exception 'INVALID_ACTION'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || p_action_id::text,0));
  select * into prior from public.game_actions where actor_id=actor and action_id=p_action_id;
  if found then
    if prior.room_id <> p_room_id or prior.action_type <> 'TIMEOUT_CLAIM' then raise exception 'ACTION_ALREADY_PROCESSED'; end if;
    return public.online_snapshot(p_room_id);
  end if;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_ROOM_MEMBER'; end if;
  select * into r from public.rooms where id=p_room_id for update;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_ROOM_MEMBER'; end if;
  if r.expires_at <= now() then raise exception 'ROOM_EXPIRED'; end if;
  if r.status <> 'IN_PROGRESS' then raise exception 'INVALID_PHASE'; end if;
  select g.state, g.deadline_at into st, due from public.game_state g where g.room_id=r.id;
  engine := st->>'phase';
  if due is null or engine not in ('BIDDING','TEAMS_COMPLETED') or now() < due + pg_catalog.make_interval(secs => private.online_grace_seconds()) then raise exception 'INVALID_PHASE'; end if;
  select m.seat into my_seat from public.room_members m where m.room_id=r.id and m.user_id=actor;
  mine := case my_seat when 1 then 'recruiter_one' else 'recruiter_two' end;
  if engine = 'BIDDING' then
    late := st->>'activeParticipant';
  else
    select exists (select 1 from public.participant_private p where p.room_id=r.id and p.user_id=actor and p.strategy is not null) into chosen;
    if not chosen then raise exception 'NOT_YOUR_TURN'; end if;
    late := case my_seat when 1 then 'recruiter_two' else 'recruiter_one' end;
    if exists (select 1 from public.participant_private p join public.room_members m using(room_id,user_id) where p.room_id=r.id and m.seat = 3 - my_seat and p.strategy is not null) then raise exception 'INVALID_PHASE'; end if;
  end if;
  if late is null or late = mine then raise exception 'NOT_YOUR_TURN'; end if;
  update public.game_state set state = state || jsonb_build_object('forfeitBy', late, 'timedOut', true), phase='MATCH_RESULT' where room_id=r.id;
  update public.rooms set status='FINISHED', version=version+1 where id=r.id returning * into r;
  insert into public.game_actions(room_id,actor_id,action_id,action_type,payload,resulting_version,expected_version)
    values(r.id,actor,p_action_id,'TIMEOUT_CLAIM',jsonb_build_object('late',late),r.version,null);
  return public.online_snapshot(r.id);
end;
$$;
revoke all on function public.online_claim_timeout(uuid,uuid) from public, anon;
grant execute on function public.online_claim_timeout(uuid,uuid) to authenticated;
