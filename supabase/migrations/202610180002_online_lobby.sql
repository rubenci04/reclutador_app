-- CODEX-006B. Each command and its invalidation commit atomically.
alter table public.game_actions add column expected_version integer;
create function private.checked_name(value text) returns text language plpgsql set search_path = '' as $$
begin
  if value is null or char_length(value) not between 1 and 24 or value <> btrim(value)
    or value ~ '[[:cntrl:]]' or value ~ U&'[\200B-\200F\202A-\202E\2060-\206F\FEFF]' then
    raise exception 'INVALID_ACTION';
  end if;
  return value;
end;
$$;

create function public.online_snapshot(p_room_id uuid) returns jsonb
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
    'settings',jsonb_build_object('mode',s.mode,'budget',s.budget,'starters',s.starters,
      'substitutes',s.substitutes,'discards',s.discards,'catalogVersion',s.catalog_version,'rulesVersion',s.rules_version),
    'members',(select jsonb_agg(jsonb_build_object('userId',m.user_id,'name',m.name,'seat',m.seat,'ready',m.ready) order by m.seat)
      from public.room_members m where m.room_id=r.id)) into result
  from public.room_settings s join public.game_state g using(room_id) join private.room_secrets secret using(room_id) where s.room_id=r.id;
  return result;
end;
$$;

create function public.online_create_room(p_name text, p_action_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); room uuid; prior public.game_actions;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_action_id is null then raise exception 'INVALID_ACTION'; end if;
  perform private.checked_name(p_name);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || p_action_id::text,0));
  select * into prior from public.game_actions where actor_id=actor and action_id=p_action_id;
  if found then
    if prior.action_type <> 'CREATE' or prior.payload <> jsonb_build_object('name',p_name) then raise exception 'ACTION_ALREADY_PROCESSED'; end if;
    return public.online_snapshot(prior.room_id);
  end if;
  insert into public.rooms(host_id) values(actor) returning id into room;
  insert into public.room_members(room_id,user_id,seat,name) values(room,actor,1,p_name);
  insert into public.room_settings(room_id) values(room);
  insert into public.game_state(room_id) values(room);
  insert into private.room_secrets(room_id) values(room);
  insert into public.game_actions(room_id,actor_id,action_id,action_type,payload,resulting_version)
    values(room,actor,p_action_id,'CREATE',jsonb_build_object('name',p_name),0);
  return public.online_snapshot(room);
end;
$$;

create function public.online_join_room(p_code text, p_name text, p_action_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); r public.rooms; prior public.game_actions;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_action_id is null or p_code is null or p_code !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_ACTION'; end if;
  perform private.checked_name(p_name);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || p_action_id::text,0));
  select rooms.* into r from public.rooms rooms join private.room_secrets s on s.room_id=rooms.id where s.invite_code=p_code for update of rooms;
  if not found then raise exception 'ROOM_NOT_FOUND'; end if;
  if r.expires_at <= now() then raise exception 'ROOM_EXPIRED'; end if;
  select * into prior from public.game_actions where actor_id=actor and action_id=p_action_id;
  if found then
    if prior.room_id <> r.id or prior.action_type <> 'JOIN' or prior.payload <> jsonb_build_object('name',p_name) then raise exception 'ACTION_ALREADY_PROCESSED'; end if;
    return public.online_snapshot(r.id);
  end if;
  if r.status in ('CANCELLED','FINISHED') then raise exception 'INVALID_PHASE'; end if;
  if not public.is_room_member(r.id) then
    if r.status not in ('WAITING','READY') then raise exception 'INVALID_PHASE'; end if;
    if (select count(*) from public.room_members where room_id=r.id) >= 2 then raise exception 'ROOM_FULL'; end if;
    insert into public.room_members(room_id,user_id,seat,name) values(r.id,actor,2,p_name);
    update public.room_members set ready=false where room_id=r.id;
    update public.rooms set version=version+1,status='WAITING' where id=r.id returning * into r;
  end if;
  insert into public.game_actions(room_id,actor_id,action_id,action_type,payload,resulting_version)
    values(r.id,actor,p_action_id,'JOIN',jsonb_build_object('name',p_name),r.version);
  return public.online_snapshot(r.id);
end;
$$;

