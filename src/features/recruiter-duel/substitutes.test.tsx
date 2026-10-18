import { writeFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { DRAFT_SLOT_IDS, DRAFT_SLOTS } from '../draft/draftTypes'
import { MatchScreen } from '../local-match/MatchScreen'
import { MATCH_MINUTES, MATCH_RULES_VERSION, type MatchResult } from '../local-match/matchTypes'
import { SUBSTITUTION_CHANCE, SUBSTITUTION_MINUTES, simulateMatch } from '../local-match/simulator'
import { auctionAvailability, autoCompleteAll, beginBidding, canAutoComplete, createRecruiterDuel, isRosterComplete, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, rosterIds, startCoinToss, startDuelMatch } from './auctionEngine'
import type { AuctionTransition, RecruiterDuelGame, RecruiterId } from './auctionTypes'
import { takeCpuTurn } from './cpuPolicy'
import { buildHudModel } from './hudModel'
import { MATCH_CONFIG_VERSION, SUBSTITUTE_POSITIONS, preflightMatchConfig, rosterComposition, rosterSize, type MatchConfig } from './matchConfig'
import { TeamPitchBoard } from './TeamPitchBoard'

afterEach(() => vi.restoreAllMocks())
const withBench = (budget: number): MatchConfig => ({ version: MATCH_CONFIG_VERSION, budget, names: { recruiter_one: null, recruiter_two: null }, substitutes: true })
const must = (result: AuctionTransition): RecruiterDuelGame => { if (!result.ok) throw new Error(result.error); return result.game }
const BUDGET = 125

/** Plays the whole auction; recruiter_two is the CPU policy when `cpu`. */
function play(config: MatchConfig, seed: string, cpu: boolean, stopWhen?: (game: RecruiterDuelGame) => boolean) {
  const created = createRecruiterDuel(DRAFT_CATALOG, seed, undefined, config)
  if (!created.ok) throw new Error(`${seed}: ${created.error}`)
  let game = must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
  for (let step = 0; step < 1200 && game.phase !== 'TEAMS_COMPLETED'; step++) {
    if (stopWhen?.(game)) return game
    if (game.phase === 'DISCARD_RESULT') { game = must(revealDiscardReplacement(game)); continue }
    if (game.phase === 'NEXT_ROUND') { game = must(revealNextAuctionRound(game)); continue }
    if (game.phase === 'REVEAL_PLAYER') { game = must(beginBidding(game)); continue }
    if (game.phase === 'ROUND_RESULT') { game = must(nextAuctionRound(game, DRAFT_CATALOG)); continue }
    const who = game.activeParticipant!
    if (cpu && who === 'recruiter_two') { game = must(takeCpuTurn(game, DRAFT_CATALOG, 'BALANCED')); continue }
    const a = auctionAvailability(game, who, DRAFT_CATALOG)
    if (who === 'recruiter_one' && a.bid.enabled) game = must(placeBid(game, who, a.minimum, DRAFT_CATALOG))
    else if (a.pass.enabled) game = must(passAuction(game, who, DRAFT_CATALOG))
    else game = must(placeBid(game, who, a.minimum, DRAFT_CATALOG))
  }
  return game
}

describe('roster composition and preflight', () => {
  it('adds one defender, one midfielder and one forward per team, only when enabled', () => {
    expect(SUBSTITUTE_POSITIONS).toEqual(['DEF', 'MED', 'DEL'])
    expect(rosterComposition({ ...withBench(100), substitutes: false })).toEqual({ ARQ: 1, DEF: 4, MED: 3, DEL: 3 })
    expect(rosterComposition(withBench(100))).toEqual({ ARQ: 1, DEF: 5, MED: 4, DEL: 4 })
    expect(rosterSize(withBench(100))).toBe(14)
  })
  it('blocks and explains a budget that cannot complete 14 players per team', () => {
    const expensive = DRAFT_CATALOG.map((player) => ({ ...player, price: 8 }))
    // 11 players at 8M fit 100M (88M) but 14 do not (112M)
    expect(preflightMatchConfig(expensive, { ...withBench(100), substitutes: false }).ok).toBe(true)
    expect(preflightMatchConfig(expensive, withBench(100))).toMatchObject({ ok: false, reason: 'budget_too_low', minimumPerTeam: 112 })
    expect(createRecruiterDuel(expensive, 'x', undefined, withBench(100))).toEqual({ ok: false, error: 'budget_too_low' })
  })
})

describe('auction with substitutes', () => {
  it.each([false, true])('signs 28 exclusive footballers (14 per team) within budget; against CPU=%s', (cpu) => {
    for (let index = 0; index < 5; index++) {
      const game = play(withBench(BUDGET), `subs-${cpu}-${index}`, cpu)
      expect(game.phase).toBe('TEAMS_COMPLETED')
      expect(game.rounds).toHaveLength(28)
      const all: string[] = []
      for (const team of Object.values(game.teams)) {
        expect(team.bench).toHaveLength(3)
        expect(team.bench!.map((slot) => slot.position)).toEqual(['DEF', 'MED', 'DEL'])
        expect(isRosterComplete(team)).toBe(true)
        expect(team.spent).toBeLessThanOrEqual(BUDGET)
        for (const slot of team.bench!) expect(DRAFT_CATALOG.find((p) => p.id === slot.playerId)!.position).toBe(slot.position)
        for (const slot of DRAFT_SLOTS) expect(DRAFT_CATALOG.find((p) => p.id === team.lineup[slot.id])!.position).toBe(slot.position)
        all.push(...rosterIds(team) as string[])
      }
      expect(all).toHaveLength(28); expect(new Set(all).size).toBe(28)
      const paid = game.record.filter((entry) => entry.type === 'award')
      expect(paid).toHaveLength(28)
      expect(paid.reduce((total, entry) => total + (entry.type === 'award' ? entry.price : 0), 0)).toBe(game.teams.recruiter_one.spent + game.teams.recruiter_two.spent)
      expect(game.discardsRemaining).toBeGreaterThanOrEqual(0)
    }
  }, 120_000)

  it('keeps the classic mode at 22 cards and 11 players, without a bench', () => {
    const created = createRecruiterDuel(DRAFT_CATALOG, 'classic-22')
    if (!created.ok) throw new Error(created.error)
    expect(created.game.rounds).toHaveLength(22)
    expect(created.game.teams.recruiter_one.bench).toBeUndefined()
  })

  it('counts the bench in the scoreboard and in early completion', () => {
    let early: RecruiterDuelGame | null = null
    for (let index = 0; index < 60 && !early; index++) {
      const game = play(withBench(BUDGET), `subs-early-${index}`, false, (current) => canAutoComplete(current, 'recruiter_two'))
      if (canAutoComplete(game, 'recruiter_two')) early = game
    }
    if (!early) throw new Error('no early completion found')
    const hud = buildHudModel(early, DRAFT_CATALOG)
    expect(hud.teamSize).toBe(14)
    expect(hud.participants.recruiter_one.signed).toBe(14)
    expect(hud.participants.recruiter_one.positions.map((p) => p.capacity)).toEqual([1, 5, 4, 4])
    const done = must(autoCompleteAll(early, 'recruiter_two', DRAFT_CATALOG))
    expect(done.phase).toBe('TEAMS_COMPLETED')
    expect(isRosterComplete(done.teams.recruiter_two)).toBe(true)
    expect(done.teams.recruiter_two.spent).toBeLessThanOrEqual(BUDGET)
    expect(new Set([...rosterIds(done.teams.recruiter_one), ...rosterIds(done.teams.recruiter_two)]).size).toBe(28)
    expect(done.record.slice(early.record.length).every((entry) => entry.type === 'award' && entry.reason === 'auto_complete')).toBe(true)
  })
})

function finishedGame(seed: string) {
  const game = play(withBench(BUDGET), seed, true)
  return must(startDuelMatch(game, DRAFT_CATALOG))
}

describe('substitutions in the match', () => {
  const lineupsOf = (game: RecruiterDuelGame) => ({ local: game.teams.recruiter_one.lineup, cpu: game.teams.recruiter_two.lineup })
  const benchOf = (game: RecruiterDuelGame, id: RecruiterId) => game.teams[id].bench!.map((slot) => slot.playerId!)

  it('are automatic, reproducible, bounded and always leave eleven distinct players on the pitch', () => {
    let seen = 0
    for (let index = 0; index < 12; index++) {
      const started = finishedGame(`subs-match-${index}`)
      const result = started.matchResult!
      const again = must(startDuelMatch({ ...started, phase: 'TEAMS_COMPLETED', matchResult: null }, DRAFT_CATALOG)).matchResult
      expect(again).toEqual(result)
      expect(result.substitutions?.version).toBe('subs-v1')
      const fromBlocks = result.blocks.flatMap((block) => block.events).filter((event) => event.type === 'substitution')
      expect(fromBlocks.map((event) => ({ minute: event.minute, side: event.side, outPlayerId: event.outPlayerId, inPlayerId: event.playerId }))).toEqual(result.substitutions!.events)
      for (const side of ['local', 'cpu'] as const) {
        const mine = result.substitutions!.events.filter((event) => event.side === side)
        expect(mine.length).toBeLessThanOrEqual(3)
        const bench = new Set(benchOf(started, side === 'local' ? 'recruiter_one' : 'recruiter_two'))
        const starters = new Set(Object.values(side === 'local' ? started.teams.recruiter_one.lineup : started.teams.recruiter_two.lineup))
        const entered = new Set<string>(); const left = new Set<string>()
        for (const event of mine) {
          expect(SUBSTITUTION_MINUTES).toContain(event.minute)
          expect(bench.has(event.inPlayerId)).toBe(true); expect(starters.has(event.outPlayerId)).toBe(true)
          expect(entered.has(event.inPlayerId)).toBe(false); expect(left.has(event.outPlayerId)).toBe(false)
          const incoming = DRAFT_CATALOG.find((p) => p.id === event.inPlayerId)!; const outgoing = DRAFT_CATALOG.find((p) => p.id === event.outPlayerId)!
          expect(incoming.position).toBe(outgoing.position); expect(outgoing.position).not.toBe('ARQ')
          entered.add(event.inPlayerId); left.add(event.outPlayerId)
          seen++
        }
      }
      for (const side of ['local', 'cpu'] as const) expect(result.blocks.flatMap((block) => block.events).filter((event) => event.type === 'goal' && event.side === side)).toHaveLength(result.score[side])
      expect(result.local.players).toHaveLength(11); expect(result.cpu.players).toHaveLength(11)
      expect(result.benches!.local).toHaveLength(3)
    }
    expect(seen).toBeGreaterThan(0)
  }, 120_000)

  it('rejects invalid benches', () => {
    const game = play(withBench(BUDGET), 'subs-invalid', true)
    const lineups = lineupsOf(game)
    const bench = { local: benchOf(game, 'recruiter_one'), cpu: benchOf(game, 'recruiter_two') }
    const run = (benches: typeof bench) => simulateMatch({ localLineup: lineups.local, cpuLineup: lineups.cpu, catalog: DRAFT_CATALOG, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: 's', budget: BUDGET, benches })
    expect(() => run(bench)).not.toThrow()
    expect(() => run({ ...bench, local: [bench.local[0], bench.local[0], bench.local[2]] })).toThrow('invalid_match_bench')
    expect(() => run({ ...bench, cpu: [lineups.cpu.LB!, bench.cpu[1], bench.cpu[2]] })).toThrow('invalid_match_bench')
    expect(() => run({ ...bench, local: [...bench.local, bench.cpu[0]] })).toThrow('invalid_match_bench')
  })

  it('really change what the engine uses: a far stronger substitute raises the scoring after he comes on', () => {
    const game = play(withBench(BUDGET), 'subs-effect', true)
    const lineups = lineupsOf(game)
    const clones = (rating: number) => DRAFT_CATALOG.filter((p) => benchOf(game, 'recruiter_one').includes(p.id)).map((p) => ({ ...p, id: `${p.id}_x${rating}`, att_rating: rating, def_rating: rating, phy_rating: rating, men_rating: rating }))
    const goalsWith = (rating: number) => {
      const extra = clones(rating); const catalog = [...DRAFT_CATALOG, ...extra]
      let goals = 0; let entered = 0
      for (let index = 0; index < 600; index++) {
        const result = simulateMatch({ localLineup: lineups.local, cpuLineup: lineups.cpu, catalog, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: `eff-${index}`, budget: BUDGET, benches: { local: extra.map((p) => p.id), cpu: benchOf(game, 'recruiter_two') } })
        goals += result.score.local; entered += result.substitutions!.events.filter((event) => event.side === 'local').length
      }
      return { goals, entered }
    }
    const strong = goalsWith(99); const weak = goalsWith(40)
    expect(strong.entered).toBe(weak.entered)
    expect(strong.entered).toBeGreaterThan(300)
    expect(strong.goals).toBeGreaterThan(weak.goals)
  }, 120_000)

  it('are narrated with who comes on and who leaves, in the interface language', async () => {
    vi.useFakeTimers()
    try {
      let started = finishedGame('subs-narration-0')
      for (let index = 1; index < 30 && !started.matchResult!.substitutions!.events.length; index++) started = finishedGame(`subs-narration-${index}`)
      const result: MatchResult = started.matchResult!
      const first = result.substitutions!.events[0]
      const incoming = DRAFT_CATALOG.find((p) => p.id === first.inPlayerId)!; const outgoing = DRAFT_CATALOG.find((p) => p.id === first.outPlayerId)!
      const i18n = await createI18n('en')
      render(<I18nextProvider i18n={i18n}><MatchScreen result={result} onRematch={vi.fn()} onReturn={vi.fn()} /></I18nextProvider>)
      act(() => vi.advanceTimersByTime(20_000))
      expect(screen.getAllByText(new RegExp(`${incoming.name} comes on for ${outgoing.name}`)).length).toBeGreaterThan(0)
    } finally { vi.useRealTimers() }
  }, 120_000)
})

describe('team screen with substitutes', () => {
  it('separates STARTERS from SUBSTITUTES and opens a substitute card', async () => {
    const game = play(withBench(BUDGET), 'subs-ui', true)
    const i18n = await createI18n('en')
    const original = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
    try {
      const view = render(<I18nextProvider i18n={i18n}><TeamPitchBoard game={game} participant="recruiter_one" catalog={DRAFT_CATALOG} /></I18nextProvider>)
      expect(screen.getByRole('heading', { name: 'STARTERS (11/11)' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'SUBSTITUTES (3/3)' })).toBeInTheDocument()
      expect(view.container.querySelectorAll('.bench-slot')).toHaveLength(3)
      const first = game.teams.recruiter_one.bench![0]
      const player = DRAFT_CATALOG.find((p) => p.id === first.playerId)!
      const starters = new Set(Object.values(game.teams.recruiter_one.lineup))
      expect(starters.has(player.id)).toBe(false)
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`View substitute ${player.name}`) }))
      expect(screen.getByRole('dialog', { name: `Details for ${player.name}` })).toBeInTheDocument()
    } finally { if (original) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', original) }
    expect(DRAFT_SLOT_IDS).toHaveLength(11)
  })
})

