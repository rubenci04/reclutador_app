import type { Player } from '../../../types/player'
import { opportunityChances, finishingChance } from '../probabilityModel'
import { formationSlots, formationAffinity, type FormationId } from '../../tactics/formations'
import { summarizeDraft } from '../../draft/draftModel'
import { DRAFT_SLOT_IDS, type DraftLineup, type DraftSlotId } from '../../draft/draftTypes'
import { eventInfluence } from '../../tactics/eventInfluence'
import { NEUTRAL_SELECTION, TACTICS_VERSION, parseStrategySelection } from '../../tactics/strategies'
import { ZERO_ADJUSTMENT, tacticalAdjustment, tacticalFeatures, type TacticalAdjustment } from '../../tactics/tacticalModel'
import { initialCheckpoint, nextCheckpoint } from './random'
import { calculateTeamStrength, initiativeChance, rosterAdvantage, isValidOrganizedLineup, isValidBench, SUBSTITUTION_MINUTES, SUBSTITUTION_CHANCE, SUBSTITUTION_RULES_VERSION, type SimulationInput } from '../simulator'
import { composeStrength, squadQuality, SQUAD_QUALITY_VERSION } from '../squadQuality'
import { MATCH_MINUTES, MATCH_RULES_VERSION, type MatchBlock, type MatchEvent, type MatchResult, type MatchSide, type MatchStats, type MatchTeam, type TeamStrength } from '../matchTypes'

const clamp = (value: number, lower: number, upper: number) => Math.max(lower, Math.min(upper, value))

function teamFrom(lineup: DraftLineup, catalog: readonly Player[], budget?: number, formation?: FormationId): MatchTeam {
  if (!isValidOrganizedLineup(lineup, catalog, budget, formation)) throw new Error('invalid_match_lineup')
  const summary = summarizeDraft(lineup, catalog, budget)
  return { lineup, players: summary.selectedPlayers, spent: summary.spent, averageRating: summary.averageRating ?? 0 }
}

function event(minute: MatchEvent['minute'], side: MatchSide | null, type: MatchEvent['type'], player?: Player): MatchEvent {
  return { minute, side, type, ...(player ? { playerId: player.id } : {}) }
}

function attacker(team: MatchTeam, random: () => number, weighted = false) {
  const attacking = team.players.filter((player) => player.position === 'DEL' || player.position === 'MED')
  if (weighted) {
    const weights = attacking.map((p) => Math.max(1, p.att_rating - 60) ** 2)
    let ticket = random() * weights.reduce((a, b) => a + b, 0)
    for (let i = 0; i < attacking.length; i++) { ticket -= weights[i]; if (ticket <= 0) return attacking[i] }
    return attacking[attacking.length - 1]
  }
  return attacking[Math.floor(random() * attacking.length)]
}

function emptyStats(): MatchStats { return { shots: 0, shotsOnTarget: 0, saves: 0, recoveries: 0, possession: 50 } }

const meanAdjustment = (total: TacticalAdjustment): TacticalAdjustment => ({ attack: Math.round(total.attack / MATCH_MINUTES.length * 100) / 100, defense: Math.round(total.defense / MATCH_MINUTES.length * 100) / 100, midfield: Math.round(total.midfield / MATCH_MINUTES.length * 100) / 100 })


type Side = { team: MatchTeam; strength: TeamStrength; features: ReturnType<typeof tacticalFeatures>; unused: string[]; subbed: boolean; baseMidfield: number }

