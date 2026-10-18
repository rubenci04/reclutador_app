// @vitest-environment node
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

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
