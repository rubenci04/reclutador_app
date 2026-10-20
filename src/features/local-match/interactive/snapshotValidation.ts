import { MATCH_MINUTES, type MatchSide } from '../matchTypes'
import { DRAFT_SLOT_IDS } from '../../draft/draftTypes'
import { calculateTeamStrength, isValidOrganizedLineup } from '../simulator'
import { tacticalFeatures } from '../../tactics/tacticalModel'
import { parseStrategySelection } from '../../tactics/strategies'
import { visibleStats } from '../playback'
import { initialCheckpoint } from './random'
import { canonical, exact, integer, object } from './validation'
import type { Session } from './types'

const equal = (a: unknown, b: unknown) => canonical(a) === canonical(b)
const sides = ['local', 'cpu'] as const
const pair = (value: unknown) => object(value) && exact(value, sides)
const numericPair = (value: unknown) => pair(value) && Object.values(value as Record<string, unknown>).every((n) => typeof n === 'number' && Number.isFinite(n))

/** Validate structure and sports invariants without regenerating any confirmed opportunity. */
export function validSnapshotState(s: Session, initial: Session): boolean {
  try {
    const k = s.kernel; const i = initial.kernel; const n = k.nextBlock
    if (!object(k) || !exact(k, Object.keys(i)) || !integer(n) || n > 6 || !Array.isArray(k.blocks) || k.blocks.length !== n || !['RUNNABLE', 'WINDOW', 'FINISHED'].includes(s.phase)) return false
    if (s.sessionId !== initial.sessionId || !equal(s.benchMode, initial.benchMode) || !equal(s.ownership, initial.ownership) || !equal(s.options, initial.options)) return false
    for (const key of ['local', 'cpu', 'strengths', 'advantage', 'quality', 'initialSelection'] as const) if (!equal(k[key], i[key])) return false
    if (!pair(k.sides) || !pair(s.departed) || !pair(s.entered) || !pair(k.stats) || !numericPair(k.score) || !numericPair(k.qualityTotals) || !pair(k.effectiveTotals) || !pair(k.adjustmentTotals)) return false
    if (!parseStrategySelection(k.selection) || !exact(k.selection as unknown as Record<string, unknown>, ['version', 'local', 'cpu'])) return false
    if (!object(k.rng) || !exact(k.rng, ['main', 'substitutions'])) return false
    for (const key of ['main', 'substitutions'] as const) {
      const rng = k.rng[key]; const original = key === 'main' ? initialCheckpoint(k.input.seed) : k.input.benches ? initialCheckpoint(`${k.input.seed}:subs`) : null
      if (!original) { if (rng !== null) return false; continue }
      if (!object(rng) || !exact(rng, ['algorithm', 'state', 'draws']) || rng.algorithm !== 'mulberry32-v1' || !integer(rng.draws) || rng.draws > 256 || !integer(rng.state) || rng.state > 0xffffffff || rng.state !== ((original.state + rng.draws * 0x6D2B79F5) >>> 0)) return false
    }
    if (!Array.isArray(k.substitutionLog) || k.substitutionLog.length > 6 || !Array.isArray(k.pendingChanges) || k.pendingChanges.length > 2) return false
    for (const pending of k.pendingChanges) if (!object(pending as unknown) || !exact(pending as unknown as Record<string, unknown>, ['minute', 'side', 'type', 'playerId', 'outPlayerId']) || pending.type !== 'substitution' || pending.minute !== MATCH_MINUTES[n] || !k.substitutionLog.some((e) => e.minute === pending.minute && e.side === pending.side && e.inPlayerId === pending.playerId && e.outPlayerId === pending.outPlayerId)) return false
    for (const side of sides) {
      const state = k.sides[side]
      if (!object(state) || !exact(state, Object.keys(i.sides[side])) || !isValidOrganizedLineup(state.team.lineup, k.input.catalog, k.input.budget, k.input.formations?.[side])) return false
      if (!object(state.team) || !exact(state.team as unknown as Record<string, unknown>, ['lineup', 'players', 'spent', 'averageRating']) || state.team.spent !== i.sides[side].team.spent || state.team.averageRating !== i.sides[side].team.averageRating) return false
      if (!equal(state.team.players, DRAFT_SLOT_IDS.map((id) => k.input.catalog.find((p) => p.id === state.team.lineup[id]))) || !equal(state.strength, calculateTeamStrength(state.team)) || !equal(state.features, tacticalFeatures(state.team.lineup, k.input.catalog, k.input.formations?.[side]))) return false
      if (!Array.isArray(state.unused) || new Set(state.unused).size !== state.unused.length || state.unused.some((id) => !i.sides[side].unused.includes(id) || Object.values(state.team.lineup).includes(id))) return false
      if (typeof state.subbed !== 'boolean' || !Number.isFinite(state.baseMidfield) || state.baseMidfield < 0 || state.baseMidfield > n * 100) return false
      for (const total of [k.effectiveTotals[side], k.adjustmentTotals[side]]) if (!object(total) || !exact(total as unknown as Record<string, unknown>, ['attack', 'defense', 'midfield']) || !Object.values(total).every(Number.isFinite)) return false
      if (!object(k.stats[side]) || !exact(k.stats[side] as unknown as Record<string, unknown>, ['shots', 'shotsOnTarget', 'saves', 'recoveries', 'possession']) || !Object.values(k.stats[side]).every(integer)) return false
      const changes = k.substitutionLog.filter((e) => e.side === side)
      if (changes.length > 3 || new Set(changes.map((e) => e.inPlayerId)).size !== changes.length || new Set(changes.map((e) => e.outPlayerId)).size !== changes.length) return false
      const expected = { ...i.sides[side].team.lineup }
      for (const event of changes) {
        if (!object(event) || !exact(event, ['minute', 'side', 'outPlayerId', 'inPlayerId']) || !MATCH_MINUTES.includes(event.minute) || !i.sides[side].unused.includes(event.inPlayerId)) return false
        const slot = DRAFT_SLOT_IDS.find((id) => expected[id] === event.outPlayerId)
        if (!slot || changes.some((e) => e.inPlayerId === event.outPlayerId)) return false
        expected[slot] = event.inPlayerId
      }
      if (!equal(state.team.lineup, expected) || state.subbed !== (changes.length > 0)) return false
      if (!Array.isArray(s.entered[side]) || !Array.isArray(s.departed[side]) || !equal(s.entered[side], s.benchMode[side] === 'manual-v1' ? changes.map((e) => e.inPlayerId) : []) || !equal(s.departed[side], s.benchMode[side] === 'manual-v1' ? changes.map((e) => e.outPlayerId) : [])) return false
    }
    const events = k.blocks.flatMap((block, index) => {
      if (!object(block) || !exact(block as unknown as Record<string, unknown>, ['minute', 'events', 'score']) || block.minute !== MATCH_MINUTES[index] || !Array.isArray(block.events) || block.events.filter((e) => e.type === 'attack').length !== 4 || !numericPair(block.score)) throw new Error('invalid_block')
      for (const e of block.events) if (!object(e as unknown) || !exact(e as unknown as Record<string, unknown>, ['minute', 'side', 'type'], ['playerId', 'outPlayerId', 'tactic']) || e.minute !== block.minute || !['attack', 'shot', 'save', 'recovery', 'goal', 'final', 'substitution'].includes(e.type) || e.side !== null && !sides.includes(e.side) || e.playerId !== undefined && !s.ownership[e.side as MatchSide]?.includes(e.playerId)) throw new Error('invalid_event')
      return block.events
    })
    const score = { local: 0, cpu: 0 }
    for (const block of k.blocks) { for (const e of block.events) if (e.type === 'goal' && e.side) score[e.side]++; if (!equal(block.score, score)) return false }
    if (!equal(k.score, score)) return false
    const stats = visibleStats(events)
    for (const side of sides) for (const key of ['shots', 'shotsOnTarget', 'saves', 'recoveries'] as const) if (k.stats[side][key] !== stats[side][key]) return false
    if (!Array.isArray(s.receipts) || s.receipts.length > 256 || !Array.isArray(s.applied) || s.applied.length > 8 || new Set(s.receipts.map((r) => r.id)).size !== s.receipts.length) return false
    if (s.applied.some((c) => !s.receipts.some((r) => r.status === 'ACCEPTED' && equal(r.command, c))) || new Set(s.applied.map((c) => c.id)).size !== s.applied.length) return false
    const appliedCount = 2 * Math.max(0, n - 2) + (s.phase === 'RUNNABLE' && n >= 2 ? 2 : 0)
    if (s.applied.length !== appliedCount || s.applied.some((c, index) => c.version !== 'interactive-command-v1' || c.sessionId !== s.sessionId || c.participant !== sides[index % 2] || c.applyBlock !== 2 + Math.floor(index / 2) || c.windowId !== `${s.sessionId}:after-${MATCH_MINUTES[c.applyBlock - 1]}`)) return false
    if (s.receipts.some((r) => r.status === 'ACCEPTED' && !s.applied.some((c) => equal(c, r.command)) && !sides.some((side) => equal(s.window?.plans[side], r.command)))) return false
    if (s.phase === 'WINDOW') {
      if (!s.window || n < 2 || n > 5 || !exact(s.window as unknown as Record<string, unknown>, ['id', 'applyBlock', 'plans']) || s.window.applyBlock !== n || s.window.id !== `${s.sessionId}:after-${MATCH_MINUTES[n - 1]}` || !pair(s.window.plans)) return false
      for (const side of sides) { const plan = s.window.plans[side]; if (plan && (!s.receipts.some((r) => r.status === 'ACCEPTED' && equal(r.command, plan)) || plan.participant !== side || plan.windowId !== s.window.id || s.applied.some((c) => c.id === plan.id))) return false }
    } else if (s.window !== null) return false
    if (s.phase === 'FINISHED') {
      if (n !== 6 || !s.result || !k.result || s.result.version !== 'interactive-result-v1' || s.result.kernelVersion !== s.kernelVersion || !exact(s.result as unknown as Record<string, unknown>, ['version', 'kernelVersion', 'decisions', 'substitutions', 'result']) || !equal(s.result.result, k.result) || !equal(s.result.decisions, s.applied) || !equal(s.result.substitutions, { version: 'interactive-subs-v1', modes: s.benchMode, events: k.substitutionLog }) || !equal(k.result.stats, k.stats) || !equal(k.result.blocks, k.blocks) || !equal(k.result.score, k.score) || events.filter((e) => e.type === 'final').length !== 1 || k.stats.local.possession + k.stats.cpu.possession !== 100) return false
    } else if (n === 6 || s.result !== null || k.result !== null || events.some((e) => e.type === 'final')) return false
    return true
  } catch { return false }
}