create function public.online_command(p_room_id uuid, p_action_id uuid, p_expected_version integer, p_action_type text, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); r public.rooms; prior public.game_actions;
begin
  if actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_action_id is null or p_expected_version is null or p_expected_version < 0 or p_action_type is null or p_action_type not in ('SET_READY','LEAVE','START') or p_payload is null or jsonb_typeof(p_payload) <> 'object' then raise exception 'INVALID_ACTION'; end if;
  if p_action_type='SET_READY' then
    if jsonb_typeof(p_payload->'ready') is distinct from 'boolean' or p_payload - 'ready' <> '{}'::jsonb then raise exception 'INVALID_ACTION'; end if;
  elsif p_payload <> '{}'::jsonb then raise exception 'INVALID_ACTION'; end if;
  -- Lock action identity before the room, consistently with CREATE/JOIN.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || p_action_id::text,0));
  select * into prior from public.game_actions where actor_id=actor and action_id=p_action_id;
  if found then
    if prior.room_id <> p_room_id or prior.action_type <> p_action_type or prior.payload <> p_payload or prior.expected_version is distinct from p_expected_version then raise exception 'ACTION_ALREADY_PROCESSED'; end if;
    if p_action_type='LEAVE' then return null; end if;
    return public.online_snapshot(p_room_id);
  end if;
  if not public.is_room_member(p_room_id) then raise exception 'NOT_ROOM_MEMBER'; end if;
  select * into r from public.rooms where id=p_room_id for update;
  -- Recheck after waiting: a different transaction can remove this membership.
  if not public.is_room_member(p_room_id) then raise exception 'NOT_ROOM_MEMBER'; end if;
  if r.expires_at <= now() then raise exception 'ROOM_EXPIRED'; end if;
  if r.version <> p_expected_version then raise exception 'STALE_STATE'; end if;
  if r.status not in ('WAITING','READY') then raise exception 'INVALID_PHASE'; end if;
  if p_action_type='SET_READY' then
    update public.room_members set ready=(p_payload->>'ready')::boolean where room_id=r.id and user_id=actor;
    update public.rooms set status=case when (select count(*) from public.room_members where room_id=r.id and ready)=2 then 'READY' else 'WAITING' end where id=r.id;
  elsif p_action_type='LEAVE' then
    if r.host_id=actor then update public.rooms set status='CANCELLED' where id=r.id;
    else
      delete from public.room_members where room_id=r.id and user_id=actor;
      update public.room_members set ready=false where room_id=r.id;
      update public.rooms set status='WAITING' where id=r.id;
    end if;
  else
    if actor <> r.host_id then raise exception 'NOT_YOUR_TURN'; end if;
    if r.status <> 'READY' or (select count(*) from public.room_members where room_id=r.id and ready) <> 2 then raise exception 'INVALID_PHASE'; end if;
    -- Lobby transition only. No client-side auction, toss or simulation is run.
    update public.rooms set status='IN_PROGRESS' where id=r.id;
    update public.game_state set phase='COIN_TOSS' where room_id=r.id;
  end if;
  update public.rooms set version=version+1 where id=r.id returning * into r;
  insert into public.game_actions(room_id,actor_id,action_id,action_type,payload,resulting_version,expected_version)
    values(r.id,actor,p_action_id,p_action_type,p_payload,r.version,p_expected_version);
  if p_action_type='LEAVE' then return null; end if;
  return public.online_snapshot(r.id);
end;
$$;

create function private.notify_room_version() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- A removed member may retain an established socket until its authorization expires.
  -- Hence broadcast only invalidations, never names, invitations, seed or strategies.
  perform realtime.send(jsonb_build_object('roomId',new.id,'version',new.version),'room_changed','room:' || new.id::text,true);
  return new;
end;
$$;
create trigger room_version_changed after update of version on public.rooms for each row execute function private.notify_room_version();
create policy room_members_receive on realtime.messages for select to authenticated using (
  extension='broadcast' and exists (
    select 1 from public.room_members m where m.user_id=auth.uid() and 'room:' || m.room_id::text = realtime.topic()
  )
);
revoke all on function private.checked_name(text), private.notify_room_version() from public, anon, authenticated;
revoke all on function public.online_snapshot(uuid), public.online_create_room(text,uuid), public.online_join_room(text,text,uuid), public.online_command(uuid,uuid,integer,text,jsonb) from public, anon;
grant execute on function public.online_snapshot(uuid), public.online_create_room(text,uuid), public.online_join_room(text,text,uuid), public.online_command(uuid,uuid,integer,text,jsonb) to authenticated;
