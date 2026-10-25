// @vitest-environment node
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildInitialDuel } from './onlineDuel'
import { startCoinToss, revealCoinToss } from '../recruiter-duel/auctionEngine'
import { COACH_MARKET_V4 } from '../coaches/coachRules'
import { DISCARDS_MARKER_V2, DISCARDS_V2, parseMatchConfig } from '../recruiter-duel/matchConfig'

const db = new PGlite()
const host = '00000000-0000-4000-8000-0000000000a1'
const guest = '00000000-0000-4000-8000-0000000000a2'
const outsider = '00000000-0000-4000-8000-0000000000a3'
const act = (n: number) => `20000000-0000-4000-8000-${String(n).padStart(12, '0')}`
let room = ''
let version = 0
let counter = 0

async function asUser(id: string) {
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id])
  await db.exec('set role authenticated')
}
async function call<T = unknown>(sql: string, params: unknown[] = []): Promise<T> {
  return (await db.query<{ r: T }>(`select ${sql} as r`, params)).rows[0].r
}
const state = (patch: Record<string, unknown> = {}) => ({ phase: 'LOBBY', seed: 'seed-1', config: { budget: 100 }, rounds: [{ playerId: 'plr_001' }], teams: { recruiter_one: { spent: 0 }, recruiter_two: { spent: 0 } }, record: [], ...patch })
const nextAction = () => act(++counter)
async function submit(user: string, patch: Record<string, unknown>) {
  await asUser(user)
  const snapshot = await call<{ version: number; state: Record<string, unknown> }>('public.online_submit_state($1,$2,$3,$4::jsonb)', [room, nextAction(), version, JSON.stringify(patch)])
  version = snapshot.version
  return snapshot
}

beforeAll(async () => {
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
  await db.exec(readFileSync('supabase/migrations/202610190001_online_duel.sql', 'utf8'))
  await asUser(host)
  const created = await call<{ roomId: string; inviteCode: string; version: number }>("public.online_create_room('Ana',$1)", [nextAction()])
  room = created.roomId
  await asUser(guest)
  const joined = await call<{ version: number }>('public.online_join_room($1,$2,$3)', [created.inviteCode, 'Beto', nextAction()])
  version = joined.version
  for (const user of [host, guest]) {
    await asUser(user)
    version = (await call<{ version: number }>("public.online_command($1,$2,$3,'SET_READY','{\"ready\":true}'::jsonb)", [room, nextAction(), version])).version
  }
}, 60000)
afterAll(async () => { await db.close() })

