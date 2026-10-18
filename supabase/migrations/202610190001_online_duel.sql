-- CODEX-006C. Online duel: the room carries the duel state so two people play the same game.
-- Honest scope: the pure rules engine runs in both browsers. PostgreSQL enforces who may write, the version
-- (no lost updates), the fixed seed and configuration, turn order during bidding, that nobody edits the rival's
-- team, and that strategies stay secret until both are chosen. It does not re-run the auction rules, so this is
-- meant for friendly games, not for ranked play.

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
    'state',g.state,
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

-- Maps the engine phase to the room phase column.
create function private.online_phase(duel_phase text) returns text language sql immutable set search_path = '' as $$
  select case duel_phase
    when 'LOBBY' then 'COIN_TOSS' when 'COIN_TOSS' then 'COIN_TOSS'
    when 'REVEAL_PLAYER' then 'AUCTION' when 'BIDDING' then 'AUCTION' when 'DISCARD_RESULT' then 'AUCTION'
    when 'ROUND_RESULT' then 'AUCTION' when 'NEXT_ROUND' then 'AUCTION'
    when 'TEAMS_COMPLETED' then 'TEAM_ORGANIZATION'
    when 'SIMULATING' then 'SIMULATING' when 'MATCH_RESULT' then 'MATCH_RESULT'
    else null end
$$;

create function public.online_start_duel(p_room_id uuid, p_action_id uuid, p_expected_version integer, p_state jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); r public.rooms; prior public.game_actions;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_action_id is null or p_expected_version is null or p_expected_version < 0 or p_state is null
    or jsonb_typeof(p_state) <> 'object' or pg_catalog.pg_column_size(p_state) > 600000 then raise exception 'INVALID_ACTION'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || p_action_id::text,0));
  select * into prior from public.game_actions where actor_id=actor and action_id=p_action_id;
  if found then
    if prior.room_id <> p_room_id or prior.action_type <> 'START_DUEL' then raise exception 'ACTION_ALREADY_PROCESSED'; end if;
    return public.online_snapshot(p_room_id);
  end if;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_ROOM_MEMBER'; end if;
  select * into r from public.rooms where id=p_room_id for update;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_ROOM_MEMBER'; end if;
  if r.expires_at <= now() then raise exception 'ROOM_EXPIRED'; end if;
  if r.version <> p_expected_version then raise exception 'STALE_STATE'; end if;
  if actor <> r.host_id then raise exception 'NOT_YOUR_TURN'; end if;
  -- A room started by the old lobby-only START (empty state) can still be rescued.
  if not (r.status = 'READY' or (r.status = 'IN_PROGRESS' and (select state from public.game_state where room_id=r.id) = '{}'::jsonb)) then raise exception 'INVALID_PHASE'; end if;
  if (select count(*) from public.room_members where room_id=r.id) <> 2 then raise exception 'INVALID_PHASE'; end if;
  if p_state->>'phase' <> 'LOBBY' or jsonb_typeof(p_state->'rounds') <> 'array' or jsonb_typeof(p_state->'teams') <> 'object'
    or jsonb_typeof(p_state->'seed') <> 'string' then raise exception 'INVALID_ACTION'; end if;
  update public.game_state set state=p_state, phase='COIN_TOSS' where room_id=r.id;
  update public.participant_private set strategy=null where room_id=r.id;
  update public.rooms set status='IN_PROGRESS', version=version+1 where id=r.id returning * into r;
  insert into public.game_actions(room_id,actor_id,action_id,action_type,payload,resulting_version,expected_version)
    values(r.id,actor,p_action_id,'START_DUEL','{}'::jsonb,r.version,p_expected_version);
  return public.online_snapshot(r.id);
end;
$$;

create function public.online_submit_state(p_room_id uuid, p_action_id uuid, p_expected_version integer, p_state jsonb) returns jsonb
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

