-- ROLLBACK of sprints 2 and 3 (202610250001_online_fair_coin.sql and 202610250002_online_turn_timer.sql).
-- NOT run automatically: paste it in the Supabase SQL Editor only if the release must be undone (docs/RELEASE-CHECKLIST.md).
-- It removes online_flip_coin, online_claim_timeout, the deadline trigger and its helpers, and puts online_submit_state and
-- online_snapshot back exactly as 202610190001_online_duel.sql defines them (client-side coin, no deadline, no serverNow).
-- Data is kept: rooms, states and game_actions rows (including FLIP_COIN and TIMEOUT_CLAIM) stay as they are, and deadline_at
-- is cleared. Rooms already finished by a timeout claim stay finished. Pair it with the previous Worker version, because the
-- new web build calls the functions removed here. This file can be run more than once.

drop trigger if exists game_state_deadline on public.game_state;
drop function if exists private.online_set_deadline();
drop function if exists private.online_bid_seconds();
drop function if exists private.online_strategy_seconds();
drop function if exists private.online_grace_seconds();
drop function if exists public.online_claim_timeout(uuid, uuid);
drop function if exists public.online_flip_coin(uuid, uuid, integer, text);
update public.game_state set deadline_at = null where deadline_at is not null;

-- online_snapshot as in 202610190001 (without serverNow).
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
    'phase',g.phase,'deadlineAt',g.deadline_at,
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

-- online_submit_state as in 202610190001 (without the server-coin checks).
create or replace function public.online_submit_state(p_room_id uuid, p_action_id uuid, p_expected_version integer, p_state jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); r public.rooms; prior public.game_actions; old jsonb; seat smallint; mine text; theirs text; next_phase text; one text; two text;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_action_id is null or p_expected_version is null or p_expected_version < 0 or p_state is null
    or jsonb_typeof(p_state) <> 'object' or pg_catalog.pg_column_size(p_state) > 600000 then raise exception 'INVALID_ACTION'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || p_action_id::text,0));
  select * into prior from public.game_actions where actor_id=actor and action_id=p_action_id;
  if found then
    if prior.room_id <> p_room_id or prior.action_type <> 'SUBMIT_STATE' then raise exception 'ACTION_ALREADY_PROCESSED'; end if;
    return public.online_snapshot(p_room_id);
  end if;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_ROOM_MEMBER'; end if;
  select * into r from public.rooms where id=p_room_id for update;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_ROOM_MEMBER'; end if;
  if r.expires_at <= now() then raise exception 'ROOM_EXPIRED'; end if;
  if r.version <> p_expected_version then raise exception 'STALE_STATE'; end if;
  if r.status <> 'IN_PROGRESS' then raise exception 'INVALID_PHASE'; end if;
  select state into old from public.game_state where room_id=r.id;
  select m.seat into seat from public.room_members m where m.room_id=r.id and m.user_id=actor;
  mine := case seat when 1 then 'recruiter_one' else 'recruiter_two' end;
  theirs := case seat when 1 then 'recruiter_two' else 'recruiter_one' end;
  next_phase := private.online_phase(p_state->>'phase');
  if next_phase is null or old = '{}'::jsonb then raise exception 'INVALID_ACTION'; end if;
  -- The deal never changes: same seed, same configuration, history only grows.
  if p_state->'seed' is distinct from old->'seed' or p_state->'config' is distinct from old->'config'
    or pg_catalog.jsonb_array_length(coalesce(p_state->'record','[]'::jsonb)) < pg_catalog.jsonb_array_length(coalesce(old->'record','[]'::jsonb)) then raise exception 'INVALID_ACTION'; end if;
  -- Bidding belongs to the seat whose turn it is.
  if old->>'phase' = 'BIDDING' and old->>'activeParticipant' is distinct from mine then raise exception 'NOT_YOUR_TURN'; end if;
  -- Nobody edits the rival's squad while teams are being arranged.
  if old->>'phase' = 'TEAMS_COMPLETED' and p_state->>'phase' = 'TEAMS_COMPLETED'
    and p_state->'teams'->theirs is distinct from old->'teams'->theirs then raise exception 'NOT_YOUR_TURN'; end if;
  if p_state->>'phase' in ('SIMULATING','MATCH_RESULT') then
    select p.strategy #>> '{}' into one from public.participant_private p join public.room_members m using(room_id,user_id) where p.room_id=r.id and m.seat=1;
    select p.strategy #>> '{}' into two from public.participant_private p join public.room_members m using(room_id,user_id) where p.room_id=r.id and m.seat=2;
    if one is null or two is null or p_state->'strategies'->>'recruiter_one' is distinct from one
      or p_state->'strategies'->>'recruiter_two' is distinct from two then raise exception 'INVALID_PHASE'; end if;
  end if;
  update public.game_state set state=p_state, phase=next_phase where room_id=r.id;
  update public.rooms set version=version+1 where id=r.id returning * into r;
  insert into public.game_actions(room_id,actor_id,action_id,action_type,payload,resulting_version,expected_version)
    values(r.id,actor,p_action_id,'SUBMIT_STATE',jsonb_build_object('phase',next_phase),r.version,p_expected_version);
  return public.online_snapshot(r.id);
end;
$$;

revoke all on function public.online_snapshot(uuid), public.online_submit_state(uuid,uuid,integer,jsonb) from public, anon;
grant execute on function public.online_snapshot(uuid), public.online_submit_state(uuid,uuid,integer,jsonb) to authenticated;