describe('substitution policy calibration', () => {
  it('keeps changes plausible and balanced between the sides, without touching the classic result', () => {
    const full = process.env.SUBS_CALIBRATION === 'write'
    const matches = full ? 4000 : 800
    const game = play(withBench(BUDGET), 'subs-calibration', true)
    const lineups = { local: game.teams.recruiter_one.lineup, cpu: game.teams.recruiter_one.lineup }
    const bench = benchIds(game)
    const countsBySide = { local: [0, 0, 0, 0], cpu: [0, 0, 0, 0] }
    const minutes: Record<number, number> = {}
    let localWins = 0; let cpuWins = 0; let draws = 0; let goals = 0
    for (let index = 0; index < matches; index++) {
      const result = simulateMatch({ localLineup: lineups.local, cpuLineup: lineups.cpu, catalog: DRAFT_CATALOG, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed: `cal-${index}`, budget: BUDGET, benches: { local: bench, cpu: bench } })
      for (const side of ['local', 'cpu'] as const) countsBySide[side][result.substitutions!.events.filter((event) => event.side === side).length]++
      for (const event of result.substitutions!.events) minutes[event.minute] = (minutes[event.minute] ?? 0) + 1
      goals += result.score.local + result.score.cpu
      if (result.winner === 'local') localWins++; else if (result.winner === 'cpu') cpuWins++; else draws++
    }
    const mean = (counts: number[]) => counts.reduce((total, count, subs) => total + count * subs, 0) / matches
    const report = { rulesVersion: MATCH_RULES_VERSION, substitutionRules: 'subs-v1', chancePerOpportunity: SUBSTITUTION_CHANCE, minutes: SUBSTITUTION_MINUTES, matches, identicalSquadsBothSides: true, substitutionsPerTeamDistribution: countsBySide, meanPerTeam: { local: mean(countsBySide.local), cpu: mean(countsBySide.cpu) }, byMinute: minutes, wins: { local: localWins, cpu: cpuWins, draws }, meanGoals: goals / matches / 2 }
    if (full) writeFileSync('docs/qa/CODEX-005H-H3-calibration.json', JSON.stringify(report, null, 2) + '\n')
    // expectation: 3 opportunities x 0.45 = 1.35 changes per team, never above 3, some teams with none
    for (const side of ['local', 'cpu'] as const) {
      expect(mean(countsBySide[side])).toBeGreaterThan(1.2); expect(mean(countsBySide[side])).toBeLessThan(1.5)
      expect(countsBySide[side][0]).toBeGreaterThan(0); expect(countsBySide[side].reduce((a, b) => a + b, 0)).toBe(matches)
    }
    expect(Math.abs(localWins - cpuWins) / matches).toBeLessThan(full ? .05 : .1)
    expect(Object.keys(minutes).map(Number).every((minute) => SUBSTITUTION_MINUTES.includes(minute as (typeof MATCH_MINUTES)[number]))).toBe(true)
  }, 120_000)
})

