// @vitest-environment node
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { parseSnapshot, type RoomSnapshot } from './contracts'

const db = new PGlite()
const host = '00000000-0000-4000-8000-000000000001'
const guest = '00000000-0000-4000-8000-000000000002'
const outsider = '00000000-0000-4000-8000-000000000003'
const room = '10000000-0000-4000-8000-000000000001'
async function asUser(id: string) {
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id])
  await db.exec('set role authenticated')
}
beforeAll(async () => {
  // Platform shim only: actual tables, RLS, grants and PL/pgSQL execute in PostgreSQL WASM.
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    insert into auth.users values ('${host}'),('${guest}'),('${outsider}');`)
  await db.exec(readFileSync('supabase/migrations/202610180001_online_foundation.sql', 'utf8'))
  await db.exec(`create schema realtime;
    create table realtime.messages(topic text, extension text, payload jsonb);
    alter table realtime.messages enable row level security;
    grant usage on schema realtime to authenticated;
    grant select,insert on realtime.messages to authenticated;
    create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic',true) $$;
    create function realtime.send(payload jsonb,event text,topic text,private boolean) returns void language sql as $$ insert into realtime.messages values(topic,'broadcast',payload) $$;`)
  await db.exec(readFileSync('supabase/migrations/202610180002_online_lobby.sql', 'utf8'))
  await db.exec(`insert into public.rooms(id,host_id) values ('${room}','${host}');
    insert into public.room_members(room_id,user_id,seat,name) values ('${room}','${host}',1,'Host'),('${room}','${guest}',2,'Guest');
    insert into public.room_settings(room_id) values ('${room}');
    insert into public.game_state(room_id) values ('${room}');
    insert into private.room_secrets(room_id) values ('${room}');
    insert into public.participant_private values ('${room}','${host}','{"strategy":"secret"}'),('${room}','${guest}','{"strategy":"other"}');`)
}, 30000)
afterAll(async () => { await db.close() })
describe('006A executed migration and SQL permissions', () => {
  it('members see the same public state but only their private strategy', async () => {
    for (const id of [host, guest]) {
      await asUser(id)
      expect((await db.query('select * from public.rooms')).rows).toHaveLength(1)
      expect((await db.query('select * from public.room_members')).rows).toHaveLength(2)
      expect((await db.query<{user_id: string}>('select * from public.participant_private')).rows.map(r => r.user_id)).toEqual([id])
    }
  })
  it('outsiders cannot discover rooms, settings, members, state or private information', async () => {
    await asUser(outsider)
    for (const table of ['rooms', 'room_members', 'room_settings', 'game_state', 'participant_private']) expect((await db.query(`select * from public.${table}`)).rows).toEqual([])
  })
  it('even the host cannot write budgets, membership, results or the action ledger', async () => {
    await asUser(host)
    for (const sql of ["update public.room_settings set budget=200", "delete from public.room_members", "update public.game_state set state='{}'", "update public.rooms set status='FINISHED'", "select * from private.room_secrets", "select * from public.game_actions", "update public.participant_private set strategy='{}'"]) await expect(db.exec(sql)).rejects.toThrow(/permission denied/)
  })
  it('anonymous role has neither room reads nor membership helper execution', async () => {
    await db.exec('reset role; set role anon')
    await expect(db.exec('select * from public.rooms')).rejects.toThrow(/permission denied/)
    await expect(db.query('select public.is_room_member($1)', [room])).rejects.toThrow(/permission denied/)
  })
  it('database constraints prevent duplicate identities, third seats and unvalidated settings', async () => {
    await db.exec('reset role')
    await expect(db.query('insert into public.room_members values ($1,$2,2,$3,false)', [room,host,'Duplicate'])).rejects.toThrow()
    await expect(db.query('insert into public.room_members values ($1,$2,3,$3,false)', [room,outsider,'Third'])).rejects.toThrow()
    await expect(db.exec('update public.room_settings set budget=200')).rejects.toThrow()
  })
})

async function rpc(sql: string, args: unknown[]): Promise<RoomSnapshot> {
  const result = await db.query<{snapshot: unknown}>(`select ${sql} as snapshot`, args)
  return parseSnapshot(result.rows[0].snapshot)
}
const create = (name = 'Host', action = crypto.randomUUID()) => rpc('public.online_create_room($1,$2)', [name,action])
const join = (code: string, name = 'Guest', action = crypto.randomUUID()) => rpc('public.online_join_room($1,$2,$3)', [code,name,action])
const command = (s: RoomSnapshot, type: string, payload = {}, action = crypto.randomUUID()) => rpc('public.online_command($1,$2,$3,$4,$5)', [s.roomId,action,s.version,type,JSON.stringify(payload)])
describe('006B executed lobby RPCs and private broadcast policy', () => {
  it('creates once per action, pins classic configuration and never discloses the seed', async () => {
    await asUser(host)
    const action = crypto.randomUUID()
    const one = await create('A',action)
    const two = await create('A',action)
    expect(two).toEqual(one)
    expect(one.members).toEqual([{userId:host,name:'A',seat:1,ready:false}])
    expect(JSON.stringify(one)).not.toContain('seed')
    await expect(create('Different',action)).rejects.toThrow('ACTION_ALREADY_PROCESSED')
  })
  it('same identity cannot occupy two seats, third identity is denied, outsider snapshot is denied', async () => {
    await asUser(host)
    const s = await create()
    expect((await join(s.inviteCode)).members).toHaveLength(1)
    await asUser(guest)
    const joined = await join(s.inviteCode)
    expect(joined.members).toHaveLength(2)
    await asUser(outsider)
    await expect(join(s.inviteCode)).rejects.toThrow('ROOM_FULL')
    await expect(rpc('public.online_snapshot($1)', [s.roomId])).rejects.toThrow('NOT_ROOM_MEMBER')
    await expect(join('0'.repeat(64))).rejects.toThrow('ROOM_NOT_FOUND')
  })
  it('joins idempotently without resetting the ready state on a retry', async () => {
    await asUser(host); const s = await create()
    await asUser(guest); const action = crypto.randomUUID()
    const j = await join(s.inviteCode,'Guest',action)
    const ready = await command(j,'SET_READY',{ready:true})
    const retried = await join(s.inviteCode,'Guest',action)
    expect(retried).toEqual(ready)
  })
  it('both ready, host start, stale command and exact duplicate have authoritative versions', async () => {
    await asUser(host); const s = await create()
    await expect(command(s,'START')).rejects.toThrow('INVALID_PHASE')
    await asUser(guest); const j = await join(s.inviteCode)
    const g = await command(j,'SET_READY',{ready:true})
    await asUser(host)
    await expect(command(j,'SET_READY',{ready:true})).rejects.toThrow('STALE_STATE')
    const id = crypto.randomUUID()
    const h = await command(g,'SET_READY',{ready:true},id)
    expect(h.status).toBe('READY')
    expect(h.version).toBe(g.version+1)
    expect(await command(g,'SET_READY',{ready:true},id)).toEqual(h)
    await expect(command(g,'SET_READY',{ready:false},id)).rejects.toThrow('ACTION_ALREADY_PROCESSED')
    await asUser(guest)
    await expect(command(h,'START')).rejects.toThrow('NOT_YOUR_TURN')
    await asUser(host)
    const started = await command(h,'START')
    expect(started.status).toBe('IN_PROGRESS'); expect(started.phase).toBe('COIN_TOSS')
    await expect(command(started,'SET_READY',{ready:false})).rejects.toThrow('INVALID_PHASE')
    await asUser(outsider)
    await expect(join(s.inviteCode)).rejects.toThrow('INVALID_PHASE')
    await asUser(guest)
    expect((await join(s.inviteCode)).version).toBe(started.version)
  })
  it('rejects tampered payloads and does not accept actor identity from the client', async () => {
    await asUser(host); const s = await create()
    for (const [type,payload] of [['SET_READY',{}],['SET_READY',{ready:true,budget:200}],['SET_READY',{ready:'true'}],['BID',{actorId:guest}],['START',{actorId:host}]]) await expect(command(s,type as string,payload as object)).rejects.toThrow('INVALID_ACTION')
    await expect(create(' ')).rejects.toThrow('INVALID_ACTION')
    await expect(create('a'.repeat(25))).rejects.toThrow('INVALID_ACTION')
  })
  it('guest leave frees its slot, resets readiness and revokes subsequent reads', async () => {
    await asUser(host); const s = await create()
    await asUser(guest); const j = await join(s.inviteCode)
    const action = crypto.randomUUID()
    const args = [j.roomId,action,j.version,'LEAVE','{}']
    await db.query('select public.online_command($1,$2,$3,$4,$5)',args)
    await db.query('select public.online_command($1,$2,$3,$4,$5)',args)
    await expect(rpc('public.online_snapshot($1)',[s.roomId])).rejects.toThrow('NOT_ROOM_MEMBER')
    await asUser(outsider)
    expect((await join(s.inviteCode,'Replacement')).members.map(m => m.userId)).toEqual([host,outsider])
  })
  it('host departure cancels the room visibly for the guest', async () => {
    await asUser(host); const s = await create()
    await asUser(guest); const j = await join(s.inviteCode)
    await asUser(host)
    await db.query('select public.online_command($1,$2,$3,$4,$5)',[s.roomId,crypto.randomUUID(),j.version,'LEAVE','{}'])
    await asUser(guest)
    expect((await rpc('public.online_snapshot($1)',[s.roomId])).status).toBe('CANCELLED')
    await expect(join(s.inviteCode)).rejects.toThrow('INVALID_PHASE')
  })
  it('server expiration blocks invitations and member snapshots', async () => {
    await asUser(host); const s = await create()
    await db.exec('reset role')
    await db.query("update public.rooms set created_at=now()-interval '2 days', expires_at=now()-interval '1 day' where id=$1",[s.roomId])
    await asUser(guest)
    await expect(join(s.inviteCode)).rejects.toThrow('ROOM_EXPIRED')
    await asUser(host)
    await expect(rpc('public.online_snapshot($1)',[s.roomId])).rejects.toThrow('ROOM_EXPIRED')
  })
  it('private realtime only authorizes members to receive invalidations, never send', async () => {
    await asUser(host); const s = await create()
    await command(s,'SET_READY',{ready:true})
    await db.query("select set_config('realtime.topic',$1,false)",['room:'+s.roomId])
    const messages = (await db.query<{payload: object}>('select * from realtime.messages')).rows
    expect(messages.length).toBeGreaterThan(0)
    for (const {payload} of messages) expect(Object.keys(payload).sort()).toEqual(['roomId','version'])
    await expect(db.exec("insert into realtime.messages values ('room:forged','broadcast','{}')")).rejects.toThrow(/row-level security/)
    await asUser(outsider)
    expect((await db.query('select * from realtime.messages')).rows).toHaveLength(0)
  })
  it('unauthenticated users cannot call any lobby RPC', async () => {
    await db.exec('reset role; set role anon')
    await expect(create()).rejects.toThrow(/permission denied/)
    await expect(join('0'.repeat(64))).rejects.toThrow(/permission denied/)
  })
})
