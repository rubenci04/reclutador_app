import type { Player } from '../../types/player'
import { summarizeDraft } from '../draft/draftModel'
import { DRAFT_SLOTS, type DraftLineup } from '../draft/draftTypes'
import { NEUTRAL_SELECTION, TACTICS_VERSION, parseStrategySelection, type StrategySelection } from '../tactics/strategies'
import { ZERO_ADJUSTMENT, tacticalAdjustment, tacticalFeatures, type TacticalAdjustment } from '../tactics/tacticalModel'
import { createSeededRandom } from './seededRandom'
import { MATCH_MINUTES, MATCH_RULES_VERSION, type MatchBlock, type MatchEvent, type MatchResult, type MatchSide, type MatchStats, type MatchTeam, type TeamStrength } from './matchTypes'

export interface SimulationInput {
  readonly localLineup: DraftLineup
  readonly cpuLineup: DraftLineup
  readonly catalog: readonly Player[]
  readonly catalogVersion: 'catalog_v1'
  readonly rulesVersion: typeof MATCH_RULES_VERSION
  readonly seed: string
  /** Optional. Missing means NEUTRAL for both sides (compatibility with stored matches and earlier tests). */
  readonly tactics?: StrategySelection
}

const clamp = (value: number, lower: number, upper: number) => Math.max(lower, Math.min(upper, value))

/**
 * Engine-boundary check of an organised eleven: exactly the 11 slots, exclusive catalog players, each in a slot of its own line, budget respected.
 * Screen confirmation is a UI step; in the future online mode the server must run this same validation authoritatively.
 */
export function isValidOrganizedLineup(lineup: DraftLineup, catalog: readonly Player[]) {
  const keys = Object.keys(lineup)
  if (keys.length !== DRAFT_SLOTS.length || !DRAFT_SLOTS.every((slot) => keys.includes(slot.id))) return false
  if (new Set(DRAFT_SLOTS.map((slot) => lineup[slot.id])).size !== DRAFT_SLOTS.length) return false
  if (!DRAFT_SLOTS.every((slot) => catalog.find((player) => player.id === lineup[slot.id])?.position === slot.position)) return false
  return summarizeDraft(lineup, catalog).canConfirm
}

function teamFrom(lineup: DraftLineup, catalog: readonly Player[]): MatchTeam {
  if (!isValidOrganizedLineup(lineup, catalog)) throw new Error('invalid_match_lineup')
  const summary = summarizeDraft(lineup, catalog)
  return { lineup, players: summary.selectedPlayers, spent: summary.spent, averageRating: summary.averageRating ?? 0 }
}

function average(players: readonly Player[], attribute: keyof Pick<Player, 'att_rating' | 'def_rating' | 'phy_rating' | 'men_rating'>) {
  return players.reduce((total, player) => total + player[attribute], 0) / players.length
}

export function calculateTeamStrength(team: MatchTeam): TeamStrength {
  const group = (position: Player['position']) => team.players.filter((player) => player.position === position)
  const attack = average(group('DEL'), 'att_rating') * .55 + average(group('MED'), 'att_rating') * .25 + average(group('DEF'), 'att_rating') * .1 + average(group('ARQ'), 'att_rating') * .1
  const defense = average(group('ARQ'), 'def_rating') * .3 + average(group('DEF'), 'def_rating') * .48 + average(group('MED'), 'def_rating') * .16 + average(group('DEL'), 'def_rating') * .06
  const midfield = average(group('MED'), 'men_rating') * .45 + average(group('MED'), 'phy_rating') * .2 + average(group('DEF'), 'men_rating') * .15 + average(group('DEL'), 'men_rating') * .1 + average(group('ARQ'), 'men_rating') * .1
  const sectors = { attack: Math.round(attack), defense: Math.round(defense), midfield: Math.round(midfield) }
  return { ...sectors, global: Math.round((sectors.attack + sectors.defense + sectors.midfield) / 3 * 10) / 10 }
}

/** Symmetric comparison of both attack-defense margins; swapping sides complements it. */
export function initiativeChance(local: TeamStrength, cpu: TeamStrength) {
  const pressure = ((local.attack - cpu.defense) - (cpu.attack - local.defense)) / 2 + (local.midfield - cpu.midfield) * .45
  return clamp(.5 + pressure / 150, .24, .76)
}

function event(minute: MatchEvent['minute'], side: MatchSide | null, type: MatchEvent['type'], player?: Player): MatchEvent {
  return { minute, side, type, ...(player ? { playerId: player.id } : {}) }
}

function attacker(team: MatchTeam, random: () => number) {
  const attacking = team.players.filter((player) => player.position === 'DEL' || player.position === 'MED')
  return attacking[Math.floor(random() * attacking.length)]
}

function emptyStats(): MatchStats { return { shots: 0, shotsOnTarget: 0, saves: 0, recoveries: 0, possession: 50 } }

const meanAdjustment = (total: TacticalAdjustment): TacticalAdjustment => ({ attack: Math.round(total.attack / MATCH_MINUTES.length * 100) / 100, defense: Math.round(total.defense / MATCH_MINUTES.length * 100) / 100, midfield: Math.round(total.midfield / MATCH_MINUTES.length * 100) / 100 })