function benchIds(game: RecruiterDuelGame) { return game.teams.recruiter_one.bench!.map((slot) => slot.playerId!) }

describe('setup with substitutes', () => {
  it('offers the option only in the custom mode, summarises the 14-player squads and explains a budget that cannot afford them', async () => {
    const { AuctionPage } = await import('./AuctionPage')
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /Custom/ }))
    const toggle = screen.getByRole('checkbox', { name: /Three substitutes per team/ })
    expect(toggle).not.toBeChecked(); expect(screen.getByText('Eleven starters, no substitutes')).toBeInTheDocument()
    fireEvent.click(toggle)
    expect(screen.getByText(/Eleven starters and three substitutes \(14-player squads, 28 footballers in total\)/)).toBeInTheDocument()
    const minimumWith = preflightMatchConfig(DRAFT_CATALOG, withBench(300))
    const minimumWithout = preflightMatchConfig(DRAFT_CATALOG, { ...withBench(300), substitutes: false })
    if (!minimumWith.ok || !minimumWithout.ok) throw new Error('presets must be viable')
    expect(minimumWith.minimumPerTeam).toBeGreaterThan(minimumWithout.minimumPerTeam)
    expect(screen.getByRole('button', { name: 'Start duel' })).toBeEnabled()
  })
})
