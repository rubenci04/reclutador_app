import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { CATEGORY_GROUPS } from '../themed-modes/categoryTree'
import { defaultBudgetForMode } from '../player-catalog/leagueCollections'
import { coachesForMode } from '../coaches/coachContext'
import { argentinaPoolV4 } from '../coaches/coachContext'
import { COACH_MARKET_V4, COACH_MAX_PRICE } from '../coaches/coachRules'
import { autoBuySubstitutes, autoCompleteAll, beginBidding, canAutoComplete, createRecruiterDuel, nextAuctionRound, passAuction, placeBid, auctionAvailability, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss, substituteMarket } from './auctionEngine'
import { declineCoach } from './coachHiring'
import { createDrawContext } from './drawHistory'
import { takeCpuTurn } from './cpuPolicy'
import { BENCH_MARKET_V2, BENCH_SHOWCASE_V1, CLASSIC_CONFIG, DISCARDS_MARKER_V2, preflightMatchConfig, type MatchConfig } from './matchConfig'
import { benchShowcase, buyShowcaseCard, cpuShowcase, finishShowcase, passShowcaseTurn, showcaseClosed, showcaseFirst, showcaseTurn, soldTo } from './benchShowcaseModel'
import type { AuctionTransition, RecruiterDuelGame, RecruiterId } from './auctionTypes'
import { FootballCoin } from './FootballCoin'
import { BenchShowcase } from './BenchShowcase'
import { resultAdvantages } from '../local-match/resultAdvantages'
import { nearestHit, shortName } from '../local-match/shortName'
import type { MatchResult } from '../local-match/matchTypes'

const must = (result: AuctionTransition): RecruiterDuelGame => { if (!result.ok) throw new Error(result.error); return result.game }

/** Engine-only auction up to TEAMS_COMPLETED; recruiter_two follows the CPU policy, recruiter_one bids the minimum while it can. */
function completed(catalog: Parameters<typeof createRecruiterDuel>[0], config: MatchConfig, seed: string): RecruiterDuelGame {
  const created = createRecruiterDuel(catalog, seed, createDrawContext(catalog, []), config)
  if (!created.ok) throw new Error(`draw:${created.error}`)
  let game = must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
  for (let step = 0; step < 2000 && game.phase !== 'TEAMS_COMPLETED'; step++) {
    if (canAutoComplete(game, 'recruiter_two')) { game = must(autoCompleteAll(game, 'recruiter_two', catalog)); continue }
    if (canAutoComplete(game, 'recruiter_one')) { game = must(autoCompleteAll(game, 'recruiter_one', catalog)); continue }
    if (game.phase === 'DISCARD_RESULT') { game = must(revealDiscardReplacement(game)); continue }
    if (game.phase === 'NEXT_ROUND') { game = must(revealNextAuctionRound(game)); continue }
    if (game.phase === 'REVEAL_PLAYER') { game = must(beginBidding(game)); continue }
    if (game.phase === 'ROUND_RESULT') { game = must(nextAuctionRound(game, catalog)); continue }
    const who = game.activeParticipant!
    if (who === 'recruiter_two') { game = must(takeCpuTurn(game, catalog, 'BALANCED')); continue }
    const a = auctionAvailability(game, who, catalog)
    game = a.bid.enabled ? must(placeBid(game, who, a.minimum, catalog)) : a.pass.enabled ? must(passAuction(game, who, catalog)) : must(placeBid(game, who, a.minimum, catalog))
  }
  if (game.phase !== 'TEAMS_COMPLETED') throw new Error('not_completed')
  return game
}
const showcaseConfig = (budget: number, extra: Partial<MatchConfig> = {}): MatchConfig => ({ ...CLASSIC_CONFIG, budget, bench: BENCH_SHOWCASE_V1, discards: DISCARDS_MARKER_V2, ...extra })

