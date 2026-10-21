import { MATCH_MINUTES } from '../matchTypes'
import { HEADER_DIRECTIONS } from './directedHeader'
import { FREE_KICKS_VERSION, FREE_KICK_STEPS, contactEligibleChance, directEligible, freeKickPending, type FreeKickEvent, type FreeKickPlan } from './freeKicks'
import { initialCheckpoint, nextCheckpoint } from './random'
import { canonical, exact, object } from './validation'
import type { Session } from './types'

const equal = (a: unknown, b: unknown) => canonical(a) === canonical(b)
const keys = ['version', 'id', 'awardedTo', 'offenderId', 'victimId', 'attempt', 'zone', 'kickerId', 'targetId', 'receiverId', 'defenderId', 'wallIds', 'keeperId', 'consequence']
const base = (a: FreeKickEvent) => Object.fromEntries(keys.map((key) => [key, a[key as keyof FreeKickEvent]]))
/** Validate event progression and precommitted intentions. Never re-roll a confirmed execution. */
export function validFreeKicks(s: Session): boolean {
  const k = s.kernel, state = k.freeKicks, all = [...k.blocks.flatMap((b) => b.events), ...(k.partial?.events ?? [])]
  if (!state) return !s.options.freeKicks && k.freeKickRng === undefined && k.freeKickPolicyRng === undefined && s.result?.freeKicks === undefined && !all.some((e) => e.freeKick || e.step?.startsWith('FK_'))
  if (!s.options.freeKicks || !k.director || !object(state) || !exact(state as unknown as Record<string, unknown>, ['version', 'plan', 'families']) || state.version !== FREE_KICKS_VERSION || !Array.isArray(state.families) || state.families.length !== k.director.selected.length) return false
  let policy = initialCheckpoint(`${k.input.seed}:free-kick-policy`), cursor = initialCheckpoint(`${k.input.seed}:free-kicks`)
  const draw = () => { const n = nextCheckpoint(cursor); cursor = n.checkpoint; return n.value }
  let pendingPlan: FreeKickPlan | null = null
  for (let index = 0; index < state.families.length; index++) {
    const selection = k.director.selected[index], minute = MATCH_MINUTES[Math.floor(selection.opportunity / 4)], id = `play-${minute}`
    const p = nextCheckpoint(policy); policy = p.checkpoint
    const events = all.filter((e) => e.freeKick?.id === id), family = state.families[index]
    if (!['FREE_KICK', 'CORNER', 'OPEN_PLAY'].includes(family)) return false
    if (family !== (events.some((e) => e.step === 'FK_FOUL') ? 'FREE_KICK' : k.corners?.families[index] === 'CORNER' ? 'CORNER' : 'OPEN_PLAY')) return false
    if (p.value >= contactEligibleChance(state.families[index - 1])) { if (events.length) return false; continue }
    // Valid full elevens always provide the required actors.
    if (!events.length) return false
    const r = Array.from({ length: 8 }, draw), a = events[0].freeKick!, side = selection.side, other = side === 'local' ? 'cpu' : 'local'
    if (!object(a) || a.version !== FREE_KICKS_VERSION || a.id !== id || a.awardedTo !== side || a.consequence !== 'FREE_KICK_ONLY' || a.attempt !== (r[0] < .5 ? 'TACKLE' : 'PRESSURE') || a.zone !== (r[3] < .5 ? 'CENTRAL_OUTSIDE' : r[3] < .8 ? 'WIDE_OUTSIDE' : 'DEEP_OUTSIDE')) return false
    const at = (who: 'local' | 'cpu') => {
      const ids = new Set(Object.values(who === 'local' ? k.input.localLineup : k.input.cpuLineup))
      for (const sub of k.substitutionLog.filter((e) => e.side === who && e.minute <= minute)) { ids.delete(sub.outPlayerId); ids.add(sub.inPlayerId) }
      return (id: string, roles: readonly string[]) => ids.has(id) && roles.includes(k.input.catalog.find((p) => p.id === id)?.position ?? '')
    }
    const own = at(side), rival = at(other)
    if (!own(a.kickerId, ['MED', 'DEL']) || !own(a.victimId, ['MED', 'DEL']) || !own(a.targetId, ['DEL']) || !own(a.receiverId, ['MED', 'DEL']) || new Set([a.kickerId, a.targetId, a.receiverId]).size !== 3 || !rival(a.defenderId, ['DEF']) || a.offenderId !== a.defenderId || !rival(a.keeperId, ['ARQ']) || !Array.isArray(a.wallIds) || a.wallIds.length < 2 || a.wallIds.length > 3 || new Set(a.wallIds).size !== a.wallIds.length || !a.wallIds.includes(a.defenderId) || !a.wallIds.every((id) => rival(id, ['DEF']))) return false
    const first = events[0]
    if (!['FK_CONTACT_LEGAL', 'FK_CONTACT_BEATEN', 'FK_FOUL'].includes(first.step!) || first.side !== other || first.playerId !== a.offenderId || first.type !== 'pass') return false
    if (family !== 'FREE_KICK') { if (events.length !== 1 || k.tree?.log.some((c) => c.playId === id && c.node.startsWith('FK_'))) return false }
    const log = k.tree!.log.filter((c) => c.playId === id), root = log[0], header = log[1]
    if (family === 'FREE_KICK') {
      if (events[0].step !== 'FK_FOUL' || events[1]?.step !== 'FK_AWARDED' || events[2]?.step !== 'FK_SETUP') return false
      const plan: FreeKickPlan = { direction: HEADER_DIRECTIONS[Math.floor(r[4] * 3)], keeper: HEADER_DIRECTIONS[Math.floor(r[5] * 3)], trajectory: r[6] < .5 ? 'HIGH' : 'LOW', indirect: r[7] < .6 ? 'FK_CROSS' : 'FK_SHORT' }
      const initial = freeKickPending(a)
      if (root && (root.node !== initial.node || !initial.options.some((o) => o.choice === root.choice))) return false
      if (header && (header.node !== 'FK_HEADER' || !HEADER_DIRECTIONS.includes(header.choice as typeof HEADER_DIRECTIONS[number]) || side !== 'local' || !events.some((e) => e.step === 'FK_WON')) || log.length > 2) return false
      if (root) Array.from({ length: 8 }, draw)
      if (header) Array.from({ length: 4 }, draw)
      const direct = directEligible(a.zone), execution = direct ? 'DIRECT' : (side === 'cpu' ? plan.indirect : root?.choice) === 'FK_SHORT' ? 'SHORT' : 'CROSS'
      const transitions: Record<string, readonly string[]> = { FK_SETUP: ['FK_RUNUP'], FK_RUNUP: ['FK_WALL', 'FK_CROSS', 'FK_SHORT'], FK_WALL: ['FK_SHOT'], FK_CROSS: ['FK_CLEAR', 'FK_CONTEST'], FK_SHORT: ['FK_CLEAR', 'FK_CONTEST'], FK_CONTEST: ['FK_CLEAR', 'FK_WON', 'FK_ADVANCE'], FK_WON: ['FK_HEADER_CONTACT'], FK_ADVANCE: ['FK_SHOT'], FK_HEADER_CONTACT: ['FK_BLOCK', 'FK_FLIGHT'], FK_SHOT: ['FK_BLOCK', 'FK_FLIGHT'], FK_FLIGHT: ['FK_GOAL', 'FK_SAVE', 'FK_WIDE', 'FK_OVER'] }
      for (let n = 3; n < events.length; n++) {
        const e = events[n], data = e.freeKick!, step = e.step!
        if (!root || !transitions[events[n - 1].step!]?.includes(step) || data.execution !== (header && n > events.findIndex((e) => e.step === 'FK_WON') ? 'HEADER' : execution)) return false
        if (data.wall !== (direct ? side === 'cpu' ? root.choice : 'WALL_JUMP' : undefined) || data.marking !== (!direct && side === 'cpu' ? root.choice : undefined)) return false
        const aimed = ['FK_HEADER_CONTACT', 'FK_SHOT', 'FK_FLIGHT', 'FK_BLOCK', 'FK_GOAL', 'FK_SAVE', 'FK_WIDE', 'FK_OVER'].includes(step)
        const direction = header?.choice ?? (side === 'cpu' || !direct ? plan.direction : root.choice === 'FK_LEFT' ? 'NEAR_POST' : root.choice === 'FK_RIGHT' ? 'FAR_POST' : 'GOAL_CENTER')
        if (data.direction !== (aimed ? direction : undefined)) return false
        const reacted = ['FK_FLIGHT', 'FK_BLOCK', 'FK_GOAL', 'FK_SAVE', 'FK_WIDE', 'FK_OVER'].includes(step)
        if (data.keeperDirection !== (reacted ? plan.keeper : undefined) || data.trajectory !== (direct && (reacted || step === 'FK_WALL') ? plan.trajectory : undefined)) return false
      }
      const pending = k.partial?.play, waiting = pending?.freeKick?.id === id
      if (waiting) {
        pendingPlan = plan
        if (header || !equal(pending, freeKickPending(events.at(-1)!.freeKick!, Boolean(root))) || events.at(-1)?.step !== (root ? 'FK_WON' : 'FK_SETUP')) return false
      } else if (!root || !['FK_BLOCK', 'FK_CLEAR', 'FK_GOAL', 'FK_SAVE', 'FK_WIDE', 'FK_OVER'].includes(events.at(-1)?.step ?? '')) return false
    }
    for (const e of events) {
      const data = e.freeKick!, step = e.step!
      if (!object(data) || !exact(data as unknown as Record<string, unknown>, keys, ['execution', 'wall', 'marking', 'direction', 'keeperDirection', 'trajectory']) || !equal(base(data), base(a)) || e.minute !== minute || !FREE_KICK_STEPS.includes(step as typeof FREE_KICK_STEPS[number])) return false
      const defensive = ['FK_CONTACT_LEGAL', 'FK_CONTACT_BEATEN', 'FK_FOUL', 'FK_WALL', 'FK_BLOCK', 'FK_CLEAR', 'FK_SAVE'].includes(step)
      const type = ['FK_BLOCK', 'FK_CLEAR'].includes(step) ? 'recovery' : step === 'FK_SAVE' ? 'save' : step === 'FK_GOAL' ? 'goal' : ['FK_WIDE', 'FK_OVER'].includes(step) ? 'shot' : 'pass'
      const shooter = data.execution === 'DIRECT' ? a.kickerId : data.execution === 'SHORT' ? a.receiverId : a.targetId
      const playerId = step === 'FK_SAVE' ? a.keeperId : defensive ? a.defenderId : ['FK_AWARDED', 'FK_SETUP', 'FK_RUNUP', 'FK_CROSS'].includes(step) ? a.kickerId : shooter
      if (e.type !== type || e.side !== (defensive ? other : side) || e.playerId !== playerId) return false
      if (['FK_CONTACT_LEGAL', 'FK_CONTACT_BEATEN', 'FK_FOUL', 'FK_AWARDED', 'FK_SETUP'].includes(step) && !equal(data, base(a))) return false
    }
  }
  return equal(state.plan, pendingPlan) && equal(k.freeKickRng, cursor) && equal(k.freeKickPolicyRng, policy) && (!s.result || equal(s.result.freeKicks, { version: FREE_KICKS_VERSION, families: state.families })) && !all.some((e) => e.step?.startsWith('FK_') && (!e.freeKick || !k.director!.selected.some((sel) => e.freeKick!.id === `play-${MATCH_MINUTES[Math.floor(sel.opportunity / 4)]}`)))
}
