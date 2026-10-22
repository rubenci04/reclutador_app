import { MATCH_MINUTES, type MatchSide } from '../matchTypes'
import { formationSlots } from '../../tactics/formations'
import { DRAFT_SLOT_IDS } from '../../draft/draftTypes'
import { calculateTeamStrength, isValidOrganizedLineup } from '../simulator'
import { tacticalFeatures } from '../../tactics/tacticalModel'
import { isStrategyId, parseStrategySelection } from '../../tactics/strategies'
import { visibleStats } from '../playback'
import { initialCheckpoint, nextCheckpoint } from './random'
import { AERIAL_VERSION, HEADER_DIRECTIONS, isHeaderDirection } from './directedHeader'
import { canonical, exact, integer, object } from './validation'
import { createDirector, eligibleMoment, recordMoment } from './matchMoments'
import { validFreeKicks } from './freeKicksValidation'
import { DEFENSE_CHOICES } from './attackTree'
import { FREE_KICK_STEPS, FK_NODES, FK_CHOICES, directEligible } from './freeKicks'
import { validCorners } from './cornersValidation'
import { CORNER_STEPS } from './corners'
import type { Session } from './types'

const equal = (a: unknown, b: unknown) => canonical(a) === canonical(b)
const sides = ['local', 'cpu'] as const
const pair = (value: unknown) => object(value) && exact(value, sides)
const numericPair = (value: unknown) => pair(value) && Object.values(value as Record<string, unknown>).every((n) => typeof n === 'number' && Number.isFinite(n))

