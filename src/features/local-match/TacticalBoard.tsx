import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { freeKickBeatDuration, freeKickScene } from './freeKickGeometry'
import { cornerBeatDuration, cornerScene } from './cornerGeometry'
import { useTranslation } from 'react-i18next'
import type { DraftLineup } from '../draft/draftTypes'
import type { FormationId } from '../tactics/formations'
import type { Player } from '../../types/player'
import { attackingSide, ballPoint, boardDots, contextualPlayerOffset, focusWindow, teamShift, type BoardDot, type BoardFocus, type BoardPlay, type Point } from './boardGeometry'
import { aerialBeatDuration, aerialScene } from './aerialGeometry'
import { HEADER_DIRECTIONS, headerGoalPoint } from './interactive/directedHeader'
import type { MatchSide } from './matchTypes'
import { boardPoint, nearestHit, shortName, type BoardHit } from './shortName'
import type { DefensePick } from './DefensePanel'
import type { PlayChoice, PlayNode } from './interactive'
import type { DribbleScene } from './DribblePanel'

/** Public, available choices only; hidden CPU plans never cross this interface. */
export interface BoardDecision {
  readonly key: string
  readonly node: PlayNode
  readonly options: readonly { readonly choice: PlayChoice; readonly label: string; readonly playerId: string | null; readonly rivalId: string | null }[]
  readonly selected: PlayChoice | null
  readonly timed: boolean
  readonly onSelect: (choice: PlayChoice) => void
  readonly onExecute: () => void
}

/** SIM-FIELD-002: the defensive moment on the pitch. Three lanes (the defender's left, centre, right) and the press zone; the first tap picks, the next one stops the precision bar. */
export interface BoardDefense { readonly attackerId: string; readonly defenderId: string; readonly pick: DefensePick | null; readonly labels: Readonly<Record<DefensePick, string>>; readonly onSelect: (pick: DefensePick) => void; readonly onExecute: () => void }
const DEFENSE_PICKS = ['LEFT', 'CENTER', 'RIGHT'] as const

export interface TacticalBoardProps {
  readonly formations: Readonly<Record<MatchSide, FormationId>>
  readonly lineups: Readonly<Record<MatchSide, DraftLineup>>
  readonly catalog: readonly Player[]
  readonly names: Readonly<Record<MatchSide, string>>
  readonly play: BoardPlay
  /** Teammates the user can pick right now, drawn with the same letter as their decision card. */
  readonly choices?: readonly { readonly playerId: string | null; readonly label: string }[]
  /** GAMEPLAY-POLISH-010: tapping an offered teammate on the board sends the same command as its card. Absent: the board is display only. */
  readonly onPick?: (label: string) => void
  /** SIM-FIELD-002: the rival goal as a target while a finish is offered; tapping it sends the same SHOOT command as its card. */
  readonly goalZone?: { readonly label: string; readonly onSelect: () => void }
  readonly defense?: BoardDefense
  readonly decision?: BoardDecision
  readonly dribbleResult?: DribbleScene
  /** Short instruction for the moment on offer, kept next to the pitch. */
  readonly hint?: string
  /** Anything that belongs right under the pitch while the moment is live (the precision bar). */
  readonly extra?: ReactNode
  /** Changes whenever a new moment is revealed, so the same kind of event twice in a row still restarts the pulse. */
  readonly tick: number
  readonly focus: BoardFocus
  readonly speed: number
  /** False under reduced motion or when the user asked to skip animations: the board snaps to each moment. */
  readonly animate: boolean
  readonly paused?: boolean
}

const PITCH_RATIO = 68 / 105
const COLORS = { local: '#00f5d4', cpu: '#ff5d73', gold: '#ffd54a' } as const
interface Pose { camera: { from: number; to: number }; start?: Parameters<typeof aerialScene>[3]; progress: number; height: number; jump: number; players: Record<string, Point>; ball: Point; trail: { x: number; y: number; height: number }[]; runPhase: number; flightProgress: number; shift: Record<MatchSide, number>; pulse: number }

