// @vitest-environment node
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { revealCoinToss, startCoinToss } from '../recruiter-duel/auctionEngine'
import { buildInitialDuel, slimDuel } from './onlineDuel'
import { MIGRATIONS } from './sqlMigrations'

const db = new PGlite()
const host = '00000000-0000-4000-8000-0000000000d1'
const guest = '00000000-0000-4000-8000-0000000000d2'
const act = (n: number) => `40000000-0000-4000-8000-${String(n).padStart(12, '0')}`
let counter = 0
const next = () => act(++counter)
const sql = (name: string) => readFileSync(name, 'utf8')
async function as(id: string) {
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id])
  await db.exec('set role authenticated')
}
async function call<T = unknown>(text: string, params: unknown[] = []): Promise<T> { return (await db.query<{ r: T }>(`select ${text} as r`, params)).rows[0].r }
const functionExists = async (name: string) => { await db.exec('reset role'); return (await db.query('select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname=$1 and n.nspname in (\'public\',\'private\')', [name])).rows.length > 0 }

async function startedRoom(seed: string) {
  await as(host)
  const created = await call<{ roomId: string; inviteCode: string }>("public.online_create_room('Ana',$1)", [next()])
  await as(guest)
  let version = (await call<{ version: number }>('public.online_join_room($1,$2,$3)', [created.inviteCode, 'Beto', next()])).version
  for (const who of [host, guest]) { await as(who); version = (await call<{ version: number }>("public.online_command($1,$2,$3,'SET_READY','{\"ready\":true}'::jsonb)", [created.roomId, next(), version])).version }
  await as(host)
  const initial = buildInitialDuel({ host: 'Ana', guest: 'Beto' }, 'GLOBAL_CLASSIC', 'GLOBAL_CLASSIC', seed)
  const started = await call<{ version: number }>('public.online_start_duel($1,$2,$3,$4::jsonb)', [created.roomId, next(), version, JSON.stringify(initial)])
  return { roomId: created.roomId, version: started.version, initial }
}

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    insert into auth.users values ('${host}'),('${guest}');`)
  await db.exec(sql(`supabase/migrations/${MIGRATIONS[0]}.sql`))
  await db.exec(`create schema realtime;
    create table realtime.messages(topic text, extension text, payload jsonb);
    alter table realtime.messages enable row level security;
    grant usage on schema realtime to authenticated;
    grant select,insert on realtime.messages to authenticated;
    create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic',true) $$;
    create function realtime.send(payload jsonb,event text,topic text,private boolean) returns void language sql as $$ insert into realtime.messages values(topic,'broadcast',payload) $$;`)
  for (const name of MIGRATIONS.slice(1)) await db.exec(sql(`supabase/migrations/${name}.sql`))
}, 60000)
afterAll(async () => { await db.close() })

describe('rollback of sprints 2 and 3', () => {
  it('has the new behaviour before the rollback: server coin, deadline and serverNow', async () => {
    const room = await startedRoom('rollback-before')
    await as(host)
    const flipped = await call<{ version: number; serverNow: string }>('public.online_flip_coin($1,$2,$3,$4)', [room.roomId, next(), room.version, 'heads'])
    expect(flipped.serverNow).toBeTruthy()
    expect(await functionExists('online_claim_timeout')).toBe(true)
    await as(host)
    // The client-side coin of the old flow is refused now.
    const tossed = startCoinToss(room.initial, 'heads'); if (!tossed.ok) throw new Error(tossed.error)
    const second = await startedRoom('rollback-before-2')
    await as(host)
    await expect(call('public.online_submit_state($1,$2,$3,$4::jsonb)', [second.roomId, next(), second.version, JSON.stringify(slimDuel(tossed.game))])).rejects.toThrow(/INVALID_PHASE|INVALID_ACTION/)
  })

  it('removes the new functions and the trigger, is idempotent, and the old flow works again', async () => {
    const before = await startedRoom('rollback-room')
    await db.exec('reset role')
    await db.exec(sql('supabase/rollback/rollback_sprint_2_3.sql'))
    await db.exec(sql('supabase/rollback/rollback_sprint_2_3.sql'))
    for (const name of ['online_flip_coin', 'online_claim_timeout', 'online_set_deadline', 'online_bid_seconds', 'online_strategy_seconds', 'online_grace_seconds']) expect(await functionExists(name)).toBe(false)
    expect((await db.query("select 1 from pg_trigger where tgname='game_state_deadline'")).rows).toHaveLength(0)
    // The room opened before the rollback keeps working with the old rules: the client tosses the coin.
    await as(host)
    const tossed = startCoinToss(before.initial, 'tails'); if (!tossed.ok) throw new Error(tossed.error)
    const afterToss = await call<{ version: number; state: Record<string, unknown>; serverNow?: string }>('public.online_submit_state($1,$2,$3,$4::jsonb)', [before.roomId, next(), before.version, JSON.stringify(slimDuel(tossed.game))])
    expect(afterToss.state).toMatchObject({ phase: 'COIN_TOSS', coinCall: 'tails' })
    expect(afterToss.serverNow).toBeUndefined()
    const revealed = revealCoinToss(tossed.game); if (!revealed.ok) throw new Error(revealed.error)
    await as(guest)
    const play = await call<{ phase: string; deadlineAt: string | null }>('public.online_submit_state($1,$2,$3,$4::jsonb)', [before.roomId, next(), afterToss.version, JSON.stringify(slimDuel({ ...revealed.game, phase: 'BIDDING', activeParticipant: 'recruiter_one' }))])
    expect(play).toMatchObject({ phase: 'AUCTION', deadlineAt: null })
    // Giving up still works; the new functions are gone.
    await as(guest)
    await expect(call('public.online_flip_coin($1,$2,$3,$4)', [before.roomId, next(), 0, 'heads'])).rejects.toThrow(/online_flip_coin/)
    await expect(call('public.online_claim_timeout($1,$2)', [before.roomId, next()])).rejects.toThrow(/online_claim_timeout/)
    expect((await call<{ status: string }>('public.online_forfeit($1,$2)', [before.roomId, next()])).status).toBe('FINISHED')
  })

  it('can apply the sprint migrations again after a rollback', async () => {
    await db.exec('reset role')
    for (const name of MIGRATIONS.slice(3)) await db.exec(sql(`supabase/migrations/${name}.sql`))
    expect(await functionExists('online_flip_coin')).toBe(true)
    expect(await functionExists('online_claim_timeout')).toBe(true)
  })
})
