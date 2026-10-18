import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { AuctionPage, COIN_TOSS_MS } from './AuctionPage'
import { auctionAvailability, beginBidding, budgetOf, createRecruiterDuel, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss, startDuelMatch } from './auctionEngine'
import type { AuctionTransition, RecruiterDuelGame } from './auctionTypes'
import * as drawHistory from './drawHistory'
import { buildHudModel } from './hudModel'
import { BUDGET_PRESETS, CLASSIC_CONFIG, MATCH_CONFIG_VERSION, NAME_MAX_LENGTH, isValidBudget, nameIssues, parseMatchConfig, preflightMatchConfig, sanitizeName, type MatchConfig } from './matchConfig'

const custom = (budget: number, names: MatchConfig['names'] = { recruiter_one: null, recruiter_two: null }): MatchConfig => ({ version: MATCH_CONFIG_VERSION, budget, names, substitutes: false })
const must = (result: AuctionTransition): RecruiterDuelGame => { if (!result.ok) throw new Error(result.error); return result.game }

describe('names', () => {
  it('sanitises free text: trims, collapses spaces, drops control and bidi characters, keeps accents', () => {
    expect(sanitizeName('  Club   Atlético \t Pichirica ')).toBe('Club Atlético Pichirica')
    expect(sanitizeName('Deportivo‮Pasto​\u0000')).toBe('Deportivo Pasto')
    expect(sanitizeName('   \n  ')).toBeNull()
    expect(sanitizeName('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>')
  })
  it('flags names over the limit (counted in characters) and equal names', () => {
    expect(nameIssues({ recruiter_one: 'a'.repeat(NAME_MAX_LENGTH), recruiter_two: null })).toEqual({})
    expect(nameIssues({ recruiter_one: 'a'.repeat(NAME_MAX_LENGTH + 1), recruiter_two: null })).toEqual({ recruiter_one: 'tooLong' })
    expect(nameIssues({ recruiter_one: '😀'.repeat(NAME_MAX_LENGTH), recruiter_two: null })).toEqual({})
    expect(nameIssues({ recruiter_one: 'Pasto', recruiter_two: 'pasto' })).toEqual({ recruiter_two: 'duplicate' })
  })
})

describe('configuration contract', () => {
  it('classic is the historical 100M / no substitutes configuration', () => {
    expect(CLASSIC_CONFIG).toEqual({ version: 1, budget: 100, names: { recruiter_one: null, recruiter_two: null }, substitutes: false })
    expect(budgetOf({})).toBe(100); expect(budgetOf({ config: custom(150) })).toBe(150)
  })
  it('parses only valid stored configurations and never coerces', () => {
    expect(parseMatchConfig(custom(125, { recruiter_one: ' Pasto ', recruiter_two: null }))?.names.recruiter_one).toBe('Pasto')
    for (const bad of [null, 'x', {}, { ...custom(100), version: 2 }, custom(99), custom(305), custom(100.5), { ...custom(100), substitutes: 'yes' }, custom(100, { recruiter_one: 'A', recruiter_two: 'a' }), custom(100, { recruiter_one: 'x'.repeat(40), recruiter_two: null })]) expect(parseMatchConfig(bad)).toBeNull()
    for (const preset of BUDGET_PRESETS) expect(isValidBudget(preset)).toBe(true)
  })
})

describe('economic preflight', () => {
  it('accepts every preset and rejects budgets that cannot pay for even the cheapest rosters', () => {
    for (const preset of BUDGET_PRESETS) expect(preflightMatchConfig(DRAFT_CATALOG, custom(preset)).ok).toBe(true)
    const top = preflightMatchConfig(DRAFT_CATALOG, custom(300))
    if (!top.ok) throw new Error(top.reason)
    expect(top.minimumPerTeam).toBeLessThan(100)
    const low = preflightMatchConfig(DRAFT_CATALOG, custom(60))
    // 60M is inside the allowed range; whether it is viable depends on the cheapest rosters of this catalogue.
    expect(low.ok || low.reason === 'budget_too_low').toBe(true)
    expect(preflightMatchConfig(DRAFT_CATALOG, custom(99))).toEqual({ ok: false, reason: 'budget_range' })
    const expensive = DRAFT_CATALOG.map((player) => ({ ...player, price: 20 }))
    const blocked = preflightMatchConfig(expensive, custom(100))
    expect(blocked).toMatchObject({ ok: false, reason: 'budget_too_low' })
    expect(createRecruiterDuel(expensive, 'x', undefined, custom(100))).toEqual({ ok: false, error: 'budget_too_low' })
    expect(createRecruiterDuel(DRAFT_CATALOG, 'x', undefined, custom(99))).toEqual({ ok: false, error: 'budget_range' })
    expect(preflightMatchConfig(DRAFT_CATALOG.filter((player) => player.position !== 'ARQ'), CLASSIC_CONFIG)).toEqual({ ok: false, reason: 'catalog_too_small' })
  })
})

describe('engine under a custom budget', () => {
  it('classic and an explicit classic configuration are the same game; custom stores its configuration', () => {
    const plain = createRecruiterDuel(DRAFT_CATALOG, 'cfg-1'); const explicit = createRecruiterDuel(DRAFT_CATALOG, 'cfg-1', undefined, CLASSIC_CONFIG)
    expect(explicit).toEqual(plain)
    if (!plain.ok) throw new Error(plain.error)
    expect('config' in plain.game).toBe(false)
    const rich = createRecruiterDuel(DRAFT_CATALOG, 'cfg-1', undefined, custom(150))
    if (!rich.ok) throw new Error(rich.error)
    expect(rich.game.config?.budget).toBe(150)
  })
  it.each([125, 150, 200])('plays to the final whistle with %iM: spending beyond 100M is legal, never beyond the budget', (budget) => {
    let overHundred = false
    for (let index = 0; index < 6; index++) {
      const created = createRecruiterDuel(DRAFT_CATALOG, `cfg-${budget}-${index}`, undefined, custom(budget))
      if (!created.ok) throw new Error(created.error)
      let game = must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
      for (let step = 0; step < 900 && game.phase !== 'TEAMS_COMPLETED'; step++) {
        if (game.phase === 'DISCARD_RESULT') { game = must(revealDiscardReplacement(game)); continue }
        if (game.phase === 'NEXT_ROUND') { game = must(revealNextAuctionRound(game)); continue }
        if (game.phase === 'REVEAL_PLAYER') { game = must(beginBidding(game)); continue }
        if (game.phase === 'ROUND_RESULT') { game = must(nextAuctionRound(game, DRAFT_CATALOG)); continue }
        const who = game.activeParticipant!; const a = auctionAvailability(game, who, DRAFT_CATALOG)
        // bid the safe maximum when allowed so spending climbs past 100M
        if (a.bid.enabled) game = must(placeBid(game, who, a.maximum, DRAFT_CATALOG))
        else if (a.pass.enabled) game = must(passAuction(game, who, DRAFT_CATALOG))
        else game = must(placeBid(game, who, a.minimum, DRAFT_CATALOG))
        for (const team of Object.values(game.teams)) expect(team.spent).toBeLessThanOrEqual(budget)
      }
      expect(game.phase).toBe('TEAMS_COMPLETED')
      overHundred ||= Object.values(game.teams).some((team) => team.spent > 100)
      const hud = buildHudModel(game, DRAFT_CATALOG)
      expect(hud.budget).toBe(budget)
      expect(hud.participants.recruiter_one.remaining).toBe(budget - game.teams.recruiter_one.spent)
      const started = startDuelMatch(game, DRAFT_CATALOG)
      if (!started.ok) throw new Error(started.error)
      expect(started.game.matchResult).not.toBeNull()
    }
    expect(overHundred).toBe(true)
  }, 60_000)
})

describe('setup screen', () => {
  beforeEach(() => { localStorage.clear(); vi.spyOn(drawHistory, 'newDrawSeed').mockReturnValue('setup-seed') })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear() })
  const open = async (language: 'en' | 'es-AR' | 'pt-BR' = 'en') => {
    const i18n = await createI18n(language)
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    return i18n
  }

  it('keeps the classic mode as the default: no extra fields, 100M summary, start enabled', async () => {
    await open()
    expect(screen.getByRole('radio', { name: /Classic/ })).toBeChecked()
    expect(screen.queryByLabelText('Team 1 name')).not.toBeInTheDocument()
    expect(screen.getByText('Starting budget: 100M per team')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start duel' })).toBeEnabled()
  })

  it('validates names and budget visibly and blocks the start until valid', async () => {
    await open()
    fireEvent.click(screen.getByRole('radio', { name: /Custom/ }))
    const one = screen.getByLabelText(/Team 1 name/); const two = screen.getByLabelText(/Team 2 name/)
    fireEvent.change(one, { target: { value: 'x'.repeat(NAME_MAX_LENGTH + 1) } })
    expect(screen.getByRole('alert')).toHaveTextContent(`Maximum ${NAME_MAX_LENGTH} characters`)
    expect(screen.getByRole('button', { name: 'Start duel' })).toBeDisabled()
    fireEvent.change(one, { target: { value: 'Deportivo Pasto' } }); fireEvent.change(two, { target: { value: 'deportivo pasto' } })
    expect(screen.getByRole('alert')).toHaveTextContent('cannot be the same')
    fireEvent.change(two, { target: { value: 'Club Atlético Pichirica' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Other value/), { target: { value: '103' } })
    expect(screen.getByRole('button', { name: 'Start duel' })).toBeDisabled()
    expect(screen.getByText(/whole number between 60 and 300M/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '150M' }))
    expect(screen.getByRole('button', { name: 'Start duel' })).toBeEnabled()
    expect(screen.getByText('Starting budget: 150M per team')).toBeInTheDocument()
  })

  it('carries names and budget through the whole duel and into the exported context', async () => {
    vi.useFakeTimers()
    await open()
    fireEvent.click(screen.getByRole('radio', { name: /Custom/ }))
    fireEvent.change(screen.getByLabelText(/Team 1 name/), { target: { value: '  Deportivo   Pasto ' } })
    fireEvent.change(screen.getByLabelText(/Team 2 name/), { target: { value: 'Club Atlético Pichirica' } })
    fireEvent.click(screen.getByRole('button', { name: '150M' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Heads' }))
    act(() => vi.advanceTimersByTime(COIN_TOSS_MS))
    fireEvent.click(screen.getByRole('button', { name: 'Start auction' }))
    const hud = screen.getByRole('region', { name: 'Duel scoreboard' })
    expect(hud).toHaveTextContent('Deportivo Pasto'); expect(hud).toHaveTextContent('Club Atlético Pichirica')
    expect(screen.getByRole('img', { name: 'Deportivo Pasto budget: 150M left of 150M' })).toBeInTheDocument()
    expect(screen.getByText(/Deportivo Pasto's turn|Club Atlético Pichirica's turn/)).toBeInTheDocument()
    const exported = JSON.parse((screen.getByLabelText('Original seed and context') as HTMLTextAreaElement).value)
    expect(exported.config).toEqual({ ...custom(150, { recruiter_one: 'Deportivo Pasto', recruiter_two: 'Club Atlético Pichirica' }), coaches: true })
  })

  it('uses an editable default name for the CPU rival and translates the setup', async () => {
    await open('es-AR')
    fireEvent.change(screen.getByLabelText('Rival'), { target: { value: 'cpu' } })
    fireEvent.click(screen.getByRole('radio', { name: /Personalizada/ }))
    expect(screen.getByLabelText(/Nombre del rival/)).toHaveAttribute('placeholder', 'CPU')
    expect(screen.getByText('Reglas de la partida')).toBeInTheDocument()
  })
})