/** Version-frozen block adapter. Historical batch API stays untouched as regression oracle. */
export function initializeKernel(source: SimulationInput) {
  const input = structuredClone(source)
  if (input.rulesVersion !== MATCH_RULES_VERSION || input.catalogVersion !== 'catalog_v1') throw new Error('unsupported_match_rules')
  const local = teamFrom(input.localLineup, input.catalog, input.budget, input.formations?.local)
  const cpu = teamFrom(input.cpuLineup, input.catalog, input.budget, input.formations?.cpu)
  const selection = input.tactics === undefined ? NEUTRAL_SELECTION : parseStrategySelection(input.tactics)
  if (!selection) throw new Error('invalid_strategy')
  const benches = input.benches
  if (benches && (!isValidBench(benches.local, input.localLineup, input.catalog) || !isValidBench(benches.cpu, input.cpuLineup, input.catalog))) throw new Error('invalid_match_bench')
  const sides: Record<MatchSide, Side> = {
    local: { team: local, strength: calculateTeamStrength(local), features: tacticalFeatures(local.lineup, input.catalog, input.formations?.local), unused: [...(benches?.local ?? [])], subbed: false, baseMidfield: 0 },
    cpu: { team: cpu, strength: calculateTeamStrength(cpu), features: tacticalFeatures(cpu.lineup, input.catalog, input.formations?.cpu), unused: [...(benches?.cpu ?? [])], subbed: false, baseMidfield: 0 },
  }
  const substitutionRandom = benches ? initialCheckpoint(`${input.seed}:subs`) : null
  const substitutionLog: { minute: (typeof MATCH_MINUTES)[number]; side: MatchSide; outPlayerId: string; inPlayerId: string }[] = []
  const adjustmentTotals: Record<MatchSide, { attack: number; defense: number; midfield: number }> = { local: { ...ZERO_ADJUSTMENT }, cpu: { ...ZERO_ADJUSTMENT } }
  const strengths = { local: sides.local.strength, cpu: sides.cpu.strength }
  const advantage = input.rosterBonus ? rosterAdvantage(strengths.local.global, strengths.cpu.global) : null
  const quality = { local: squadQuality(local.players), cpu: squadQuality(cpu.players) }
  const qualityTotals = { local: 0, cpu: 0 }
  const effectiveTotals = { local: { attack: 0, defense: 0, midfield: 0 }, cpu: { attack: 0, defense: 0, midfield: 0 } }
  type MutableStats = { -readonly [Key in keyof MatchStats]: MatchStats[Key] }
  const stats: Record<MatchSide, MutableStats> = { local: emptyStats(), cpu: emptyStats() }
  const score = { local: 0, cpu: 0 }
  const random = initialCheckpoint(input.seed)
  const blocks: MatchBlock[] = []
  return { input, local, cpu, sides, strengths, stats, score, blocks, advantage, quality, qualityTotals, effectiveTotals, adjustmentTotals, substitutionLog, selection, initialSelection: selection, nextBlock: 0, rng: { main: random, substitutions: substitutionRandom }, pendingChanges: [] as MatchEvent[], result: null as MatchResult | null }
}
export type KernelState = ReturnType<typeof initializeKernel>

