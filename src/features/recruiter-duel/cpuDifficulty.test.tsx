import { writeFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { COACH_CATALOG } from '../coaches/coachCatalog'
import { teamPower } from './teamPower'
import { coachEffect, coachReserveFor } from '../coaches/coachRules'
import { CoachMarket } from './CoachMarket'
import { MatchSetupPanel } from './MatchSetupPanel'
import { autoChooseCoach, coachMarket, coachOffers } from './coachHiring'
import { CLASSIC_CONFIG, DEFAULT_SETUP_DRAFT, parseMatchConfig, preflightMatchConfig } from './matchConfig'
import { CPU_DIFFICULTIES, CPU_STRATEGIES, privateValuation, takeCpuTurn, type CpuDifficulty, type CpuStrategy } from './cpuPolicy'
import { auctionAvailability, beginBidding, createRecruiterDuel, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss, startDuelMatch } from './auctionEngine'
import type { AuctionTransition, RecruiterDuelGame } from './auctionTypes'

const config = { ...CLASSIC_CONFIG, coaches: true, coachReserve: 8 }
const must = (value: AuctionTransition): RecruiterDuelGame => { if (!value.ok) throw new Error(value.error); return value.game }
function play(seed: string, strategy: CpuStrategy, difficulty: CpuDifficulty) {
  const created = createRecruiterDuel(DRAFT_CATALOG, seed, undefined, config)
  if (!created.ok) throw new Error(created.error)
  let game = must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
  for (let step = 0; step < 1500 && game.phase !== 'TEAMS_COMPLETED'; step++) {
    if (game.phase === 'DISCARD_RESULT') { game = must(revealDiscardReplacement(game)); continue }
    if (game.phase === 'NEXT_ROUND') { game = must(revealNextAuctionRound(game)); continue }
    if (game.phase === 'REVEAL_PLAYER') { game = must(beginBidding(game)); continue }
    if (game.phase === 'ROUND_RESULT') { game = must(nextAuctionRound(game, DRAFT_CATALOG)); continue }
    if (game.activeParticipant === 'recruiter_two') { game = must(takeCpuTurn(game, DRAFT_CATALOG, strategy, difficulty)); continue }
    const availability = auctionAvailability(game, 'recruiter_one', DRAFT_CATALOG)
    const player = DRAFT_CATALOG.find((record) => record.id === game.rounds[game.roundIndex].playerId)!
    game = availability.bid.enabled && availability.minimum <= player.price + 2 ? must(placeBid(game, 'recruiter_one', availability.minimum, DRAFT_CATALOG)) : must(passAuction(game, 'recruiter_one', DRAFT_CATALOG))
  }
  expect(game.phase).toBe('TEAMS_COMPLETED')
  return game
}

describe('coach reserve and affinity', () => {
  it('preserves legacy reserve, validates the new range and defaults new setups to 8M', () => {
    expect(coachReserveFor({ coaches: true })).toBe(1)
    expect(coachReserveFor(CLASSIC_CONFIG)).toBe(0)
    expect(DEFAULT_SETUP_DRAFT.coachReserve).toBe(8)
    for (const value of [0, 9, -1, 2.5, NaN, '8']) expect(parseMatchConfig({ ...config, coachReserve: value })).toBeNull()
    expect(parseMatchConfig(config)).toEqual(config)
    expect(parseMatchConfig({ ...config, coaches: false })).toBeNull()
    expect(preflightMatchConfig(DRAFT_CATALOG, config).ok).toBe(true)
    const fixedPrices = DRAFT_CATALOG.map((player) => ({ ...player, price: 5 }))
    expect(preflightMatchConfig(fixedPrices, { ...CLASSIC_CONFIG, budget: 60 }).ok).toBe(true)
    const minimum = preflightMatchConfig(fixedPrices, { ...config, budget: 60 })
    expect(minimum.ok).toBe(false)
  })
  it('offers three distinct choices with a top coach and affordable starter contract', () => {
    for (let seed = 0; seed < 100; seed++) {
      const offers = coachOffers(`reserve-${seed}`, 8)
      for (const choices of Object.values(offers)) expect(new Set(choices.map((coach) => coach.id)).size).toBe(3)
      for (const choices of Object.values(offers)) {
        expect(choices).toHaveLength(3)
        expect(choices.some((coach) => coach.tier === 'S')).toBe(true)
        expect(choices.some((coach) => coach.price === 1)).toBe(true)
      }
      expect(coachOffers(`reserve-${seed}`)).toEqual(coachOffers(`reserve-${seed}`, 1))
    }
    expect(COACH_CATALOG).toHaveLength(100)
    expect(COACH_CATALOG.filter((coach) => coach.status === 'LEGEND')).toHaveLength(30)
    expect(COACH_CATALOG.filter((coach) => coach.nationality === 'ARG')).toHaveLength(54)
  })
  it('rewards coach/tactic affinity within a 3-point ceiling without nationality or era advantages', () => {
    const coach = { tier: 'S' as const, focus: 'ATTACK' as const }
    expect(coachEffect(coach, 'WIDE_PLAY').attack).toBeGreaterThan(coachEffect(coach, 'LOW_BLOCK').attack)
    expect(coachEffect(coach, 'WIDE_PLAY').attack).toBeLessThanOrEqual(3)
    for (const candidate of COACH_CATALOG) for (const tactic of ['NEUTRAL', 'MIDFIELD_CONTROL', 'WIDE_PLAY', 'COUNTER_ATTACK', 'HIGH_PRESS', 'LOW_BLOCK'] as const) {
      expect(Object.values(coachEffect(candidate, tactic)).every((value) => value >= 0 && value <= 3)).toBe(true)
    }
  })
})

it('calibrates all 9 bidding profiles over 270 complete duels with the 8M reserve', () => {
  const report = []
  for (const difficulty of CPU_DIFFICULTIES) for (const strategy of CPU_STRATEGIES) {
    const bucket = { difficulty, strategy, games: 30, bids: 0, passes: 0, cpuPlayerSpent: 0, cpuMeanRating: 0, wins: 0, draws: 0, losses: 0 }
    for (let index = 0; index < bucket.games; index++) {
      const game = play(`difficulty-${index}`, strategy, difficulty)
      const all = Object.values(game.teams).flatMap((team) => Object.values(team.lineup))
      expect(new Set(all).size).toBe(22)
      for (const team of Object.values(game.teams)) expect(team.spent).toBeLessThanOrEqual(92)
      for (const decision of game.record) if (decision.type === 'cpu_decision') {
        expect(decision.difficulty).toBe(difficulty)
        if (decision.action === 'bid') { bucket.bids++; expect(decision.amount).toBeLessThanOrEqual(decision.privateMaximum) } else bucket.passes++
      }
      const hired = autoChooseCoach(autoChooseCoach(game, 'recruiter_one'), 'recruiter_two')
      expect(Object.values(hired.teams).every((team) => team.spent <= 100 && team.coachId)).toBe(true)
      const result = must(startDuelMatch(hired, DRAFT_CATALOG)).matchResult!
      const power = teamPower(hired, 'recruiter_two', DRAFT_CATALOG)!
      for (const sector of ['attack', 'defense', 'midfield', 'global'] as const) expect(result.effectiveStrengths?.cpu[sector]).toBeCloseTo(power.total[sector], 5)
      bucket.cpuPlayerSpent += game.teams.recruiter_two.spent
      bucket.cpuMeanRating += result.cpu.averageRating
      bucket[result.winner === 'cpu' ? 'wins' : result.winner === 'local' ? 'losses' : 'draws']++
    }
    bucket.cpuPlayerSpent /= bucket.games; bucket.cpuMeanRating /= bucket.games
    report.push(bucket)
  }
  writeFileSync('docs/qa/SIMULATION-COACHES-cpu.json', JSON.stringify({ games: 270, coachReserve: 8, humanPolicy: 'base_plus_2', report }, null, 2) + '\n')
}, 30000)

it('keeps normal legacy valuations and reduces hard scouting noise while respecting the usable auction budget', () => {
  const created = createRecruiterDuel(DRAFT_CATALOG, 'valuation')
  if (!created.ok) throw new Error(created.error)
  const context = { seed: 'valuation', roundIndex: 0, player: DRAFT_CATALOG[0], team: created.game.teams.recruiter_two, publicCatalog: DRAFT_CATALOG, acquiredIds: [], budget: 92 }
  expect(privateValuation(context, 'BALANCED')).toBe(privateValuation({ ...context, difficulty: 'NORMAL' }, 'BALANCED'))
  const sums = { EASY: 0, NORMAL: 0, HARD: 0 }
  for (let index = 0; index < 200; index++) for (const difficulty of CPU_DIFFICULTIES) sums[difficulty] += privateValuation({ ...context, difficulty, seed: `valuation-${index}` }, 'BALANCED')
  expect(sums.HARD).toBeGreaterThan(sums.EASY)
})

it('stores coach affinity with the actual chosen tactic in the resulting match', () => {
  const game = play('affinity-integration', 'BALANCED', 'HARD')
  const hired = autoChooseCoach(game, 'recruiter_two')
  const coach = COACH_CATALOG.find((candidate) => candidate.id === hired.teams.recruiter_two.coachId)!
  const played = must(startDuelMatch(hired, DRAFT_CATALOG, { recruiter_one: 'NEUTRAL', recruiter_two: 'MIDFIELD_CONTROL' }))
  expect(played.matchResult?.coaches?.cpu).toEqual({ id: coach.id, ...coachEffect(coach, 'MIDFIELD_CONTROL') })
})

it.each(['es-AR', 'en', 'pt-BR'] as const)('shows coach cards, reference age/team and the reserve control in %s', async (language) => {
  const i18n = await createI18n(language)
  const onChange = vi.fn()
  const setup = render(<I18nextProvider i18n={i18n}><MatchSetupPanel draft={DEFAULT_SETUP_DRAFT} onChange={onChange} versusCpu={false} preflight={{ ok: true, minimumPerTeam: 60 }} /></I18nextProvider>)
  const reserve = screen.getByLabelText(i18n.t('coach.reserveLabel'), { exact: false })
  expect(reserve).toHaveValue('8')
  fireEvent.change(reserve, { target: { value: '4' } })
  expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SETUP_DRAFT, coachReserve: 4 })
  setup.unmount()
  const game = play('card-ui', 'BALANCED', 'NORMAL')
  const onHire = vi.fn()
  render(<I18nextProvider i18n={i18n}><CoachMarket game={game} participant="recruiter_one" name="Test" locked={false} onHire={onHire} onDecline={vi.fn()} /></I18nextProvider>)
  const coach = coachMarket(game, 'recruiter_one')[0]
  const button = screen.getByRole('button', { name: new RegExp(`${coach.name} ${coach.surname}`) })
  expect(button).toHaveTextContent(coach.team)
  expect(button).toHaveTextContent(`${coach.price}M`)
  fireEvent.click(button)
  expect(onHire).toHaveBeenCalledWith(coach.id)
})
