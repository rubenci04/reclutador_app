import { expect, it } from 'vitest'
import { COACH_CATALOG, EXTRA_COACHES } from './coachCatalog'
import { COACH_TIER_PRICE } from './coachRules'

it('offers an explicit elite majority while preserving the 120 coach identities and affordable prices', () => {
  const all = [...COACH_CATALOG, ...EXTRA_COACHES]
  const stars = all.filter((c) => c.tier === 'S')
  console.info('Coach coverage', { total: all.length, stars: stars.length, currentStars: stars.filter((c) => c.status === 'ACTIVE').length })
  expect(all).toHaveLength(120)
  expect(new Set(all.map((c) => c.id)).size).toBe(all.length)
  expect(stars.length / all.length).toBeGreaterThanOrEqual(.5)
  expect(stars.length / all.length).toBeLessThanOrEqual(.6)
  expect(stars.filter((c) => c.status === 'ACTIVE').length).toBeGreaterThanOrEqual(20)
  expect(all.filter((c) => c.status === 'LEGEND').every((c) => c.tier === 'S')).toBe(true)
  for (const coach of all) expect(coach.price).toBe(COACH_TIER_PRICE[coach.tier])
})