export function advanceKernel(current: KernelState, automatic: Readonly<Record<MatchSide, boolean>>): KernelState {
  if (current.result || current.nextBlock >= 6) throw new Error('invalid_kernel_phase')
  const state = structuredClone(current)
  const { input, sides, stats, score, blocks, advantage, qualityTotals, effectiveTotals, adjustmentTotals, substitutionLog } = state
  const selection = state.selection
  const extra = (key: MatchSide) => (advantage?.side === key ? advantage.bonus : 0)
  const coachExtra = (key: MatchSide, sector: 'attack' | 'defense' | 'midfield') => input.coaches?.[key]?.[sector] ?? 0
  const random = () => { const next = nextCheckpoint(state.rng.main); state.rng.main = next.checkpoint; return next.value }
  const blockIndex = state.nextBlock
  const minute = MATCH_MINUTES[blockIndex]
  const substitutionRandom = state.rng.substitutions ? () => { const next = nextCheckpoint(state.rng.substitutions!); state.rng.substitutions = next.checkpoint; return next.value } : null
  const changes: MatchEvent[] = state.pendingChanges.splice(0)
  if (substitutionRandom && SUBSTITUTION_MINUTES.includes(minute)) {
    for (const key of ['local', 'cpu'] as const) {
      if (!automatic[key]) continue
      const state = sides[key]
      if (!state.unused.length || substitutionRandom() >= SUBSTITUTION_CHANCE) continue
      const incomingId = state.unused.splice(Math.floor(substitutionRandom() * state.unused.length), 1)[0]
      const incoming = input.catalog.find((player) => player.id === incomingId)!
      const originals = new Set(Object.values(key === 'local' ? input.localLineup : input.cpuLineup))
      const options = formationSlots(input.formations?.[key]).filter((slot) => slot.position === incoming.position && slot.position !== 'ARQ' && originals.has(state.team.lineup[slot.id] ?? ''))
      if (!options.length) continue
      const slot = options[Math.floor(substitutionRandom() * options.length)]
      const outId = state.team.lineup[slot.id]!
      const lineup = { ...state.team.lineup, [slot.id]: incomingId } as DraftLineup
      const players = DRAFT_SLOT_IDS.map((id: DraftSlotId) => input.catalog.find((player) => player.id === lineup[id])!)
      state.team = { ...state.team, lineup, players }
      state.strength = calculateTeamStrength(state.team); state.features = tacticalFeatures(lineup, input.catalog, input.formations?.[key]); state.subbed = true
      substitutionLog.push({ minute, side: key, outPlayerId: outId, inPlayerId: incomingId })
      changes.push({ minute, side: key, type: 'substitution', playerId: incomingId, outPlayerId: outId })
    }
  }
  sides.local.baseMidfield += sides.local.strength.midfield; sides.cpu.baseMidfield += sides.cpu.strength.midfield
  const adjustment: Record<MatchSide, TacticalAdjustment> = {
    local: tacticalAdjustment(selection.local, sides.local.features, sides.cpu.features, selection.cpu, blockIndex),
    cpu: tacticalAdjustment(selection.cpu, sides.cpu.features, sides.local.features, selection.local, blockIndex),
  }
  for (const key of ['local', 'cpu'] as const) {
    const affinity = input.formations ? formationAffinity(input.formations[key], selection[key]) : ZERO_ADJUSTMENT
    adjustment[key] = { attack: adjustment[key].attack + affinity.attack, defense: adjustment[key].defense + affinity.defense, midfield: adjustment[key].midfield + affinity.midfield }
    for (const sector of ['attack', 'defense', 'midfield'] as const) adjustmentTotals[key][sector] += adjustment[key][sector]
  }
  const strengthFor = (key: MatchSide) => {
    const qualityBonus = input.rosterBonus ? squadQuality(sides[key].team.players).bonus : 0
    qualityTotals[key] += qualityBonus
    return composeStrength(sides[key].strength, extra(key) + qualityBonus, { attack: coachExtra(key, 'attack'), defense: coachExtra(key, 'defense'), midfield: coachExtra(key, 'midfield') }, adjustment[key])
  }
  const effective = { local: strengthFor('local'), cpu: strengthFor('cpu') }
  for (const key of ['local', 'cpu'] as const) for (const sector of ['attack', 'defense', 'midfield'] as const) effectiveTotals[key][sector] += effective[key][sector]
  // Versioned action models: v1 has three opportunities per block, v2 four.
  // Stored/classic simulations retain their original parameters and stream.
  const events: MatchEvent[] = [...changes]
  const calibrated = input.actionModel === 'action-v3'
  const lively = input.actionModel === 'action-v2' || calibrated
  for (let opportunity = 0; opportunity < (lively ? 4 : input.actionModel ? 3 : 1); opportunity++) {
    const classicChance = initiativeChance(effective.local, effective.cpu)
    const localAttackChance = calibrated ? opportunityChances(effective.local, effective.cpu) : input.actionModel ? clamp(.5 + (classicChance - .5) * 3.5, .15, .85) : classicChance
    const side: MatchSide = random() < localAttackChance ? 'local' : 'cpu'
    const opponent: MatchSide = side === 'local' ? 'cpu' : 'local'
    events.push(event(minute, side, 'attack', attacker(sides[side].team, random, calibrated)))
    const shootingPower = effective[side].attack + effective[side].midfield * .16
    const resistance = effective[opponent].defense + effective[opponent].midfield * .12
    const shotChance = clamp((lively ? .76 : .65) + (shootingPower - resistance) / 180 + (random() - .5) * .2, lively ? .68 : .35, lively ? .9 : .86)
    if (random() < shotChance) {
      stats[side].shots++
      const onTarget = random() < clamp((lively ? .72 : .65) + (shootingPower - resistance) / 220, lively ? .66 : .38, lively ? .88 : .84)
      if (onTarget) {
        stats[side].shotsOnTarget++
        const goalChance = calibrated ? finishingChance(effective[side], effective[opponent], sides[side].team.players.filter((p) => p.position !== 'ARQ' && p.overall_rating >= 98).length) : clamp((lively ? .34 : input.actionModel ? .3 : .4) + (shootingPower - resistance) / (input.actionModel ? 75 : 240) + (random() - .5) * .12, lively ? .28 : .14, .62)
        if (random() < goalChance) {
          score[side]++
          events.push(event(minute, side, 'goal', attacker(sides[side].team, random, calibrated)))
        } else {
          stats[opponent].saves++
          events.push(event(minute, opponent, 'save'))
        }
      } else events.push(event(minute, side, 'shot', attacker(sides[side].team, random, calibrated)))
    } else {
      stats[opponent].recoveries++
      events.push(event(minute, opponent, 'recovery'))
    }
  }
  if (minute === 90) events.push(event(minute, null, 'final'))
  const narrated = events.map((item) => { const tactic = eventInfluence(item.type, item.side, selection, adjustment); return tactic ? { ...item, tactic } : item })
  blocks.push({ minute, events: narrated, score: { ...score } })
  state.nextBlock++
  return state
}