describe('GAMEPLAY-POLISH-010 budgets', () => {
  it('uses 160M for current categories, 220M for legends, the larger one for crossings, and every category can complete both elevens with the coach reserve and a bench', () => {
    for (const id of CATEGORY_GROUPS.flatMap((group) => group.modes)) {
      const budget = defaultBudgetForMode(id)
      expect(budget).toBe(id.includes('LEGENDS') ? 220 : 160)
      const config = showcaseConfig(budget, { coaches: true, coachReserve: COACH_MAX_PRICE, coachMarket: COACH_MARKET_V4 })
      const catalog = catalogForMode(id)
      expect(preflightMatchConfig(catalog, config).ok, id).toBe(true)
      for (const n of [1, 2]) expect(createRecruiterDuel(catalog, `viability-${id}-${n}`, createDrawContext(catalog, []), config).ok, `${id} draw ${n}`).toBe(true)
    }
    expect(Math.max(defaultBudgetForMode('GLOBAL_CLASSIC'), defaultBudgetForMode('EUROPE_LEGENDS'))).toBe(220)
  })
  it('leaves money for the coach reserve after a complete auction at 160M and 220M, so the aftermarket exists', () => {
    for (const [mode, budget] of [['SPAIN_LEAGUE', 160], ['EUROPE_LEGENDS', 220]] as const) {
      const catalog = catalogForMode(mode)
      const game = completed(catalog, showcaseConfig(budget, { coaches: true, coachReserve: COACH_MAX_PRICE, coachMarket: COACH_MARKET_V4 }), `aftermarket-${mode}`)
      for (const id of ['recruiter_one', 'recruiter_two'] as const) expect(budget - game.teams[id].spent, `${mode} ${id}`).toBeGreaterThanOrEqual(COACH_MAX_PRICE)
    }
  })
})

describe('GAMEPLAY-POLISH-010 Argentine coach pools (coach-market-v4)', () => {
  const current = argentinaPoolV4(false)
  it('builds a documented current pool of at least ten coaches with club, period and source, without Pochettino', () => {
    expect(current.length).toBeGreaterThanOrEqual(10)
    for (const coach of current) { expect(coach.sourceUrl, coach.surname).toMatch(/^https:/); expect(coach.period?.[0], coach.surname).toBeGreaterThanOrEqual(2024); expect(coach.team.length).toBeGreaterThan(2) }
    const surnames = current.map((c) => c.surname)
    for (const wanted of ['Arruabarrena', 'Falcioni', 'Troglio', 'Barros Schelotto', 'Pellegrino', 'Berti', 'Zielinski', 'Almirón', 'Martínez', 'Madelón']) expect(surnames, wanted).toContain(wanted)
    expect(surnames).not.toContain('Pochettino')
    expect(current.find((c) => c.surname === 'Arruabarrena')!.team).toBe('Boca Juniors')
    expect(current.find((c) => c.surname === 'Úbeda')!.period).toEqual([2026, 2026])
    expect(current.find((c) => c.surname === 'Pellegrino')!.team).toBe('Lanús')
    expect(new Set(current.map((c) => c.id)).size).toBe(current.length)
    // Fonseca is not placed at River without a verifiable source.
    expect(surnames).not.toContain('Fonseca')
  })
  it('keeps the previous v3 market untouched and uses the new pool only from v4', () => {
    expect(coachesForMode('ARGENTINA_CURRENT', 'v3').some((c) => c.surname === 'Pochettino')).toBe(true)
    expect(coachesForMode('ARGENTINA_CURRENT', 'v3').some((c) => c.surname === 'Troglio')).toBe(false)
    expect(coachesForMode('ARGENTINA_CURRENT', 'v4').some((c) => c.surname === 'Troglio')).toBe(true)
    expect(coachesForMode('SPAIN_LEAGUE', 'v4')).toEqual(coachesForMode('SPAIN_LEAGUE', 'v3'))
  })
  it('adds the requested legends with a separate historical edition for people who also have a current card', () => {
    const legends = coachesForMode('ARGENTINA_LEGENDS', 'v4')
    const names = legends.map((c) => `${c.name} ${c.surname}`)
    for (const wanted of ['Reinaldo Merlo', 'Juan Carlos Lorenzo', 'Ángel Labruna', 'Carlos Bianchi', 'Miguel Ángel Russo', 'Carlos Bilardo', 'César Luis Menotti', 'Américo Rubén Gallego', 'Ramón Ángel Díaz']) expect(names, wanted).toContain(wanted)
    expect(legends.every((c) => c.status === 'LEGEND')).toBe(true)
    const diaz = legends.find((c) => c.surname === 'Díaz')!
    expect(diaz.team).toBe('River Plate'); expect(diaz.period).toEqual([1995, 2002])
    expect(coachesForMode('ARGENTINA_CURRENT', 'v2').every((c) => c.status === 'ACTIVE')).toBe(true)
    expect(legends.some((c) => c.surname === 'Pochettino')).toBe(false)
  })
})

