import { expect, it } from 'vitest'
import { COACH_CATALOG, EXTRA_COACHES } from './coachCatalog'
import { COACH_TIER_PRICE } from './coachRules'

it('offers an explicit elite majority while preserving the 120 coach identities and affordable prices', () => {
  // coach-market-v3 additions (coach_v3_*) only enter v3 pools; the historical catalogue keeps its 120 identities.
  const all = [...COACH_CATALOG, ...EXTRA_COACHES].filter((c) => !c.id.startsWith('coach_v3_'))
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