describe('online duel: starting', () => {
  it('accepts a real mixed-category draw and advances both participants to arranging without a migration', async () => {
    await asUser(host)
    const created = await call<{ roomId: string; inviteCode: string }>("public.online_create_room('Ana',$1)", [nextAction()])
    await asUser(guest)
    let latest = (await call<{ version: number }>('public.online_join_room($1,$2,$3)', [created.inviteCode, 'Beto', nextAction()])).version
    for (const user of [host, guest]) {
      await asUser(user)
      latest = (await call<{ version: number }>("public.online_command($1,$2,$3,'SET_READY','{\"ready\":true}'::jsonb)", [created.roomId, nextAction(), latest])).version
    }
    await asUser(host)
    const initial = buildInitialDuel({ host: 'Ana', guest: 'Beto' }, 'SPAIN_LEGENDS', 'ARGENTINA_CURRENT')
    expect(initial.config).toMatchObject({ coachMarket: COACH_MARKET_V4, discards: DISCARDS_MARKER_V2 })
    expect(initial.discardsRemaining).toBe(DISCARDS_V2)
    latest = (await call<{ version: number }>('public.online_start_duel($1,$2,$3,$4::jsonb)', [created.roomId, nextAction(), latest, JSON.stringify(initial)])).version
    const tossed = startCoinToss(initial, 'heads'); if (!tossed.ok) throw new Error(tossed.error)
    latest = (await call<{ version: number }>('public.online_submit_state($1,$2,$3,$4::jsonb)', [created.roomId, nextAction(), latest, JSON.stringify(tossed.game)])).version
    const revealed = revealCoinToss(tossed.game); if (!revealed.ok) throw new Error(revealed.error)
    await call('public.online_submit_state($1,$2,$3,$4::jsonb)', [created.roomId, nextAction(), latest, JSON.stringify(revealed.game)])
    await asUser(guest)
    const seen = await call<{ state: { phase: string; categoryPair: unknown; config: unknown; discardsRemaining: number } }>('public.online_snapshot($1)', [created.roomId])
    expect(seen.state.phase).toBe('TEAMS_COMPLETED')
    expect(seen.state.categoryPair).toEqual(initial.categoryPair)
    expect(parseMatchConfig(seen.state.config)).toEqual(initial.config)
    expect(seen.state.discardsRemaining).toBe(DISCARDS_V2)
  })
  it('only the host starts, with a well-formed initial state, and both members then see it', async () => {
    await asUser(guest)
    await expect(call('public.online_start_duel($1,$2,$3,$4::jsonb)', [room, nextAction(), version, JSON.stringify(state())])).rejects.toThrow(/NOT_YOUR_TURN/)
    await asUser(host)
    await expect(call('public.online_start_duel($1,$2,$3,$4::jsonb)', [room, nextAction(), version, JSON.stringify(state({ phase: 'BIDDING' }))])).rejects.toThrow(/INVALID_ACTION/)
    await expect(call('public.online_start_duel($1,$2,$3,$4::jsonb)', [room, nextAction(), version - 1, JSON.stringify(state())])).rejects.toThrow(/STALE_STATE/)
    const id = nextAction()
    const started = await call<{ version: number; status: string; phase: string; state: { seed: string } }>('public.online_start_duel($1,$2,$3,$4::jsonb)', [room, id, version, JSON.stringify(state())])
    expect(started).toMatchObject({ status: 'IN_PROGRESS', phase: 'COIN_TOSS', state: { seed: 'seed-1' } })
    // Repeating the same request (a network retry) returns the room without starting twice.
    const again = await call<{ version: number }>('public.online_start_duel($1,$2,$3,$4::jsonb)', [room, id, version, JSON.stringify(state())])
    expect(again.version).toBe(started.version)
    version = started.version
    await asUser(guest)
    expect((await call<{ state: { seed: string } }>('public.online_snapshot($1)', [room])).state.seed).toBe('seed-1')
    await asUser(outsider)
    await expect(call('public.online_snapshot($1)', [room])).rejects.toThrow(/NOT_ROOM_MEMBER/)
  })
})

describe('online duel: who may change what', () => {
  it('lets either member advance the toss and the reveal, and tracks the engine phase', async () => {
    const one = await submit(host, state({ phase: 'COIN_TOSS' }))
    expect(one.state).toMatchObject({ phase: 'COIN_TOSS' })
    const two = await submit(guest, state({ phase: 'REVEAL_PLAYER' }))
    expect((two as unknown as { phase: string }).phase).toBe('AUCTION')
  })
  it('keeps the deal fixed: seed, configuration and the growing history cannot be rewritten', async () => {
    await asUser(host)
    for (const bad of [state({ seed: 'other', phase: 'BIDDING', activeParticipant: 'recruiter_one' }), state({ config: { budget: 999 }, phase: 'BIDDING' })]) {
      await expect(call('public.online_submit_state($1,$2,$3,$4::jsonb)', [room, nextAction(), version, JSON.stringify(bad)])).rejects.toThrow(/INVALID_ACTION/)
    }
  })
  it('enforces turns during bidding and rejects stale writes', async () => {
    await submit(host, state({ phase: 'BIDDING', activeParticipant: 'recruiter_one', record: [{ type: 'x' }] }))
    await asUser(guest)
    await expect(call('public.online_submit_state($1,$2,$3,$4::jsonb)', [room, nextAction(), version, JSON.stringify(state({ phase: 'BIDDING', activeParticipant: 'recruiter_one', record: [{ type: 'x' }, { type: 'y' }] }))])).rejects.toThrow(/NOT_YOUR_TURN/)
    await asUser(host)
    await expect(call('public.online_submit_state($1,$2,$3,$4::jsonb)', [room, nextAction(), version - 1, JSON.stringify(state({ phase: 'BIDDING', activeParticipant: 'recruiter_two', record: [{ type: 'x' }, { type: 'y' }] }))])).rejects.toThrow(/STALE_STATE/)
    await expect(call('public.online_submit_state($1,$2,$3,$4::jsonb)', [room, nextAction(), version, JSON.stringify(state({ phase: 'BIDDING', activeParticipant: 'recruiter_two', record: [] }))])).rejects.toThrow(/INVALID_ACTION/)
    await submit(host, state({ phase: 'BIDDING', activeParticipant: 'recruiter_two', record: [{ type: 'x' }, { type: 'y' }] }))
    await submit(guest, state({ phase: 'ROUND_RESULT', record: [{ type: 'x' }, { type: 'y' }, { type: 'z' }] }))
  })
  it('does not let a person edit the rival team while squads are arranged', async () => {
    await submit(host, state({ phase: 'TEAMS_COMPLETED', record: [{}, {}, {}], teams: { recruiter_one: { spent: 90 }, recruiter_two: { spent: 80 } } }))
    await asUser(guest)
    await expect(call('public.online_submit_state($1,$2,$3,$4::jsonb)', [room, nextAction(), version, JSON.stringify(state({ phase: 'TEAMS_COMPLETED', record: [{}, {}, {}], teams: { recruiter_one: { spent: 10 }, recruiter_two: { spent: 80 } } }))])).rejects.toThrow(/NOT_YOUR_TURN/)
    await submit(guest, state({ phase: 'TEAMS_COMPLETED', record: [{}, {}, {}], teams: { recruiter_one: { spent: 90 }, recruiter_two: { spent: 85 } } }))
  })
})

