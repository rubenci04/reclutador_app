-- Sprint 2. Online fairness: the coin is tossed by the server, and the shared state can no longer rewrite it.
-- Honest scope: the coin result is drawn inside PostgreSQL with server randomness, so neither browser can compute it
-- from the seed. Prices, awards and the match result are still produced by the browsers; each browser re-checks them
-- (verifyDuelState), and the server does not. Friendly games only. The 22 cards of the deal stay visible to both players.
-- This file can be run more than once: every object is created or replaced, never duplicated.

-- Only recruiter one (the seat that calls the coin) can toss, once, in the lobby phase of the duel.
create or replace function public.online_flip_coin(p_room_id uuid, p_action_id uuid, p_expected_version integer, p_called_side text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); r public.rooms; prior public.game_actions; st jsonb; outcome text;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_action_id is null or p_expected_version is null or p_expected_version < 0 or p_called_side is null or p_called_side not in ('heads','tails') then raise exception 'INVALID_ACTION'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || p_action_id::text,0));
  select * into prior from public.game_actions where actor_id=actor and action_id=p_action_id;
  if found then
    if prior.room_id <> p_room_id or prior.action_type <> 'FLIP_COIN' then raise exception 'ACTION_ALREADY_PROCESSED'; end if;
    return public.online_snapshot(p_room_id);
  end if;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_ROOM_MEMBER'; end if;
  select * into r from public.rooms where id=p_room_id for update;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_ROOM_MEMBER'; end if;
  if r.expires_at <= now() then raise exception 'ROOM_EXPIRED'; end if;
  if r.version <> p_expected_version then raise exception 'STALE_STATE'; end if;
  if r.status <> 'IN_PROGRESS' then raise exception 'INVALID_PHASE'; end if;
  if not exists (select 1 from public.room_members m where m.room_id=r.id and m.user_id=actor and m.seat=1) then raise exception 'NOT_YOUR_TURN'; end if;
  select state into st from public.game_state where room_id=r.id;
  if st->>'phase' is distinct from 'LOBBY' or (st->'coinResult' is not null and st->'coinResult' <> 'null'::jsonb) then raise exception 'INVALID_PHASE'; end if;
  -- One random bit from the server; it never depends on the seed or on anything a client sent.
  outcome := case when pg_catalog.get_bit(pg_catalog.decode(pg_catalog.replace(pg_catalog.gen_random_uuid()::text,'-',''),'hex'),0) = 0 then 'heads' else 'tails' end;
  update public.game_state set state = st || jsonb_build_object('phase','COIN_TOSS','coinCall',p_called_side,'coinResult',outcome), phase='COIN_TOSS' where room_id=r.id;
  update public.rooms set version=version+1 where id=r.id returning * into r;
  insert into public.game_actions(room_id,actor_id,action_id,action_type,payload,resulting_version,expected_version)
    values(r.id,actor,p_action_id,'FLIP_COIN',jsonb_build_object('calledSide',p_called_side),r.version,p_expected_version);
  return public.online_snapshot(r.id);
end;
$$;

revoke all on function public.online_flip_coin(uuid,uuid,integer,text) from public, anon;
grant execute on function public.online_flip_coin(uuid,uuid,integer,text) to authenticated;

create or replace function public.online_submit_state(p_room_id uuid, p_action_id uuid, p_expected_version integer, p_state jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); r public.rooms; prior public.game_actions; old jsonb; seat smallint; mine text; theirs text; next_phase text; one text; two text; expected_winner text;
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
  -- The coin belongs to the server: only online_flip_coin writes coinCall and coinResult, and once they exist nobody changes them.
  if p_state->'coinCall' is distinct from old->'coinCall' or p_state->'coinResult' is distinct from old->'coinResult' then raise exception 'INVALID_ACTION'; end if;
  -- Leaving the lobby needs the server's toss; the announced winner must follow from it.
  if old->>'phase' = 'LOBBY' and p_state->>'phase' <> 'LOBBY' then raise exception 'INVALID_PHASE'; end if;
  expected_winner := (select (array['recruiter_one','recruiter_two'])[1 + (old->>'coinCall' is distinct from old->>'coinResult')::int]);
  if p_state->>'coinTossWinner' is not null and p_state->>'coinTossWinner' is distinct from expected_winner then raise exception 'INVALID_ACTION'; end if;
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

revoke all on function public.online_submit_state(uuid,uuid,integer,jsonb) from public, anon;
grant execute on function public.online_submit_state(uuid,uuid,integer,jsonb) to authenticated;