/** Validate structure and sports invariants without regenerating any confirmed opportunity. */
export function validSnapshotState(s: Session, initial: Session): boolean {
  try {
    const k = s.kernel; const i = initial.kernel; const n = k.nextBlock
    if (!object(k) || !exact(k, Object.keys(i)) || !integer(n) || n > 6 || !Array.isArray(k.blocks) || k.blocks.length !== n || !['RUNNABLE', 'WINDOW', 'FINISHED', 'PLAY'].includes(s.phase)) return false
    if (!equal(k.duels, i.duels)) return false
    if (s.sessionId !== initial.sessionId || !equal(s.benchMode, initial.benchMode) || !equal(s.ownership, initial.ownership) || !equal(s.options, initial.options)) return false
    for (const key of ['local', 'cpu', 'strengths', 'advantage', 'quality', 'initialSelection'] as const) if (!equal(k[key], i[key])) return false
    if (!pair(k.sides) || !pair(s.departed) || !pair(s.entered) || !pair(k.stats) || !numericPair(k.score) || !numericPair(k.qualityTotals) || !pair(k.effectiveTotals) || !pair(k.adjustmentTotals)) return false
    if (!parseStrategySelection(k.selection) || !exact(k.selection as unknown as Record<string, unknown>, ['version', 'local', 'cpu'])) return false
    if (!object(k.rng) || !exact(k.rng, ['main', 'substitutions'], ['tree', 'director', 'aerial'])) return false
    if ((k.tree === undefined) !== (k.rng.tree === undefined) || !validTree(s, k) || !validDirector(s) || !validAerial(s) || !validCorners(s) || !validFreeKicks(s)) return false
    for (const key of ['main', 'substitutions', ...(k.tree ? ['tree' as const] : []), ...(k.director ? ['director' as const] : []), ...(k.aerial ? ['aerial' as const] : [])] as const) {
      const rng = k.rng[key]; const original = key === 'main' ? initialCheckpoint(k.input.seed) : key === 'aerial' ? initialCheckpoint(`${k.input.seed}:aerial`) : key === 'director' ? initialCheckpoint(`${k.input.seed}:moments`) : key === 'tree' ? initialCheckpoint(`${k.input.seed}:tree`) : k.input.benches ? initialCheckpoint(`${k.input.seed}:subs`) : null
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
      if (typeof state.subbed !== 'boolean' || !Number.isFinite(state.baseMidfield) || state.baseMidfield < 0 || state.baseMidfield > (n + (k.partial ? 1 : 0)) * 100) return false
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
      for (const e of block.events) if (!object(e as unknown) || !exact(e as unknown as Record<string, unknown>, ['minute', 'side', 'type'], ['playerId', 'outPlayerId', 'tactic', 'step', ...(k.aerial ? ['aerial'] : []), ...(k.corners ? ['corner'] : []), ...(k.freeKicks ? ['freeKick'] : [])]) || e.minute !== block.minute || !['attack', 'shot', 'save', 'recovery', 'goal', 'final', 'substitution', 'pass', ...(k.corners ? ['corner'] : [])].includes(e.type) || e.side !== null && !sides.includes(e.side) || e.playerId !== undefined && !s.ownership[e.side as MatchSide]?.includes(e.playerId)) throw new Error('invalid_event')
      return block.events
    })
    const open = k.partial?.events ?? []
    const score = { local: 0, cpu: 0 }
    for (const block of k.blocks) { for (const e of block.events) if (e.type === 'goal' && e.side) score[e.side]++; if (!equal(block.score, score)) return false }
    for (const e of open) if (e.type === 'goal' && e.side) score[e.side]++
    if (!equal(k.score, score)) return false
    const stats = visibleStats([...events, ...open])
    for (const side of sides) for (const key of ['shots', 'shotsOnTarget', 'saves', 'recoveries'] as const) if (k.stats[side][key] !== stats[side][key]) return false
    if (!Array.isArray(s.receipts) || s.receipts.length > 256 || !Array.isArray(s.applied) || s.applied.length > 8 || new Set(s.receipts.map((r) => r.id)).size !== s.receipts.length) return false
    if (s.applied.some((c) => !s.receipts.some((r) => r.status === 'ACCEPTED' && equal(r.command, c))) || new Set(s.applied.map((c) => c.id)).size !== s.applied.length) return false
    if (s.options.matchRules) {
      const selection = { ...i.selection }
      for (const receipt of s.receipts) if (receipt.status === 'ACCEPTED') {
        const c = receipt.command
        if (!sides.includes(c.participant)) return false
        if (!['KEEP', 'SUBSTITUTE', 'STRATEGY', 'HALFTIME'].includes(c.order.type)) return false
        if (c.order.type === 'STRATEGY' || c.order.type === 'HALFTIME') {
          if (c.applyBlock !== 3 || !isStrategyId(c.order.parameters.strategy)) return false
          if (s.applied.some((d) => d.id === c.id)) selection[c.participant as MatchSide] = c.order.parameters.strategy
        }
      }
      if (!equal(selection, k.selection)) return false
    }
    const appliedCount = 2 * Math.max(0, n - 2) + ((s.phase === 'RUNNABLE' || s.phase === 'PLAY') && n >= 2 ? 2 : 0)
    if (s.applied.length !== appliedCount || s.applied.some((c, index) => c.version !== 'interactive-command-v1' || c.sessionId !== s.sessionId || c.participant !== sides[index % 2] || c.applyBlock !== 2 + Math.floor(index / 2) || c.windowId !== `${s.sessionId}:after-${MATCH_MINUTES[c.applyBlock - 1]}`)) return false
    if (s.receipts.some((r) => r.status === 'ACCEPTED' && !s.applied.some((c) => equal(c, r.command)) && !sides.some((side) => equal(s.window?.plans[side], r.command)))) return false
    if (s.phase === 'WINDOW') {
      if (!s.window || n < 2 || n > 5 || !exact(s.window as unknown as Record<string, unknown>, ['id', 'applyBlock', 'plans']) || s.window.applyBlock !== n || s.window.id !== `${s.sessionId}:after-${MATCH_MINUTES[n - 1]}` || !pair(s.window.plans)) return false
      for (const side of sides) { const plan = s.window.plans[side]; if (plan && (!s.receipts.some((r) => r.status === 'ACCEPTED' && equal(r.command, plan)) || plan.participant !== side || plan.windowId !== s.window.id || s.applied.some((c) => c.id === plan.id))) return false }
    } else if (s.window !== null) return false
    if (s.phase === 'FINISHED') {
      if (n !== 6 || !s.result || !k.result || s.result.version !== 'interactive-result-v1' || s.result.kernelVersion !== s.kernelVersion || !exact(s.result as unknown as Record<string, unknown>, ['version', 'kernelVersion', 'decisions', 'substitutions', 'result'], ['plays', 'moments', 'aerial', 'matchRules', 'corners', 'freeKicks']) || !equal(s.result.matchRules, s.options.matchRules) || !equal(s.result.aerial, k.aerial ? { version: k.aerial.version } : undefined) || !equal(s.result.moments, k.director ? { version: k.director.version, selected: k.director.selected } : undefined) || !equal(s.result.plays, k.tree?.log) || !equal(s.result.result, k.result) || !equal(s.result.decisions, s.applied) || !equal(s.result.substitutions, { version: 'interactive-subs-v1', modes: s.benchMode, events: k.substitutionLog }) || !equal(k.result.stats, k.stats) || !equal(k.result.blocks, k.blocks) || !equal(k.result.score, k.score) || events.filter((e) => e.type === 'final').length !== 1 || k.stats.local.possession + k.stats.cpu.possession !== 100) return false
    } else if (n === 6 || s.result !== null || k.result !== null || events.some((e) => e.type === 'final')) return false
    return true
  } catch { return false }
}