/** Pure deterministic simulator. Events and statistics are emitted from the same block decisions. */
export function simulateMatch(input: SimulationInput): MatchResult {
  if (input.rulesVersion !== MATCH_RULES_VERSION || input.catalogVersion !== 'catalog_v1') throw new Error('unsupported_match_rules')
  const local = teamFrom(input.localLineup, input.catalog)
  const cpu = teamFrom(input.cpuLineup, input.catalog)
  const selection = input.tactics === undefined ? NEUTRAL_SELECTION : parseStrategySelection(input.tactics)
  if (!selection) throw new Error('invalid_strategy')
  const teams = { local, cpu } as const
  const features = { local: tacticalFeatures(local.lineup, input.catalog), cpu: tacticalFeatures(cpu.lineup, input.catalog) }
  const adjustmentTotals: Record<MatchSide, { attack: number; defense: number; midfield: number }> = { local: { ...ZERO_ADJUSTMENT }, cpu: { ...ZERO_ADJUSTMENT } }
  const strengths = { local: calculateTeamStrength(local), cpu: calculateTeamStrength(cpu) }
  type MutableStats = { -readonly [Key in keyof MatchStats]: MatchStats[Key] }
  const stats: Record<MatchSide, MutableStats> = { local: emptyStats(), cpu: emptyStats() }
  const score = { local: 0, cpu: 0 }
  const random = createSeededRandom(input.seed)
  const blocks: MatchBlock[] = []
  for (const [blockIndex, minute] of MATCH_MINUTES.entries()) {
    const adjustment: Record<MatchSide, TacticalAdjustment> = {
      local: tacticalAdjustment(selection.local, features.local, features.cpu, selection.cpu, blockIndex),
      cpu: tacticalAdjustment(selection.cpu, features.cpu, features.local, selection.local, blockIndex),
    }
    for (const key of ['local', 'cpu'] as const) for (const sector of ['attack', 'defense', 'midfield'] as const) adjustmentTotals[key][sector] += adjustment[key][sector]
    const effective = {
      local: { ...strengths.local, attack: strengths.local.attack + adjustment.local.attack, defense: strengths.local.defense + adjustment.local.defense, midfield: strengths.local.midfield + adjustment.local.midfield },
      cpu: { ...strengths.cpu, attack: strengths.cpu.attack + adjustment.cpu.attack, defense: strengths.cpu.defense + adjustment.cpu.defense, midfield: strengths.cpu.midfield + adjustment.cpu.midfield },
    }
    const localAttackChance = initiativeChance(effective.local, effective.cpu)
    const side: MatchSide = random() < localAttackChance ? 'local' : 'cpu'
    const opponent: MatchSide = side === 'local' ? 'cpu' : 'local'
    const events: MatchEvent[] = [event(minute, side, 'attack', attacker(teams[side], random))]
    const shootingPower = effective[side].attack + effective[side].midfield * .16
    const resistance = effective[opponent].defense + effective[opponent].midfield * .12
    const shotChance = clamp(.65 + (shootingPower - resistance) / 180 + (random() - .5) * .2, .35, .86)
    if (random() < shotChance) {
      stats[side].shots++
      const onTarget = random() < clamp(.65 + (shootingPower - resistance) / 220, .38, .84)
      if (onTarget) {
        stats[side].shotsOnTarget++
        const goalChance = clamp(.4 + (shootingPower - resistance) / 240 + (random() - .5) * .12, .14, .62)
        if (random() < goalChance) {
          score[side]++
          events.push(event(minute, side, 'goal', attacker(teams[side], random)))
        } else {
          stats[opponent].saves++
          events.push(event(minute, opponent, 'save'))
        }
      } else events.push(event(minute, side, 'shot', attacker(teams[side], random)))
    } else {
      stats[opponent].recoveries++
      events.push(event(minute, opponent, 'recovery'))
    }
    if (minute === 90) events.push(event(minute, null, 'final'))
    blocks.push({ minute, events, score: { ...score } })
  }
  const meanMidfield = (side: MatchSide) => strengths[side].midfield + adjustmentTotals[side].midfield / MATCH_MINUTES.length
  const possessionLocal = Math.round(clamp(50 + (meanMidfield('local') - meanMidfield('cpu')) * .6 + (random() - .5) * 4, 36, 64))
  stats.local.possession = possessionLocal; stats.cpu.possession = 100 - possessionLocal
  return {
    catalogVersion: input.catalogVersion, rulesVersion: input.rulesVersion, seed: input.seed, local, cpu, strengths, stats, blocks,
    score, winner: score.local === score.cpu ? 'draw' : score.local > score.cpu ? 'local' : 'cpu',
    tactics: { version: TACTICS_VERSION, selection: { local: selection.local, cpu: selection.cpu }, adjustments: { local: meanAdjustment(adjustmentTotals.local), cpu: meanAdjustment(adjustmentTotals.cpu) } },
  }
}

export function playerName(eventData: MatchEvent, catalog: readonly Player[]) {
  return eventData.playerId ? catalog.find((player) => player.id === eventData.playerId)?.name : undefined
}