export function finishKernel(current: KernelState): KernelState {
  if (current.result) return structuredClone(current)
  if (current.nextBlock !== 6) throw new Error('invalid_kernel_phase')
  const state = structuredClone(current)
  const { input, local, cpu, sides, strengths, stats, score, blocks, advantage, quality, qualityTotals, effectiveTotals, adjustmentTotals, substitutionLog } = state
  const benches = input.benches
  const extra = (key: MatchSide) => (advantage?.side === key ? advantage.bonus : 0)
  const coachExtra = (key: MatchSide, sector: 'attack' | 'defense' | 'midfield') => input.coaches?.[key]?.[sector] ?? 0
  const random = () => { const next = nextCheckpoint(state.rng.main); state.rng.main = next.checkpoint; return next.value }
  // Without a change the base midfield is constant; with one it is the block average of the elevens actually on the pitch.
  const meanMidfield = (side: MatchSide) => (sides[side].subbed ? sides[side].baseMidfield / MATCH_MINUTES.length : strengths[side].midfield) + adjustmentTotals[side].midfield / MATCH_MINUTES.length + extra(side) + coachExtra(side, 'midfield') + qualityTotals[side] / MATCH_MINUTES.length
  const possessionLocal = Math.round(clamp(50 + (meanMidfield('local') - meanMidfield('cpu')) * .6 + (random() - .5) * 4, 36, 64))
  stats.local.possession = possessionLocal; stats.cpu.possession = 100 - possessionLocal
  const meanStrength = (side: MatchSide): TeamStrength => {
    const sectors = meanAdjustment(effectiveTotals[side])
    return { ...sectors, global: Math.round((sectors.attack + sectors.defense + sectors.midfield) / 3 * 10) / 10 }
  }
  state.result = {
    catalogVersion: input.catalogVersion, rulesVersion: input.rulesVersion, seed: input.seed, local, cpu, strengths, stats, blocks,
    ...(input.seriesFormat ? { seriesFormat: input.seriesFormat } : {}),
    ...(input.formations ? { formations: input.formations } : {}),
    ...(input.actionModel ? { actionModel: input.actionModel } : {}),
    score, winner: score.local === score.cpu ? 'draw' : score.local > score.cpu ? 'local' : 'cpu',
    ...(input.rosterBonus || input.coaches ? { effectiveStrengths: { local: meanStrength('local'), cpu: meanStrength('cpu') } } : {}),
    ...(benches ? { benches: { local: benches.local.map((id) => input.catalog.find((player) => player.id === id)!), cpu: benches.cpu.map((id) => input.catalog.find((player) => player.id === id)!) }, substitutions: { version: SUBSTITUTION_RULES_VERSION, events: substitutionLog } } : {}),
    ...(advantage ? { rosterAdvantage: advantage } : {}),
    ...(input.coaches && (input.coaches.local || input.coaches.cpu) ? { coaches: input.coaches } : {}),
    ...(input.rosterBonus ? { quality: { version: SQUAD_QUALITY_VERSION, initial: quality, meanBonus: { local: Math.round(qualityTotals.local / MATCH_MINUTES.length * 100) / 100, cpu: Math.round(qualityTotals.cpu / MATCH_MINUTES.length * 100) / 100 } } } : {}),
    tactics: { version: TACTICS_VERSION, selection: { local: state.initialSelection.local, cpu: state.initialSelection.cpu }, adjustments: { local: meanAdjustment(adjustmentTotals.local), cpu: meanAdjustment(adjustmentTotals.cpu) } },
  }
  return state
}
