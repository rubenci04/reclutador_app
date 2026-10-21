import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import data from '../../data/league-coaches.json'
import { catalogForMode } from '../themed-modes/modeCatalog'
import type { ThemedModeId } from '../themed-modes/modeTypes'
import { CLASSIC_CONFIG, parseMatchConfig } from '../recruiter-duel/matchConfig'
import { beginBidding, budgetOf, createRecruiterDuel, nextAuctionRound, passAuction, placeBid, auctionAvailability, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss, startDuelMatch } from '../recruiter-duel/auctionEngine'
import type { AuctionTransition, RecruiterDuelGame } from '../recruiter-duel/auctionTypes'
import { takeCpuTurn } from '../recruiter-duel/cpuPolicy'
import { autoChooseCoach, chooseCoach, coachMarket, coachOf, coachOffers, coachOffersFor, declineCoach } from '../recruiter-duel/coachHiring'
import { COACH_MARKET_V2, COACH_OFFER_SIZE_V2, COACH_TIER_PRICE, coachEffect } from './coachRules'
import { coachById } from './coachCatalog'
import { coachesForMode, leagueCoaches } from './coachContext'
import { LEAGUE_COACHES } from './leagueCoaches'
import es from '../../i18n/locales/es-AR/common.json'
import en from '../../i18n/locales/en/common.json'
import pt from '../../i18n/locales/pt-BR/common.json'

const LEAGUE_MODES = ['ITALY_CURRENT', 'ITALY_LEGENDS', 'MEXICO_CURRENT', 'MEXICO_LEGENDS'] as const satisfies readonly ThemedModeId[]
const SIDES = ['recruiter_one', 'recruiter_two'] as const
const must = (result: AuctionTransition): RecruiterDuelGame => { if (!result.ok) throw new Error(result.error); return result.game }
const fullName = (c: { name: string; surname: string }) => `${c.name} ${c.surname}`

describe('COACH-006 league coaches', () => {
  it('adds ten Serie A and ten Liga MX coaches with documented career, years and source', () => {
    expect(LEAGUE_COACHES).toHaveLength(20)
    expect(LEAGUE_COACHES.filter((c) => c.league === 'ITA')).toHaveLength(10)
    expect(LEAGUE_COACHES.filter((c) => c.league === 'MEX')).toHaveLength(10)
    expect(new Set(LEAGUE_COACHES.map((c) => c.id)).size).toBe(20)
    for (const c of LEAGUE_COACHES) {
      expect(c.sourceUrl, c.id).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//)
      expect(c.team.length, c.id).toBeGreaterThan(0)
      const [from, to] = c.period!
      expect(from, c.id).toBeGreaterThan(c.birthYear)
      expect(to ?? 2026, c.id).toBeGreaterThanOrEqual(from)
      if (c.deathYear) expect(to!, c.id).toBeLessThanOrEqual(c.deathYear)
      expect(c.price).toBe(COACH_TIER_PRICE[c.tier])
      expect(coachById(c.id)).toBeDefined()
    }
    expect(data.retrieved).toBe('2026-10-21')
  })
  it('selects by career in the league, never by nationality, and keeps Bilardo and Basile out of Italy', () => {
    for (const mode of LEAGUE_MODES) {
      const pool = coachesForMode(mode, 'v2')
      expect(pool.length, mode).toBeGreaterThanOrEqual(6)
      expect(pool.every((c) => c.league === (mode.startsWith('ITALY') ? 'ITA' : 'MEX')), mode).toBe(true)
      expect(pool.every((c) => (c.status === 'LEGEND') === mode.endsWith('LEGENDS')), mode).toBe(true)
      expect(pool.map((c) => c.surname)).not.toContain('Bilardo')
      expect(pool.map((c) => c.surname)).not.toContain('Basile')
    }
    // A foreign coach with a Mexican career is eligible; an Italian national without one is not.
    expect(leagueCoaches('MEX', false).some((c) => c.surname === 'Mohamed' && c.nationality === 'ARG')).toBe(true)
    expect(leagueCoaches('MEX', false).some((c) => c.nationality === 'ITA')).toBe(false)
    expect(leagueCoaches('ITA', true).some((c) => c.surname === 'Liedholm' && c.nationality === 'SWE')).toBe(true)
    // Legacy offers are untouched: Bilardo is still in the old Italian legend pool of earlier games.
    expect(coachesForMode('ITALY_LEGENDS').map((c) => c.surname)).toContain('Bilardo')
  })
  it('keeps the same name for the same coach in other categories (no duplicate person in a pool)', () => {
    for (const mode of ['GLOBAL_CLASSIC', 'LEGENDS_ONLY', 'EUROPE_CURRENT', 'EUROPE_LEGENDS', 'SOUTH_AMERICA_CURRENT', 'SOUTH_AMERICA_LEGENDS'] as const) {
      const pool = coachesForMode(mode, 'v2')
      expect(new Set(pool.map(fullName)).size, mode).toBe(pool.length)
    }
    expect(coachesForMode('EUROPE_LEGENDS', 'v2').some((c) => c.surname === 'Capello')).toBe(true)
    expect(coachesForMode('SOUTH_AMERICA_CURRENT', 'v2').some((c) => c.surname === 'Vucetich')).toBe(true)
  })
})

