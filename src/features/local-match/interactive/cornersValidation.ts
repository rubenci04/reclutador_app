import { MATCH_MINUTES, type MatchEvent, type MatchSide } from '../matchTypes'
import { formationSlots } from '../../tactics/formations'
import { HEADER_DIRECTIONS } from './directedHeader'
import { CORNER_DELIVERIES, CORNER_STEPS, CORNERS_VERSION, cornerFamilyChance, cornerPlan, otherSide, type CornerEvent, type CornerPlan } from './corners'
import { initialCheckpoint, nextCheckpoint } from './random'
import { canonical, exact, object } from './validation'
import type { Session } from './types'

const equal = (a: unknown, b: unknown) => canonical(a) === canonical(b)
const baseKeys = ['version', 'id', 'awardedTo', 'cause', 'concededById', 'kickerId', 'targetId', 'defenderId', 'farDefenderId', 'keeperId', 'receiverId', 'sector'] as const
const base = (a: CornerEvent) => Object.fromEntries(baseKeys.map((key) => [key, a[key]]))
/** Validate causes, fixed intentions, event progression and stream cursors, without resolving sporting outcomes again. */
export function validCorners(s: Session): boolean {
  const k = s.kernel, state = k.corners, all = [...k.blocks.flatMap((b) => b.events), ...(k.partial?.events ?? [])]
  if (!state) return s.result?.corners === undefined && !s.options.corners && k.cornerRng === undefined && k.cornerPolicyRng === undefined && !all.some((e) => e.corner || e.type === 'corner')
  if (!s.options.corners || !k.director || !object(state) || !exact(state as unknown as Record<string, unknown>, ['version', 'plan', 'families']) || state.version !== CORNERS_VERSION || !Array.isArray(state.families) || state.families.length !== k.director.selected.length) return false
  let policy = initialCheckpoint(`${k.input.seed}:corner-policy`), cursor = initialCheckpoint(`${k.input.seed}:corners`)
  const draw = () => { const next = nextCheckpoint(cursor); cursor = next.checkpoint; return next.value }
  const groups = new Map<string, MatchEvent[]>()
  for (const e of all) {
    if (!e.corner) { if (e.type === 'corner' || CORNER_STEPS.includes(e.step as typeof CORNER_STEPS[number])) return false; continue }
    const a = e.corner
    if (!object(a) || !exact(a as unknown as Record<string, unknown>, baseKeys, ['delivery', 'marking', 'direction', 'keeperDirection', 'markerId']) || a.version !== CORNERS_VERSION || !CORNER_STEPS.includes(e.step as typeof CORNER_STEPS[number])) return false
    groups.set(a.id, [...(groups.get(a.id) ?? []), e])
  }
  let expectedPendingPlan: CornerPlan | null = null
  const pending = k.partial?.play
  for (let i = 0; i < state.families.length; i++) {
    const next = nextCheckpoint(policy); policy = next.checkpoint
    const family = state.families[i], selection = k.director.selected[i], minute = MATCH_MINUTES[Math.floor(selection.opportunity / 4)], id = `play-${minute}`, events = groups.get(id)
    if (!['OPEN_PLAY', 'CORNER'].includes(family)) return false
    if (family === 'OPEN_PLAY') { if (events) return false; continue }
    if (next.value >= cornerFamilyChance(state.families[i - 1]) || !events || events.length < 2) return false
    const a = events[0].corner!, other = otherSide(a.awardedTo)
    if (a.id !== id || a.awardedTo !== selection.side || !['local', 'cpu'].includes(a.awardedTo) || !['LEFT', 'RIGHT'].includes(a.sector) || !['DEFLECTION', 'CLEARANCE', 'SAVE'].includes(a.cause)) return false
    const at = (side: MatchSide) => {
      const lineup: Record<string, string | null> = { ...(side === 'local' ? k.input.localLineup : k.input.cpuLineup) }
      for (const sub of k.substitutionLog.filter((e) => e.side === side && e.minute <= minute)) { const slot = Object.keys(lineup).find((slot) => lineup[slot] === sub.outPlayerId); if (slot) lineup[slot] = sub.inPlayerId }
      return formationSlots(k.input.formations?.[side]).map((slot) => ({ id: lineup[slot.id], position: slot.position }))
    }
    const own = at(a.awardedTo), rival = at(other)
    if (!own.some((p) => p.id === a.kickerId && ['MED', 'DEL'].includes(p.position)) || !own.some((p) => p.id === a.targetId && p.position === 'DEL') || !own.some((p) => p.id === a.receiverId && ['MED', 'DEL'].includes(p.position)) || new Set([a.kickerId, a.targetId, a.receiverId]).size !== 3 || !rival.some((p) => p.id === a.defenderId && p.position === 'DEF') || !rival.some((p) => p.id === a.farDefenderId && p.position === 'DEF') || !rival.some((p) => p.id === a.keeperId && p.position === 'ARQ')) return false
    const setup = Array.from({ length: 5 }, draw), plan = cornerPlan(setup)
    if (a.cause !== (setup[0] < 1 / 3 ? 'DEFLECTION' : setup[0] < 2 / 3 ? 'CLEARANCE' : 'SAVE') || a.sector !== (setup[1] < .5 ? 'LEFT' : 'RIGHT') || a.concededById !== (a.cause === 'SAVE' ? a.keeperId : a.defenderId)) return false
    const log = k.tree!.log.filter((c) => c.playId === id), root = log[0], header = log[1]
    if (log.length > 2 || root && (root.node !== (a.awardedTo === 'local' ? 'CORNER_ATTACK' : 'CORNER_DEFEND') || !(a.awardedTo === 'local' ? [...CORNER_DELIVERIES] : ['MAN_MARK', 'ZONE']).includes(root.choice)) || header && (header.node !== 'CORNER_HEADER' || !HEADER_DIRECTIONS.includes(header.choice as typeof HEADER_DIRECTIONS[number]))) return false
    if (root) Array.from({ length: 8 }, draw)
    if (header) Array.from({ length: 4 }, draw)
    const delivery = root ? a.awardedTo === 'local' ? root.choice : plan.delivery : undefined
    const markerId = delivery === 'CORNER_FAR' ? a.farDefenderId : a.defenderId
    const marking = root && a.awardedTo === 'cpu' ? root.choice : undefined
    const direction = a.awardedTo === 'local' && delivery !== 'CORNER_SHORT' ? header?.choice : plan.direction
    const steps = events.map((e) => e.step)
    const origin = a.cause === 'SAVE' ? 'CORNER_CONCEDED_SAVE' : a.cause === 'CLEARANCE' ? 'CORNER_CONCEDED_CLEAR' : 'CORNER_DEFLECTED'
    if (steps[0] !== origin || steps[1] !== 'CORNER_AWARDED') return false
    const transitions: Readonly<Record<string, readonly string[]>> = {
      CORNER_AWARDED: ['CORNER_RUNUP'], CORNER_RUNUP: ['CORNER_DELIVERY', 'CORNER_SHORT_PASS', 'CORNER_CLEAR'], CORNER_DELIVERY: ['CORNER_CONTEST', 'CORNER_ZONE', 'CORNER_CLEAR'], CORNER_SHORT_PASS: ['CORNER_CONTEST', 'CORNER_ZONE'], CORNER_CONTEST: ['CORNER_CLEAR', 'CORNER_WON', 'CORNER_SHORT_ADVANCE'], CORNER_ZONE: ['CORNER_CLEAR', 'CORNER_WON', 'CORNER_SHORT_ADVANCE'], CORNER_WON: ['CORNER_CONTACT'], CORNER_SHORT_ADVANCE: ['CORNER_SHOT'], CORNER_CONTACT: ['CORNER_BLOCK', 'CORNER_FLIGHT'], CORNER_SHOT: ['CORNER_BLOCK', 'CORNER_FLIGHT'], CORNER_FLIGHT: ['CORNER_WIDE', 'CORNER_OVER', 'CORNER_SAVE', 'CORNER_GOAL'], CORNER_CLEAR: ['CORNER_EXIT'],
    }
    for (let n = 0; n < events.length; n++) {
      const e = events[n], c = e.corner!, step = e.step!
      if (!equal(base(c), base(a)) || e.minute !== minute || n >= 2 && !transitions[steps[n - 1]!]?.includes(step)) return false
      if (n < 2 ? c.delivery !== undefined || c.marking !== undefined || c.markerId !== undefined : !root || c.delivery !== delivery || c.marking !== marking || c.markerId !== markerId) return false
      if (step === 'CORNER_DELIVERY' && delivery === 'CORNER_SHORT' || ['CORNER_SHORT_PASS', 'CORNER_SHORT_ADVANCE', 'CORNER_SHOT'].includes(step) && delivery !== 'CORNER_SHORT' || step === 'CORNER_ZONE' && marking !== 'ZONE' || step === 'CORNER_CONTEST' && marking === 'ZONE') return false
      const isShot = ['CORNER_CONTACT', 'CORNER_SHOT', 'CORNER_FLIGHT', 'CORNER_BLOCK', 'CORNER_WIDE', 'CORNER_OVER', 'CORNER_SAVE', 'CORNER_GOAL'].includes(step)
      if (isShot ? c.direction !== direction || !HEADER_DIRECTIONS.includes(c.direction!) : c.direction !== undefined) return false
      if (['CORNER_FLIGHT', 'CORNER_BLOCK', 'CORNER_WIDE', 'CORNER_OVER', 'CORNER_SAVE', 'CORNER_GOAL'].includes(step) ? c.keeperDirection !== plan.keeper : c.keeperDirection !== undefined) return false
      const defensive = ['CORNER_CONCEDED_CLEAR', 'CORNER_CONCEDED_SAVE', 'CORNER_CLEAR', 'CORNER_EXIT', 'CORNER_BLOCK', 'CORNER_SAVE'].includes(step)
      const type = ['CORNER_DEFLECTED', 'CORNER_WIDE', 'CORNER_OVER'].includes(step) ? 'shot' : ['CORNER_CONCEDED_SAVE', 'CORNER_SAVE'].includes(step) ? 'save' : ['CORNER_CONCEDED_CLEAR', 'CORNER_CLEAR', 'CORNER_BLOCK'].includes(step) ? 'recovery' : step === 'CORNER_GOAL' ? 'goal' : ['CORNER_AWARDED', 'CORNER_RUNUP', 'CORNER_CONTEST', 'CORNER_ZONE', 'CORNER_WON'].includes(step) ? 'corner' : 'pass'
      const target = delivery === 'CORNER_SHORT' ? a.receiverId : a.targetId
      const actor = ['CORNER_CONCEDED_SAVE', 'CORNER_SAVE'].includes(step) ? a.keeperId : defensive ? n < 2 ? a.defenderId : markerId : step === 'CORNER_DEFLECTED' ? a.targetId : ['CORNER_AWARDED', 'CORNER_RUNUP', 'CORNER_DELIVERY'].includes(step) ? a.kickerId : target
      if (e.side !== (defensive ? other : a.awardedTo) || e.type !== type || e.playerId !== actor) return false
    }
    const last = steps.at(-1), isPending = pending?.corner?.id === id
    if (isPending) {
      expectedPendingPlan = plan
      if (!equal(base(pending.corner!), base(a)) || pending.sector !== a.sector || pending.protagonistId !== (pending.node === 'CORNER_HEADER' ? a.targetId : a.awardedTo === 'local' ? a.kickerId : a.defenderId) || pending.receiverId !== (pending.node === 'CORNER_HEADER' ? a.targetId : null)) return false
      if (!root ? last !== 'CORNER_AWARDED' || pending.node !== (a.awardedTo === 'local' ? 'CORNER_ATTACK' : 'CORNER_DEFEND') : last !== 'CORNER_WON' || pending.node !== 'CORNER_HEADER' || header || a.awardedTo !== 'local') return false
      const choices: readonly string[] = pending.node === 'CORNER_HEADER' ? HEADER_DIRECTIONS : pending.node === 'CORNER_ATTACK' ? CORNER_DELIVERIES : ['MAN_MARK', 'ZONE']
      if (pending.options.some((o, j) => o.choice !== choices[j] || !o.available || o.playerId !== (pending.node === 'CORNER_DEFEND' ? a.defenderId : o.choice === 'CORNER_SHORT' ? a.receiverId : a.targetId) || o.rivalId !== (pending.node === 'CORNER_DEFEND' ? a.targetId : pending.node === 'CORNER_HEADER' ? markerId : o.choice === 'CORNER_FAR' ? a.farDefenderId : a.defenderId))) return false
      if (pending.node === 'CORNER_HEADER' && !equal(pending.corner, events.at(-1)!.corner)) return false
    } else if (!root || !['CORNER_CLEAR', 'CORNER_EXIT', 'CORNER_BLOCK', 'CORNER_WIDE', 'CORNER_OVER', 'CORNER_SAVE', 'CORNER_GOAL'].includes(last!)) return false
    groups.delete(id)
  }
  if (groups.size || !equal(state.plan, expectedPendingPlan) || !equal(k.cornerRng, cursor) || !equal(k.cornerPolicyRng, policy) || k.tree?.log.some((e) => e.node.startsWith('CORNER_') && !all.some((item) => item.corner?.id === e.playId))) return false
  return !s.result || equal(s.result.corners, { version: CORNERS_VERSION, families: state.families })
}
