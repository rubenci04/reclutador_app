import type { AerialPose } from './aerialGeometry'
import type { CornerEvent } from './interactive/corners'
import { headerGoalPoint } from './interactive/directedHeader'
import type { PlayStep } from './matchTypes'
import type { Point } from './boardGeometry'

const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
export function cornerBeatDuration(step: PlayStep | undefined) {
  if (step === 'CORNER_RUNUP') return 550
  if (step === 'CORNER_DELIVERY') return 1000
  if (step === 'CORNER_CONTEST' || step === 'CORNER_ZONE') return 750
  if (step === 'CORNER_WON') return 450
  if (step === 'CORNER_CONTACT' || step === 'CORNER_SHOT') return 350
  if (step === 'CORNER_FLIGHT') return 750
  if (step === 'CORNER_SHORT_PASS' || step === 'CORNER_SHORT_ADVANCE') return 650
  return 800
}
/** Entirely visual. Canonical attacking-right scene is mirrored for CPU corners; previous rendered pose supplies continuity. */
export function cornerScene(a: CornerEvent, step: PlayStep, progress: number, start?: AerialPose): AerialPose {
  const markerId = a.markerId ?? a.defenderId
  const t = Math.max(0, Math.min(1, progress)), smooth = t * t * (3 - 2 * t)
  const mirror = (p: Point): Point => a.awardedTo === 'local' ? p : { x: 1 - p.x, y: 1 - p.y }
  const edge = a.sector === 'LEFT' ? .025 : .975, corner = { x: .985, y: edge }
  const near = a.sector === 'LEFT' ? .40 : .60
  const duel = { x: .86, y: a.delivery === 'CORNER_FAR' ? 1 - near : near }
  const short = { x: .82, y: a.sector === 'LEFT' ? .17 : .83 }
  const target = a.delivery === 'CORNER_SHORT' ? short : duel
  const fallback: AerialPose = { ball: { x: .8, y: .5 }, height: 0, jump: 0, players: { [a.kickerId]: { x: .7, y: edge < .5 ? .2 : .8 }, [a.targetId]: { x: .68, y: .5 }, [a.receiverId]: { x: .7, y: edge < .5 ? .25 : .75 }, [markerId]: { x: .9, y: .55 } }, keeper: { x: .96, y: .5 } }
  const prior: AerialPose = start ? { ...start, ball: mirror(start.ball), players: Object.fromEntries(Object.entries(start.players).map(([id, p]) => [id, mirror(p)])), keeper: mirror(start.keeper) } : fallback
  const at = (id: string, fallback: Point) => prior.players[id] ?? fallback
  const players = { ...prior.players }
  players[a.kickerId] = mix(at(a.kickerId, corner), { x: corner.x - (step === 'CORNER_AWARDED' ? .065 : .018), y: edge }, smooth)
  players[a.targetId] = mix(at(a.targetId, duel), duel, smooth)
  players[a.receiverId] = mix(at(a.receiverId, short), short, smooth)
  players[markerId] = mix(at(markerId, target), { x: target.x + .045, y: target.y + (target.y < .5 ? .055 : -.055) }, smooth)
  let ball = prior.ball, height = prior.height, jump = prior.jump * (1 - smooth), keeper = prior.keeper
  if (['CORNER_DEFLECTED', 'CORNER_CONCEDED_CLEAR', 'CORNER_CONCEDED_SAVE'].includes(step)) {
    ball = mix(prior.ball, { x: 1.015, y: edge < .5 ? .22 : .78 }, smooth); height *= 1 - smooth
    if (step === 'CORNER_CONCEDED_SAVE') keeper = mix(prior.keeper, { x: .96, y: edge < .5 ? .32 : .68 }, smooth)
  } else if (step === 'CORNER_AWARDED' || step === 'CORNER_RUNUP') { ball = mix(prior.ball, corner, smooth); height *= 1 - smooth }
  else if (step === 'CORNER_DELIVERY') {
    const flight = Math.max(0, (t - .25) / .75)
    ball = t <= .25 ? mix(prior.ball, corner, t / .25) : mix(corner, duel, flight)
    height = t <= .25 ? prior.height * (1 - t / .25) : .04 * flight + Math.sin(Math.PI * flight) * .14
  } else if (step === 'CORNER_SHORT_PASS') { ball = mix(prior.ball, short, smooth); height *= 1 - smooth }
  else if (step === 'CORNER_CONTEST' || step === 'CORNER_ZONE') {
    ball = mix(prior.ball, target, smooth)
    if (a.delivery !== 'CORNER_SHORT') { jump += Math.sin(Math.PI * t) ** 2 * .07; height = prior.height + jump * .6 }
  } else if (step === 'CORNER_WON') { ball = mix(prior.ball, duel, smooth); height = prior.height + (.04 - prior.height) * smooth }
  else if (step === 'CORNER_SHORT_ADVANCE') {
    players[a.receiverId] = mix(at(a.receiverId, short), { x: .9, y: edge < .5 ? .32 : .68 }, smooth)
    const initialReceiver = at(a.receiverId, short)
    ball = { x: players[a.receiverId].x + (prior.ball.x - initialReceiver.x) * (1 - smooth) + .018 * smooth, y: players[a.receiverId].y + (prior.ball.y - initialReceiver.y) * (1 - smooth) }; height *= 1 - smooth
  } else if (step === 'CORNER_CONTACT' || step === 'CORNER_SHOT') {
    ball = mix(prior.ball, { x: prior.ball.x + .018, y: prior.ball.y }, smooth)
    if (step === 'CORNER_CONTACT') jump += Math.sin(Math.PI * t) ** 2 * .035
  } else if (step === 'CORNER_CLEAR' || step === 'CORNER_BLOCK' || step === 'CORNER_EXIT') {
    const exit = step === 'CORNER_EXIT'
    ball = mix(prior.ball, { x: exit ? .65 : .76, y: exit ? .5 : edge < .5 ? .28 : .72 }, smooth)
    height *= 1 - smooth
    if (exit) players[markerId] = mix(at(markerId, target), { x: .632, y: .5 }, smooth)
  } else {
    const aim = headerGoalPoint(a.sector, a.direction ?? 'GOAL_CENTER'), keeperAim = headerGoalPoint(a.sector, a.keeperDirection ?? 'GOAL_CENTER')
    if (step === 'CORNER_FLIGHT') { ball = mix(prior.ball, { x: .925, y: aim.y }, smooth); height = prior.height * (1 - smooth) + Math.sin(Math.PI * t) * .03; keeper = mix(prior.keeper, { x: .96, y: keeperAim.y }, smooth) }
    else if (step === 'CORNER_SAVE') { keeper = mix(prior.keeper, { x: .965, y: aim.y }, smooth); ball = mix(prior.ball, { x: .965, y: aim.y }, smooth); height *= 1 - smooth }
    else if (step === 'CORNER_GOAL') { ball = mix(prior.ball, { x: .994, y: aim.y }, smooth); height *= 1 - smooth }
    else if (step === 'CORNER_WIDE' || step === 'CORNER_OVER') { ball = mix(prior.ball, { x: .995, y: step === 'CORNER_WIDE' ? aim.y < .5 ? .28 : .72 : aim.y }, smooth); height = prior.height * (1 - smooth) + (step === 'CORNER_OVER' ? .18 * smooth : 0) }
  }
  return { ball: mirror(ball), players: Object.fromEntries(Object.entries(players).map(([id, p]) => [id, mirror(p)])), keeper: mirror(keeper), height, jump }
}