describe('GAMEPLAY-POLISH-010 fixed bench showcase (bench-showcase-v1)', () => {
  const game = declineBoth(completed(DRAFT_CATALOG, showcaseConfig(300, { coaches: true, coachReserve: COACH_MAX_PRICE }), 'showcase-a'))
  function declineBoth(g: RecruiterDuelGame) { return must(declineCoach(must(declineCoach(g, 'recruiter_one')), 'recruiter_two')) }
  const first = showcaseFirst(game); const second: RecruiterId = first === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one'

  it('offers exactly ten unique cards (1 ARQ, 3 DEF, 3 MED, 3 DEL), none already won, derived from the seed', () => {
    const cards = benchShowcase(game, DRAFT_CATALOG)
    expect(cards).toHaveLength(10); expect(new Set(cards.map((c) => c.id)).size).toBe(10)
    expect(['ARQ', 'DEF', 'MED', 'DEL'].map((p) => cards.filter((c) => c.position === p).length)).toEqual([1, 3, 3, 3])
    const won = new Set(game.record.flatMap((r) => r.type === 'award' ? [r.playerId] : []))
    expect(cards.some((c) => won.has(c.id))).toBe(false)
    expect(benchShowcase(game, DRAFT_CATALOG).map((c) => c.id)).toEqual(cards.map((c) => c.id))
  })
  it('never replaces a bought card: it stays in the showcase as SOLD and the rest do not change', () => {
    const before = benchShowcase(game, DRAFT_CATALOG).map((c) => c.id)
    const bought = must(buyShowcaseCard(game, first, before[0], DRAFT_CATALOG))
    expect(benchShowcase(bought, DRAFT_CATALOG).map((c) => c.id)).toEqual(before)
    expect(soldTo(bought, before[0])).toBe(first)
    expect(bought.teams[first].bench!.some((slot) => slot.playerId === before[0])).toBe(true)
    expect(bought.teams[first].spent).toBe(game.teams[first].spent + benchShowcase(game, DRAFT_CATALOG)[0].price)
    // Nobody can take it again, and substituteMarket (the old replacing market) stays closed for this version.
    expect(buyShowcaseCard(bought, second, before[0], DRAFT_CATALOG).ok).toBe(false)
    expect(substituteMarket(bought, first, DRAFT_CATALOG)).toEqual([])
    expect(autoBuySubstitutes(game, 'recruiter_two', DRAFT_CATALOG)).toBe(game)
  })
  it('follows the snake A-B-B-A-A-B-B-A-A-B, five each at most, with no automatic purchase before a turn', () => {
    expect(showcaseTurn(game, DRAFT_CATALOG)).toBe(first)
    expect(cpuShowcase(game, first === 'recruiter_two' ? 'recruiter_one' : 'recruiter_two', DRAFT_CATALOG)).toBe(game)
    let current = game; const actors: RecruiterId[] = []
    for (let i = 0; i < 10; i++) {
      const turn = showcaseTurn(current, DRAFT_CATALOG)!
      actors.push(turn)
      const card = benchShowcase(current, DRAFT_CATALOG).find((c) => !soldTo(current, c.id))!
      current = must(buyShowcaseCard(current, turn, card.id, DRAFT_CATALOG))
    }
    expect(actors).toEqual([first, second, second, first, first, second, second, first, first, second])
    expect(showcaseTurn(current, DRAFT_CATALOG)).toBeNull(); expect(showcaseClosed(current, DRAFT_CATALOG)).toBe(true)
    for (const id of [first, second]) expect(current.teams[id].bench).toHaveLength(5)
    expect(buyShowcaseCard(current, first, benchShowcase(current, DRAFT_CATALOG)[0].id, DRAFT_CATALOG).ok).toBe(false)
  })
  it('lets a pass use its chance, hands the rest to the other participant when one finishes, and never exceeds five', () => {
    let current = must(passShowcaseTurn(game, first, DRAFT_CATALOG))
    expect(showcaseTurn(current, DRAFT_CATALOG)).toBe(second)
    expect(passShowcaseTurn(current, first, DRAFT_CATALOG).ok).toBe(false)
    current = must(finishShowcase(current, second, DRAFT_CATALOG))
    expect(showcaseTurn(current, DRAFT_CATALOG)).toBe(first)
    for (let i = 0; i < 12 && showcaseTurn(current, DRAFT_CATALOG) === first; i++) {
      const card = benchShowcase(current, DRAFT_CATALOG).find((c) => !soldTo(current, c.id))!
      current = must(buyShowcaseCard(current, first, card.id, DRAFT_CATALOG))
    }
    expect(current.teams[first].bench).toHaveLength(5); expect(current.teams[second].bench ?? []).toHaveLength(0)
    expect(showcaseTurn(current, DRAFT_CATALOG)).toBeNull()
  })
  it('makes the CPU decide only on its own chances, deterministically, and keeps online/legacy configurations on the old market', () => {
    const cpu: RecruiterId = 'recruiter_two'
    const played = cpuShowcase(game, cpu, DRAFT_CATALOG)
    if (first === cpu) expect(played.teams[cpu].bench).toHaveLength(1); else expect(played).toBe(game)
    expect(JSON.stringify(cpuShowcase(game, cpu, DRAFT_CATALOG))).toBe(JSON.stringify(played))
    const legacy = declineBoth(completed(DRAFT_CATALOG, { ...CLASSIC_CONFIG, budget: 300, bench: BENCH_MARKET_V2, discards: DISCARDS_MARKER_V2, coaches: true, coachReserve: COACH_MAX_PRICE }, 'showcase-legacy'))
    expect(showcaseTurn(legacy, DRAFT_CATALOG)).toBeNull()
    expect(substituteMarket(legacy, 'recruiter_one', DRAFT_CATALOG).length).toBeGreaterThan(0)
  })
})

