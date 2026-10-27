import type { Player } from '../../../types/player'
import { formationAffinity, formationSlots } from '../../tactics/formations'
import { DRAFT_SLOT_IDS, type DraftLineup, type DraftSlotId } from '../../draft/draftTypes'
import { NEUTRAL_SELECTION, TACTICS_VERSION, parseStrategySelection } from '../../tactics/strategies'
import { ZERO_ADJUSTMENT, tacticalAdjustment, tacticalFeatures, type TacticalAdjustment } from '../../tactics/tacticalModel'
import { MATCH_MINUTES, MATCH_RULES_VERSION, type MatchBlock, type MatchEvent, type MatchResult, type MatchSide, type MatchTeam, type TeamStrength } from '../matchTypes'
import { createSeededRandom } from '../seededRandom'
import { squadQuality, SQUAD_QUALITY_VERSION } from '../squadQuality'
import { SUBSTITUTION_CHANCE, SUBSTITUTION_MINUTES, SUBSTITUTION_RULES_VERSION, calculateTeamStrength, isValidBench, rosterAdvantage, simulateMatch, teamFrom, type SimulationInput } from '../simulator'
import { ENGINE_VERSION, LINE_WEIGHTS, MIDFIELD_MENTAL_SHARE, SEGMENTS, SHOOTER_RATING_FLOOR, TEMPO } from './engineConstants'
import { possessionShare, runFiguresMatch, type Chance, type FiguresSetup, type Lines, type Moment, type ResolvedMoment } from './figuresModel'

const SIDES = ['local', 'cpu'] as const
const rival = (side: MatchSide): MatchSide => side === 'local' ? 'cpu' : 'local'

/** Weighted mean of a rating over the eleven, each position counting as the line asks: the formation decides how many of each there are. */
function lineMean(players: readonly Player[], weights: Readonly<Record<Player['position'], number>>, rating: (player: Player) => number) {
  let total = 0; let weight = 0
  for (const player of players) { total += rating(player) * weights[player.position]; weight += weights[player.position] }
  return total / weight
}

/** The four lines of an eleven: attack, midfield and defence by weighted mean, goalkeeper by his own rating. */
export function baseLines(players: readonly Player[]): Lines {
  const keeper = players.filter((player) => player.position === 'ARQ')
  return {
    attack: lineMean(players, LINE_WEIGHTS.attack, (p) => p.att_rating),
    midfield: lineMean(players, LINE_WEIGHTS.midfield, (p) => p.men_rating * MIDFIELD_MENTAL_SHARE + p.phy_rating * (1 - MIDFIELD_MENTAL_SHARE)),
    defense: lineMean(players, LINE_WEIGHTS.defense, (p) => p.def_rating),
    keeper: keeper.reduce((sum, p) => sum + p.def_rating, 0) / keeper.length,
  }
}

export interface FiguresOptions {
  /** Quality 0-1 of the moments played by a person, by segment. A human moment without one waits. */
  readonly qualities?: Readonly<Record<number, number>>
  /** Sides whose moments are played by a person. Empty (the default) means the whole match is automatic. */
  readonly humanSides?: readonly MatchSide[]
}
export interface FiguresRun {
  /** The finished match, or null while a human moment waits. */
  readonly result: MatchResult | null
  readonly waiting: Moment | null
  readonly segmentsPlayed: number
  readonly score: Readonly<Record<MatchSide, number>>
}

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0)
const round2 = (value: number) => Math.round(value * 100) / 100

/**
 * Step by step or whole: with no `humanSides` it plays the entire match (CPU, online, tests); with them it returns `waiting` at the first
 * moment of a person that has no quality yet, and the screen calls again with that quality added. Same seed and data, same match.
 */