const AERIAL_STEPS = ['AERIAL_CROSS', 'AERIAL_CONTEST', 'AERIAL_WON', 'AERIAL_CLEAR', 'DIRECTED_HEADER_CONTACT', 'DIRECTED_HEADER_FLIGHT', 'DIRECTED_HEADER_BLOCK', 'DIRECTED_HEADER_OVER', 'DIRECTED_HEADER_WIDE', 'DIRECTED_HEADER_GOAL', 'DIRECTED_HEADER_SAVE']
const PLAY_STEPS = ['DEFENSE_BUILD', 'INTERCEPT_OK', 'PRESS_OK', 'PRESS_BEATEN', 'CPU_RETAIN', 'DEFENSE_BLOCK', 'CPU_WIDE', 'CPU_GOAL', 'DEFENSE_SAVE', 'BUILD', 'PASS_LEFT_OK', 'PASS_RIGHT_OK', 'PASS_LEFT_LOST', 'PASS_RIGHT_LOST', 'CROSS_OK', 'CROSS_LOST', 'SHOT_BLOCKED', 'SHOT_WIDE', 'SHOT_SAVED', 'SHOT_GOAL', 'HEADER_WIDE', 'HEADER_SAVED', 'HEADER_GOAL']
const DRIBBLE_CHOICES: readonly string[] = ['DRIBBLE_LEFT', 'DRIBBLE_CENTER', 'DRIBBLE_RIGHT']
/** attack-tree-v1 bookkeeping: the pending play, the open block and the decision log must agree with each other. */
function validTree(s: Session, k: Session['kernel']): boolean {
  const n = k.nextBlock
  if (k.tree === undefined) return k.partial === undefined && s.phase !== 'PLAY' && s.result?.plays === undefined
  if (!object(k.tree) || !exact(k.tree as unknown as Record<string, unknown>, ['version', 'limit', 'started', 'log']) || k.tree.version !== 'attack-tree-v1' || k.tree.limit !== 3 || !integer(k.tree.started) || k.tree.started > k.tree.limit || !Array.isArray(k.tree.log) || k.tree.log.length > (k.aerial ? 9 : 6) + (k.dribble ? 1 : 0)) return false
  if (new Set(k.tree.log.map((entry) => entry.id)).size !== k.tree.log.length) return false
  for (const entry of k.tree.log) if (!object(entry as unknown) || !exact(entry as unknown as Record<string, unknown>, ['id', 'playId', 'node', 'choice'], k.dribble || k.precisionShot || k.defenseMini ? ['precision'] : []) || typeof entry.id !== 'string' || typeof entry.playId !== 'string' || !['DIRECTION', 'FINISH', ...(k.dribble ? ['DRIBBLE'] : []), ...(k.director ? ['DEFEND'] : []), ...(k.corners ? ['CORNER_ATTACK', 'CORNER_DEFEND', 'CORNER_HEADER'] : []), ...(k.freeKicks ? FK_NODES : []), ...(k.aerial ? ['HEADER'] : [])].includes(entry.node) || (entry.precision !== undefined && (!(entry.node === 'DRIBBLE' && k.dribble || entry.node === 'FK_ATTACK' && k.precisionShot || entry.node === 'DEFEND' && k.defenseMini) || typeof entry.precision !== 'number' || !(entry.precision >= 0 && entry.precision <= 1))) || !['LEFT', 'RIGHT', 'CROSS', 'SHOOT', ...(k.dribble ? DRIBBLE_CHOICES : []), ...(k.director ? ['INTERCEPT', 'PRESS'] : []), ...(k.defenseMini ? ['DEFEND_LEFT', 'DEFEND_CENTER', 'DEFEND_RIGHT'] : []), ...(k.aerial ? HEADER_DIRECTIONS : []), ...(k.corners ? ['CORNER_NEAR', 'CORNER_FAR', 'CORNER_SHORT', 'MAN_MARK', 'ZONE'] : []), ...(k.freeKicks ? FK_CHOICES : [])].includes(entry.choice)) return false
  const directions = k.tree.log.filter((entry) => entry.node === 'DIRECTION' || entry.node === 'DEFEND' || entry.node === 'CORNER_ATTACK' || entry.node === 'CORNER_DEFEND' || entry.node === 'FK_ATTACK' || entry.node === 'FK_DEFEND').length
  const partial = k.partial
  if (partial === null) return s.phase !== 'PLAY' && k.tree.started === directions
  if (!partial) return false
  if (!object(partial as unknown) || !exact(partial as unknown as Record<string, unknown>, ['events', 'opportunity', 'played', 'play']) || !Array.isArray(partial.events) || !integer(partial.opportunity) || partial.opportunity > 3 || partial.played !== true || n > 5) return false
  const play = partial.play
  if (s.phase !== 'PLAY' || !play || !object(play as unknown) || !exact(play as unknown as Record<string, unknown>, ['id', 'node', 'protagonistId', 'receiverId', 'sector', 'options'], [...(k.director ? ['attackerId'] : []), ...(k.aerial ? ['aerial'] : []), ...(k.corners ? ['corner'] : []), ...(k.freeKicks ? ['freeKick'] : []), ...(k.dribble ? ['dribble'] : []), ...(k.defenseMini ? ['defense'] : [])]) || play.id !== `play-${MATCH_MINUTES[n]}` || !['DIRECTION', 'FINISH', ...(k.dribble ? ['DRIBBLE'] : []), ...(k.director ? ['DEFEND'] : []), ...(k.aerial ? ['HEADER'] : []), ...(k.corners ? ['CORNER_ATTACK', 'CORNER_DEFEND', 'CORNER_HEADER'] : []), ...(k.freeKicks ? FK_NODES : [])].includes(play.node) || !s.ownership.local.includes(play.protagonistId) || !Array.isArray(play.options) || play.options.length !== (play.node === 'DEFEND' && play.defense ? 5 : play.node === 'DRIBBLE' ? 3 : play.node === 'HEADER' || play.node === 'CORNER_ATTACK' || play.node === 'CORNER_HEADER' || play.node === 'FK_HEADER' || play.node === 'FK_ATTACK' && play.freeKick && directEligible(play.freeKick.zone) ? 3 : 2) || !play.options.some((o) => o.available)) return false
  if (play.defense !== undefined && (play.node !== 'DEFEND' || !k.defenseMini || !object(play.defense as unknown) || !exact(play.defense as unknown as Record<string, unknown>, ['lane']) || !['LEFT', 'CENTER', 'RIGHT'].includes(play.defense.lane))) return false
  if (k.defenseMini && (!object(k.defenseMini as unknown) || !exact(k.defenseMini as unknown as Record<string, unknown>, ['version', 'used']) || k.defenseMini.version !== 'defense-mini-v1' || typeof k.defenseMini.used !== 'boolean' || play.defense !== undefined && !k.defenseMini.used)) return false
  if (play.node === 'DEFEND' && (!play.attackerId || !s.ownership.cpu.includes(play.attackerId) || play.receiverId !== null || play.sector !== null || !play.options.every((o, i) => o.available && o.choice === (play.defense ? DEFENSE_CHOICES : ['INTERCEPT', 'PRESS'])[i] && o.playerId === play.protagonistId && o.rivalId === play.attackerId))) return false
  if (play.node === 'DRIBBLE' && (!k.dribble || !play.receiverId || !s.ownership.local.includes(play.receiverId) || !['LEFT', 'RIGHT'].includes(play.sector ?? '') || !object(play.dribble as unknown) || !exact(play.dribble as unknown as Record<string, unknown>, ['cover']) || !['LEFT', 'CENTER', 'RIGHT'].includes(play.dribble!.cover) || !play.options.every((o, i) => o.available && o.choice === DRIBBLE_CHOICES[i] && o.playerId === play.receiverId))) return false
  if (play.node === 'FINISH' && (!play.receiverId || !s.ownership.local.includes(play.receiverId) || !['LEFT', 'RIGHT'].includes(play.sector ?? ''))) return false
  for (const o of play.options) if (!object(o as unknown) || !exact(o as unknown as Record<string, unknown>, ['choice', 'available', 'playerId', 'rivalId']) || typeof o.available !== 'boolean' || o.playerId !== null && !s.ownership.local.includes(o.playerId) || o.rivalId !== null && !s.ownership.cpu.includes(o.rivalId)) return false
  const minute = MATCH_MINUTES[n]
  for (const e of partial.events) if (!object(e as unknown) || !exact(e as unknown as Record<string, unknown>, ['minute', 'side', 'type'], ['playerId', 'outPlayerId', 'tactic', 'step', ...(k.aerial ? ['aerial'] : []), ...(k.corners ? ['corner'] : []), ...(k.freeKicks ? ['freeKick'] : [])]) || e.minute !== minute || e.type === 'final' || e.side !== null && !sides.includes(e.side) || e.playerId !== undefined && !s.ownership[e.side as MatchSide]?.includes(e.playerId) || e.step !== undefined && ![...PLAY_STEPS, ...(k.duels ? ['CARRY_OK', 'CARRY_LOST'] : []), ...(k.dribble ? ['DRIBBLE_OK', 'DRIBBLE_LOST'] : []), ...(k.aerial ? AERIAL_STEPS : []), ...(k.corners ? CORNER_STEPS : []), ...(k.freeKicks ? FREE_KICK_STEPS : [])].includes(e.step) || e.tactic !== undefined) return false
  if (partial.events.filter((e) => e.type === 'attack').length > 4 || k.tree.started !== directions + (play.node === 'FINISH' || play.node === 'DRIBBLE' || play.node === 'HEADER' || play.node === 'CORNER_HEADER' || play.node === 'FK_HEADER' ? 0 : 1)) return false
  return true
}

