import { describe, expect, it } from 'vitest'
import { LEAGUE_PLAYERS, LEAGUE_PROVENANCE, IMPORTED_MODE_IDS, defaultBudgetForMode } from './leagueCollections'
import { validatePlayer } from './validatePlayer'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { preflightMatchConfig, CLASSIC_CONFIG } from '../recruiter-duel/matchConfig'
import { createRecruiterDuel, startDuelMatch, startCoinToss, revealCoinToss, beginBidding, nextAuctionRound, passAuction, placeBid, auctionAvailability, revealDiscardReplacement, revealNextAuctionRound } from '../recruiter-duel/auctionEngine'
import type { AuctionTransition } from '../recruiter-duel/auctionTypes'
import { approvedPhoto } from '../recruiter-duel/visualAssets'
import identityAliases from '../../data/league-collections/identityAliases.json'

describe('supplied league collections', () => {
  it('reconciles reviewed career-name variants only in Global Legends and preserves distinct namesakes', () => {
    const legends = catalogForMode('LEGENDS_ONLY')
    const ids = new Set(legends.map((p) => p.id))
    const aliasIds = identityAliases.flat()
    expect(new Set(aliasIds).size).toBe(aliasIds.length)
    for (const group of identityAliases) {
      expect(group.every((id) => LEAGUE_PLAYERS.some((p) => p.id === id && p.category === 'legend'))).toBe(true)
      expect(group.filter((id) => ids.has(id))).toEqual([group[0]])
    }
    expect(legends).toHaveLength(552)
    for (const id of ['import_arg_ley_025', 'import_arg_ley_072', 'import_eng_epl_ley_008', 'import_esp_esp_leg_luis_suarez_miramontes', 'import_bra_bra_leg_ronaldo_luis_nazario_de_lima', 'import_bra_bra_leg_ronaldo_giovanelli']) expect(ids.has(id), id).toBe(true)
    const matheuzinhos = catalogForMode('BRAZIL_CURRENT').filter((p) => p.name === 'Matheuzinho')
    expect(matheuzinhos).toHaveLength(2)
    expect(new Set(matheuzinhos.map((p) => p.id)).size).toBe(2)
  })
  it('imports all 1,200 rows with valid positions, game ratings, prices, provenance and no photos', () => {
    expect(LEAGUE_PLAYERS).toHaveLength(1200)
    const ids = LEAGUE_PLAYERS.map((p) => p.id)
    expect(new Set(ids).size).toBe(1200)
    const issues = LEAGUE_PLAYERS.flatMap((p) => { const result = validatePlayer(p, ids); return result.valid ? [] : [{ id: p.id, issues: result.issues }] })
    expect(issues).toEqual([])
    expect(LEAGUE_PLAYERS.every((p) => approvedPhoto(p.id) === undefined)).toBe(true)
    expect(LEAGUE_PROVENANCE.every((p) => p.sourceRank >= 1 && p.sourceRank <= 150)).toBe(true)
  })
  it.each(IMPORTED_MODE_IDS)('%s supports affordable exclusive teams and simulation', (mode) => {
    const catalog = catalogForMode(mode)
    expect(catalog.length).toBeGreaterThanOrEqual(150)
    if (mode !== 'LEGENDS_ONLY') expect(catalog).toHaveLength(150)
    const config = { ...CLASSIC_CONFIG, budget: defaultBudgetForMode(mode), coaches: true, coachReserve: 8 }
    expect(preflightMatchConfig(catalog, config), mode).toMatchObject({ ok: true })
    for (let index = 0; index < 5; index++) {
      const created = createRecruiterDuel(catalog, `import-${mode}-${index}`, undefined, config)
      expect(created.ok, JSON.stringify(created)).toBe(true)
      if (!created.ok) continue
      const toss = startCoinToss(created.game, 'heads')
      if (!toss.ok) throw new Error(toss.error)
      const revealed = revealCoinToss(toss.game)
      if (!revealed.ok) throw new Error(revealed.error)
      const must = (r: AuctionTransition) => { if (!r.ok) throw new Error(r.error); return r.game }
      let game = must(beginBidding(revealed.game))
      for (let step = 0; step < 300 && game.phase !== 'TEAMS_COMPLETED'; step++) {
        if (game.phase === 'DISCARD_RESULT') { game = must(revealDiscardReplacement(game)); continue }
        if (game.phase === 'NEXT_ROUND') { game = must(revealNextAuctionRound(game)); continue }
        if (game.phase === 'REVEAL_PLAYER') { game = must(beginBidding(game)); continue }
        if (game.phase === 'ROUND_RESULT') { game = must(nextAuctionRound(game, catalog)); continue }
        const who = game.activeParticipant!
        const available = auctionAvailability(game, who, catalog)
        game = available.pass.enabled ? must(passAuction(game, who, catalog)) : must(placeBid(game, who, available.minimum, catalog))
      }
      expect(game.phase).toBe('TEAMS_COMPLETED')
      const played = startDuelMatch(game, catalog, undefined, true)
      expect(played.ok).toBe(true)
      const ids = [...Object.values(game.teams.recruiter_one.lineup), ...Object.values(game.teams.recruiter_two.lineup)]
      expect(new Set(ids).size).toBe(22)
    }
  })
})
