import type { Player } from '../../../types/player'
import type { DraftLineup } from '../../draft/draftTypes'
import { formationSlots } from '../../tactics/formations'
import { createSession } from './session'
import type { Outcome, SessionInput } from './types'

export const must = <T,>(outcome: Outcome<T>): T => { if (!outcome.ok) throw new Error(outcome.error); return outcome.value }
export function liveInput(seed = 'sim-005'): SessionInput {
  const catalog: Player[] = []
  const lineups = {} as Record<'local' | 'cpu', DraftLineup>
  const benches = {} as Record<'local' | 'cpu', string[]>
  for (const side of ['local', 'cpu'] as const) {
    const add = (position: Player['position'], i: number, r: number) => {
      const id = `live_${side}_${i}`
      catalog.push({ id, name: id, position, era: '2020s', category: 'contemporary', reference_year: 2026, nationality: 'ARG', club_tag: 'SYNTHETIC', overall_rating: r, att_rating: r - 1, def_rating: r - 2, phy_rating: r, men_rating: r + 1, price: 4 })
      return id
    }
    lineups[side] = Object.fromEntries(formationSlots('4-3-3').map((slot, i) => [slot.id, add(slot.position, i, 78 + i % 8)])) as DraftLineup
    benches[side] = (['DEF', 'MED', 'DEL'] as const).map((position, i) => add(position, i + 11, 91))
  }
  return { catalog, localLineup: lineups.local, cpuLineup: lineups.cpu, catalogVersion: 'catalog_v1', rulesVersion: 'local-match-v2', seed, actionModel: 'action-v3', seriesFormat: 'home-away', budget: 150, formations: { local: '4-3-3', cpu: '4-3-3' }, benches, rosterBonus: true, tactics: { version: 'tactics-v1', local: 'HIGH_PRESS', cpu: 'COUNTER_ATTACK' } }
}
export const liveSession = (seed?: string) => must(createSession(liveInput(seed), { sessionId: 'live-fixture', benchMode: { local: 'manual-v1', cpu: 'manual-v1' }, acquisition: { local: { spent: 69, coachPaid: 1, budget: 150 }, cpu: { spent: 70, coachPaid: 0, budget: 150 } } }))