describe('GAMEPLAY-POLISH-010 showcase screen', () => {
  it('shows ten cards, lets only the turn holder buy, and keeps a bought card visible as SOLD', async () => {
    const base = must(declineCoach(must(declineCoach(completed(DRAFT_CATALOG, showcaseConfig(300, { coaches: true, coachReserve: COACH_MAX_PRICE }), 'showcase-ui'), 'recruiter_one')), 'recruiter_two'))
    const i18n = await createI18n('en'); const names = { recruiter_one: 'One', recruiter_two: 'Two' }
    const turn = showcaseTurn(base, DRAFT_CATALOG)!
    const bought: string[] = []
    const view = (g: RecruiterDuelGame) => <I18nextProvider i18n={i18n}><BenchShowcase game={g} catalog={DRAFT_CATALOG} names={names} humans={['recruiter_one', 'recruiter_two']} onBuy={(_, id) => bought.push(id)} onPass={() => {}} onFinish={() => {}} /></I18nextProvider>
    const { container, rerender } = render(view(base))
    expect(container.querySelectorAll('.showcase-card')).toHaveLength(10)
    expect(container.querySelector('.showcase-turn')!.textContent).toContain(names[turn])
    fireEvent.click(container.querySelector('.showcase-card button')!)
    expect(bought).toHaveLength(1)
    const card = benchShowcase(base, DRAFT_CATALOG)[0]
    const after = must(buyShowcaseCard(base, turn, card.id, DRAFT_CATALOG))
    rerender(view(after))
    expect(container.querySelectorAll('.showcase-card')).toHaveLength(10)
    const sold = container.querySelectorAll('.showcase-card[data-sold="true"]')
    expect(sold).toHaveLength(1); expect(sold[0].textContent).toContain('SOLD'); expect(sold[0].querySelector('button')).toBeNull()
  })
})