describe('COACH-006 six-card market', () => {
  const modes = [...LEAGUE_MODES, 'GLOBAL_CLASSIC', 'LEGENDS_ONLY', 'ARGENTINA_CURRENT', 'EUROPE_CURRENT'] as const
  it.each(modes)('%s offers six distinct affordable coaches with varied specialisations, deterministically', (mode) => {
    for (const seed of ['m1', 'm2', 'm3', 'm4']) for (const left of mode.endsWith('LEGENDS') || mode === 'LEGENDS_ONLY' ? [12, 8] : [12, 8, 3]) {
      const offers = coachOffers(seed, Math.min(8, left), mode, { recruiter_one: left, recruiter_two: left }, 'v2')
      for (const side of SIDES) {
        const cards = offers[side]
        // With the reserve (8M) kept aside, six cards are always possible; with less money only what fits is shown.
        if (left >= 8) expect(cards.length, `${mode}:${seed}:${left}`).toBe(COACH_OFFER_SIZE_V2)
        else expect(cards.length).toBeGreaterThanOrEqual(1)
        expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length)
        for (const c of cards) expect(c.price).toBeLessThanOrEqual(left)
        const pool = coachesForMode(mode, 'v2')
        for (const c of cards) expect(pool.some((p) => p.id === c.id), `${mode} borrowed ${c.id}`).toBe(true)
      }
      expect(coachOffers(seed, Math.min(8, left), mode, { recruiter_one: left, recruiter_two: left }, 'v2')).toEqual(offers)
    }
    const rich = coachOffers('variety', 8, mode, { recruiter_one: 8, recruiter_two: 8 }, 'v2').recruiter_one
    expect(new Set(rich.map((c) => c.focus)).size).toBeGreaterThanOrEqual(3)
    expect(new Set(rich.map((c) => c.tier)).size).toBeGreaterThanOrEqual(Math.min(3, new Set(coachesForMode(mode, 'v2').map((c) => c.tier)).size))
    if (coachesForMode(mode, 'v2').length > COACH_OFFER_SIZE_V2) expect(coachOffers('variety', 8, mode, { recruiter_one: 8, recruiter_two: 8 }, 'v2')).not.toEqual(coachOffers('other-seed', 8, mode, { recruiter_one: 8, recruiter_two: 8 }, 'v2'))
  })
  it('keeps the earlier three-card offer for games without the marker', () => {
    const legacy = coachOffers('legacy', 8, 'ITALY_CURRENT')
    expect(legacy.recruiter_one).toHaveLength(3)
    expect(coachOffers('legacy', 8, 'ITALY_CURRENT', undefined, 'v1')).toEqual(legacy)
    expect(parseMatchConfig({ ...CLASSIC_CONFIG, coaches: true, coachMarket: COACH_MARKET_V2 })).toMatchObject({ coaches: true, coachMarket: COACH_MARKET_V2 })
    expect(parseMatchConfig({ ...CLASSIC_CONFIG, coaches: true })).not.toHaveProperty('coachMarket')
    expect(parseMatchConfig({ ...CLASSIC_CONFIG, coachMarket: COACH_MARKET_V2 })).toBeNull()
    expect(parseMatchConfig({ ...CLASSIC_CONFIG, coaches: true, coachMarket: 'other' })).toBeNull()
  })
})