/** Small Canvas 2D tactical board. Original code; it draws only what the confirmed event states. */
export function TacticalBoard({ formations, lineups, catalog, names, play, choices = [], onPick, goalZone, defense, decision, dribbleResult, hint, extra, tick, focus, speed, animate, paused = false }: TacticalBoardProps) {
  const { t } = useTranslation()
  const canvas = useRef<HTMLCanvasElement>(null)
  const [hits] = useState<Hit[]>(() => [])
  const painted = useRef({ width: 640, height: 413 })
  const hover = useRef<string | null>(null)
  const pickedAt = useRef(0)
  const redraw = useRef<() => void>(() => {})
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!media) return
    const update = () => setReducedMotion(media.matches)
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])
  const motion = animate && !reducedMotion
  /** The pass just chosen: the ball flies from the carrier to the teammate while the engine confirms it. */
  const [flight, setFlight] = useState<{ readonly key: number; readonly fx: number; readonly fy: number; readonly tx: number; readonly ty: number } | null>(null)
  const flightClock = useRef({ key: -1, elapsed: 0 })
  useEffect(() => { if (!flight || paused) return; const timer = window.setTimeout(() => setFlight(null), Math.max(0, 520 - flightClock.current.elapsed)); return () => window.clearTimeout(timer) }, [flight, paused])
  /** Every footballer on the pitch carries his rating; the readable surname is added when the board is wide enough or zoomed on one team. */
  const info = useMemo(() => new Map(catalog.map((player) => [player.id, { ovr: player.overall_rating, short: shortName(player.name) }])), [catalog])
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
    for (const dot of dots) {
      const offset = contextualPlayerOffset(dot, play, ball, options.some(option => option.dot === dot))
      players[dot.slotId + dot.side] = { x: dot.home.x + offset.x, y: dot.home.y + offset.y }
    }
    if (carrier) {
      const key = carrier.slotId + carrier.side
      const carry = play.kind === 'attack' || play.kind === 'pass' ? dir * .10 : 0
      players[key] = { x: Math.max(.08, Math.min(.92, players[key].x + carry)), y: players[key].y + (play.variant === undefined ? 0 : (play.variant - 1) * .025) }
      if (play.kind === 'attack' || play.kind === 'pass' || play.kind === 'recovery') { ball = { x: players[key].x + dir * .018, y: players[key].y } }
      const defender = dots.find((d) => d.playerId && d.playerId === play.defenderId)
      if (defender) players[defender.slotId + defender.side] = { x: players[key].x + dir * .06, y: players[key].y + .035 }
    }
    if (['shot', 'goal', 'save'].includes(play.kind)) {
      const defending = play.kind === 'save' ? play.side : play.side === 'local' ? 'cpu' : 'local'
      const keeper = dots.find((d) => d.side === defending && d.slotId === 'GK')
      if (keeper) players[keeper.slotId + keeper.side] = { x: defending === 'local' ? .055 : .945, y: ball.y + .035 }
    }
    if (dribbleResult && (play.step === 'DRIBBLE_OK' || play.step === 'DRIBBLE_LOST')) {
      const runner = dots.find(dot => dot.playerId === dribbleResult.attackerId)
      const marker = dots.find(dot => dot.playerId === dribbleResult.defenderId)
      if (runner && marker) {
        const start = players[runner.slotId + runner.side]
        const laneY = Math.max(.10, Math.min(.90, start.y + ({ LEFT: -.14, CENTER: 0, RIGHT: .14 })[dribbleResult.lane]))
        players[runner.slotId + runner.side] = { x: Math.min(.90, start.x + (dribbleResult.ok ? .12 : .035)), y: laneY }
        players[marker.slotId + marker.side] = { x: Math.min(.94, start.x + .07), y: Math.max(.10, Math.min(.90, start.y + ({ LEFT: -.14, CENTER: 0, RIGHT: .14 })[dribbleResult.cover])) }
        const holder = players[(dribbleResult.ok ? runner : marker).slotId + (dribbleResult.ok ? runner : marker).side]
        ball = { x: holder.x + .018, y: holder.y }
      }
    }
    return { ball, shift, players }
  }, [play, carrier, dots, options, dribbleResult])
  const pose = useRef<Pose>({ camera: { from: 0, to: 1 }, progress: 0, height: 0, jump: 0, players: {}, ball: { x: .5, y: .5 }, trail: [], runPhase: 0, flightProgress: 0, shift: { local: 0, cpu: 0 }, pulse: 0 })
  const pulsed = useRef(-1)
  const elapsed = useRef(0)
  const aerialStart = useRef<Parameters<typeof aerialScene>[3]>(undefined)
  const runningOptions = motion && Boolean(onPick) && options.length > 0 && !play.aerial && !play.corner && !play.freeKick
  const latest = useRef({ dots, carrier, from, options, carrierName, names, focus, play, target, hits: hits, info, hover, goalZone, defense, decision, runningOptions, motion, flight })
  useEffect(() => { latest.current = { dots, carrier, from, options, carrierName, names, focus, play, target, hits: hits, info, hover, goalZone, defense, decision, runningOptions, motion, flight } })
  useEffect(() => { latest.current.hits.length = 0; hover.current = null; pickedAt.current = 0 }, [decision?.key])

  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext?.('2d') ?? null
    if (!element || !context) return
    let frame = 0; let last: number | undefined; let runLast: number | undefined; let running = true
    if (pulsed.current !== tick) {
      pulsed.current = tick; pose.current.pulse = 1; elapsed.current = 0
      // Preserve the previous confirmed pose when a new aerial beat starts.
      const actors = Object.fromEntries(dots.flatMap((dot) => dot.playerId ? [[dot.playerId, pose.current.players[dot.slotId + dot.side] ?? dot.home]] : []))
      aerialStart.current = { ball: pose.current.ball, height: pose.current.height, jump: pose.current.jump, players: actors, keeper: actors[dots.find((d) => d.side === ((play.freeKick ?? play.corner)?.awardedTo === 'cpu' ? 'local' : 'cpu') && d.slotId === 'GK')?.playerId ?? ''] ?? { x: (play.freeKick ?? play.corner)?.awardedTo === 'cpu' ? .04 : .96, y: .5 } }
      pose.current.start = aerialStart.current
    }
    const draw = () => {
      const box = element.getBoundingClientRect()
      const width = Math.max(240, box.width || element.clientWidth || 640)
      const height = width * PITCH_RATIO
      const ratio = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
      if (element.width !== Math.round(width * ratio) || element.height !== Math.round(height * ratio)) { element.width = Math.round(width * ratio); element.height = Math.round(height * ratio) }
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      painted.current = { width, height }
      paint(context, width, height, pose.current, latest.current)
    }
    redraw.current = draw
    const step = (time: number) => {
      if (!running) return
      const state = pose.current; const goal = latest.current.target
      const dt = last === undefined ? 0 : Math.min(.1, (time - last) / 1000); last = time
      if (paused && motion) { draw(); frame = 0; return }
      const runNow = performance.now()
      const runDelta = runLast === undefined ? 0 : Math.min(.1, Math.max(0, (runNow - runLast) / 1000))
      runLast = runNow
      state.runPhase = motion ? state.runPhase + runDelta * 2.4 : 0
      const flightKey = flight?.key ?? -1
      if (flightClock.current.key !== flightKey) flightClock.current = { key: flightKey, elapsed: 0 }
      flightClock.current.elapsed += dt * 1000
      state.flightProgress = motion ? Math.min(1, flightClock.current.elapsed / 450) : 1
      const previousBall = { ...state.ball, height: state.height }
      const k = motion ? 1 - Math.exp(-dt * 7 * speed) : 1
      const camera = focusWindow(latest.current.focus)
      state.camera.from += (camera.from - state.camera.from) * k; state.camera.to += (camera.to - state.camera.to) * k
      state.ball = { x: state.ball.x + (goal.ball.x - state.ball.x) * k, y: state.ball.y + (goal.ball.y - state.ball.y) * k }
      for (const [key, point] of Object.entries(goal.players)) {
        const prior = state.players[key] ?? latest.current.dots.find((d) => d.slotId + d.side === key)?.home ?? point
        state.players[key] = { x: prior.x + (point.x - prior.x) * k, y: prior.y + (point.y - prior.y) * k }
      }
      for (const side of ['local', 'cpu'] as const) state.shift[side] += (goal.shift[side] - state.shift[side]) * k
      state.pulse = motion ? Math.max(0, state.pulse - dt * 1.4 * speed) : 0
      const action = latest.current.play
      elapsed.current += dt * 1000 * speed
      state.progress = motion ? Math.min(1, elapsed.current / (action.freeKick ? freeKickBeatDuration(action.step) : action.corner ? cornerBeatDuration(action.step) : aerialBeatDuration(action.step))) : 1
      if ((action.aerial || action.corner || action.freeKick) && action.step) {
        const scene = action.freeKick ? freeKickScene(action.freeKick, action.step, state.progress, aerialStart.current) : action.corner ? cornerScene(action.corner, action.step, state.progress, aerialStart.current) : aerialScene(action.aerial!, action.step, state.progress, aerialStart.current)
        state.ball = scene.ball; state.height = scene.height; state.jump = scene.jump
        for (const dot of latest.current.dots) {
          if (dot.playerId && scene.players[dot.playerId]) state.players[dot.slotId + dot.side] = scene.players[dot.playerId]
          if (dot.side === ((action.freeKick ?? action.corner)?.awardedTo === 'cpu' ? 'local' : 'cpu') && dot.slotId === 'GK') state.players[dot.slotId + dot.side] = scene.keeper
        }
      } else { state.height = 0; state.jump = 0 }
      const travel = Math.hypot(state.ball.x - previousBall.x, state.ball.y - previousBall.y, state.height - previousBall.height)
      state.trail = motion && travel > .0002 ? [previousBall, ...state.trail].slice(0, 3) : []
      draw()
      if ((action.aerial || action.corner || action.freeKick) && state.progress >= 1) { frame = 0; return }
      const settled = Math.abs(goal.ball.x - state.ball.x) < .001 && Math.abs(goal.ball.y - state.ball.y) < .001 && Object.entries(goal.players).every(([key, p]) => Math.abs(state.players[key].x - p.x) < .001 && Math.abs(state.players[key].y - p.y) < .001) && state.pulse === 0 && ['local', 'cpu'].every((side) => Math.abs(goal.shift[side as MatchSide] - state.shift[side as MatchSide]) < .001)
      if (settled && !runningOptions && (!flight || state.flightProgress >= 1) && !action.aerial && !action.corner && !action.freeKick) { state.ball = goal.ball; state.players = { ...goal.players }; state.shift = { ...goal.shift }; state.trail = []; draw(); frame = 0; return }
      frame = window.requestAnimationFrame(step)
    }
    frame = window.requestAnimationFrame(step)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { if (!frame) draw() })
    observer?.observe(element)
    return () => { running = false; if (frame) window.cancelAnimationFrame(frame); observer?.disconnect() }
  }, [tick, focus, play, motion, speed, dots, options, paused, runningOptions, flight, Boolean(goalZone), defense?.attackerId, defense?.pick, decision?.key, decision?.selected, target]) // eslint-disable-line react-hooks/exhaustive-deps

  const attacker = attackingSide(play)
  const interactive = Boolean(onPick && options.length || goalZone || defense || decision)
  const hitAt = (event: { readonly clientX: number; readonly clientY: number; readonly currentTarget: HTMLCanvasElement }) => { const point = boardPoint({ x: event.clientX, y: event.clientY }, event.currentTarget.getBoundingClientRect(), painted.current); return nearestHit(hits, point.x, point.y) }
  const choose = (event: { readonly clientX: number; readonly clientY: number; readonly currentTarget: HTMLCanvasElement }) => {
    const now = Date.now()
    if (decision) {
      const hit = hitAt(event)
      const option = decision.options.find(option => hit?.label === 'PLAY:' + option.choice)
      if (!option) return
      if (decision.timed && decision.selected) { if (now - pickedAt.current > 350) decision.onExecute(); return }
      pickedAt.current = now
      decision.onSelect(option.choice)
      return
    }
    if (defense) {
      // The pick starts the timing and the next tap stops it: no third confirmation. A double tap on the same spot is not a second decision.
      if (defense.pick) { if (now - pickedAt.current > 350) defense.onExecute(); return }
      const hit = hitAt(event)
      if (hit?.label.startsWith('DEF:')) { pickedAt.current = now; defense.onSelect(hit.label.slice(4) as DefensePick) }
      return
    }
    const hit = hitAt(event)
    if (!hit) return
    if (motion && hit.cx !== undefined && hit.fx !== undefined) {
      flightClock.current = { key: now, elapsed: 0 }
      setFlight({ key: now, fx: hit.fx / painted.current.width, fy: hit.fy! / painted.current.height, tx: hit.cx / painted.current.width, ty: hit.cy! / painted.current.height })
    }
    if (hit.label === 'GOAL') goalZone?.onSelect(); else onPick?.(hit.label)
  }
  return <figure className="tactical-board">
    <canvas ref={canvas} className={`tactical-canvas${interactive ? ' is-pickable' : ''}`} onPointerMove={interactive ? (event) => { if (event.pointerType !== 'mouse') return; const next = hitAt(event)?.label ?? null; if (next !== hover.current) { hover.current = next; event.currentTarget.style.cursor = next || defense?.pick ? 'pointer' : 'default'; redraw.current() } } : undefined} onPointerLeave={() => { if (hover.current) { hover.current = null; redraw.current() } }} role="img" aria-label={t('board.label', { local: names.local, cpu: names.cpu })} onClick={interactive ? choose : undefined} />
    {hint && <small className="board-pick-hint" role="status">{hint}</small>}
    {extra}
    <figcaption className="tactical-caption">{attacker ? t('series.attacking', { name: names[attacker] }) : t('board.idle')}{carrierName && (!play.freeKick || carrier?.side === attacker) && <> · <b>{carrierName}</b></>}</figcaption>
  </figure>
}

