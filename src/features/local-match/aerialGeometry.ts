import type { AerialEvent } from './interactive/directedHeader'
import { headerGoalPoint } from './interactive/directedHeader'
import type { PlayStep } from './matchTypes'
import type { Point } from './boardGeometry'

export function aerialBeatDuration(step: PlayStep | undefined) {
  if (step === 'AERIAL_CROSS') return 1000
  if (step === 'AERIAL_CONTEST') return 750
  if (step === 'AERIAL_WON') return 550
  if (step === 'DIRECTED_HEADER_CONTACT') return 350
  if (step === 'DIRECTED_HEADER_FLIGHT') return 750
  return 800
}
const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
/** Tactical choreography from confirmed actors/events only. The HEADER prompt has no chosen direction or keeper reaction. */
export function aerialScene(a: AerialEvent, step: PlayStep, progress: number) {
  const t = Math.max(0, Math.min(1, progress)); const smooth = t * t * (3 - 2 * t)
  const wing = { x: .71, y: a.sector === 'LEFT' ? .20 : .80 }
  const duel = { x: .85, y: .5 + (a.sector === 'LEFT' ? -.035 : .035) }
  const striker = { x: duel.x, y: duel.y }
  const defender = { x: duel.x + .022, y: duel.y + .035 }
  const aim = headerGoalPoint(a.sector, a.direction ?? 'GOAL_CENTER')
  const keeperAim = headerGoalPoint(a.sector, a.keeperDirection ?? 'GOAL_CENTER')
  let ball: Point = duel; let height = .035; let jump = 0
  let keeper = { x: .96, y: .5 }
  let crosser: Point = wing; let receiver: Point = striker; let marker: Point = defender
  if (step === 'AERIAL_CROSS') {
    const running = Math.min(1, t / .25)
    crosser = mix({ x: .63, y: wing.y }, wing, running)
    const flight = Math.max(0, (t - .25) / .75)
    ball = flight === 0 ? { x: crosser.x + .015, y: crosser.y } : mix(wing, duel, flight)
    height = .025 + Math.sin(Math.PI * flight) * .13
    receiver = mix({ x: .66, y: .43 }, striker, smooth)
    marker = mix({ x: .90, y: .62 }, defender, smooth)
  } else if (step === 'AERIAL_CONTEST') {
    jump = Math.sin(Math.PI * t) * .045
    height = .04 + jump * .6
    receiver = mix({ x: striker.x - .025, y: striker.y }, striker, smooth)
    marker = mix({ x: defender.x + .02, y: defender.y }, defender, smooth)
  } else if (step === 'DIRECTED_HEADER_CONTACT') {
    ball = mix(duel, { x: duel.x + .02, y: duel.y }, smooth)
    jump = Math.sin(Math.PI * t) * .025; height = .04
  } else if (step === 'DIRECTED_HEADER_FLIGHT') {
    ball = mix({ x: duel.x + .02, y: duel.y }, aim, smooth)
    height = .04 * (1 - t) + Math.sin(Math.PI * t) * .025
    keeper = { x: .96, y: .5 + (keeperAim.y - .5) * smooth }
  } else if (step === 'AERIAL_CLEAR' || step === 'DIRECTED_HEADER_BLOCK') {
    ball = mix(duel, { x: .77, y: .63 }, smooth); height = .04 * (1 - t)
  } else if (step === 'DIRECTED_HEADER_OVER') {
    ball = mix(aim, { x: .995, y: aim.y }, smooth); height = .08 + .10 * smooth
    keeper = { x: .96, y: keeperAim.y }
  } else if (step === 'DIRECTED_HEADER_WIDE') {
    ball = mix(aim, { x: .995, y: aim.y < .5 ? .30 : .70 }, smooth); height = .02
    keeper = { x: .96, y: keeperAim.y }
  } else if (step === 'DIRECTED_HEADER_SAVE') {
    keeper = mix({ x: .96, y: keeperAim.y }, { x: .97, y: aim.y }, smooth)
    ball = keeper; height = .015
  } else if (step === 'DIRECTED_HEADER_GOAL') {
    ball = { x: .994, y: aim.y }; height = .01
    keeper = { x: .96, y: keeperAim.y }
  }
  return { ball, height, jump, players: { [a.crosserId]: crosser, [a.targetId]: receiver, [a.defenderId]: marker }, keeper }
}