/** Reconstruct only the policy stream; never inspect/replay sporting results to validate selection. */
function validDirector(s: Session): boolean {
  const k = s.kernel; const d = k.director
  if (!d) return k.rng.director === undefined && s.options.moments === undefined
  if (!s.options.moments || !object(d) || !exact(d as unknown as Record<string, unknown>, ['version', 'target', 'nextEligible', 'nextSide', 'selected']) || !Array.isArray(d.selected) || d.selected.length !== k.tree?.started) return false
  let rng = initialCheckpoint(`${k.input.seed}:moments`)
  const random = () => { const next = nextCheckpoint(rng); rng = next.checkpoint; return next.value }
  const expected = createDirector(random)
  for (const selection of d.selected) {
    if (!object(selection as unknown) || !exact(selection as unknown as Record<string, unknown>, ['opportunity', 'side', 'protagonistId']) || !integer(selection.opportunity) || selection.opportunity >= 24 || !s.ownership.local.includes(selection.protagonistId) || !eligibleMoment(expected, selection.opportunity, selection.side)) return false
    const block = k.blocks[Math.floor(selection.opportunity / 4)]?.events ?? k.partial?.events
    const attack = block?.filter((e) => e.type === 'attack')[selection.opportunity % 4]
    if (!attack || attack.side !== selection.side || attack.step !== (selection.side === 'local' ? 'BUILD' : 'DEFENSE_BUILD')) return false
    recordMoment(expected, selection, random)
  }
  return equal(d, expected) && equal(k.rng.director, rng)
}

