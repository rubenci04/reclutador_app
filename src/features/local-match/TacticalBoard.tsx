import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { DraftLineup } from '../draft/draftTypes'
import type { FormationId } from '../tactics/formations'
import type { Player } from '../../types/player'
import { attackingSide, ballPoint, boardDots, focusWindow, teamShift, type BoardDot, type BoardFocus, type BoardPlay, type Point } from './boardGeometry'
import type { MatchSide } from './matchTypes'

export interface TacticalBoardProps {
  readonly formations: Readonly<Record<MatchSide, FormationId>>
  readonly lineups: Readonly<Record<MatchSide, DraftLineup>>
  readonly catalog: readonly Player[]
  readonly names: Readonly<Record<MatchSide, string>>
  readonly play: BoardPlay
  /** Teammates the user can pick right now, drawn with the same letter as their decision card. */
  readonly choices?: readonly { readonly playerId: string | null; readonly label: string }[]
  /** Changes whenever a new moment is revealed, so the same kind of event twice in a row still restarts the pulse. */
  readonly tick: number
  readonly focus: BoardFocus
  readonly speed: number
  /** False under reduced motion or when the user asked to skip animations: the board snaps to each moment. */
  readonly animate: boolean
}

const PITCH_RATIO = 68 / 105
const COLORS = { local: '#00f5d4', cpu: '#ff5d73', gold: '#ffd54a' } as const
interface Pose { players: Record<string, Point>; ball: Point; shift: Record<MatchSide, number>; pulse: number }

/** Small Canvas 2D tactical board. Original code; it draws only what the confirmed event states. */
export function TacticalBoard({ formations, lineups, catalog, names, play, choices = [], tick, focus, speed, animate }: TacticalBoardProps) {
  const { t } = useTranslation()
  const canvas = useRef<HTMLCanvasElement>(null)
  const dots = useMemo(() => boardDots(formations, lineups), [formations, lineups])
  const carrier = useMemo(() => dots.find((dot) => dot.side === play.side && dot.playerId === play.playerId && play.playerId !== undefined), [dots, play.side, play.playerId])
  const from = useMemo(() => dots.find((dot) => play.fromPlayerId !== undefined && dot.playerId === play.fromPlayerId), [dots, play.fromPlayerId])
  const options = useMemo(() => choices.flatMap((choice) => { const dot = dots.find((candidate) => candidate.side === 'local' && candidate.playerId === choice.playerId && choice.playerId !== null); return dot ? [{ dot, label: choice.label }] : [] }), [dots, choices])
  const carrierName = carrier ? catalog.find((player) => player.id === carrier.playerId)?.name : undefined
  const target = useMemo(() => {
    const shift = { local: teamShift(play, 'local'), cpu: teamShift(play, 'cpu') }
    const dir = play.side === 'cpu' ? -1 : 1
    let ball = carrier && (play.kind === 'attack' || play.kind === 'pass' || play.kind === 'recovery') ? { x: carrier.home.x + shift[carrier.side] + dir * .02, y: carrier.home.y } : ballPoint(play)
    const players: Record<string, Point> = {}
    for (const dot of dots) players[dot.slotId + dot.side] = { x: dot.home.x + shift[dot.side], y: dot.home.y }
    if (carrier) {
      const key = carrier.slotId + carrier.side
      const carry = play.kind === 'attack' || play.kind === 'pass' ? dir * .10 : 0
      players[key] = { x: Math.max(.08, Math.min(.92, players[key].x + carry)), y: players[key].y }
      if (play.kind === 'attack' || play.kind === 'pass' || play.kind === 'recovery') { ball = { x: players[key].x + dir * .018, y: players[key].y } }
      const defender = dots.find((d) => d.playerId && d.playerId === play.defenderId)
      if (defender) players[defender.slotId + defender.side] = { x: players[key].x + dir * .06, y: players[key].y + .035 }
    }
    if (['shot', 'goal', 'save'].includes(play.kind)) {
      const defending = play.kind === 'save' ? play.side : play.side === 'local' ? 'cpu' : 'local'
      const keeper = dots.find((d) => d.side === defending && d.slotId === 'GK')
      if (keeper) players[keeper.slotId + keeper.side] = { x: defending === 'local' ? .055 : .945, y: ball.y + .035 }
    }
    return { ball, shift, players }
  }, [play, carrier, dots])
  const pose = useRef<Pose>({ players: {}, ball: { x: .5, y: .5 }, shift: { local: 0, cpu: 0 }, pulse: 0 })
  const pulsed = useRef(-1)
  const latest = useRef({ dots, carrier, from, options, carrierName, names, focus, play, target })
  useEffect(() => { latest.current = { dots, carrier, from, options, carrierName, names, focus, play, target } })

  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext?.('2d') ?? null
    if (!element || !context) return
    let frame = 0; let last = 0; let running = true
    if (pulsed.current !== tick) { pulsed.current = tick; pose.current.pulse = 1 }
    const draw = () => {
      const box = element.getBoundingClientRect()
      const width = Math.max(240, box.width || element.clientWidth || 640)
      const height = width * PITCH_RATIO
      const ratio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
      if (element.width !== Math.round(width * ratio) || element.height !== Math.round(height * ratio)) { element.width = Math.round(width * ratio); element.height = Math.round(height * ratio) }
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      paint(context, width, height, pose.current, latest.current)
    }
    const step = (time: number) => {
      if (!running) return
      const state = pose.current; const goal = latest.current.target
      const dt = last ? Math.min(.1, (time - last) / 1000) : .016; last = time
      const k = animate ? 1 - Math.exp(-dt * 7 * speed) : 1
      state.ball = { x: state.ball.x + (goal.ball.x - state.ball.x) * k, y: state.ball.y + (goal.ball.y - state.ball.y) * k }
      for (const [key, point] of Object.entries(goal.players)) {
        const prior = state.players[key] ?? latest.current.dots.find((d) => d.slotId + d.side === key)?.home ?? point
        state.players[key] = { x: prior.x + (point.x - prior.x) * k, y: prior.y + (point.y - prior.y) * k }
      }
      for (const side of ['local', 'cpu'] as const) state.shift[side] += (goal.shift[side] - state.shift[side]) * k
      state.pulse = animate ? Math.max(0, state.pulse - dt * 1.4 * speed) : 0
      draw()
      const settled = Math.abs(goal.ball.x - state.ball.x) < .001 && Math.abs(goal.ball.y - state.ball.y) < .001 && Object.entries(goal.players).every(([key, p]) => Math.abs(state.players[key].x - p.x) < .001 && Math.abs(state.players[key].y - p.y) < .001) && state.pulse === 0 && ['local', 'cpu'].every((side) => Math.abs(goal.shift[side as MatchSide] - state.shift[side as MatchSide]) < .001)
      if (settled) { state.ball = goal.ball; state.players = { ...goal.players }; state.shift = { ...goal.shift }; draw(); frame = 0; return }
      frame = window.requestAnimationFrame(step)
    }
    frame = window.requestAnimationFrame(step)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { if (!frame) draw() })
    observer?.observe(element)
    return () => { running = false; if (frame) window.cancelAnimationFrame(frame); observer?.disconnect() }
  }, [tick, focus, play, animate, speed, dots, options])

  const attacker = attackingSide(play)
  return <figure className="tactical-board">
    <canvas ref={canvas} className="tactical-canvas" role="img" aria-label={t('board.label', { local: names.local, cpu: names.cpu })} />
    <figcaption className="tactical-caption">{attacker ? t('series.attacking', { name: names[attacker] }) : t('board.idle')}{carrierName && <> · <b>{carrierName}</b></>}</figcaption>
  </figure>
}

