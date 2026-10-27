import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { audio } from '../audio/audioEngine'
import type { FormationId } from '../tactics/formations'
import { simulateFiguresMatch } from './engine/figuresMatch'
import { framesFromBlocks, statsFromFrames, type Frame, type PlayFrame } from './engine/figuresPlays'
import { FiguresMomentLayer } from './FiguresMomentLayer'
import { FiguresPitch } from './FiguresPitch'
import { MatchStatsPanel } from './MatchStatsPanel'
import type { MatchResult, MatchSide, MatchTeam } from './matchTypes'
import type { SimulationInput } from './simulator'
import { shortName } from './shortName'

/** Time a chance spends while the ball is built and while it ends; marks (kick-off, half-time, full time) take the same. */
export const BUILD_MS = 500
export const FINISH_MS = 800
const CENTER = { x: 50, y: 50 }

interface Props {
  readonly input: SimulationInput
  /** Sides whose moments are played by a person: only the local side against the CPU, both in hot-seat. */
  readonly humanSides: readonly MatchSide[]
  readonly names: Readonly<Record<MatchSide, string>>
  /** Called once with the finished match (same shape the replay and the series use). */
  readonly onFinished: (result: MatchResult) => void
}

const CAPTION_BUILD = { open: 'attack', corner: 'corner', 'free-kick': 'freeKick', penalty: 'penalty' } as const

/** Clean match screen: scoreboard, drawn pitch, one caption line, and a layer for each key moment. Everything else sits behind "See details". */
export function FiguresMatchScreen({ input, humanSides, names, onFinished }: Props) {
  const { t } = useTranslation()
  const [qualities, setQualities] = useState<Readonly<Record<number, number>>>({})
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)
  const [detail, setDetail] = useState(false)
  const run = useMemo(() => simulateFiguresMatch(input, { humanSides, qualities }), [input, humanSides, qualities])
  const frames = useMemo(() => framesFromBlocks(run.blocks, run.result !== null), [run])
  const last = frames.length * 2 - 1
  const atEnd = step >= last
  const moment = atEnd ? run.waiting : null
  const finished = atEnd && run.result !== null
  const reported = useRef(false)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (paused || atEnd) return
    const timer = window.setTimeout(() => setStep((value) => value + 1), step % 2 === 0 ? BUILD_MS : FINISH_MS)
    return () => window.clearTimeout(timer)
  }, [step, paused, atEnd, frames])

  useEffect(() => {
    if (!finished || reported.current || !run.result) return
    reported.current = true
    audio.play('finalWhistle')
    onFinished(run.result)
    heading.current?.focus({ preventScroll: true })
  }, [finished, run.result, onFinished])

  const index = Math.min(Math.floor(step / 2), frames.length - 1)
  const frame: Frame = frames[index]
  const phase = step % 2 === 0 ? 'build' : 'finish'
  const play = frame.kind === 'play' ? frame : null
  const before = index > 0 ? frames[index - 1].scoreAfter : { local: 0, cpu: 0 }
  const score = play && phase === 'build' ? before : frame.scoreAfter
  const teams: Record<MatchSide, MatchTeam> = { local: run.lineups.local[frame.segment], cpu: run.lineups.cpu[frame.segment] }
  const formations = { local: input.formations?.local ?? '4-3-3', cpu: input.formations?.cpu ?? '4-3-3' } as Record<MatchSide, FormationId>
  const nameOf = (side: MatchSide, id?: string) => shortName(teams[side].players.find((p) => p.id === id)?.name ?? names[side])
  const caption = (item: Frame, at: 'build' | 'finish') => {
    if (item.kind !== 'play') return t(`fm.${item.kind}`)
    const other = item.side === 'local' ? 'cpu' : 'local'
    if (at === 'build') return t(`fm.play.${CAPTION_BUILD[item.chance]}`, { team: names[item.side] })
    if (item.outcome === 'goal') return t('fm.play.goal', { name: nameOf(item.side, item.playerId) })
    if (item.outcome === 'save') return t('fm.play.save', { team: names[other] })
    if (item.outcome === 'blocked') return t('fm.play.blocked', { team: names[other] })
    return t('fm.play.off', { name: nameOf(item.side, item.playerId) })
  }
  const shown = frames.slice(0, index + (phase === 'finish' ? 1 : 0))
  const stats = finished && run.result ? run.result.stats : statsFromFrames(shown)
  const winner = finished && run.result ? run.result.winner : null
  useEffect(() => { if (play?.outcome === 'goal' && phase === 'finish') audio.play('goal') }, [play, phase])
  const ball = play ? (phase === 'build' ? play.build : play.finish) : CENTER

  return <section className="fm" aria-label={t('fm.pitch', { local: names.local, cpu: names.cpu })}>
    <header className="fm-board">
      <span className="fm-team fm-local">{names.local}</span>
      <h2 ref={heading} tabIndex={-1} className="fm-score" aria-label={t('fm.score', { local: names.local, localScore: score.local, cpu: names.cpu, cpuScore: score.cpu })}>{score.local}<span aria-hidden="true">–</span>{score.cpu}</h2>
      <span className="fm-team fm-cpu">{names.cpu}</span>
      <span className="fm-clock" aria-label={t('fm.clock', { minute: frame.minute })}>{frame.minute}'</span>
    </header>
    <div className="fm-stage">
      <FiguresPitch teams={teams} formations={formations} ball={ball} attacking={play ? play.side : null} highlightId={play?.playerId} label={t('fm.pitch', { local: names.local, cpu: names.cpu })} />
      {moment && <FiguresMomentLayer moment={moment} playerName={humanSides.length > 1 ? names[moment.side] : undefined} onResolve={(quality) => setQualities((previous) => ({ ...previous, [moment.segment]: quality }))} />}
    </div>
    <p className="fm-caption" aria-live="polite">{winner ? (winner === 'draw' ? t('fm.result.draw') : t('fm.result.winner', { name: names[winner] })) : caption(frame, phase)}</p>
    <div className="fm-controls">
      {!finished && <button type="button" className="secondary-action" onClick={() => setPaused((value) => !value)} aria-pressed={paused} disabled={Boolean(moment)}>{t(paused ? 'fm.resume' : 'fm.pause')}</button>}
      {!finished && <button type="button" className="secondary-action" onClick={() => { setPaused(false); setStep(last) }} disabled={atEnd}>{t('fm.skip')}</button>}
      <button type="button" className="secondary-action" onClick={() => setDetail(true)}>{t('fm.detail')}</button>
    </div>
    {detail && <div className="fm-detail" role="dialog" aria-modal="true" aria-label={t('fm.detail')}>
      <button type="button" className="primary-action" onClick={() => setDetail(false)}>{t('fm.closeDetail')}</button>
      <MatchStatsPanel stats={stats} />
      <p className="fm-corners"><span>{stats.local.corners ?? 0}</span><small>{t('fm.corners')}</small><span>{stats.cpu.corners ?? 0}</span></p>
      <h3>{t('fm.lineups')}</h3>
      <div className="fm-lineups">{(['local', 'cpu'] as const).map((side) => <ol key={side}><li><strong>{names[side]}</strong></li>{teams[side].players.map((p) => <li key={p.id}><small>{p.position}</small> {p.name}</li>)}</ol>)}</div>
      <h3>{t('fm.plays')}</h3>
      <ol className="fm-plays">{shown.filter((item): item is PlayFrame => item.kind === 'play' && item.outcome === 'goal').map((item) => <li key={item.key}>{item.minute}' · {caption(item, 'finish')}</li>)}</ol>
    </div>}
  </section>
}