describe('online duel: secret strategies', () => {
  it('never exposes a choice, reveals both only when both exist, and fixes the choice', async () => {
    await asUser(host)
    await expect(call('public.online_set_strategy($1,$2)', [room, 'NOT_A_STRATEGY'])).rejects.toThrow(/INVALID_ACTION/)
    await expect(call('public.online_reveal_strategies($1)', [room])).rejects.toThrow(/INVALID_PHASE/)
    const mine = await call<{ version: number; strategyReady: Record<string, boolean> }>('public.online_set_strategy($1,$2)', [room, 'HIGH_PRESS'])
    expect(mine.strategyReady).toEqual({ '1': true, '2': false })
    version = mine.version
    // Same request again is harmless; a different one is refused.
    await call('public.online_set_strategy($1,$2)', [room, 'HIGH_PRESS'])
    await expect(call('public.online_set_strategy($1,$2)', [room, 'LOW_BLOCK'])).rejects.toThrow(/INVALID_PHASE/)
    await expect(call('public.online_reveal_strategies($1)', [room])).rejects.toThrow(/INVALID_PHASE/)
    await asUser(guest)
    const snapshot = await call<{ strategyReady: Record<string, boolean> }>('public.online_snapshot($1)', [room])
    expect(JSON.stringify(snapshot)).not.toContain('HIGH_PRESS')
    expect((await db.query('select * from public.participant_private')).rows.map((row) => (row as { user_id: string }).user_id)).toEqual([])
    const both = await call<{ version: number }>('public.online_set_strategy($1,$2)', [room, 'WIDE_PLAY'])
    version = both.version
    expect(await call('public.online_reveal_strategies($1)', [room])).toEqual({ recruiter_one: 'HIGH_PRESS', recruiter_two: 'WIDE_PLAY' })
    await asUser(outsider)
    await expect(call('public.online_reveal_strategies($1)', [room])).rejects.toThrow(/NOT_ROOM_MEMBER/)
  })
  it('only accepts a result that uses the strategies that were really chosen', async () => {
    await asUser(host)
    const cheat = state({ phase: 'SIMULATING', record: [{}, {}, {}], strategies: { recruiter_one: 'LOW_BLOCK', recruiter_two: 'WIDE_PLAY' }, teams: { recruiter_one: { spent: 90 }, recruiter_two: { spent: 85 } } })
    await expect(call('public.online_submit_state($1,$2,$3,$4::jsonb)', [room, nextAction(), version, JSON.stringify(cheat)])).rejects.toThrow(/INVALID_PHASE/)
    const honest = await submit(host, { ...cheat, strategies: { recruiter_one: 'HIGH_PRESS', recruiter_two: 'WIDE_PLAY' } })
    expect((honest as unknown as { phase: string }).phase).toBe('SIMULATING')
  })
})

describe('online duel: giving up', () => {
  it('finishes the room, records who left and survives a retry', async () => {
    await asUser(guest)
    const id = nextAction()
    const result = await call<{ status: string; phase: string; state: { forfeitBy: string } }>('public.online_forfeit($1,$2)', [room, id])
    expect(result).toMatchObject({ status: 'FINISHED', phase: 'MATCH_RESULT', state: { forfeitBy: 'recruiter_two' } })
    expect((await call<{ status: string }>('public.online_forfeit($1,$2)', [room, id])).status).toBe('FINISHED')
    await asUser(host)
    await expect(call('public.online_forfeit($1,$2)', [room, nextAction()])).rejects.toThrow(/INVALID_PHASE/)
    await expect(call('public.online_submit_state($1,$2,$3,$4::jsonb)', [room, nextAction(), version + 1, JSON.stringify(state())])).rejects.toThrow()
  })
  it('keeps direct table writes closed for everyone', async () => {
    await asUser(host)
    await expect(db.exec("update public.game_state set state='{}'")).rejects.toThrow(/permission denied/)
    await expect(db.exec("update public.participant_private set strategy='\"X\"'")).rejects.toThrow(/permission denied/)
  })
})