export function simulateFiguresMatch(input: SimulationInput, options: FiguresOptions = {}): FiguresRun {
  if (input.rulesVersion !== MATCH_RULES_VERSION || input.catalogVersion !== 'catalog_v1') throw new Error('unsupported_match_rules')
  const local = teamFrom(input.localLineup, input.catalog, input.budget, input.formations?.local)
  const cpu = teamFrom(input.cpuLineup, input.catalog, input.budget, input.formations?.cpu)
  const selection = input.tactics === undefined ? NEUTRAL_SELECTION : parseStrategySelection(input.tactics)
  if (!selection) throw new Error('invalid_strategy')
  const benches = input.benches
  if (benches && (!isValidBench(benches.local, input.localLineup, input.catalog) || !isValidBench(benches.cpu, input.cpuLineup, input.catalog))) throw new Error('invalid_match_bench')

  type State = { team: MatchTeam; unused: string[]; features: ReturnType<typeof tacticalFeatures> }
  const states: Record<MatchSide, State> = {
    local: { team: local, unused: [...(benches?.local ?? [])], features: tacticalFeatures(local.lineup, input.catalog, input.formations?.local) },
    cpu: { team: cpu, unused: [...(benches?.cpu ?? [])], features: tacticalFeatures(cpu.lineup, input.catalog, input.formations?.cpu) },
  }
  const strengths = { local: calculateTeamStrength(local), cpu: calculateTeamStrength(cpu) }
  const advantage = input.rosterBonus ? rosterAdvantage(strengths.local.global, strengths.cpu.global) : null
  const quality = { local: squadQuality(local.players), cpu: squadQuality(cpu.players) }
  const extra = (side: MatchSide) => advantage?.side === side ? advantage.bonus : 0
  const coachExtra = (side: MatchSide, sector: keyof TacticalAdjustment) => input.coaches?.[side]?.[sector] ?? 0

  // Substitutions (subs-v1): the same policy and its own stream as the classic simulator; they never depend on the score.
  const substitutionRandom = benches ? createSeededRandom(`${input.seed}:subs`) : null
  const substitutionLog: { minute: (typeof MATCH_MINUTES)[number]; side: MatchSide; outPlayerId: string; inPlayerId: string }[] = []
  const segmentChanges: MatchEvent[][] = []
  const lines: Record<MatchSide, Lines[]> = { local: [], cpu: [] }
  const bonusTotals = { local: { ...ZERO_ADJUSTMENT }, cpu: { ...ZERO_ADJUSTMENT } }
  const qualityTotals = { local: 0, cpu: 0 }
  const lineupsPlayed: Record<MatchSide, MatchTeam[]> = { local: [], cpu: [] }
  for (const [segment, minute] of MATCH_MINUTES.entries()) {
    const changes: MatchEvent[] = []
    if (substitutionRandom && SUBSTITUTION_MINUTES.includes(minute)) {
      for (const side of SIDES) {
        const state = states[side]
        if (!state.unused.length || substitutionRandom() >= SUBSTITUTION_CHANCE) continue
        const incomingId = state.unused.splice(Math.floor(substitutionRandom() * state.unused.length), 1)[0]
        const incoming = input.catalog.find((player) => player.id === incomingId)!
        const originals = new Set(Object.values(side === 'local' ? input.localLineup : input.cpuLineup))
        const options = formationSlots(input.formations?.[side]).filter((slot) => slot.position === incoming.position && slot.position !== 'ARQ' && originals.has(state.team.lineup[slot.id] ?? ''))
        if (!options.length) continue
        const slot = options[Math.floor(substitutionRandom() * options.length)]
        const outId = state.team.lineup[slot.id]!
        const lineup = { ...state.team.lineup, [slot.id]: incomingId } as DraftLineup
        state.team = { ...state.team, lineup, players: DRAFT_SLOT_IDS.map((id: DraftSlotId) => input.catalog.find((player) => player.id === lineup[id])!) }
        state.features = tacticalFeatures(lineup, input.catalog, input.formations?.[side])
        substitutionLog.push({ minute, side, outPlayerId: outId, inPlayerId: incomingId })
        changes.push({ minute, side, type: 'substitution', playerId: incomingId, outPlayerId: outId })
      }
    }
    segmentChanges.push(changes)
    for (const side of SIDES) {
      const state = states[side]
      lineupsPlayed[side].push(state.team)
      const tactic = tacticalAdjustment(selection[side], state.features, states[rival(side)].features, selection[rival(side)], segment)
      const affinity = input.formations ? formationAffinity(input.formations[side], selection[side]) : ZERO_ADJUSTMENT
      const uniform = extra(side) + (input.rosterBonus ? squadQuality(state.team.players).bonus : 0)
      qualityTotals[side] += input.rosterBonus ? squadQuality(state.team.players).bonus : 0
      const delta = {
        attack: uniform + coachExtra(side, 'attack') + tactic.attack + affinity.attack,
        midfield: uniform + coachExtra(side, 'midfield') + tactic.midfield + affinity.midfield,
        defense: uniform + coachExtra(side, 'defense') + tactic.defense + affinity.defense,
      }
      for (const sector of ['attack', 'midfield', 'defense'] as const) bonusTotals[side][sector] += delta[sector]
      const base = baseLines(state.team.players)
      lines[side].push({ attack: base.attack + delta.attack, midfield: base.midfield + delta.midfield, defense: base.defense + delta.defense, keeper: base.keeper + uniform })
    }
  }

  const setup: FiguresSetup = { seed: input.seed, sides: { local: { lines: lines.local, tempo: TEMPO[selection.local] }, cpu: { lines: lines.cpu, tempo: TEMPO[selection.cpu] } } }
  const progress = runFiguresMatch(setup, options.qualities, options.humanSides)
  if (!progress.finished) return { result: null, waiting: progress.waiting, segmentsPlayed: progress.segments.length, score: progress.score }

  // Events and statistics come from the same chances that decided the score.
  const shooter = (side: MatchSide, segment: number, roll: number) => {
    const attacking = lineupsPlayed[side][segment].players.filter((player) => player.position === 'DEL' || player.position === 'MED')
    const weights = attacking.map((player) => Math.max(1, player.att_rating - SHOOTER_RATING_FLOOR) ** 2)
    let ticket = roll * sum(weights)
    for (let index = 0; index < attacking.length; index++) { ticket -= weights[index]; if (ticket <= 0) return attacking[index] }
    return attacking[attacking.length - 1]
  }
  const stats = { local: { shots: 0, shotsOnTarget: 0, saves: 0, recoveries: 0, corners: 0, possession: 50 }, cpu: { shots: 0, shotsOnTarget: 0, saves: 0, recoveries: 0, corners: 0, possession: 50 } }
  const eventsOf = (chance: Chance, minute: (typeof MATCH_MINUTES)[number]): MatchEvent[] => {
    const side = chance.side; const other = rival(side)
    const player = shooter(side, chance.segment, chance.shooterRoll)
    stats[side].shots++
    if (chance.kind === 'corner') stats[side].corners++
    const attack: MatchEvent = { minute, side, type: 'attack', playerId: player.id, ...(chance.kind === 'free-kick' || chance.kind === 'penalty' ? { setPiece: chance.kind } : {}) }
    // One playback frame per chance starts at its attack event; a corner follows it.
    const opening: MatchEvent[] = chance.kind === 'corner' ? [attack, { minute, side, type: 'corner' }] : [attack]
    if (chance.outcome === 'goal') { stats[side].shotsOnTarget++; return [...opening, { minute, side, type: 'goal', playerId: player.id }] }
    if (chance.outcome === 'save') { stats[side].shotsOnTarget++; stats[other].saves++; return [...opening, { minute, side: other, type: 'save' }] }
    if (chance.outcome === 'blocked') { stats[other].recoveries++; return [...opening, { minute, side: other, type: 'recovery' }] }
    return [...opening, { minute, side, type: 'shot', playerId: player.id }]
  }
  const blocks: MatchBlock[] = progress.segments.map((segment) => {
    const minute = MATCH_MINUTES[segment.segment]
    const events = [...segmentChanges[segment.segment], ...segment.chances.flatMap((chance) => eventsOf(chance, minute))]
    if (minute === 90) events.push({ minute, side: null, type: 'final' })
    return { minute, events, score: { ...segment.score } }
  })
  const possessionLocal = possessionShare(setup, progress)
  stats.local.possession = possessionLocal; stats.cpu.possession = 100 - possessionLocal

  const mean = (total: number) => total / SEGMENTS
  const effective = (side: MatchSide): TeamStrength => {
    const sectors = { attack: strengths[side].attack + mean(bonusTotals[side].attack), defense: strengths[side].defense + mean(bonusTotals[side].defense), midfield: strengths[side].midfield + mean(bonusTotals[side].midfield) }
    return { ...sectors, global: Math.round((sectors.attack + sectors.defense + sectors.midfield) / 3 * 10) / 10 }
  }
  const meanAdjustment = (side: MatchSide): TacticalAdjustment => ({ attack: round2(mean(bonusTotals[side].attack)), defense: round2(mean(bonusTotals[side].defense)), midfield: round2(mean(bonusTotals[side].midfield)) })
  const score = progress.score
  const moments: ResolvedMoment[] = progress.segments.flatMap((segment) => segment.moment ? [segment.moment] : [])
  const result: MatchResult = {
    engineVersion: ENGINE_VERSION, moments,
    catalogVersion: input.catalogVersion, rulesVersion: input.rulesVersion, seed: input.seed, local: lineupsPlayed.local[0], cpu: lineupsPlayed.cpu[0], strengths, stats, blocks,
    ...(input.seriesFormat ? { seriesFormat: input.seriesFormat } : {}),
    ...(input.formations ? { formations: input.formations } : {}),
    ...(input.actionModel ? { actionModel: input.actionModel } : {}),
    score, winner: score.local === score.cpu ? 'draw' : score.local > score.cpu ? 'local' : 'cpu',
    ...(input.rosterBonus || input.coaches ? { effectiveStrengths: { local: effective('local'), cpu: effective('cpu') } } : {}),
    ...(benches ? { benches: { local: benches.local.map((id) => input.catalog.find((player) => player.id === id)!), cpu: benches.cpu.map((id) => input.catalog.find((player) => player.id === id)!) }, substitutions: { version: SUBSTITUTION_RULES_VERSION, events: substitutionLog } } : {}),
    ...(advantage ? { rosterAdvantage: advantage } : {}),
    ...(input.coaches && (input.coaches.local || input.coaches.cpu) ? { coaches: input.coaches } : {}),
    ...(input.rosterBonus ? { quality: { version: SQUAD_QUALITY_VERSION, initial: quality, meanBonus: { local: round2(mean(qualityTotals.local)), cpu: round2(mean(qualityTotals.cpu)) } } } : {}),
    tactics: { version: TACTICS_VERSION, selection: { local: selection.local, cpu: selection.cpu }, adjustments: { local: meanAdjustment('local'), cpu: meanAdjustment('cpu') } },
  }
  return { result, waiting: null, segmentsPlayed: SEGMENTS, score }
}

/** The one door for new matches: the figures engine when asked for, the frozen classic simulator otherwise (stored matches never change). */
export function playMatch(input: SimulationInput): MatchResult {
  return input.engineVersion === ENGINE_VERSION ? simulateFiguresMatch(input).result! : simulateMatch(input)
}
