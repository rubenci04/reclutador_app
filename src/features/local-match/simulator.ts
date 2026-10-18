import type { Player } from '../../types/player'
import { summarizeDraft } from '../draft/draftModel'
import { DRAFT_SLOT_IDS, DRAFT_SLOTS, type DraftLineup, type DraftSlotId } from '../draft/draftTypes'
import { eventInfluence } from '../tactics/eventInfluence'
import { NEUTRAL_SELECTION, TACTICS_VERSION, parseStrategySelection, type StrategySelection } from '../tactics/strategies'
import { ZERO_ADJUSTMENT, tacticalAdjustment, tacticalFeatures, type TacticalAdjustment } from '../tactics/tacticalModel'
import { createSeededRandom } from './seededRandom'
import { MATCH_MINUTES, MATCH_RULES_VERSION, type MatchBlock, type MatchEvent, type MatchResult, type MatchSide, type MatchStats, type MatchTeam, type RosterAdvantage, type TeamStrength } from './matchTypes'

export interface SimulationInput {
  readonly localLineup: DraftLineup
  readonly cpuLineup: DraftLineup
  readonly catalog: readonly Player[]
  readonly catalogVersion: 'catalog_v1'
  readonly rulesVersion: typeof MATCH_RULES_VERSION
  readonly seed: string
  /** Optional. Missing means NEUTRAL for both sides (compatibility with stored matches and earlier tests). */
  readonly tactics?: StrategySelection
  /** Duels: gives the side with the better global power a bounded extra. Omitted keeps the classic simulation untouched. */
  readonly rosterBonus?: boolean
  /** Budget the elevens were built under; omitted means the classic budget. */
  readonly budget?: number
  /** Optional substitutes (player ids) per side. Without them the match is exactly the classic one. */
  readonly benches?: Readonly<Record<MatchSide, readonly string[]>>
}

/**
 * Substitution policy (subs-v1). At minutes 45, 60 and 75 each side with unused substitutes makes ONE change with
 * probability SUBSTITUTION_CHANCE: a random unused substitute replaces a random original starter of his own line (never the
 * goalkeeper). A bench of three therefore caps changes at three, a player who left never returns and the side always has
 * eleven. It uses its own seeded stream, so the main match stream and every classic result are untouched.
 */
export const SUBSTITUTION_RULES_VERSION = 'subs-v1' as const
export const SUBSTITUTION_MINUTES: readonly (typeof MATCH_MINUTES)[number][] = [45, 60, 75]
export const SUBSTITUTION_CHANCE = .45

/** Bench of one side: unique catalog players, outside the eleven, with a general position. */
export function isValidBench(bench: readonly string[], lineup: DraftLineup, catalog: readonly Player[]) {
  if (new Set(bench).size !== bench.length || bench.length > 3) return false
  const onPitch = new Set(Object.values(lineup))
  return bench.every((id) => !onPitch.has(id) && catalog.some((player) => player.id === id))
}

const clamp = (value: number, lower: number, upper: number) => Math.max(lower, Math.min(upper, value))

export const ROSTER_BONUS_PER_POINT = 0.8
export const ROSTER_BONUS_CAP = 3
export const ROSTER_BONUS_MIN_DIFFERENCE = 0.5
/** Reward for the better-built roster: 0.8 strength points per global point of difference, at most 3, nothing under 0.5. */
export function rosterAdvantage(localGlobal: number, cpuGlobal: number): RosterAdvantage {
  const difference = Math.round(Math.abs(localGlobal - cpuGlobal) * 10) / 10
  if (difference < ROSTER_BONUS_MIN_DIFFERENCE) return { side: null, bonus: 0, difference }
  return { side: localGlobal > cpuGlobal ? 'local' : 'cpu', bonus: Math.min(ROSTER_BONUS_CAP, Math.round(difference * ROSTER_BONUS_PER_POINT * 10) / 10), difference }
}

/**
 * Engine-boundary check of an organised eleven: exactly the 11 slots, exclusive catalog players, each in a slot of its own line, budget respected.
 * Screen confirmation is a UI step; in the future online mode the server must run this same validation authoritatively.
 */