describe('online duel: closing a room', () => {
  it('lets the host delete a room completely and tells everyone else it is gone', async () => {
    await asUser(host)
    const created = await call<{ roomId: string; inviteCode: string }>("public.online_create_room('Ana',$1)", [nextAction()])
    await asUser(guest)
    await call('public.online_join_room($1,$2,$3)', [created.inviteCode, 'Beto', nextAction()])
    await asUser(outsider)
    await expect(call('public.online_close_room($1,$2)', [created.roomId, nextAction()])).rejects.toThrow(/NOT_ROOM_MEMBER/)
    await asUser(host)
    expect(await call('public.online_close_room($1,$2)', [created.roomId, nextAction()])).toBeNull()
    await asUser(guest)
    await expect(call('public.online_snapshot($1)', [created.roomId])).rejects.toThrow(/NOT_ROOM_MEMBER/)
    await db.exec('reset role')
    expect((await db.query('select count(*)::int as n from public.rooms where id=$1', [created.roomId])).rows[0]).toEqual({ n: 0 })
    expect((await db.query("select count(*)::int as n from realtime.messages where payload->>'closed'='true'")).rows[0]).toEqual({ n: 1 })
  })
  it('lets a guest leave a lobby, but not walk out of a running match (that is a forfeit)', async () => {
    await asUser(host)
    const created = await call<{ roomId: string; inviteCode: string; version: number }>("public.online_create_room('Ana',$1)", [nextAction()])
    await asUser(guest)
    await call('public.online_join_room($1,$2,$3)', [created.inviteCode, 'Beto', nextAction()])
    expect(await call('public.online_close_room($1,$2)', [created.roomId, nextAction()])).toBeNull()
    await asUser(host)
    const after = await call<{ members: unknown[]; status: string }>('public.online_snapshot($1)', [created.roomId])
    expect(after.members).toHaveLength(1)
    expect(after.status).toBe('WAITING')
  })
})

describe('online duel: migration and room names', () => {
  it('can be run again without errors (every object is replaced, never duplicated)', async () => {
    await db.exec('reset role')
    await db.exec(readFileSync('supabase/migrations/202610190001_online_duel.sql', 'utf8'))
    await db.exec(readFileSync('supabase/migrations/202610190001_online_duel.sql', 'utf8'))
  })
  it('stores a room name, hands out a short code and lets the guest join with it', async () => {
    await asUser(host)
    const created = await call<{ roomId: string; roomName: string; shortCode: string; members: { name: string }[] }>("public.online_create_room('Ana',$1,'Sala del barrio')", [nextAction()])
    expect(created.roomName).toBe('Sala del barrio')
    expect(created.shortCode).toMatch(/^[0-9A-F]{6}$/)
    await asUser(guest)
    await expect(call('public.online_join_room($1,$2,$3)', ['zzzzzz', 'Beto', nextAction()])).rejects.toThrow(/INVALID_ACTION/)
    await expect(call('public.online_join_room($1,$2,$3)', ['ABCDEF', 'Beto', nextAction()])).rejects.toThrow(/ROOM_NOT_FOUND/)
    const joined = await call<{ members: { name: string }[]; roomName: string }>('public.online_join_room($1,$2,$3)', [created.shortCode.toLowerCase(), 'Beto', nextAction()])
    expect(joined.members.map((member) => member.name)).toEqual(['Ana', 'Beto'])
    expect(joined.roomName).toBe('Sala del barrio')
    await asUser(outsider)
    await expect(call('public.online_snapshot($1)', [created.roomId])).rejects.toThrow(/NOT_ROOM_MEMBER/)
    await asUser(host)
    await expect(call("public.online_create_room('Ana',$1,'name longer than twenty-four characters!!')", [nextAction()])).rejects.toThrow(/INVALID_ACTION/)
    const unnamed = await call<{ roomName: string | null }>("public.online_create_room('Ana',$1)", [nextAction()])
    expect(unnamed.roomName).toBeNull()
  })
})
