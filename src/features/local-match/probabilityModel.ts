import type { TeamStrength } from './matchTypes'

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))
/** action-v3: effective global is the main signal; sector matchups still matter.
 * A 2-point advantage is meaningful even when concentrated in midfield.
 * No outcome correction, streak protection or guaranteed winner is applied.
 */
export function opportunityChances(local: TeamStrength, cpu: TeamStrength) {
  const gap = local.global - cpu.global
  const sectorEdge = ((local.attack - cpu.defense) - (cpu.attack - local.defense)) / 2
  return clamp(.5 + gap * .065 + clamp(sectorEdge, -10, 10) * .002, .15, .85)
}
export function finishingChance(own: TeamStrength, rival: TeamStrength, stars: number) {
  return clamp(.30 + (own.global - rival.global) * .018 + clamp(own.attack - rival.defense, -15, 15) / 250 + Math.min(3, stars) * .012, .16, .52)
}
