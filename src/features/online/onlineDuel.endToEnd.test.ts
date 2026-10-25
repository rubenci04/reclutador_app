// @vitest-environment node
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { auctionAvailability, autoBuySubstitutes, beginBidding, completeDuelMatch, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startDuelMatch } from '../recruiter-duel/auctionEngine'
import type { AuctionTransition, RecruiterDuelGame, RecruiterId } from '../recruiter-duel/auctionTypes'
import { autoChooseCoach } from '../recruiter-duel/coachHiring'
import { buildInitialDuel, parseDuel, slimDuel } from './onlineDuel'
import { MIGRATIONS } from './sqlMigrations'
import { duelCatalog, verifyDuelState } from './verifyDuelState'

/**
 * Two real identities against the real SQL (PGlite with every migration, in order). The browsers' part is played with the
 * same engine functions the pages use; nothing waits for real time: deadline_at is moved in the test.
 */
const db = new PGlite()
const host = '00000000-0000-4000-8000-0000000000c1'
const guest = '00000000-0000-4000-8000-0000000000c2'
const user: Record<RecruiterId, string> = { recruiter_one: host, recruiter_two: guest }
const act = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`
let counter = 0
const next = () => act(++counter)

async function as(id: string) {
  await db.exec('reset role')
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id])
  await db.exec('set role authenticated')
}
async function call<T = unknown>(sql: string, params: unknown[] = []): Promise<T> { return (await db.query<{ r: T }>(`select ${sql} as r`, params)).rows[0].r }
const must = (value: AuctionTransition): RecruiterDuelGame => { if (!value.ok) throw new Error(value.error); return value.game }

interface Snapshot { version: number; status: string; phase: string; deadlineAt: string | null; serverNow?: string; state: Record<string, unknown> }
interface Table { roomId: string; version: number; catalog: ReturnType<typeof duelCatalog> }

const snapshotAs = async (table: Table, who: string) => { await as(who); return call<Snapshot>('public.online_snapshot($1)', [table.roomId]) }
const gameAs = async (table: Table, who: string) => parseDuel((await snapshotAs(table, who)).state)!
async function submit(table: Table, who: string, game: RecruiterDuelGame) {
  await as(who)
  const snapshot = await call<Snapshot>('public.online_submit_state($1,$2,$3,$4::jsonb)', [table.roomId, next(), table.version, JSON.stringify(slimDuel(game))])
  table.version = snapshot.version
  return snapshot
}
/** Both browsers receive the state and check it with the rules engine: the honest flow must raise no warning. */
async function bothAgree(table: Table) {
  for (const who of [host, guest]) expect(verifyDuelState(await gameAs(table, who))).toMatchObject({ ok: true })
}

async function openRoom(seed: string): Promise<Table> {
  await as(host)
  const created = await call<{ roomId: string; inviteCode: string; shortCode: string }>("public.online_create_room('Ana',$1,'Sala e2e')", [next()])
  await as(guest)
  let version = (await call<{ version: number; members: unknown[] }>('public.online_join_room($1,$2,$3)', [created.shortCode.toLowerCase(), 'Beto', next()])).version
  for (const who of [host, guest]) { await as(who); version = (await call<{ version: number }>("public.online_command($1,$2,$3,'SET_READY','{\"ready\":true}'::jsonb)", [created.roomId, next(), version])).version }
  const initial = buildInitialDuel({ host: 'Ana', guest: 'Beto' }, 'GLOBAL_CLASSIC', 'GLOBAL_CLASSIC', seed)
  await as(host)
  const started = await call<Snapshot>('public.online_start_duel($1,$2,$3,$4::jsonb)', [created.roomId, next(), version, JSON.stringify(initial)])
  expect(started).toMatchObject({ status: 'IN_PROGRESS' })
  const table: Table = { roomId: created.roomId, version: started.version, catalog: duelCatalog(initial) }
  // The server tosses the coin; the host only calls a side.
  await as(host)
  const flipped = await call<Snapshot>('public.online_flip_coin($1,$2,$3,$4)', [created.roomId, next(), table.version, 'heads'])
  table.version = flipped.version
  expect(flipped.state).toMatchObject({ phase: 'COIN_TOSS', coinCall: 'heads' })
  expect(['heads', 'tails']).toContain(flipped.state.coinResult)
  return table
}

/** Plays like the pages do (each action by the browser that owns it) until `stop` says so. */
async function advance(table: Table, stop: (game: RecruiterDuelGame) => boolean, verify: boolean) {
  const grab: Record<RecruiterId, number> = { recruiter_one: 3, recruiter_two: 1 }
  for (let step = 0; step < 1500; step++) {
    const game = await gameAs(table, host)
    if (stop(game)) return game
    const catalog = table.catalog
    let moved: RecruiterDuelGame; let who = step % 2 ? guest : host
    if (game.phase === 'COIN_TOSS') moved = must(revealCoinToss(game))
    else if (game.phase === 'REVEAL_PLAYER') moved = must(beginBidding(game))
    else if (game.phase === 'DISCARD_RESULT') moved = must(revealDiscardReplacement(game))
    else if (game.phase === 'NEXT_ROUND') moved = must(revealNextAuctionRound(game))
    else if (game.phase === 'ROUND_RESULT') moved = must(nextAuctionRound(game, catalog))
    else if (game.phase === 'BIDDING') {
      const side = game.activeParticipant!; who = user[side]
      const availability = auctionAvailability(game, side, catalog)
      const price = catalog.find((player) => player.id === game.rounds[game.roundIndex].playerId)!.price
      moved = availability.bid.enabled && availability.minimum <= price + grab[side] ? must(placeBid(game, side, availability.minimum, catalog)) : must(passAuction(game, side, catalog))
    } else throw new Error(`unexpected phase ${game.phase}`)
    await submit(table, who, moved)
    if (verify) await bothAgree(table)
  }
  throw new Error('the game did not reach the expected point')
}

/** Each person hires a coach and buys substitutes for their own team, then chooses a secret strategy. */
async function arrange(table: Table, strategies: boolean) {
  const catalog = table.catalog
  for (const side of ['recruiter_one', 'recruiter_two'] as const) {
    const current = await gameAs(table, user[side])
    await submit(table, user[side], autoBuySubstitutes(autoChooseCoach(current, side), side, catalog))
  }
  if (!strategies) return
  const picks: Record<RecruiterId, string> = { recruiter_one: 'HIGH_PRESS', recruiter_two: 'LOW_BLOCK' }
  for (const side of ['recruiter_one', 'recruiter_two'] as const) {
    await as(user[side])
    const ready = await call<{ version: number }>('public.online_set_strategy($1,$2)', [table.roomId, picks[side]])
    table.version = ready.version
  }
}
const backdate = async (table: Table, seconds: number) => { await db.exec('reset role'); await db.query('update public.game_state set deadline_at = now() - make_interval(secs => $2) where room_id=$1', [table.roomId, seconds]) }
const claim = (table: Table, who: string) => as(who).then(() => call<Snapshot>('public.online_claim_timeout($1,$2)', [table.roomId, next()]))

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    insert into auth.users values ('${host}'),('${guest}');`)
  await db.exec(readFileSync(`supabase/migrations/${MIGRATIONS[0]}.sql`, 'utf8'))
  await db.exec(`create schema realtime;
    create table realtime.messages(topic text, extension text, payload jsonb);
    alter table realtime.messages enable row level security;
    grant usage on schema realtime to authenticated;
    grant select,insert on realtime.messages to authenticated;
    create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic',true) $$;
    create function realtime.send(payload jsonb,event text,topic text,private boolean) returns void language sql as $$ insert into realtime.messages values(topic,'broadcast',payload) $$;`)
  for (const name of MIGRATIONS.slice(1)) await db.exec(readFileSync(`supabase/migrations/${name}.sql`, 'utf8'))
}, 60000)
afterAll(async () => { await db.close() })

