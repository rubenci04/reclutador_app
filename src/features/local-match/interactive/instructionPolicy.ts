import type { Player } from '../../../types/player'
import type { DraftLineup } from '../../draft/draftTypes'
import type { FormationId } from '../../tactics/formations'
import { strategyFit } from '../../tactics/cpuStrategy'
import { tacticalFeatures } from '../../tactics/tacticalModel'
import { STRATEGY_IDS, type StrategyId } from '../../tactics/strategies'
import type { CpuDifficulty } from '../../recruiter-duel/cpuPolicy'
import { createSeededRandom } from '../seededRandom'
import type { InstructionPolicy, Order, Session } from './types'
import { inspectSession } from './session'

export interface OwnSquad {
  readonly lineup: DraftLineup
  readonly players: readonly Player[]
  readonly bench: readonly Player[]
  readonly formation: FormationId
  readonly strategy: StrategyId
  readonly changesLeft: number
}

/** Pure policy factory: receives only own roster and public score/time. No session or opponent plans. */
export function makeInstructionPolicy(own: OwnSquad, difficulty: CpuDifficulty): InstructionPolicy {
  return (view, context) => {
    const random = createSeededRandom(`${context.seed}:live-policy-v1:${context.cursor}`)
    const keep: Order = { type: 'KEEP', parameters: {} }
    if (difficulty === 'EASY' && random() < .65) return { order: keep, nextCursor: context.cursor + 1 }
    const substitutions = own.bench.filter((p) => context.availableBench.includes(p.id) && p.position !== 'ARQ').flatMap((incoming) => own.players.filter((p) => p.position === incoming.position).map((out) => ({ incoming, out, gain: incoming.overall_rating - out.overall_rating }))).sort((a, b) => b.gain - a.gain || a.incoming.id.localeCompare(b.incoming.id) || a.out.id.localeCompare(b.out.id))
    const best = substitutions[0]
    if (own.changesLeft > 0 && best && best.gain > (difficulty === 'HARD' ? 0 : 2)) return { order: { type: 'SUBSTITUTE', parameters: { inId: best.incoming.id, outId: best.out.id } }, nextCursor: context.cursor + 1 }
    const fit = strategyFit(tacticalFeatures(own.lineup, own.players, own.formation))
    const rival = context.participant === 'local' ? 'cpu' : 'local'
    const losing = view.score[context.participant] < view.score[rival]
    const winning = view.score[context.participant] > view.score[rival]
    const ranked = STRATEGY_IDS.map((strategy) => ({ strategy, score: fit[strategy] + (difficulty === 'HARD' && view.nextBlock >= 4 ? losing && (strategy === 'WIDE_PLAY' || strategy === 'COUNTER_ATTACK') ? .15 : winning && strategy === 'LOW_BLOCK' ? .12 : 0 : 0) })).sort((a, b) => b.score - a.score || a.strategy.localeCompare(b.strategy))
    const selected = difficulty === 'HARD' ? ranked[0].strategy : ranked[Math.floor(random() * Math.min(3, ranked.length))].strategy
    return { order: selected === own.strategy ? keep : { type: 'STRATEGY', parameters: { strategy: selected } }, nextCursor: context.cursor + 1 }
  }
}

/** Adapter intentionally copies own data only; policy view is projected, never a private snapshot. */
export function cpuInstruction(session: Session, difficulty: CpuDifficulty): Order {
  const side = session.kernel.sides.cpu
  const policy = makeInstructionPolicy({ lineup: side.team.lineup, players: side.team.players, bench: session.kernel.input.catalog.filter((p) => side.unused.includes(p.id)), formation: session.kernel.input.formations?.cpu ?? '4-3-3', strategy: session.kernel.selection.cpu, changesLeft: 3 - session.entered.cpu.length }, difficulty)
  return policy(inspectSession(session), { participant: 'cpu', seed: session.kernel.input.seed, cursor: session.kernel.nextBlock, availableBench: side.unused }).order
}