export function isValidOrganizedLineup(lineup: DraftLineup, catalog: readonly Player[], budget?: number) {
  const keys = Object.keys(lineup)
  if (keys.length !== DRAFT_SLOTS.length || !DRAFT_SLOTS.every((slot) => keys.includes(slot.id))) return false
  if (new Set(DRAFT_SLOTS.map((slot) => lineup[slot.id])).size !== DRAFT_SLOTS.length) return false
  if (!DRAFT_SLOTS.every((slot) => catalog.find((player) => player.id === lineup[slot.id])?.position === slot.position)) return false
  return summarizeDraft(lineup, catalog, budget).canConfirm
}

function teamFrom(lineup: DraftLineup, catalog: readonly Player[], budget?: number): MatchTeam {
  if (!isValidOrganizedLineup(lineup, catalog, budget)) throw new Error('invalid_match_lineup')
  const summary = summarizeDraft(lineup, catalog, budget)
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
  const local = teamFrom(input.localLineup, input.catalog, input.budget)
  const cpu = teamFrom(input.cpuLineup, input.catalog, input.budget)
  const selection = input.tactics === undefined ? NEUTRAL_SELECTION : parseStrategySelection(input.tactics)
  if (!selection) throw new Error('invalid_strategy')
  const benches = input.benches
  if (benches && (!isValidBench(benches.local, input.localLineup, input.catalog) || !isValidBench(benches.cpu, input.cpuLineup, input.catalog))) throw new Error('invalid_match_bench')
  type Side = { team: MatchTeam; strength: TeamStrength; features: ReturnType<typeof tacticalFeatures>; unused: string[]; subbed: boolean; baseMidfield: number }
  const sides: Record<MatchSide, Side> = {
    local: { team: local, strength: calculateTeamStrength(local), features: tacticalFeatures(local.lineup, input.catalog), unused: [...(benches?.local ?? [])], subbed: false, baseMidfield: 0 },
    cpu: { team: cpu, strength: calculateTeamStrength(cpu), features: tacticalFeatures(cpu.lineup, input.catalog), unused: [...(benches?.cpu ?? [])], subbed: false, baseMidfield: 0 },
  }
  const substitutionRandom = benches ? createSeededRandom(`${input.seed}:subs`) : null
  const substitutionLog: { minute: (typeof MATCH_MINUTES)[number]; side: MatchSide; outPlayerId: string; inPlayerId: string }[] = []
  const adjustmentTotals: Record<MatchSide, { attack: number; defense: number; midfield: number }> = { local: { ...ZERO_ADJUSTMENT }, cpu: { ...ZERO_ADJUSTMENT } }
  const strengths = { local: sides.local.strength, cpu: sides.cpu.strength }
  const advantage = input.rosterBonus ? rosterAdvantage(strengths.local.global, strengths.cpu.global) : null
  const extra = (key: MatchSide) => (advantage?.side === key ? advantage.bonus : 0)
  type MutableStats = { -readonly [Key in keyof MatchStats]: MatchStats[Key] }
  const stats: Record<MatchSide, MutableStats> = { local: emptyStats(), cpu: emptyStats() }
  const score = { local: 0, cpu: 0 }
  const random = createSeededRandom(input.seed)
  const blocks: MatchBlock[] = []
  for (const [blockIndex, minute] of MATCH_MINUTES.entries()) {
    const changes: MatchEvent[] = []
    if (substitutionRandom && SUBSTITUTION_MINUTES.includes(minute)) {
      for (const key of ['local', 'cpu'] as const) {
        const state = sides[key]
        if (!state.unused.length || substitutionRandom() >= SUBSTITUTION_CHANCE) continue
        const incomingId = state.unused.splice(Math.floor(substitutionRandom() * state.unused.length), 1)[0]
        const incoming = input.catalog.find((player) => player.id === incomingId)!
        const originals = new Set(Object.values(key === 'local' ? input.localLineup : input.cpuLineup))
        const options = DRAFT_SLOTS.filter((slot) => slot.position === incoming.position && slot.position !== 'ARQ' && originals.has(state.team.lineup[slot.id] ?? ''))
        if (!options.length) continue
        const slot = options[Math.floor(substitutionRandom() * options.length)]
        const outId = state.team.lineup[slot.id]!
        const lineup = { ...state.team.lineup, [slot.id]: incomingId } as DraftLineup
        const players = DRAFT_SLOT_IDS.map((id: DraftSlotId) => input.catalog.find((player) => player.id === lineup[id])!)
        state.team = { ...state.team, lineup, players }
        state.strength = calculateTeamStrength(state.team); state.features = tacticalFeatures(lineup, input.catalog); state.subbed = true
        substitutionLog.push({ minute, side: key, outPlayerId: outId, inPlayerId: incomingId })
        changes.push({ minute, side: key, type: 'substitution', playerId: incomingId, outPlayerId: outId })
      }
    }
    sides.local.baseMidfield += sides.local.strength.midfield; sides.cpu.baseMidfield += sides.cpu.strength.midfield
    const adjustment: Record<MatchSide, TacticalAdjustment> = {
      local: tacticalAdjustment(selection.local, sides.local.features, sides.cpu.features, selection.cpu, blockIndex),
      cpu: tacticalAdjustment(selection.cpu, sides.cpu.features, sides.local.features, selection.local, blockIndex),
    }
    for (const key of ['local', 'cpu'] as const) for (const sector of ['attack', 'defense', 'midfield'] as const) adjustmentTotals[key][sector] += adjustment[key][sector]
    const effective = {
      local: { ...sides.local.strength, attack: sides.local.strength.attack + adjustment.local.attack + extra('local'), defense: sides.local.strength.defense + adjustment.local.defense + extra('local'), midfield: sides.local.strength.midfield + adjustment.local.midfield + extra('local') },
      cpu: { ...sides.cpu.strength, attack: sides.cpu.strength.attack + adjustment.cpu.attack + extra('cpu'), defense: sides.cpu.strength.defense + adjustment.cpu.defense + extra('cpu'), midfield: sides.cpu.strength.midfield + adjustment.cpu.midfield + extra('cpu') },
    }
    const localAttackChance = initiativeChance(effective.local, effective.cpu)
    const side: MatchSide = random() < localAttackChance ? 'local' : 'cpu'
    const opponent: MatchSide = side === 'local' ? 'cpu' : 'local'
    const events: MatchEvent[] = [...changes, event(minute, side, 'attack', attacker(sides[side].team, random))]
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
          events.push(event(minute, side, 'goal', attacker(sides[side].team, random)))
        } else {
          stats[opponent].saves++
          events.push(event(minute, opponent, 'save'))
        }
      } else events.push(event(minute, side, 'shot', attacker(sides[side].team, random)))
    } else {
      stats[opponent].recoveries++
      events.push(event(minute, opponent, 'recovery'))
    }
    if (minute === 90) events.push(event(minute, null, 'final'))
    const narrated = events.map((item) => { const tactic = eventInfluence(item.type, item.side, selection, adjustment); return tactic ? { ...item, tactic } : item })
    blocks.push({ minute, events: narrated, score: { ...score } })
  }
  // Without a change the base midfield is constant; with one it is the block average of the elevens actually on the pitch.
  const meanMidfield = (side: MatchSide) => (sides[side].subbed ? sides[side].baseMidfield / MATCH_MINUTES.length : strengths[side].midfield) + adjustmentTotals[side].midfield / MATCH_MINUTES.length
  const possessionLocal = Math.round(clamp(50 + (meanMidfield('local') - meanMidfield('cpu')) * .6 + (random() - .5) * 4, 36, 64))
  stats.local.possession = possessionLocal; stats.cpu.possession = 100 - possessionLocal
  return {
    catalogVersion: input.catalogVersion, rulesVersion: input.rulesVersion, seed: input.seed, local, cpu, strengths, stats, blocks,
    score, winner: score.local === score.cpu ? 'draw' : score.local > score.cpu ? 'local' : 'cpu',
    ...(benches ? { benches: { local: benches.local.map((id) => input.catalog.find((player) => player.id === id)!), cpu: benches.cpu.map((id) => input.catalog.find((player) => player.id === id)!) }, substitutions: { version: SUBSTITUTION_RULES_VERSION, events: substitutionLog } } : {}),
    ...(advantage ? { rosterAdvantage: advantage } : {}),
    tactics: { version: TACTICS_VERSION, selection: { local: selection.local, cpu: selection.cpu }, adjustments: { local: meanAdjustment(adjustmentTotals.local), cpu: meanAdjustment(adjustmentTotals.cpu) } },
  }
}

export function playerName(eventData: MatchEvent, catalog: readonly Player[]) {
  return eventData.playerId ? catalog.find((player) => player.id === eventData.playerId)?.name : undefined
}