function validAerial(s: Session): boolean {
  const k = s.kernel; const state = k.aerial
  if (!state) return !s.options.aerial && k.rng.aerial === undefined && s.result?.aerial === undefined
  if (!s.options.aerial || !k.director || !object(state) || !exact(state as unknown as Record<string, unknown>, ['version', 'keeperPlan']) || state.version !== AERIAL_VERSION) return false
  const pending = k.partial?.play
  if ((pending?.node === 'HEADER') !== (state.keeperPlan !== null) || state.keeperPlan !== null && !isHeaderDirection(state.keeperPlan)) return false
  const all = [...k.blocks.flatMap((b) => b.events), ...(k.partial?.events ?? [])]
  let draws = 0
  let cursor = initialCheckpoint(`${k.input.seed}:aerial`)
  const consume = (n: number) => { let value = 0; for (let i = 0; i < n; i++) { const next = nextCheckpoint(cursor); cursor = next.checkpoint; value = next.value; draws++ } return value }
  let stage = 'IDLE'; let plan: string | null = null; let actors: unknown = null
  for (const entry of k.tree!.log) {
    if (k.freeKicks && entry.node.startsWith('FK_')) continue
    if (k.corners && entry.node.startsWith('CORNER_')) continue
    const allowed: readonly string[] = entry.node === 'HEADER' ? HEADER_DIRECTIONS : entry.node === 'DIRECTION' ? ['LEFT', 'RIGHT'] : entry.node === 'DRIBBLE' ? DRIBBLE_CHOICES : entry.node === 'FINISH' ? ['CROSS', 'SHOOT'] : ['INTERCEPT', 'PRESS', 'DEFEND_LEFT', 'DEFEND_CENTER', 'DEFEND_RIGHT']
    if (!allowed.includes(entry.choice) || k.tree!.log.filter((e) => e.playId === entry.playId && e.node === entry.node).length !== 1) return false
  }
  for (const e of all) {
    if (!e.aerial) { if (AERIAL_STEPS.includes(e.step ?? '')) return false; continue }
    const a = e.aerial
    if (!AERIAL_STEPS.includes(e.step ?? '') || !object(a) || !exact(a as unknown as Record<string, unknown>, ['version', 'crosserId', 'targetId', 'defenderId', 'sector'], ['direction', 'keeperDirection']) || a.version !== AERIAL_VERSION || !s.ownership.local.includes(a.crosserId) || !s.ownership.local.includes(a.targetId) || a.crosserId === a.targetId || !s.ownership.cpu.includes(a.defenderId) || !['LEFT', 'RIGHT'].includes(a.sector)) return false
    if (a.direction !== undefined && !isHeaderDirection(a.direction) || a.keeperDirection !== undefined && !isHeaderDirection(a.keeperDirection)) return false
    if (e.step?.startsWith('AERIAL_') && (a.direction !== undefined || a.keeperDirection !== undefined)) return false
    if (e.step?.startsWith('DIRECTED_') && (!isHeaderDirection(a.direction) || e.step !== 'DIRECTED_HEADER_CONTACT' && !isHeaderDirection(a.keeperDirection))) return false
    const base = { version: a.version, crosserId: a.crosserId, targetId: a.targetId, defenderId: a.defenderId, sector: a.sector }
    if (e.step === 'AERIAL_CROSS') {
      if (stage !== 'IDLE' || !k.tree!.log.some((c) => c.playId === `play-${e.minute}` && c.node === 'FINISH' && c.choice === 'CROSS')) return false
      actors = base; stage = 'DELIVERY'; consume(1)
    } else {
      if (!equal(base, actors)) return false
      if (e.step === 'AERIAL_CONTEST' && stage === 'DELIVERY') { stage = 'DUEL'; consume(1) }
      else if (e.step === 'AERIAL_WON' && stage === 'DUEL') { stage = 'AWAIT_HEADER'; plan = HEADER_DIRECTIONS[Math.floor(consume(1) * 3)] }
      else if (e.step === 'AERIAL_CLEAR' && ['DELIVERY', 'DUEL'].includes(stage)) stage = 'IDLE'
      else if (e.step === 'DIRECTED_HEADER_CONTACT' && stage === 'AWAIT_HEADER') {
        if (a.keeperDirection !== undefined || !k.tree!.log.some((c) => c.playId === `play-${e.minute}` && c.node === 'HEADER' && c.choice === a.direction)) return false
        stage = 'CONTACT'
      } else if (e.step === 'DIRECTED_HEADER_FLIGHT' && stage === 'CONTACT') stage = 'FLIGHT'
      else if (e.step === 'DIRECTED_HEADER_BLOCK' && stage === 'CONTACT') { stage = 'IDLE'; consume(1) }
      else if (['DIRECTED_HEADER_OVER', 'DIRECTED_HEADER_WIDE', 'DIRECTED_HEADER_GOAL', 'DIRECTED_HEADER_SAVE'].includes(e.step!) && stage === 'FLIGHT') { stage = 'IDLE'; consume(3) }
      else return false
      if (a.keeperDirection !== undefined && a.keeperDirection !== plan) return false
    }
    const recovering = e.step === 'AERIAL_CLEAR' || e.step === 'DIRECTED_HEADER_BLOCK'
    const saved = e.step === 'DIRECTED_HEADER_SAVE'
    const expectedPlayer = e.step === 'AERIAL_CROSS' ? a.crosserId : recovering ? a.defenderId : saved ? k.input.catalog.find((p) => p.id === e.playerId && p.position === 'ARQ')?.id : a.targetId
    const expectedType = recovering ? 'recovery' : saved ? 'save' : e.step === 'DIRECTED_HEADER_GOAL' ? 'goal' : ['DIRECTED_HEADER_WIDE', 'DIRECTED_HEADER_OVER'].includes(e.step!) ? 'shot' : 'pass'
    if (!expectedPlayer || e.playerId !== expectedPlayer || e.type !== expectedType || e.side !== (recovering || saved ? 'cpu' : 'local')) return false
  }
  if (k.rng.aerial?.draws !== draws || !equal(k.rng.aerial, cursor) || stage !== (pending?.node === 'HEADER' ? 'AWAIT_HEADER' : 'IDLE')) return false
  if (pending?.node === 'HEADER') {
    const a = pending.aerial
    if (!a || pending.receiverId !== a.targetId || pending.sector !== a.sector || !pending.options.every((o, i) => o.choice === HEADER_DIRECTIONS[i] && o.available && o.playerId === a.targetId && o.rivalId === a.defenderId)) return false
    const last = k.partial!.events.at(-1)
    if (last?.step !== 'AERIAL_WON' || !equal(a, last.aerial) || !k.tree!.log.some((e) => e.playId === pending.id && e.node === 'FINISH' && e.choice === 'CROSS')) return false
    if (state.keeperPlan !== plan || !formationSlots(k.input.formations?.local).some((slot) => slot.position === 'DEL' && k.sides.local.team.lineup[slot.id] === a.targetId)) return false
  } else if (pending?.aerial !== undefined) return false
  return true
}