type Hit = BoardHit
function paint(ctx: CanvasRenderingContext2D, w: number, h: number, pose: Pose, view: { dots: ReturnType<typeof boardDots>; carrier: BoardDot | undefined; from: BoardDot | undefined; options: readonly { dot: BoardDot; label: string }[]; carrierName: string | undefined; names: Readonly<Record<MatchSide, string>>; focus: BoardFocus; play: BoardPlay; hits: Hit[]; info: ReadonlyMap<string, { ovr: number; short: string }>; hover: { current: string | null }; goalZone?: { label: string }; defense?: BoardDefense; decision?: BoardDecision; runningOptions: boolean; motion: boolean; flight: { fx: number; fy: number; tx: number; ty: number } | null }) {
  const aerialActors = view.play.aerial ?? (view.play.corner ? { ...view.play.corner, defenderId: view.play.corner.markerId ?? view.play.corner.defenderId } : undefined)
  // Interactive targets use the requested focus immediately; a prior set-piece pan must never move their hit areas.
  const window_ = (view.play.corner || view.play.freeKick) && !view.decision ? pose.camera : focusWindow(view.focus)
  const pitchW = w / (window_.to - window_.from); const pitchH = pitchW * PITCH_RATIO
  const ox = -window_.from * pitchW
  const pan = Math.min(0, Math.max(h - pitchH, h / 2 - pose.ball.y * pitchH))
  const oy = (view.play.corner || view.play.freeKick) ? pan * Math.min(1, (1 - window_.to + window_.from) / .45) : view.focus === 'full' ? 0 : pan
  const X = (u: number) => ox + u * pitchW; const Y = (v: number) => oy + v * pitchH
  ctx.clearRect(0, 0, w, h)
  view.hits.length = 0
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
  // Goal mouth: the three heading targets share exactly these pitch coordinates.
  for (const x of [.005, .985]) { ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 2; ctx.strokeRect(X(x), Y(.40), pitchW * .01, pitchH * .20) }
  // Direction of the attack: a quiet chevron strip toward the goal under pressure.
  const attacker = attackingSide(view.play)
  if (attacker && !view.play.freeKick) {
    const dir = attacker === 'local' ? 1 : -1; const y = Y(.5); const start = X(.5 + dir * .06); const end = X(.5 + dir * .4)
    ctx.strokeStyle = COLORS[attacker] + 'aa'; ctx.lineWidth = 3; ctx.setLineDash([10, 8])
    ctx.beginPath(); ctx.moveTo(start, y); ctx.lineTo(end, y); ctx.stroke(); ctx.setLineDash([])
    ctx.beginPath(); ctx.moveTo(end, y - 9); ctx.lineTo(end + dir * 14, y); ctx.lineTo(end, y + 9); ctx.stroke()
  }
  const radius = Math.max(5, Math.min(11, pitchW * .0145))
  const at = (dot: BoardDot) => {
    const p = pose.players[dot.slotId + dot.side] ?? dot.home
    const option = view.options.findIndex(option => option.dot === dot)
    const run = view.runningOptions && option >= 0 && dot.side === attacker ? Math.sin(pose.runPhase + option * Math.PI) * .025 * (dot.side === 'local' ? 1 : -1) : 0
    const jumping = view.play.freeKick ? (view.play.step === 'FK_WALL' || view.play.step === 'FK_SHOT' ? view.play.freeKick.wallIds.includes(dot.playerId ?? '') : dot.playerId === view.play.freeKick.targetId || dot.playerId === view.play.freeKick.defenderId) : aerialActors && (dot.playerId === aerialActors.targetId || dot.playerId === aerialActors.defenderId)
    return { x: X(Math.max(.035, Math.min(.965, p.x + run))), y: Y(p.y) - (jumping ? pose.jump * pitchH : 0) }
  }
  // The pass that was just played: from the protagonist to whoever received it (or cut it out).
  if (!view.play.aerial && !view.play.corner && !view.play.freeKick && view.from && view.carrier && view.carrier !== view.from && (view.play.kind === 'pass' || view.play.kind === 'recovery')) {
    const a = at(view.from)
    ctx.strokeStyle = view.play.kind === 'pass' ? COLORS.gold : '#ffffffaa'; ctx.lineWidth = 3; ctx.setLineDash(view.play.kind === 'pass' ? [] : [6, 6])
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(X(pose.ball.x), Y(pose.ball.y)); ctx.stroke(); ctx.setLineDash([])
  }
  if ((aerialActors || view.play.freeKick) && view.play.step && ['FK_CROSS', 'FK_FLIGHT', 'FK_SHORT', 'AERIAL_CROSS', 'DIRECTED_HEADER_FLIGHT', 'CORNER_DELIVERY', 'CORNER_FLIGHT', 'CORNER_SHORT_PASS'].includes(view.play.step)) {
    ctx.strokeStyle = '#ffd54ab0'; ctx.lineWidth = 2; ctx.beginPath()
    for (let i = 0; i <= 24; i++) {
      const scene = view.play.freeKick ? freeKickScene(view.play.freeKick, view.play.step, pose.progress * i / 24, pose.start) : view.play.corner ? cornerScene(view.play.corner, view.play.step, pose.progress * i / 24, pose.start) : aerialScene(view.play.aerial!, view.play.step, pose.progress * i / 24, pose.start)
      const x = X(scene.ball.x); const y = Y(scene.ball.y) - scene.height * pitchH
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  // Options on offer: the protagonist (carrier) with a thin line to each available teammate and its card letter.
  if (view.options.length && view.carrier) {
    const origin = at(view.carrier)
    for (const option of view.options) {
      const p = at(option.dot)
      if (option.dot.side === attacker) {
        const dir = attacker === 'local' ? 1 : -1
        const start = p.x + dir * radius * 2.2, end = p.x + dir * pitchW * .065
        ctx.save(); ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.lineDashOffset = view.runningOptions ? -pose.runPhase * 8 : 0
        ctx.beginPath(); ctx.moveTo(start, p.y); ctx.lineTo(end, p.y); ctx.stroke(); ctx.setLineDash([])
        ctx.beginPath(); ctx.moveTo(end - dir * 6, p.y - 5); ctx.lineTo(end, p.y); ctx.lineTo(end - dir * 6, p.y + 5); ctx.stroke(); ctx.restore()
      }
      view.hits.push({ x: p.x, y: p.y - radius, r: Math.max(24, radius * 3.6), label: option.label, cx: p.x, cy: p.y, fx: origin.x, fy: origin.y })
      if (view.hover.current === option.label) { ctx.fillStyle = '#ffffff33'; ctx.beginPath(); ctx.arc(p.x, p.y, radius * 2.8, 0, Math.PI * 2); ctx.fill() }
      ctx.strokeStyle = '#ffffffb0'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([])
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p.x, p.y, radius * 1.9, 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y - radius * 2.9, radius * 1.1, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#0b1a10'; ctx.font = `800 ${Math.max(11, radius * 1.4)}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(option.label, p.x, p.y - radius * 2.9); ctx.textBaseline = 'alphabetic'
    }
  }
  // SIM-FIELD-002 FINISH: the rival goal is a target while SHOOT is on offer and the goal is on screen.
  if (view.goalZone) {
    const gx = X(.985), top = Y(.40), bottom = Y(.60), mid = (top + bottom) / 2
    if (gx > 0 && gx < w + 2 && mid > 0 && mid < h) {
      const hot = view.hover.current === 'GOAL'
      ctx.fillStyle = hot ? '#ffd54a77' : '#ffd54a33'; ctx.fillRect(gx - pitchW * .05, top - 5, pitchW * .06, bottom - top + 10)
      ctx.strokeStyle = COLORS.gold; ctx.lineWidth = hot ? 4 : 3; ctx.setLineDash([6, 4]); ctx.strokeRect(gx - pitchW * .05, top - 5, pitchW * .06, bottom - top + 10); ctx.setLineDash([])
      ctx.font = `800 ${Math.max(11, radius * 1.3)}px Inter, system-ui, sans-serif`; ctx.textAlign = 'right'; ctx.lineWidth = 3; ctx.strokeStyle = '#0b1a10'; ctx.fillStyle = COLORS.gold
      ctx.strokeText(view.goalZone.label, Math.min(w - 4, gx + 4), top - 12); ctx.fillText(view.goalZone.label, Math.min(w - 4, gx + 4), top - 12)
      const origin = view.carrier ? at(view.carrier) : undefined
      view.hits.push({ x: gx, y: mid, r: Math.max(30, (bottom - top) * .9), label: 'GOAL', cx: gx, cy: mid, ...(origin ? { fx: origin.x, fy: origin.y } : {}) })
    }
  }
  // SIM-FIELD-002 DEFEND: attacker, defender, three lanes seen from the defender (he faces the rival, so his left is the top of the pitch) and the press zone. The CPU intention is never drawn.
  const duel = view.defense
  const rival = duel && view.dots.find((dot) => dot.playerId === duel.attackerId); const keeper = duel && view.dots.find((dot) => dot.playerId === duel.defenderId)
  if (duel && rival && keeper) {
    const a = at(rival), d = at(keeper)
    const left = Math.max(2, X(.03)), right = Math.min(w - 2, Math.max(a.x, d.x) + pitchW * .1), edges = [.14, .38, .62, .86].map(Y)
    DEFENSE_PICKS.forEach((lane, index) => {
      const chosen = duel.pick === lane, hot = view.hover.current === 'DEF:' + lane
      ctx.fillStyle = chosen ? '#ffd54a40' : hot ? '#ffffff30' : '#ffffff12'; ctx.fillRect(left, edges[index], right - left, edges[index + 1] - edges[index])
      ctx.strokeStyle = chosen ? COLORS.gold : '#ffffff80'; ctx.lineWidth = chosen ? 3 : 1.5; ctx.setLineDash(chosen ? [] : [6, 5]); ctx.strokeRect(left, edges[index], right - left, edges[index + 1] - edges[index]); ctx.setLineDash([])
      ctx.font = `800 ${Math.max(11, radius * 1.3)}px Inter, system-ui, sans-serif`; ctx.textAlign = 'left'; ctx.lineWidth = 3; ctx.strokeStyle = '#0b1a10'; ctx.fillStyle = chosen ? COLORS.gold : '#fff'
      ctx.strokeText(duel.labels[lane], left + 6, edges[index] + 16); ctx.fillText(duel.labels[lane], left + 6, edges[index] + 16)
      if (!duel.pick) view.hits.push({ x: (left + right) / 2, y: (edges[index] + edges[index + 1]) / 2, r: 0, hw: (right - left) / 2, hh: (edges[index + 1] - edges[index]) / 2, label: 'DEF:' + lane })
    })
    ctx.fillStyle = COLORS.cpu + '55'; ctx.beginPath(); ctx.arc(a.x, a.y, radius * 2.3, 0, Math.PI * 2); ctx.fill()
    const press = duel.pick === 'PRESS', pressHot = view.hover.current === 'DEF:PRESS'
    ctx.fillStyle = press ? '#ffd54a55' : pressHot ? '#ffffff40' : '#00f5d422'; ctx.strokeStyle = press ? COLORS.gold : COLORS.local; ctx.lineWidth = press ? 3.5 : 2.5; ctx.setLineDash(press ? [] : [4, 4])
    ctx.beginPath(); ctx.arc(d.x, d.y, radius * 2.7, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.setLineDash([])
    ctx.font = `800 ${Math.max(10, radius * 1.2)}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#0b1a10'; ctx.fillStyle = press ? COLORS.gold : '#fff'
    ctx.strokeText(duel.labels.PRESS, d.x, d.y + radius * 4.6); ctx.fillText(duel.labels.PRESS, d.x, d.y + radius * 4.6)
    if (!duel.pick) view.hits.push({ x: d.x, y: d.y, r: Math.max(26, radius * 3.2), label: 'DEF:PRESS' })
  }
  for (const dot of view.dots) {
    const { x, y } = at(dot)
    if (aerialActors && pose.jump > 0 && (dot.playerId === aerialActors.targetId || dot.playerId === aerialActors.defenderId)) {
      ctx.fillStyle = '#0009'; ctx.beginPath(); ctx.ellipse(x, y + pose.jump * pitchH + radius, radius * 1.2, radius * .35, 0, 0, Math.PI * 2); ctx.fill()
    }
    const marked = view.carrier?.side === dot.side && view.carrier.playerId === dot.playerId
    if (dot.playerId && dot.playerId === view.play.defenderId) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2); ctx.stroke() }
    if (marked) {
      ctx.fillStyle = COLORS.gold + '55'; ctx.beginPath(); ctx.arc(x, y, radius * 2.2, 0, Math.PI * 2); ctx.fill()
      if (attacker === dot.side && ['attack', 'pass', 'recovery'].includes(view.play.kind) && !view.play.aerial && !view.play.corner && !view.play.freeKick) {
        const dir = dot.side === 'local' ? 1 : -1
        ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y + radius * .65, radius * 1.8, radius * .8, 0, 0, Math.PI * 2); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x + dir * radius * 1.3, y + radius * .2); ctx.lineTo(x + dir * radius * 2.2, y + radius * .65); ctx.lineTo(x + dir * radius * 1.3, y + radius * 1.1); ctx.stroke()
      }
    }
    ctx.fillStyle = COLORS[dot.side]; ctx.strokeStyle = marked ? COLORS.gold : '#0b1a10'; ctx.lineWidth = marked ? 3 : 1.5
    ctx.beginPath(); ctx.arc(x, y, marked ? radius * 1.25 : radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    const facts = dot.playerId ? view.info.get(dot.playerId) : undefined
    if (facts && radius >= 6) {
      ctx.font = `800 ${Math.max(8, radius * 1.05)}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#08130c'; ctx.fillText(String(facts.ovr), x, y + .5); ctx.textBaseline = 'alphabetic'
      if (!marked && (w >= 520 || view.focus === dot.side)) { ctx.font = `700 ${Math.max(9, radius * 1.05)}px Inter, system-ui, sans-serif`; ctx.lineWidth = 3; ctx.strokeStyle = '#0b1a10'; ctx.fillStyle = '#fff'; ctx.strokeText(facts.short, x, y + radius * 2.2); ctx.fillText(facts.short, x, y + radius * 2.2) }
    }
    if (marked && view.carrierName) {
      ctx.font = `700 ${Math.max(11, radius * 1.5)}px Inter, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#0b1a10'; ctx.fillStyle = '#fff'
      const halfLabel = ctx.measureText(view.carrierName).width / 2 + 4
      const labelX = Math.max(halfLabel, Math.min(w - halfLabel, x))
      ctx.strokeText(view.carrierName, labelX, y - radius * 2.3); ctx.fillText(view.carrierName, labelX, y - radius * 2.3)
    }
  }
  const decision = view.decision
  if (decision) {
    const awarded = view.play.freeKick?.awardedTo ?? view.play.corner?.awardedTo ?? 'local'
    const flip = awarded === 'cpu'
    const world = (x: number, y: number) => ({ x: X(flip ? 1 - x : x), y: Y(flip ? 1 - y : y) })
    const header = ['HEADER', 'CORNER_HEADER', 'FK_HEADER'].includes(decision.node)
    const direct = decision.node === 'FK_ATTACK' && view.play.freeKick?.zone === 'CENTRAL_OUTSIDE'
    // Show the actual public marking pair / wall, never the CPU's covered lane or planned delivery.
    if (decision.node === 'CORNER_DEFEND' || decision.node === 'FK_DEFEND') {
      const wall = view.play.freeKick?.wallIds ?? []
      const pairs = decision.options.flatMap(option => {
        const defender = view.dots.find(dot => dot.playerId === option.playerId)
        const forward = view.dots.find(dot => dot.playerId === option.rivalId)
        return defender && forward ? [{ defender, forward }] : []
      })
      ctx.save(); ctx.strokeStyle = COLORS.gold; ctx.fillStyle = COLORS.local + '44'; ctx.lineWidth = 2; ctx.setLineDash([4, 4])
      for (const pair of pairs) {
        const a = at(pair.defender), b = at(pair.forward)
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
        for (const point of [a, b]) { ctx.beginPath(); ctx.arc(point.x, point.y, radius * 2, 0, Math.PI * 2); ctx.stroke() }
        if (decision.options.some(option => option.choice === 'MAN_MARK')) view.hits.push({ x: a.x, y: a.y, r: Math.max(24, radius * 2), label: 'PLAY:MAN_MARK' })
      }
      for (const dot of view.dots.filter(dot => wall.includes(dot.playerId ?? ''))) {
        const p = at(dot); ctx.beginPath(); ctx.arc(p.x, p.y, radius * 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
        if (decision.options.some(option => option.choice === 'WALL_JUMP')) view.hits.push({ x: p.x, y: p.y, r: Math.max(24, radius * 2), label: 'PLAY:' + (dot.playerId === wall[wall.length - 1] ? 'WALL_HOLD' : 'WALL_JUMP') })
      }
      const box = world(.88, .37), boxEnd = world(.995, .63)
      ctx.fillRect(Math.min(box.x, boxEnd.x), Math.min(box.y, boxEnd.y), Math.abs(boxEnd.x - box.x), Math.abs(boxEnd.y - box.y))
      ctx.strokeRect(Math.min(box.x, boxEnd.x), Math.min(box.y, boxEnd.y), Math.abs(boxEnd.x - box.x), Math.abs(boxEnd.y - box.y)); ctx.restore()
      if (decision.options.some(option => option.choice === 'ZONE')) view.hits.push({ x: (box.x + boxEnd.x) / 2, y: (box.y + boxEnd.y) / 2, r: 0, hw: Math.max(24, Math.abs(boxEnd.x - box.x) / 2), hh: Math.max(24, Math.abs(boxEnd.y - box.y) / 2), label: 'PLAY:ZONE' })
    }
    decision.options.forEach((option, index) => {
      let point: Point
      let lane = false
      if (header) {
        const sector = view.play.aerial?.sector ?? view.play.corner?.sector ?? 'LEFT'
        const goal = headerGoalPoint(sector, option.choice as typeof HEADER_DIRECTIONS[number], awarded)
        point = { x: X(goal.x - (flip ? -.025 : .025)), y: Y(goal.y) }
      } else if (direct) {
        point = world(.96, [.43, .50, .57][index])
      } else if (decision.node === 'DRIBBLE') {
        const origin = view.carrier ? at(view.carrier) : world(.62, .5)
        point = { x: Math.min(w - 42, Math.max(42, origin.x + pitchW * .12)), y: Y([.20, .50, .80][index]) }
        lane = true
        ctx.strokeStyle = COLORS.gold + '88'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(point.x, point.y); ctx.stroke(); ctx.setLineDash([])
      } else if (option.choice === 'WALL_JUMP' || option.choice === 'WALL_HOLD') {
        const wall = view.play.freeKick?.wallIds ?? []
        const dot = view.dots.find(dot => dot.playerId === wall[index === 0 ? 0 : wall.length - 1])
        const p = dot ? at(dot) : world(.82, .5)
        point = { x: p.x, y: p.y + (index === 0 ? -30 : 30) }
      } else if (option.choice === 'MAN_MARK' || option.choice === 'ZONE') {
        point = world(.82, option.choice === 'MAN_MARK' ? .30 : .70)
      } else {
        const sector = view.play.corner?.sector ?? 'LEFT'
        const near = sector === 'LEFT' ? .30 : .70
        const short = option.choice.endsWith('SHORT')
        point = world(short ? .72 : .86, short ? sector === 'LEFT' ? .12 : .88 : option.choice === 'CORNER_FAR' ? 1 - near : near)
      }
      const x = Math.max(26, Math.min(w - 26, point.x)), y = Math.max(28, Math.min(h - 28, point.y))
      const hot = view.hover.current === 'PLAY:' + option.choice || decision.selected === option.choice
      const hitRadius = Math.max(24, radius * 2.5)
      if (!header && !direct && decision.node.endsWith('ATTACK') && option.playerId) {
        const receiver = view.dots.find(dot => dot.playerId === option.playerId)
        if (receiver) {
          const p = at(receiver)
          ctx.strokeStyle = COLORS.gold + '99'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([])
          ctx.beginPath(); ctx.arc(p.x, p.y, radius * 1.8, 0, Math.PI * 2); ctx.stroke()
        }
      }
      ctx.save(); ctx.fillStyle = hot ? '#f4dc6388' : '#d5fb7633'; ctx.strokeStyle = hot ? '#fff' : COLORS.gold; ctx.lineWidth = hot ? 3.5 : 2
      if (lane) {
        const hw = Math.max(26, pitchW * .055), hh = Math.max(24, pitchH * .10)
        ctx.fillRect(x - hw, y - hh, hw * 2, hh * 2); ctx.strokeRect(x - hw, y - hh, hw * 2, hh * 2)
        view.hits.push({ x, y, r: 0, hw, hh, label: 'PLAY:' + option.choice })
      } else {
        ctx.beginPath(); ctx.arc(x, y, hitRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
        view.hits.push({ x, y, r: hitRadius, label: 'PLAY:' + option.choice })
      }
      ctx.fillStyle = COLORS.gold; ctx.beginPath(); ctx.arc(x, y, radius * 1.15, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#102016'; ctx.font = '800 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(String.fromCharCode(65 + index), x, y)
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0b1a10'; ctx.lineWidth = 3; ctx.font = '700 11px system-ui'
      const compact = header || direct
      const labelX = compact ? x - hitRadius - 5 : Math.max(70, Math.min(w - 70, x))
      const labelY = compact ? y : Math.min(h - 12, y + hitRadius + 13)
      ctx.textAlign = compact ? 'right' : 'center'
      ctx.strokeText(option.label, labelX, labelY, Math.min(150, w * .4)); ctx.fillText(option.label, labelX, labelY, Math.min(150, w * .4)); ctx.restore()
    })
  }
  if (!view.decision && (view.play.aerial && view.play.step === 'AERIAL_WON' || view.play.corner?.awardedTo === 'local' && view.play.step === 'CORNER_WON')) {
    for (const [i, direction] of HEADER_DIRECTIONS.entries()) {
      const point = headerGoalPoint(aerialActors!.sector, direction)
      ctx.fillStyle = COLORS.gold; ctx.beginPath(); ctx.arc(X(point.x - .035), Y(point.y), radius * .9, 0, Math.PI * 2); ctx.fill()
      ctx.font = '800 11px system-ui'; ctx.fillStyle = '#102016'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(['A', 'B', 'C'][i], X(point.x - .035), Y(point.y)); ctx.textBaseline = 'alphabetic'
    }
  }
  if (view.play.freeKick && view.play.step === 'FK_FOUL') {
    const a = view.play.freeKick, flip = a.awardedTo === 'cpu';
    const rx = X(flip ? .34 : .66), ry = Y(flip ? .38 : .62), direction = flip ? -1 : 1;
    ctx.fillStyle = '#ffe45e'; ctx.beginPath(); ctx.arc(rx, ry, radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffe45e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + direction * radius * 3, ry - radius * 2); ctx.stroke();
  }
  if (!view.decision && view.play.freeKick?.awardedTo === 'local' && view.play.step === 'FK_SETUP' && view.play.freeKick.zone === 'CENTRAL_OUTSIDE') {
    for (const [index, y] of [.43, .50, .57].entries()) { ctx.fillStyle = COLORS.gold; ctx.beginPath(); ctx.arc(X(.965), Y(y), radius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#102016'; ctx.font = '800 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText(['A', 'B', 'C'][index], X(.965), Y(y) + 4) }
  }
  const flight = view.motion && view.flight && pose.flightProgress < 1 ? view.flight : null
  const flightAt = (progress: number) => {
    const eased = 1 - (1 - Math.max(0, progress)) ** 3
    return { x: (flight!.fx + (flight!.tx - flight!.fx) * eased) * w, y: (flight!.fy + (flight!.ty - flight!.fy) * eased) * h }
  }
  const flying = flight ? flightAt(pose.flightProgress) : null
  const bx = flying?.x ?? X(pose.ball.x); const groundY = Y(pose.ball.y); const by = flying?.y ?? groundY - pose.height * pitchH
  if (view.motion) {
    ctx.save(); ctx.fillStyle = '#fff'
    const trail = flight ? [1, 2, 3].map(i => flightAt(pose.flightProgress - i * .045)) : pose.trail.map(point => ({ x: X(point.x), y: Y(point.y) - point.height * pitchH }))
    trail.forEach((point, index) => {
      ctx.globalAlpha = [.35, .20, .08][index]
      ctx.beginPath(); ctx.arc(point.x, point.y, Math.max(2, radius * (.5 - index * .10)), 0, Math.PI * 2); ctx.fill()
    })
    ctx.restore()
  }
  if (aerialActors || view.play.freeKick) {
    ctx.fillStyle = '#0008'; ctx.beginPath(); ctx.ellipse(bx, groundY + 3, radius * .8, radius * .3, 0, 0, Math.PI * 2); ctx.fill()
    if (view.play.step === 'DIRECTED_HEADER_CONTACT' || view.play.step === 'CORNER_CONTACT') { ctx.strokeStyle = COLORS.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, radius * (1.4 + pose.progress), 0, Math.PI * 2); ctx.stroke() }
  }
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