function paint(ctx: CanvasRenderingContext2D, w: number, h: number, pose: Pose, view: { dots: ReturnType<typeof boardDots>; carrier: BoardDot | undefined; from: BoardDot | undefined; options: readonly { dot: BoardDot; label: string }[]; carrierName: string | undefined; names: Readonly<Record<MatchSide, string>>; focus: BoardFocus; play: BoardPlay }) {
  const window_ = focusWindow(view.focus)
  const pitchW = w / (window_.to - window_.from); const pitchH = pitchW * PITCH_RATIO
  const ox = -window_.from * pitchW
  const oy = view.focus === 'full' ? 0 : Math.min(0, Math.max(h - pitchH, h / 2 - pose.ball.y * pitchH))
  const X = (u: number) => ox + u * pitchW; const Y = (v: number) => oy + v * pitchH
  ctx.clearRect(0, 0, w, h)
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip()
  for (let stripe = 0; stripe < 12; stripe++) { ctx.fillStyle = stripe % 2 ? '#203f2b' : '#254d32'; ctx.fillRect(X(stripe / 12), Y(0), pitchW / 12 + 1, pitchH) }
  ctx.strokeStyle = '#ffffff66'; ctx.lineWidth = 1.5
  ctx.strokeRect(X(.005), Y(.01), pitchW * .99, pitchH * .98)
  ctx.beginPath(); ctx.moveTo(X(.5), Y(.01)); ctx.lineTo(X(.5), Y(.99)); ctx.stroke()
  ctx.beginPath(); ctx.arc(X(.5), Y(.5), pitchH * .13, 0, Math.PI * 2); ctx.stroke()
  for (const [from, dir] of [[.005, 1], [.995, -1]] as const) {
    ctx.strokeRect(dir === 1 ? X(from) : X(from) - pitchW * .157, Y(.215), pitchW * .157, pitchH * .57)
    ctx.strokeRect(dir === 1 ? X(from) : X(from) - pitchW * .052, Y(.37), pitchW * .052, pitchH * .26)
  }
  // Direction of the attack: a quiet chevron strip toward the goal under pressure.
  const attacker = attackingSide(view.play)
  if (attacker) {
    const dir = attacker === 'local' ? 1 : -1; const y = Y(.5); const start = X(.5 + dir * .06); const end = X(.5 + dir * .4)
    ctx.strokeStyle = COLORS[attacker] + 'aa'; ctx.lineWidth = 3; ctx.setLineDash([10, 8])
    ctx.beginPath(); ctx.moveTo(start, y); ctx.lineTo(end, y); ctx.stroke(); ctx.setLineDash([])
    ctx.beginPath(); ctx.moveTo(end, y - 9); ctx.lineTo(end + dir * 14, y); ctx.lineTo(end, y + 9); ctx.stroke()
  }
  const radius = Math.max(5, Math.min(11, pitchW * .0145))
  const at = (dot: BoardDot) => { const p = pose.players[dot.slotId + dot.side] ?? dot.home; return { x: X(p.x), y: Y(p.y) } }
  // The pass that was just played: from the protagonist to whoever received it (or cut it out).
  if (view.from && view.carrier && view.carrier !== view.from && (view.play.kind === 'pass' || view.play.kind === 'recovery')) {
    const a = at(view.from)
    ctx.strokeStyle = view.play.kind === 'pass' ? COLORS.gold : '#ffffffaa'; ctx.lineWidth = 3; ctx.setLineDash(view.play.kind === 'pass' ? [] : [6, 6])
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(X(pose.ball.x), Y(pose.ball.y)); ctx.stroke(); ctx.setLineDash([])
  }
  // Options on offer: the protagonist (carrier) with a thin line to each available teammate and its card letter.
  if (view.options.length && view.carrier) {
    const origin = at(view.carrier)
    for (const option of view.options) {
      const p = at(option.dot)
      ctx.strokeStyle = '#ffffffb0'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([])
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p.x, p.y, radius * 1.9, 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y - radius * 2.9, radius * 1.1, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#0b1a10'; ctx.font = `800 ${Math.max(11, radius * 1.4)}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(option.label, p.x, p.y - radius * 2.9); ctx.textBaseline = 'alphabetic'
    }
  }
  for (const dot of view.dots) {
    const { x, y } = at(dot)
    const marked = view.carrier?.side === dot.side && view.carrier.playerId === dot.playerId
    if (dot.playerId && dot.playerId === view.play.defenderId) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2); ctx.stroke() }
    if (marked) { ctx.fillStyle = COLORS.gold + '55'; ctx.beginPath(); ctx.arc(x, y, radius * 2.2, 0, Math.PI * 2); ctx.fill() }
    ctx.fillStyle = COLORS[dot.side]; ctx.strokeStyle = marked ? COLORS.gold : '#0b1a10'; ctx.lineWidth = marked ? 3 : 1.5
    ctx.beginPath(); ctx.arc(x, y, marked ? radius * 1.25 : radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    if (marked && view.carrierName) {
      ctx.font = `700 ${Math.max(11, radius * 1.5)}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#0b1a10'; ctx.fillStyle = '#fff'
      ctx.strokeText(view.carrierName, x, y - radius * 2.3); ctx.fillText(view.carrierName, x, y - radius * 2.3)
    }
  }
  const bx = X(pose.ball.x); const by = Y(pose.ball.y)
  if (pose.pulse > 0 && view.play.kind === 'goal') { ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 4; ctx.globalAlpha = pose.pulse; ctx.beginPath(); ctx.arc(bx, by, radius * (1.5 + (1 - pose.pulse) * 5), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1 }
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0b1a10'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(bx, by, Math.max(3.5, radius * .55), 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  // Goal labels keep orientation when zoomed: the local side defends the left goal. A cut edge points to the rest of the pitch.
  ctx.font = '800 11px Inter, system-ui, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = '#0b1a10'
  const label = (text: string, x: number, align: CanvasTextAlign, color: string) => { ctx.textAlign = align; ctx.fillStyle = color; ctx.strokeText(text, x, h - 8); ctx.fillText(text, x, h - 8) }
  if (window_.from === 0) label(view.names.local, 8, 'left', COLORS.local); else label('‹ ' + view.names.local, 8, 'left', '#ffffffcc')
  if (window_.to === 1) label(view.names.cpu, w - 8, 'right', COLORS.cpu); else label(view.names.cpu + ' ›', w - 8, 'right', '#ffffffcc')
  ctx.restore()
}