describe('online duel end to end against the real migrations', () => {
  it('plays a whole honest game and both clients verify every state without a warning', async () => {
    const table = await openRoom('e2e-honest')
    await bothAgree(table)
    const squads = await advance(table, (game) => game.phase === 'TEAMS_COMPLETED', true)
    expect(squads.record.filter((entry) => entry.type === 'award')).toHaveLength(squads.rounds.length)
    // The deadline for choosing a strategy starts when the squads are ready.
    expect((await snapshotAs(table, guest)).deadlineAt).not.toBeNull()
    await arrange(table, true)
    await bothAgree(table)
    // The secret strategies stay secret until both exist; then either browser starts the same deterministic match.
    await as(guest)
    const strategies = await call<Record<RecruiterId, never>>('public.online_reveal_strategies($1)', [table.roomId])
    expect(strategies).toEqual({ recruiter_one: 'HIGH_PRESS', recruiter_two: 'LOW_BLOCK' })
    const ready = await gameAs(table, guest)
    const simulating = await submit(table, guest, must(startDuelMatch(ready, table.catalog, strategies, true)))
    expect(simulating.phase).toBe('SIMULATING')
    await bothAgree(table)
    const finished = await submit(table, host, must(completeDuelMatch((await gameAs(table, host)))))
    expect(finished).toMatchObject({ phase: 'MATCH_RESULT', status: 'IN_PROGRESS', deadlineAt: null })
    await bothAgree(table)
    const seenByHost = await gameAs(table, host); const seenByGuest = await gameAs(table, guest)
    expect(seenByHost.matchResult).not.toBeNull()
    expect(seenByHost.matchResult).toEqual(seenByGuest.matchResult)
  }, 240000)

  it('catches an altered price, rejects a changed coin and rejects playing out of turn', async () => {
    const table = await openRoom('e2e-cheat-1')
    // Out of turn: the guest tries to bid while it is the host\'s turn.
    const bidding = await advance(table, (game) => game.phase === 'BIDDING', false)
    const waiting: RecruiterId = bidding.activeParticipant === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one'
    await as(user[waiting])
    await expect(call('public.online_submit_state($1,$2,$3,$4::jsonb)', [table.roomId, next(), table.version, JSON.stringify(slimDuel({ ...bidding, activeParticipant: waiting }))])).rejects.toThrow(/NOT_YOUR_TURN/)
    // The coin cannot be rewritten once the server tossed it.
    await as(host)
    const other = bidding.coinResult === 'heads' ? 'tails' : 'heads'
    await expect(call('public.online_submit_state($1,$2,$3,$4::jsonb)', [table.roomId, next(), table.version, JSON.stringify(slimDuel({ ...bidding, coinResult: other }))])).rejects.toThrow(/INVALID_ACTION/)
    // A price altered after a round is accepted by the server (it does not re-run the rules) but the rival\'s browser flags it.
    const awarded = await advance(table, (game) => game.phase === 'ROUND_RESULT', false)
    await bothAgree(table)
    const index = awarded.record.findIndex((entry) => entry.type === 'award')
    const award = awarded.record[index] as Extract<RecruiterDuelGame['record'][number], { type: 'award' }>
    const cheat = { ...awarded, record: awarded.record.map((entry, at) => at === index ? { ...entry, price: Math.max(1, award.price - 2) } : entry) } as RecruiterDuelGame
    await submit(table, host, cheat)
    expect(verifyDuelState(await gameAs(table, guest))).toEqual({ ok: false, reason: 'replay' })
  }, 240000)

  it('catches an altered match result even when the server accepts the state', async () => {
    const table = await openRoom('e2e-cheat-2')
    await advance(table, (game) => game.phase === 'TEAMS_COMPLETED', false)
    await arrange(table, true)
    await as(host)
    const strategies = await call<Record<RecruiterId, never>>('public.online_reveal_strategies($1)', [table.roomId])
    const ready = await gameAs(table, host)
    const honest = must(startDuelMatch(ready, table.catalog, strategies, true))
    const result = honest.matchResult!
    const forged = { ...honest, matchResult: { ...result, score: { local: result.score.local + 3, cpu: result.score.cpu } } }
    await submit(table, host, forged)
    expect(verifyDuelState(await gameAs(table, guest))).toEqual({ ok: false, reason: 'match_result' })
  }, 240000)

  it('lets the waiting player claim the win only after the deadline, in bidding and while strategies are pending', async () => {
    const table = await openRoom('e2e-timeout')
    const bidding = await advance(table, (game) => game.phase === 'BIDDING', false)
    const late: RecruiterId = bidding.activeParticipant!
    const waiting: RecruiterId = late === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one'
    expect((await snapshotAs(table, user[waiting])).deadlineAt).not.toBeNull()
    await expect(claim(table, user[waiting])).rejects.toThrow(/INVALID_PHASE/)
    await backdate(table, 200)
    await expect(claim(table, user[late])).rejects.toThrow(/NOT_YOUR_TURN/)
    const done = await claim(table, user[waiting])
    expect(done).toMatchObject({ status: 'FINISHED', state: { forfeitBy: late, timedOut: true } })

    // Strategies: only someone who already chose can claim, and only once the 5 minutes passed.
    const second = await openRoom('e2e-timeout-2')
    await advance(second, (game) => game.phase === 'TEAMS_COMPLETED', false)
    await arrange(second, false)
    await as(guest)
    second.version = (await call<{ version: number }>('public.online_set_strategy($1,$2)', [second.roomId, 'WIDE_PLAY'])).version
    await expect(claim(second, guest)).rejects.toThrow(/INVALID_PHASE/)
    await backdate(second, 400)
    await expect(claim(second, host)).rejects.toThrow(/NOT_YOUR_TURN/)
    expect(await claim(second, guest)).toMatchObject({ status: 'FINISHED', state: { forfeitBy: 'recruiter_one' } })
  }, 240000)
})
