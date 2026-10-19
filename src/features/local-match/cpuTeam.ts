import { DRAFT_BUDGET_MILLIONS } from '../../data/catalogRules'
import type { Player } from '../../types/player'
import { summarizeDraft } from '../draft/draftModel'
import { DRAFT_SLOTS, type DraftLineup } from '../draft/draftTypes'
import { createSeededRandom, shuffleSeeded } from './seededRandom'
import type { MatchTeam } from './matchTypes'

export interface CpuTeamBuild {
  readonly team: MatchTeam
  readonly seed: string
  readonly targetReached: boolean
  /** Dynamic-programming passes; bounded by 11 slots and the 100M cap. */
  readonly attempts: number
}

function emptyLineup(): DraftLineup {
  return Object.fromEntries(DRAFT_SLOTS.map((slot) => [slot.id, null])) as DraftLineup
}

function toTeam(lineup: DraftLineup, catalog: readonly Player[], budget: number): MatchTeam | null {
  const summary = summarizeDraft(lineup, catalog, budget)
  if (!summary.canConfirm) return null
  return { lineup, players: summary.selectedPlayers, spent: summary.spent, averageRating: summary.averageRating ?? 0 }
}

/** A bounded seeded price-state search. It proves whether a 95–100M 4-3-3 exists before falling back below 95M. */
export function generateCpuTeam(catalog: readonly Player[], seed: string, budget: number = DRAFT_BUDGET_MILLIONS): CpuTeamBuild {
  const random = createSeededRandom(seed)
  const byPosition = new Map(['ARQ', 'DEF', 'MED', 'DEL'].map((position) => [position, catalog.filter((player) => player.position === position)]))
  if (byPosition.get('ARQ')!.length < 1 || byPosition.get('DEF')!.length < 4 || byPosition.get('MED')!.length < 3 || byPosition.get('DEL')!.length < 3) throw new Error('cpu_catalog_incomplete')
  let states = new Map<number, DraftLineup>([[0, emptyLineup()]])
  for (const slot of DRAFT_SLOTS) {
    const next = new Map<number, DraftLineup>()
    const options = shuffleSeeded(byPosition.get(slot.position)!, random)
    for (const [spent, lineup] of states) for (const player of options) {
      if (Object.values(lineup).includes(player.id)) continue
      const cost = spent + player.price
      if (cost > budget) continue
      // One seeded representative per amount is enough because positions never overlap.
      if (!next.has(cost) || random() < .35) next.set(cost, { ...lineup, [slot.id]: player.id })
    }
    states = next
  }
  const targetCosts = [...states.keys()].filter((cost) => cost >= budget - 5 && cost <= budget).sort((left, right) => left - right)
  const availableCosts = [...states.keys()].sort((left, right) => right - left)
  const chosenCost = targetCosts.length ? targetCosts[Math.floor(random() * targetCosts.length)] : availableCosts[0]
  const team = chosenCost === undefined ? null : toTeam(states.get(chosenCost)!, catalog, budget)
  if (!team) throw new Error('cpu_team_unavailable')
  return { team, seed, targetReached: targetCosts.length > 0, attempts: DRAFT_SLOTS.length }
}