create function public.online_set_strategy(p_room_id uuid, p_strategy text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); r public.rooms; st jsonb;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_strategy is null or p_strategy not in ('NEUTRAL','MIDFIELD_CONTROL','WIDE_PLAY','COUNTER_ATTACK','HIGH_PRESS','LOW_BLOCK') then raise exception 'INVALID_ACTION'; end if;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_ROOM_MEMBER'; end if;
  select * into r from public.rooms where id=p_room_id for update;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_ROOM_MEMBER'; end if;
  if r.expires_at <= now() then raise exception 'ROOM_EXPIRED'; end if;
  if r.status <> 'IN_PROGRESS' then raise exception 'INVALID_PHASE'; end if;
  select state into st from public.game_state where room_id=r.id;
  if st->>'phase' <> 'TEAMS_COMPLETED' then raise exception 'INVALID_PHASE'; end if;
  -- One secret choice per person; repeating the same request is harmless, changing it is not allowed.
  if exists (select 1 from public.participant_private where room_id=r.id and user_id=actor and strategy is not null) then
    if (select strategy #>> '{}' from public.participant_private where room_id=r.id and user_id=actor) = p_strategy then return public.online_snapshot(r.id); end if;
    raise exception 'INVALID_PHASE';
  end if;
  insert into public.participant_private(room_id,user_id,strategy) values (r.id,actor,to_jsonb(p_strategy))
    on conflict (room_id,user_id) do update set strategy=excluded.strategy;
  update public.rooms set version=version+1 where id=r.id;
  return public.online_snapshot(r.id);
end;
$$;

-- Returns both choices only once both exist, so nobody sees the rival's pick before committing their own.
create function public.online_reveal_strategies(p_room_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); one text; two text;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_ROOM_MEMBER'; end if;
  select p.strategy #>> '{}' into one from public.participant_private p join public.room_members m using(room_id,user_id) where p.room_id=p_room_id and m.seat=1;
  select p.strategy #>> '{}' into two from public.participant_private p join public.room_members m using(room_id,user_id) where p.room_id=p_room_id and m.seat=2;
  if one is null or two is null then raise exception 'INVALID_PHASE'; end if;
  return jsonb_build_object('recruiter_one',one,'recruiter_two',two);
end;
$$;

-- Giving up: the room is finished and the state records who left. The other person wins.
create function public.online_forfeit(p_room_id uuid, p_action_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); r public.rooms; prior public.game_actions; seat smallint;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_action_id is null then raise exception 'INVALID_ACTION'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || p_action_id::text,0));
  select * into prior from public.game_actions where actor_id=actor and action_id=p_action_id;
  if found then
    if prior.room_id <> p_room_id or prior.action_type <> 'FORFEIT' then raise exception 'ACTION_ALREADY_PROCESSED'; end if;
    return public.online_snapshot(p_room_id);
  end if;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_ROOM_MEMBER'; end if;
  select * into r from public.rooms where id=p_room_id for update;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_ROOM_MEMBER'; end if;
  if r.expires_at <= now() then raise exception 'ROOM_EXPIRED'; end if;
  if r.status <> 'IN_PROGRESS' then raise exception 'INVALID_PHASE'; end if;
  select m.seat into seat from public.room_members m where m.room_id=r.id and m.user_id=actor;
  update public.game_state set state = state || jsonb_build_object('forfeitBy', case seat when 1 then 'recruiter_one' else 'recruiter_two' end), phase='MATCH_RESULT' where room_id=r.id;
  update public.rooms set status='FINISHED', version=version+1 where id=r.id returning * into r;
  insert into public.game_actions(room_id,actor_id,action_id,action_type,payload,resulting_version,expected_version)
    values(r.id,actor,p_action_id,'FORFEIT','{}'::jsonb,r.version,null);
  return public.online_snapshot(r.id);
end;
$$;

revoke all on function private.online_phase(text) from public, anon, authenticated;
revoke all on function public.online_snapshot(uuid), public.online_start_duel(uuid,uuid,integer,jsonb), public.online_submit_state(uuid,uuid,integer,jsonb),
  public.online_set_strategy(uuid,text), public.online_reveal_strategies(uuid), public.online_forfeit(uuid,uuid) from public, anon;
grant execute on function public.online_snapshot(uuid), public.online_start_duel(uuid,uuid,integer,jsonb), public.online_submit_state(uuid,uuid,integer,jsonb),
  public.online_set_strategy(uuid,text), public.online_reveal_strategies(uuid), public.online_forfeit(uuid,uuid) to authenticated;

-- Closing a room. The host deletes it (everything about it goes with it); a guest just leaves while nothing is being played.
create function public.online_close_room(p_room_id uuid, p_action_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); r public.rooms;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_action_id is null then raise exception 'INVALID_ACTION'; end if;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_ROOM_MEMBER'; end if;
  select * into r from public.rooms where id=p_room_id for update;
  if not found or not public.is_room_member(p_room_id) then raise exception 'NOT_ROOM_MEMBER'; end if;
  if r.host_id = actor then
    delete from public.rooms where id = r.id;
    return null;
  end if;
  if r.status = 'IN_PROGRESS' then raise exception 'INVALID_PHASE'; end if;
  delete from public.room_members where room_id = r.id and user_id = actor;
  update public.room_members set ready=false where room_id = r.id;
  update public.rooms set status = case when r.status in ('WAITING','READY') then 'WAITING' else r.status end, version = version + 1 where id = r.id;
  return null;
end;
$$;

-- Tells whoever is still connected that the room is gone (the host deleted it).
create function private.notify_room_closed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.send(jsonb_build_object('roomId',old.id,'closed',true),'room_changed','room:' || old.id::text,true);
  return old;
end;
$$;
create trigger room_closed after delete on public.rooms for each row execute function private.notify_room_closed();
revoke all on function private.notify_room_closed() from public, anon, authenticated;
revoke all on function public.online_close_room(uuid,uuid) from public, anon;
grant execute on function public.online_close_room(uuid,uuid) to authenticated;
