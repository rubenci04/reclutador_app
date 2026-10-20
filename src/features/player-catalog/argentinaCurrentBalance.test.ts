import { expect, it } from 'vitest'
import { LEAGUE_PLAYERS, LEAGUE_PROVENANCE, importedPlayersForMode } from './leagueCollections'
import { ARGENTINA_CURRENT_RATINGS } from './argentinaCurrentBalance'
import { calculatePlayerPrice } from './calculatePlayerPrice'
import { catalogForMode, modeSource } from '../themed-modes/modeCatalog'
import { validatePlayer } from './validatePlayer'

it('balances the 150 current Argentine players with explicit choices and varied editorial bands', () => {
  const players = catalogForMode('ARGENTINA_CURRENT')
  expect(players).toHaveLength(150)
  expect(modeSource('ARGENTINA_CURRENT').players).toBe(players)
  expect(importedPlayersForMode('ARGENTINA_CURRENT')).toBe(players)
  for (const [id, rating] of Object.entries(ARGENTINA_CURRENT_RATINGS)) expect(players.find((p) => p.id === id)?.overall_rating).toBe(rating)
  expect(players.filter((p) => p.overall_rating === 75)).toHaveLength(20)
  expect(new Set(players.map((p) => p.overall_rating)).size).toBe(11)
  expect([...players].sort((a, b) => b.overall_rating - a.overall_rating).slice(0, 2).map((p) => p.id)).toEqual(['import_arg_act_002', 'import_arg_act_001'])
  for (const player of players) {
    const base = LEAGUE_PLAYERS.find((p) => p.id === player.id)!
    expect({ ...player, overall_rating: base.overall_rating, att_rating: base.att_rating, def_rating: base.def_rating, phy_rating: base.phy_rating, men_rating: base.men_rating, price: base.price }).toEqual(base)
    expect(player.price).toBe(calculatePlayerPrice(player.overall_rating))
    expect(validatePlayer(player, players.map((p) => p.id)).valid).toBe(true)
  }
  expect(LEAGUE_PROVENANCE.find((p) => p.id === 'import_arg_act_002')?.sourceRating).toBe(81)
  expect(importedPlayersForMode('ARGENTINA_LEGENDS')!.every((p) => LEAGUE_PLAYERS.includes(p))).toBe(true)
})
