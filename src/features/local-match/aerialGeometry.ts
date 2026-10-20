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
export interface AerialPose {
  readonly ball: Point
  readonly height: number
  readonly jump: number
  readonly players: Readonly<Record<string, Point>>
  readonly keeper: Point
}
/** Visual coordinates only. Start is the previous rendered pose, never a sporting prediction. */
export function aerialScene(a: AerialEvent, step: PlayStep, progress: number, start?: AerialPose): AerialPose {
  const t = Math.max(0, Math.min(1, progress)); const smooth = t * t * (3 - 2 * t)
  const wing = { x: .71, y: a.sector === 'LEFT' ? .20 : .80 }
  const duel = { x: .85, y: .5 + (a.sector === 'LEFT' ? -.035 : .035) }
  const marker = { x: .89, y: duel.y + .06 }
  const release = { x: duel.x + .02, y: duel.y }
  const aim = headerGoalPoint(a.sector, a.direction ?? 'GOAL_CENTER')
  // Stop before the goal mouth until the engine's confirmed ending is revealed.
  const flightEnd = { x: .925, y: aim.y }
  const keeperAim = headerGoalPoint(a.sector, a.keeperDirection ?? 'GOAL_CENTER')
  const defaultStart = step === 'AERIAL_CROSS' ? { ball: { x: .648, y: wing.y }, height: 0, jump: 0, players: { [a.crosserId]: { x: .63, y: wing.y }, [a.targetId]: { x: .66, y: .43 }, [a.defenderId]: { x: .90, y: .62 } }, keeper: { x: .96, y: .5 } }
    : { ball: step === 'DIRECTED_HEADER_FLIGHT' ? release : step.startsWith('DIRECTED_HEADER_') && !['DIRECTED_HEADER_CONTACT', 'DIRECTED_HEADER_BLOCK'].includes(step) ? flightEnd : duel, height: step === 'DIRECTED_HEADER_FLIGHT' || step === 'DIRECTED_HEADER_CONTACT' ? .04 : step === 'AERIAL_CONTEST' || step === 'AERIAL_WON' ? .04 : .015, jump: 0, players: { [a.crosserId]: wing, [a.targetId]: duel, [a.defenderId]: marker }, keeper: { x: .96, y: step.startsWith('DIRECTED_HEADER_') && step !== 'DIRECTED_HEADER_CONTACT' && step !== 'DIRECTED_HEADER_FLIGHT' ? keeperAim.y : .5 } }
  const prior = start ?? defaultStart
  const at = (id: string, fallback: Point) => prior.players[id] ?? fallback
  let ball = prior.ball; let height = prior.height; let jump = prior.jump * (1 - smooth)
  let crosser = at(a.crosserId, wing); let receiver = at(a.targetId, duel); let defender = at(a.defenderId, marker); let keeper = prior.keeper
  if (step === 'AERIAL_CROSS') {
    const run = Math.min(1, t / .25); const runEase = run * run * (3 - 2 * run)
    crosser = mix(at(a.crosserId, wing), wing, runEase)
    const flight = Math.max(0, (t - .25) / .75)
    const released = { x: wing.x + .018, y: wing.y }
    ball = t <= .25 ? mix(prior.ball, released, runEase) : mix(released, duel, flight)
    height = t <= .25 ? prior.height * (1 - runEase) : .04 * flight + Math.sin(Math.PI * flight) * .13
    receiver = mix(at(a.targetId, duel), duel, smooth)
    defender = mix(at(a.defenderId, marker), marker, smooth)
  } else if (step === 'AERIAL_CONTEST') {
    receiver = mix(at(a.targetId, duel), duel, smooth); defender = mix(at(a.defenderId, marker), marker, smooth)
    jump += Math.sin(Math.PI * t) ** 2 * .07
    ball = mix(prior.ball, duel, smooth); height = prior.height + jump * .6
  } else if (step === 'AERIAL_WON') {
    ball = mix(prior.ball, duel, smooth); height = prior.height + (.04 - prior.height) * smooth
  } else if (step === 'DIRECTED_HEADER_CONTACT') {
    ball = mix(prior.ball, release, smooth); height = prior.height + (.04 - prior.height) * smooth
    jump += Math.sin(Math.PI * t) ** 2 * .035
  } else if (step === 'DIRECTED_HEADER_FLIGHT') {
    ball = mix(prior.ball, flightEnd, smooth); height = prior.height * (1 - smooth) + .015 * smooth + Math.sin(Math.PI * t) * .025
    keeper = mix(prior.keeper, { x: .96, y: keeperAim.y }, smooth)
  } else if (step === 'AERIAL_CLEAR' || step === 'DIRECTED_HEADER_BLOCK') {
    ball = mix(prior.ball, { x: .77, y: .63 }, smooth); height = prior.height * (1 - smooth)
  } else if (step === 'DIRECTED_HEADER_OVER') {
    ball = mix(prior.ball, { x: .995, y: aim.y }, smooth); height = prior.height + (.18 - prior.height) * smooth
  } else if (step === 'DIRECTED_HEADER_WIDE') {
    ball = mix(prior.ball, { x: .995, y: aim.y < .5 ? .30 : .70 }, smooth); height = prior.height * (1 - smooth)
  } else if (step === 'DIRECTED_HEADER_SAVE') {
    keeper = mix(prior.keeper, { x: .965, y: aim.y }, smooth)
    ball = mix(prior.ball, { x: .965, y: aim.y }, smooth); height = prior.height + (.015 - prior.height) * smooth
  } else if (step === 'DIRECTED_HEADER_GOAL') {
    ball = mix(prior.ball, { x: .994, y: aim.y }, smooth); height = prior.height * (1 - smooth)
  }
  return { ball, height, jump, players: { [a.crosserId]: crosser, [a.targetId]: receiver, [a.defenderId]: defender }, keeper }
}
