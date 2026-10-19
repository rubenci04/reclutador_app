import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { DRAFT_CATALOG } from '../draft/catalog'
import { createDrawContext } from '../recruiter-duel/drawHistory'
import * as drawHistory from '../recruiter-duel/drawHistory'
import { AuctionPage, COIN_TOSS_MS } from '../recruiter-duel/AuctionPage'
import { auctionAvailability, beginBidding, createRecruiterDuel, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss, startDuelMatch } from '../recruiter-duel/auctionEngine'
import type { AuctionTransition, RecruiterDuelGame } from '../recruiter-duel/auctionTypes'
import { evaluateMode } from './filterEngine'
import { ARGENTINA_METADATA, ARGENTINA_PLAYERS, catalogForMode, PLAYABLE_MODES } from './modeCatalog'
import { defaultBudgetForMode } from '../player-catalog/leagueCollections'
import { CLASSIC_CONFIG } from '../recruiter-duel/matchConfig'
import { THEMED_MODES } from './modes'

const must = (result: AuctionTransition): RecruiterDuelGame => { if (!result.ok) throw new Error(result.error); return result.game }
const mode = THEMED_MODES.find((item) => item.id === 'ARGENTINA_CLUBS')!

describe('Argentine football mode', () => {
  it('is playable from verified Argentine careers and CPU compatible, and Global stays the default', () => {
    const result = evaluateMode(ARGENTINA_PLAYERS, mode, ARGENTINA_METADATA, ARGENTINA_PLAYERS.map((player) => player.id))
    expect(result.diagnostic.availability).toBe('available')
    expect(result.diagnostic.cpuCompatible).toBe(true)
    expect(result.players).toHaveLength(200)
    expect(catalogForMode('GLOBAL_CLASSIC')).toBe(DRAFT_CATALOG)
    expect(catalogForMode('ARGENTINA_CLUBS')).toHaveLength(200)
    expect(PLAYABLE_MODES.has('ARGENTINA_CURRENT')).toBe(true)
  })
  it('selects by career in Argentina, never by nationality', () => {
    const foreigner = ARGENTINA_PLAYERS.find((player) => player.nationality !== 'ARG')!
    expect(catalogForMode('ARGENTINA_CLUBS')).toContain(foreigner)
    expect(evaluateMode(ARGENTINA_PLAYERS, mode, {}).diagnostic.availability).toBe('metadata_pending')
  })
  it.each(['ARGENTINA_CLUBS', 'ARGENTINA_LEGENDS'] as const)('plays 60 full duels on %s without an illegal team', (modeId) => {
    const catalog = catalogForMode(modeId)
    for (let index = 0; index < 60; index++) {
      const created = createRecruiterDuel(catalog, `arg-mode-${index}`, undefined, { ...CLASSIC_CONFIG, budget: defaultBudgetForMode(modeId) })
      if (!created.ok) throw new Error(`${index}:${created.error}`)
      let game = must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
      for (let step = 0; step < 1500 && game.phase !== 'TEAMS_COMPLETED'; step++) {
        if (game.phase === 'DISCARD_RESULT') { game = must(revealDiscardReplacement(game)); continue }
        if (game.phase === 'NEXT_ROUND') { game = must(revealNextAuctionRound(game)); continue }
        if (game.phase === 'REVEAL_PLAYER') { game = must(beginBidding(game)); continue }
        if (game.phase === 'ROUND_RESULT') { game = must(nextAuctionRound(game, catalog)); continue }
        const who = game.activeParticipant!
        const a = auctionAvailability(game, who, catalog)
        game = a.pass.enabled && (step % 3 !== 0 || !a.bid.enabled) ? must(passAuction(game, who, catalog)) : must(placeBid(game, who, a.minimum, catalog))
      }
      expect(game.phase).toBe('TEAMS_COMPLETED')
      const ids = Object.values(game.teams.recruiter_one.lineup).concat(Object.values(game.teams.recruiter_two.lineup))
      expect(new Set(ids).size).toBe(22)
      expect(game.teams.recruiter_one.spent).toBeLessThanOrEqual(defaultBudgetForMode(modeId))
      expect(game.teams.recruiter_two.spent).toBeLessThanOrEqual(defaultBudgetForMode(modeId))
      if (modeId === 'ARGENTINA_LEGENDS') expect(ids.every((id) => catalog.find((player) => player.id === id)?.category === 'legend')).toBe(true)
      for (const id of ['recruiter_one', 'recruiter_two'] as const) expect(Object.values(game.teams[id].lineup).every((player) => player?.startsWith(modeId === 'ARGENTINA_CLUBS' ? 'arg_' : 'import_arg_'))).toBe(true)
      const played = must(startDuelMatch(game, catalog))
      expect(played.matchResult).not.toBeNull()
    }
  })
})

describe('mode selection in the page', () => {
  beforeEach(() => { localStorage.clear(); vi.spyOn(drawHistory, 'newDrawSeed').mockReturnValue('arg-seed-1') })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); localStorage.clear() })
  it.each([
    ['ARGENTINA_CURRENT', /Argentine league current players 2026/, 'argentina_current'],
    ['ARGENTINA_LEGENDS', /Argentine football legends/, 'argentina_legends'],
  ] as const)('starts %s with the selected collection and its own draw history', async (modeId, label, historySuffix) => {
    vi.useFakeTimers()
    const i18n = await createI18n('en')
    render(<I18nextProvider i18n={i18n}><AuctionPage onDraftFree={vi.fn()} /></I18nextProvider>)
    expect(screen.getByRole('button', { name: /^Global/ })).not.toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /^Argentine league/ }))
    fireEvent.click(screen.getByRole('button', { name: label }))
    fireEvent.click(screen.getByRole('button', { name: 'Start duel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Heads' }))
    act(() => vi.advanceTimersByTime(COIN_TOSS_MS))
    const catalog = catalogForMode(modeId)
    const expected = must(createRecruiterDuel(catalog, 'arg-seed-1', createDrawContext(catalog, []), { ...CLASSIC_CONFIG, budget: defaultBudgetForMode(modeId), coaches: true, coachReserve: 8 }) as AuctionTransition)
    const first = catalog.find((player) => player.id === expected.rounds[0].playerId)!
    expect(screen.getAllByText(first.name).length).toBeGreaterThan(0)
    expect(localStorage.getItem(`reclutador.duel-draws.v1.${historySuffix}`)).not.toBeNull()
    expect(localStorage.getItem('reclutador.duel-draws.v1')).toBeNull()
  })
})