describe('GAMEPLAY-POLISH-010 coin', () => {
  it('keeps both faces in the document, announces the stored side only after the landing, and never changes it', async () => {
    const i18n = await createI18n('en')
    const { container } = render(<I18nextProvider i18n={i18n}><FootballCoin side="tails" tossing /></I18nextProvider>)
    const coin = container.querySelector('.football-coin') as HTMLElement
    expect(coin.classList.contains('tossing')).toBe(true); expect(coin.getAttribute('data-side')).toBe('tails')
    expect(container.querySelectorAll('.coin-face')).toHaveLength(2); expect(container.querySelector('.coin-shadow')).not.toBeNull()
    expect(coin.getAttribute('aria-label')).toBe(i18n.t('duel.coinTossWaiting'))
    act(() => { const el = container.querySelector('.coin3d')!; for (const name of ['animationend', 'webkitAnimationEnd']) fireEvent(el, new Event(name, { bubbles: true })) })
    expect(coin.classList.contains('landed')).toBe(true); expect(coin.getAttribute('data-side')).toBe('tails')
    expect(coin.getAttribute('aria-label')).toContain(i18n.t('duel.tails'))
    expect(screen.getByText(/Stadium/i)).toBeInTheDocument()
  })
  it('does not flatten the 3D flip (no filter on the preserve-3d element) and defines a visible, finite animation plus a reduced-motion fade', () => {
    const css = readFileSync('src/styles/index.css', 'utf8')
    expect(css).toMatch(/\.coin3d \{[^}]*transform-style: preserve-3d;\s*\}/)
    expect(css).toMatch(/\.coin-stage \{[^}]*filter: drop-shadow/)
    expect(css).toMatch(/\.football-coin\.tossing \.coin3d \{ animation: 2200ms/)
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{[^]*coin-alt-front-heads/)
  })
})

describe('GAMEPLAY-POLISH-010 result summary and board helpers', () => {
  const side = (global: number, attack: number, midfield: number, defense: number) => ({ global, attack, midfield, defense })
  const result = { strengths: { local: side(80, 80, 80, 80), cpu: side(80, 80, 80, 80) }, effectiveStrengths: { local: side(86, 90, 84, 84), cpu: side(81, 80, 83, 80) }, stats: { local: { shots: 9, shotsOnTarget: 5, saves: 2, recoveries: 3, possession: 58 }, cpu: { shots: 4, shotsOnTarget: 2, saves: 3, recoveries: 5, possession: 42 } }, coaches: { local: { id: 'x', attack: 1, defense: 1, midfield: 1 }, cpu: null } } as unknown as MatchResult
  it('lists only the edges the stored result states and never claims causality', () => {
    const edges = resultAdvantages(result)
    expect(edges.local).toEqual(expect.arrayContaining(['power', 'attack', 'defense', 'coach', 'possession', 'shots']))
    expect(edges.local).not.toContain('midfield'); expect(edges.cpu).toEqual([])
  })
  it('abbreviates long names readably and finds the offered teammate under a tap', () => {
    expect(shortName('Messi')).toBe('Messi'); expect(shortName('Lionel Andrés Messi')).toBe('L. Messi'); expect(shortName('Cristiano Ronaldo dos Santos Aveiro')).toBe('C. Aveiro')
    const hits = [{ x: 100, y: 100, r: 30, label: 'A' }, { x: 220, y: 90, r: 30, label: 'B' }]
    expect(nearestHit(hits, 110, 95)?.label).toBe('A'); expect(nearestHit(hits, 215, 100)?.label).toBe('B'); expect(nearestHit(hits, 160, 200)).toBeNull()
  })
})
