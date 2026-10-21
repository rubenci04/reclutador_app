import { describe, expect, it } from 'vitest'
import { clubRepeats, spreadClubs } from './clubSpread'
import { createRecruiterDuel } from './auctionEngine'
import { CLASSIC_CONFIG } from './matchConfig'
import { createDrawContext, CURRENT_DRAW_POLICY, parseReplay } from './drawHistory'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { canonicalClubKey } from '../player-catalog/clubKey'
import { createSeededRandom, shuffleSeeded } from '../local-match/seededRandom'
import type { ThemedModeId } from '../themed-modes/modeTypes'

const config = { ...CLASSIC_CONFIG, budget: 150, coaches: true, coachReserve: 8 }
const club = (card: string) => card[0]

describe('club-spread-v3 ordering', () => {
  it('leaves no equal neighbours whenever an arrangement exists', () => {
    for (let index = 0; index < 60; index++) {
      const random = createSeededRandom(`spread-${index}`)
      const clubs = Array.from({ length: 22 }, () => 'ABCDEFGH'[Math.floor(random() * 5)] + Math.floor(random() * 20))
      const cards = clubs.map((value, i) => `${value[0]}${i}`)
      const counts = new Map<string, number>(); for (const card of cards) counts.set(club(card), (counts.get(club(card)) ?? 0) + 1)
      const feasible = Math.max(...counts.values()) <= Math.ceil(cards.length / 2)
      const { order, repeats } = spreadClubs(shuffleSeeded(cards, random), club)
      expect(order).toHaveLength(22)
      expect([...order].sort()).toEqual([...cards].sort())
      expect(clubRepeats(order, club)).toBe(repeats)
      if (feasible) expect(repeats, cards.join()).toBe(0)
    }
  })
  it('minimises and reports the repeats when no clash-free sequence exists, and is deterministic', () => {
    const cards = ['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'C1']
    const first = spreadClubs(cards, club), second = spreadClubs(cards, club)
    expect(first).toEqual(second)
    expect(first.repeats).toBe(2) // five A split by two other cards form three groups: the minimum is 5 - 3 = 2 adjacent pairs
    expect(first.order).toHaveLength(7)
  })
  it('compares canonical club ids, not texts: reviewed aliases are the same club', () => {
    expect(canonicalClubKey('atletico_madrid')).toBe(canonicalClubKey('atletico_de_madrid'))
    expect(canonicalClubKey('barcelona')).toBe(canonicalClubKey('fc_barcelona'))
    expect(canonicalClubKey('real_madrid')).not.toBe(canonicalClubKey('barcelona'))
  })
})

describe('club-spread-v3 in new draws', () => {
  const modes = ['GLOBAL_CLASSIC', 'EUROPE_CURRENT', 'SPAIN_LEAGUE', 'ITALY_CURRENT', 'ARGENTINA_CURRENT'] as const satisfies readonly ThemedModeId[]
  it.each(modes)('%s: same cards as the earlier policy, no consecutive same-club pairs, reproducible', (mode) => {
    const pool = catalogForMode(mode)
    for (let index = 0; index < 15; index++) {
      const seed = `club-${mode}-${index}`
      const before = createRecruiterDuel(pool, seed, createDrawContext(pool, [], 'rarity-v2'), config)
      const after = createRecruiterDuel(pool, seed, createDrawContext(pool, [], CURRENT_DRAW_POLICY), config)
      expect(before.ok && after.ok).toBe(true)
      if (!before.ok || !after.ok) continue
      expect(after.game.rounds.map((r) => r.playerId).sort()).toEqual(before.game.rounds.map((r) => r.playerId).sort())
      expect(after.game.rounds.map((r) => r.position).sort()).toEqual(before.game.rounds.map((r) => r.position).sort())
      const clubOf = (round: { playerId: string }) => canonicalClubKey(pool.find((p) => p.id === round.playerId)!.club_tag)
      const repeats = clubRepeats(after.game.rounds, clubOf)
      expect(repeats).toBe(after.game.drawDiagnostics?.clubRepeats)
      const counts = new Map<string, number>(); for (const round of after.game.rounds) counts.set(clubOf(round), (counts.get(clubOf(round)) ?? 0) + 1)
      if (Math.max(...counts.values()) <= 11) expect(repeats, seed).toBe(0)
      expect(before.game.drawDiagnostics?.clubRepeats).toBeUndefined()
      expect(createRecruiterDuel(pool, seed, createDrawContext(pool, [], CURRENT_DRAW_POLICY), config)).toEqual(after)
    }
  })
  it('keeps earlier draw contexts and replays valid and unchanged', () => {
    const pool = catalogForMode('SPAIN_LEAGUE')
    const old = createDrawContext(pool, [], 'rarity-v2')
    expect(parseReplay(JSON.stringify({ seed: 'old', context: old }), pool)).not.toBeNull()
    expect(parseReplay(JSON.stringify({ seed: 'new', context: createDrawContext(pool, [], CURRENT_DRAW_POLICY) }), pool)).not.toBeNull()
    expect(createRecruiterDuel(pool, 'old', old, config)).toEqual(createRecruiterDuel(pool, 'old', structuredClone(old), config))
  })
})
