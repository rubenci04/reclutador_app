import type { AerialPose } from './aerialGeometry'
import type { FreeKickEvent } from './interactive/freeKicks'
import type { PlayStep } from './matchTypes'
import type { Point } from './boardGeometry'
const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
export function freeKickBeatDuration(step?: PlayStep) {
  if (step === 'FK_SETUP') return 1100
  if (step === 'FK_RUNUP') return 650
  if (step === 'FK_WALL') return 400
  if (step === 'FK_SHOT' || step === 'FK_HEADER_CONTACT') return 350
  if (step === 'FK_CROSS') return 1000
  if (step === 'FK_FLIGHT') return 750
  return 800
}
/** Tactical staging only: these normalized drawing points are not measured foul coordinates. */
export function freeKickScene(a: FreeKickEvent, step: PlayStep, progress: number, start?: AerialPose): AerialPose {
  const t = Math.max(0, Math.min(1, progress)), smooth = t * t * (3 - 2 * t)
  const mirror = (p: Point): Point => a.awardedTo === 'local' ? p : { x: 1 - p.x, y: 1 - p.y }
  const spot: Point = a.zone === 'CENTRAL_OUTSIDE' ? { x: .72, y: .5 } : a.zone === 'WIDE_OUTSIDE' ? { x: .72, y: .22 } : { x: .59, y: .35 }
  const prior: AerialPose = start ? { ...start, ball: mirror(start.ball), players: Object.fromEntries(Object.entries(start.players).map(([id, p]) => [id, mirror(p)])), keeper: mirror(start.keeper) } : { ball: spot, players: {}, keeper: { x: .96, y: .5 }, height: 0, jump: 0 }
  const players = { ...prior.players }, at = (id: string, fallback: Point) => prior.players[id] ?? fallback
  const preparing = ['FK_FOUL', 'FK_AWARDED', 'FK_SETUP'].includes(step)
  const short = { x: spot.x + .10, y: spot.y + .10 }, target = { x: .86, y: .48 }
  let ball = prior.ball, height = prior.height * (1 - smooth), jump = 0, keeper = prior.keeper
  if (preparing) {
    ball = mix(prior.ball, spot, smooth)
    players[a.victimId] = mix(at(a.victimId, spot), { x: spot.x - .05, y: spot.y + .07 }, smooth)
    players[a.kickerId] = mix(at(a.kickerId, spot), { x: spot.x - .065, y: spot.y }, smooth)
    players[a.targetId] = mix(at(a.targetId, target), { x: .83, y: .47 }, smooth)
    players[a.receiverId] = mix(at(a.receiverId, short), short, smooth)
    a.wallIds.forEach((id, n) => { players[id] = mix(at(id, { x: .81, y: .45 + n * .045 }), { x: spot.x + .09, y: spot.y + (.5 - spot.y) * .35 + (n - (a.wallIds.length - 1) / 2) * .045 }, smooth) })
  } else if (step === 'FK_RUNUP') {
    ball = mix(prior.ball, spot, smooth); players[a.kickerId] = mix(at(a.kickerId, spot), { x: spot.x - .018, y: spot.y }, smooth)
  } else if (step === 'FK_WALL') {
    // Wall reacts to the run-up. Ball remains stationary until the actual strike.
    jump = a.wall === 'WALL_JUMP' ? Math.sin(Math.PI * t / 2) * .055 : 0
  } else if (step === 'FK_CROSS' || step === 'FK_SHORT') {
    const destination = step === 'FK_SHORT' ? short : target
    ball = mix(prior.ball, destination, smooth); height = step === 'FK_CROSS' ? .04 * smooth + Math.sin(Math.PI * t) * .14 : height
    players[a.targetId] = mix(at(a.targetId, target), target, smooth)
    players[a.receiverId] = mix(at(a.receiverId, short), short, smooth)
    players[a.defenderId] = mix(at(a.defenderId, target), { x: target.x + .04, y: target.y + .055 }, smooth)
  } else if (step === 'FK_CONTEST' || step === 'FK_WON') {
    ball = mix(prior.ball, a.execution === 'SHORT' ? short : target, smooth)
    jump = a.execution === 'CROSS' ? Math.sin(Math.PI * t) ** 2 * .06 : 0
    height = a.execution === 'CROSS' ? .04 : height
  } else if (step === 'FK_ADVANCE') {
    const destination = { x: short.x + .045, y: short.y }
    players[a.receiverId] = mix(at(a.receiverId, short), destination, smooth); ball = mix(prior.ball, { x: destination.x + .018, y: destination.y }, smooth)
  } else if (step === 'FK_SHOT' || step === 'FK_HEADER_CONTACT') {
    ball = mix(prior.ball, { x: prior.ball.x + .02, y: prior.ball.y }, smooth)
    jump = step === 'FK_HEADER_CONTACT' ? Math.sin(Math.PI * t) ** 2 * .035 : prior.jump * (1 - smooth)
  } else if (step === 'FK_CLEAR' || step === 'FK_BLOCK') {
    ball = mix(prior.ball, { x: step === 'FK_BLOCK' ? .79 : .63, y: .68 }, smooth); height = Math.sin(Math.PI * t) * .035
  } else if (['FK_FLIGHT', 'FK_SAVE', 'FK_GOAL', 'FK_WIDE', 'FK_OVER'].includes(step)) {
    const aim = a.direction === 'NEAR_POST' ? .43 : a.direction === 'FAR_POST' ? .57 : .5
    const keeperAim = a.keeperDirection === 'NEAR_POST' ? .43 : a.keeperDirection === 'FAR_POST' ? .57 : .5
    const destination = step === 'FK_FLIGHT' ? { x: .925, y: aim } : step === 'FK_SAVE' ? { x: .965, y: aim } : { x: .994, y: step === 'FK_WIDE' ? aim < .5 ? .28 : .72 : aim }
    ball = mix(prior.ball, destination, smooth)
    height = step === 'FK_OVER' ? prior.height * (1 - smooth) + .18 * smooth : prior.height * (1 - smooth) + (step === 'FK_FLIGHT' && a.trajectory !== 'LOW' ? Math.sin(Math.PI * t) * .09 : 0)
    if (step === 'FK_FLIGHT' || step === 'FK_SAVE') keeper = mix(prior.keeper, { x: step === 'FK_SAVE' ? .965 : .96, y: step === 'FK_SAVE' ? aim : keeperAim }, smooth)
  }
  return { ball: mirror(ball), players: Object.fromEntries(Object.entries(players).map(([id, p]) => [id, mirror(p)])), keeper: mirror(keeper), height, jump }
}
