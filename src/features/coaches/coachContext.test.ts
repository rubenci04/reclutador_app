import { describe, expect, it } from 'vitest'
import { coachesForMode } from './coachContext'
import { coachOffers } from '../recruiter-duel/coachHiring'
import { IMPORTED_MODE_IDS } from '../player-catalog/leagueCollections'

describe('league coach offers', () => {
  it.each(IMPORTED_MODE_IDS)('%s offers exactly three distinct contextual cards with an affordable option', (mode) => {
    const pool = coachesForMode(mode)
    expect(pool.length).toBeGreaterThanOrEqual(3)
    const historical = mode.includes('LEGENDS') || mode === 'LEGENDS_ONLY'
    expect(pool.every((coach) => coach.status === (historical ? 'LEGEND' : 'ACTIVE'))).toBe(true)
    for (const reserve of [1, 4, 8]) for (let seed = 0; seed < 20; seed++) {
      const offers = coachOffers(`context-${seed}`, reserve, mode)
      expect(offers).toEqual(coachOffers(`context-${seed}`, reserve, mode))
      for (const side of Object.values(offers)) {
        expect(side).toHaveLength(3)
        expect(new Set(side.map((c) => c.id)).size).toBe(3)
        expect(side.every((c) => pool.some((p) => p.id === c.id))).toBe(true)
        expect(side.some((c) => c.price <= reserve)).toBe(true)
      }
    }
  })
  it('uses Spanish and English career references instead of nationality', () => {
    expect(coachesForMode('SPAIN_LEGENDS').find((c) => c.surname === 'Menotti')?.team).toBe('FC Barcelona')
    expect(coachesForMode('ENGLAND_LEGENDS').find((c) => c.surname === 'Ferguson')?.nationality).toBe('SCO')
    expect(coachesForMode('ARGENTINA_CURRENT').some((c) => c.surname === 'Scaloni')).toBe(false)
  })
})

describe('current editions: at least ten current coaches with a single reference', () => {
  const currentModes = ['ARGENTINA_CURRENT', 'SPAIN_LEAGUE', 'ENGLAND_LEAGUE', 'BRAZIL_CURRENT', 'SOUTH_AMERICA_CURRENT', 'EUROPE_CURRENT', 'GLOBAL_CLASSIC'] as const
  it.each(currentModes)('%s has ten or more current coaches and no second reference', (mode) => {
    const pool = coachesForMode(mode)
    expect(pool.length).toBeGreaterThanOrEqual(10)
    expect(pool.every((coach) => coach.status === 'ACTIVE' && coach.secondaryTeam === undefined && coach.team.length > 0)).toBe(true)
  })
  it('does not show Flick, Guardiola or Enrique with a former club in the Spanish current edition', () => {
    const spain = coachesForMode('SPAIN_LEAGUE')
    expect(spain.find((c) => c.surname === 'Flick')?.team).toBe('FC Barcelona')
    expect(spain.some((c) => ['Guardiola', 'Enrique', 'Aguirre', 'Emery'].includes(c.surname))).toBe(false)
  })
  it('offers three coaches that the recruiter can pay for with what is left', () => {
    for (const mode of currentModes) for (let seed = 0; seed < 10; seed++) {
      const offers = coachOffers(`left-${seed}`, 3, mode, { recruiter_one: 5, recruiter_two: 12 })
      expect(offers.recruiter_one).toHaveLength(3)
      expect(offers.recruiter_one.every((c) => c.price <= 5)).toBe(true)
      expect(offers.recruiter_two.every((c) => c.price <= 12)).toBe(true)
    }
  })
})