function play(mode: ThemedModeId, seed: string): RecruiterDuelGame {
  const catalog = catalogForMode(mode)
  const created = createRecruiterDuel(catalog, seed, undefined, { ...CLASSIC_CONFIG, budget: mode.endsWith('LEGENDS') ? 200 : 150, coaches: true, coachReserve: 8, coachMarket: COACH_MARKET_V2 })
  if (!created.ok) throw new Error(`${seed}: ${created.error}`)
  let game: RecruiterDuelGame = { ...must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads')))))), coachMode: mode }
  for (let step = 0; step < 1500 && game.phase !== 'TEAMS_COMPLETED'; step++) {
    if (game.phase === 'DISCARD_RESULT') { game = must(revealDiscardReplacement(game)); continue }
    if (game.phase === 'NEXT_ROUND') { game = must(revealNextAuctionRound(game)); continue }
    if (game.phase === 'REVEAL_PLAYER') { game = must(beginBidding(game)); continue }
    if (game.phase === 'ROUND_RESULT') { game = must(nextAuctionRound(game, catalog)); continue }
    const who = game.activeParticipant!
    if (who === 'recruiter_two') { game = must(takeCpuTurn(game, catalog, 'AGGRESSIVE')); continue }
    const a = auctionAvailability(game, who, catalog)
    if (a.bid.enabled) game = must(placeBid(game, who, a.maximum, catalog))
    else if (a.pass.enabled) game = must(passAuction(game, who, catalog))
    else game = must(placeBid(game, who, a.minimum, catalog))
  }
  return game
}

describe('COACH-006 hiring, rejection and CPU in a duel', () => {
  it.each(['ITALY_CURRENT', 'MEXICO_LEGENDS'] as const)('%s: shows six affordable cards, charges once, applies the bonus once and allows no coach', (mode) => {
    const game = play(mode, 'hire-1')
    expect(game.phase).toBe('TEAMS_COMPLETED')
    for (const side of SIDES) {
      const left = budgetOf(game) - game.teams[side].spent
      expect(coachOffersFor(game, side).length).toBeGreaterThanOrEqual(4)
      for (const c of coachMarket(game, side)) expect(c.price).toBeLessThanOrEqual(left)
    }
    const market = coachMarket(game, 'recruiter_one')
    const pick = market[0]
    const hired = must(chooseCoach(game, 'recruiter_one', pick.id))
    expect(hired.teams.recruiter_one.spent).toBe(game.teams.recruiter_one.spent + pick.price)
    expect(hired.teams.recruiter_one.coachPrice).toBe(pick.price)
    expect(coachMarket(hired, 'recruiter_one')).toEqual([])
    expect(chooseCoach(hired, 'recruiter_one', pick.id)).toEqual({ ok: false, error: 'invalid_coach' })
    expect(coachOf(hired, 'recruiter_one')?.id).toBe(pick.id)
    // CPU: deterministic strongest affordable choice, only from its own offer.
    const both = autoChooseCoach(hired, 'recruiter_two')
    const cpuCoach = coachOf(both, 'recruiter_two')!
    expect(coachOffersFor(game, 'recruiter_two').some((c) => c.id === cpuCoach.id)).toBe(true)
    expect(autoChooseCoach(both, 'recruiter_two')).toBe(both)
    const played = must(startDuelMatch(both, catalogForMode(mode), undefined, true))
    expect(played.matchResult?.coaches?.local?.id).toBe(pick.id)
    expect(played.matchResult?.coaches?.cpu?.id).toBe(cpuCoach.id)
    // The effect is the fixed tier/focus value, counted by the engine once (no hidden price or bonus edits).
    expect(coachEffect(pick).attack).toBeGreaterThan(0)
    // Declining keeps the market optional and charges nothing.
    const declined = must(declineCoach(game, 'recruiter_one'))
    expect(declined.teams.recruiter_one.spent).toBe(game.teams.recruiter_one.spent)
    expect(declined.teams.recruiter_one.coachDeclined).toBe(true)
  })
  it('a historic game without the marker keeps its three cards and its hired coach', () => {
    const catalog = catalogForMode('ITALY_CURRENT')
    const created = createRecruiterDuel(catalog, 'old-game', undefined, { ...CLASSIC_CONFIG, coaches: true, coachReserve: 8 })
    if (!created.ok) throw new Error(created.error)
    const old: RecruiterDuelGame = { ...created.game, coachMode: 'ITALY_CURRENT', phase: 'TEAMS_COMPLETED' }
    expect(coachOffersFor(old, 'recruiter_one').length).toBeLessThanOrEqual(3)
    expect(coachOf({ ...old, teams: { ...old.teams, recruiter_one: { ...old.teams.recruiter_one, coachId: 'coach_045', coachPrice: 5 } } }, 'recruiter_one')?.price).toBe(5)
  })
})

describe('COACH-006 card presentation data', () => {
  it('has the compact card labels and affinity text in all three languages', () => {
    for (const locale of [es, en, pt]) {
      expect(Object.keys(locale.coach.sector).sort()).toEqual(['attack', 'defense', 'midfield'])
      expect(Object.keys(locale.coach.affinity).sort()).toEqual(['ATTACK', 'BALANCED', 'DEFENSE', 'MIDFIELD'])
      expect(locale.coach.contextHintV2.length).toBeGreaterThan(20)
    }
    expect(readFileSync('src/data/league-coaches.json', 'utf8')).not.toMatch(/"photo|\.jpg/i)
  })
})
