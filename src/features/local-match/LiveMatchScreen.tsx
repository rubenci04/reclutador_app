import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmNavigation } from '../../components/ConfirmNavigation'
import { audio } from '../audio/audioEngine'
import type { SoundId } from '../audio/soundEffects'
import type { CpuDifficulty } from '../recruiter-duel/cpuPolicy'
import { advanceBlock, checkpointSession, exportResult, inspectSession, restoreSession, submitPlay } from './interactive'
import type { CheckpointAuthority, Order, PendingPlay, PlayChoice, Session } from './interactive'
import { confirmLiveOrder, currentPower, defaultPlayChoice, keepWindow } from './interactive/liveModel'
import { DecisionPanel, Handover } from './LiveDecisionPanel'
import { PlayPanel } from './LivePlayPanel'
import { aerialBeatDuration } from './aerialGeometry'
import { frameFocus, frameSoundOffset, frameSounds, liveFrames } from './livePresentation'
import { EVENT_ICONS, PLAY_LETTERS, eventKey, momentumShare } from './matchFeed'
import { MatchScreen } from './MatchScreen'
import { MatchStatsPanel } from './MatchStatsPanel'
import { TacticalBoard } from './TacticalBoard'
import { TacticalSummary } from './TacticalSummary'
import { playerName } from './simulator'
import { visibleStats } from './playback'
import { IDLE_PLAY, type BoardFocus, type BoardPlay } from './boardGeometry'
import type { MatchEvent, MatchSide } from './matchTypes'

interface Props {
  readonly origin: Session
  readonly versusCpu: boolean
  readonly difficulty: CpuDifficulty
  readonly names: Readonly<Record<MatchSide, string>>
  readonly onFinished: (session: Session) => void
  readonly onReturn: () => void
  readonly closed: boolean
}

/** Wait between revealed moments at 1×. Speed and skipping only change this wait, never the sporting result. */
export const FRAME_MS = 800
export const FAST_MS = 40
const prefersReducedMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Presentation schedules and reveals blocks that SIM-004B has already confirmed; every sporting transition is delegated to it.
 * A confirmed block is shown one opportunity at a time, with sounds, score and board following what is on screen.
 */
export function LiveMatchScreen({ origin, versusCpu, difficulty, names, onFinished, onReturn, closed }: Props) {
  const { t } = useTranslation()
  const [session, setSession] = useState(origin)
  const current = useRef(origin)
  const [cursor, setCursor] = useState(0)
  const [paused, setPaused] = useState(false); const [speed, setSpeed] = useState(1)
  const [exitOpen, setExitOpen] = useState(false); const [rest, setRest] = useState(false)
  const [handover, setHandover] = useState(''); const [error, setError] = useState('')
  const [skipAnimation, setSkipAnimation] = useState(false); const [replay, setReplay] = useState(false)
  const [focus, setFocus] = useState<BoardFocus>('full')
  const [savedRevision, setSavedRevision] = useState<number | null>(null)
  const saved = useRef<{ snapshot: string; authority: CheckpointAuthority } | null>(null)
  const saving = useRef(false); const mounted = useRef(true); const recorded = useRef(false)
  const heard = useRef(new Set<string>())
  const audioCursor = useRef(0)
  const beatClock = useRef({ cursor: -1, elapsed: 0 })
  const main = useRef<HTMLElement>(null); const narration = useRef<HTMLOListElement>(null)
  useEffect(() => { mounted.current = true; main.current?.focus(); return () => { mounted.current = false } }, [])
  const view = useMemo(() => inspectSession(session), [session])
  const frames = useMemo(() => liveFrames(view.blocks, view.partial), [view])
  const shownCount = Math.min(cursor, frames.length)
  const caughtUp = shownCount >= frames.length
  const shown = useMemo(() => frames.slice(0, shownCount), [frames, shownCount])
  const events = useMemo(() => shown.flatMap((frame) => frame.events), [shown])
  const latest = shown.at(-1)
  const score = latest?.score ?? { local: 0, cpu: 0 }
  const minute = latest?.minute ?? 0
  const finished = session.phase === 'FINISHED' && caughtUp
  const atWindow = session.phase === 'WINDOW' && caughtUp && session.window !== null
  const atPlay = session.phase === 'PLAY' && caughtUp && view.play !== null
  const commit = (next: Session, reveal = false) => {
    current.current = next; setSession(next); setError('')
    if (reveal) setCursor(liveFrames(next.kernel.blocks).length)
  }
  const advance = (revision: number, reveal = false) => {
    const state = current.current
    if (state.revision !== revision || state.phase !== 'RUNNABLE') return
    const next = advanceBlock(state)
    if (next.ok) commit(next.value, reveal); else setError(next.error)
  }
  /** A card is bound to the node it was rendered for: a second tap or a stale card can never resolve a later node. */
  const choosePlay = (rendered: PendingPlay, choice: PlayChoice) => {
    const state = current.current
    if (state.phase !== 'PLAY') return
    const next = submitPlay(state, { version: 'interactive-play-command-v1', id: `${state.sessionId}:${rendered.id}:${rendered.node}`, sessionId: state.sessionId, expectedRevision: state.revision, playId: rendered.id, node: rendered.node, choice })
    if (next.ok) {
      commit(next.value)
      // Reveal the first confirmed response immediately; later beats keep their normal duration.
      setCursor((value) => Math.min(value + 1, liveFrames(next.value.kernel.blocks, next.value.kernel.partial ? { minute: next.value.kernel.partial.events[0].minute, events: next.value.kernel.partial.events } : null).length))
    } else if (next.error !== 'DUPLICATE_COMMAND' && next.error !== 'WRONG_PLAY' && next.error !== 'STALE_STATE') setError(next.error)
  }
  const nextManually = () => { if (!caughtUp) setCursor(frames.length); else advance(current.current.revision, true) }
  const wait = rest || skipAnimation ? FAST_MS : (latest?.events.some((e) => e.aerial) ? aerialBeatDuration(frameFocus(latest)?.step) : FRAME_MS) / speed
  useEffect(() => {
    if (beatClock.current.cursor !== cursor) beatClock.current = { cursor, elapsed: 0 }
    if (paused || exitOpen) return
    const started = Date.now()
    const revision = session.revision
    let action: (() => void) | null = null
    if (cursor < frames.length) action = () => setCursor((value) => Math.min(value + 1, frames.length))
    else if (session.phase === 'RUNNABLE') action = () => advance(revision)
    else if (session.phase === 'PLAY' && rest) action = () => { const pending = current.current.kernel.partial?.play; if (pending && current.current.revision === revision) choosePlay(pending, defaultPlayChoice(pending, origin.kernel.input.catalog)) }
    else if (session.phase === 'WINDOW' && rest) action = () => { if (current.current.revision !== revision) return; const next = keepWindow(current.current); if (next.ok) commit(next.value) }
    if (!action) return
    const timer = window.setTimeout(action, rest || skipAnimation ? wait : Math.max(0, wait - beatClock.current.elapsed / speed))
    return () => { window.clearTimeout(timer); if (beatClock.current.cursor === cursor) beatClock.current.elapsed += (Date.now() - started) * speed }
  }, [paused, exitOpen, cursor, frames.length, session.revision, session.phase, rest, wait, speed, skipAnimation]) // eslint-disable-line react-hooks/exhaustive-deps
  // Sounds follow what is on screen and go through a ledger: pausing, changing speed or jumping ahead never repeats one.
  useEffect(() => {
    // Explicit manual reveals still sound while paused; the clock alone reveals nothing.
    if (exitOpen || paused && audioCursor.current === shownCount) return
    audioCursor.current = shownCount
    const timers: number[] = []
    const play = new Set<SoundId>()
    if (!heard.current.has('kickoff') && origin.kernel.blocks.length === 0) { heard.current.add('kickoff'); play.add('kickoffWhistle') }
    for (const frame of shown) for (const sound of frameSounds(frame)) {
      const key = `${frame.key}:${sound}`
      if (heard.current.has(key)) continue
      const delay = frame === latest && !paused && !skipAnimation && !rest && !prefersReducedMotion() ? Math.max(0, frameSoundOffset(sound) - beatClock.current.elapsed) / speed : 0
      if (delay > 0) timers.push(window.setTimeout(() => { if (!heard.current.has(key)) { heard.current.add(key); audio.play(sound) } }, delay))
      else { heard.current.add(key); play.add(sound) }
    }
    for (const sound of play) audio.play(sound)
    return () => timers.forEach(window.clearTimeout)
  }, [shown, paused, exitOpen, speed, skipAnimation, rest]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (narration.current) narration.current.scrollTop = narration.current.scrollHeight }, [shownCount])
  // The record and the series table only learn the result once it has been shown.
  useEffect(() => { if (finished && !recorded.current) { recorded.current = true; onFinished(session) } }, [finished, session, onFinished])
  const side: MatchSide = !versusCpu && session.window?.plans.local ? 'cpu' : 'local'
  const passDevice = atWindow && !versusCpu && Boolean(session.window?.plans.local) && handover !== session.window?.id
  const final = finished ? exportResult(session) : null
  const focusEvent = frameFocus(latest)
  const source = [...events].reverse().find((item) => item !== focusEvent && item.playerId && (item.type === 'attack' || item.type === 'pass') && item.minute === focusEvent?.minute)
  const play: BoardPlay = focusEvent && !finished ? { kind: focusEvent.type, side: focusEvent.side, playerId: focusEvent.playerId, aerial: focusEvent.aerial, step: focusEvent.step, ...(focusEvent.step && !['BUILD', 'DEFENSE_BUILD'].includes(focusEvent.step) && source?.playerId ? { fromPlayerId: source.playerId } : {}), ...(atPlay && view.play ? { defenderId: view.play.node === 'DEFEND' ? view.play.protagonistId : view.play.options.find((o) => o.available)?.rivalId ?? undefined } : {}) } : IDLE_PLAY
  const choices = atPlay && view.play && view.play.node !== 'DEFEND' && view.play.node !== 'HEADER' ? view.play.options.filter((option) => option.available && option.choice !== 'SHOOT').map((option) => ({ playerId: option.playerId, label: PLAY_LETTERS[option.choice] })) : []
  const goal = latest?.events.find((item) => item.type === 'goal')
  const momentum = momentumShare(events)
  const stats = finished ? view.stats : visibleStats(events)
  const catalog = origin.kernel.input.catalog
  const power = { local: currentPower(session, 'local'), cpu: currentPower(session, 'cpu') }
  const animate = !skipAnimation && !prefersReducedMotion()
  const eventText = (item: MatchEvent) => t(eventKey(item), { team: item.side ? names[item.side] : '', player: playerName(item, catalog) ?? '', out: catalog.find((p) => p.id === item.outPlayerId)?.name ?? '' })
  const status = finished ? t('match.final') : atWindow ? t('liveDT.window', { minute }) : t('match.minute', { minute })
  const save = async () => {
    if (saving.current) return
    saving.current = true; setPaused(true)
    const state = current.current
    try {
      const checkpoint = await checkpointSession(state)
      if (mounted.current && current.current.revision === state.revision) { saved.current = checkpoint; setSavedRevision(state.revision) }
    } catch { if (mounted.current) setError('CHECKPOINT_FAILED') }
    finally { saving.current = false }
  }
  const restore = async () => {
    const checkpoint = saved.current
    if (!checkpoint || checkpoint.authority.revision !== current.current.revision) return setError('CHECKPOINT_EXPIRED')
    const restored = await restoreSession(checkpoint.snapshot, checkpoint.authority)
    if (!mounted.current || current.current.revision !== checkpoint.authority.revision) return
    if (restored.ok) commit(restored.value); else setError(restored.error)
  }
  if (replay && final?.ok) return <MatchScreen result={final.value.result} catalog={catalog} localName={names.local} cpuName={names.cpu} onReturn={() => setReplay(false)} returnLabel={t('navigation.backSummary')} exitWarning={t('liveDT.closeReplay')} onRematch={() => {}} showNewMatchActions={false} />
  return <main id="match-main" ref={main} tabIndex={-1} onPointerDownCapture={() => { void audio.unlock() }} onKeyDownCapture={() => { void audio.unlock() }} className={`match-screen live-match${animate ? '' : ' live-no-motion'}`}>
    <section className="match-card" aria-label={t('liveDT.title')}>
      <header className="match-heading"><p className="eyebrow"><span />{finished ? t('match.final') : t('match.playing')}</p><h1 className="live-title">{t('liveDT.title')}</h1>{finished && closed ? <button className="secondary-action" onClick={onReturn}>{t('navigation.home')}</button> : <ConfirmNavigation label={t(finished ? 'navigation.home' : 'navigation.exitMatch')} message={t('navigation.seriesExitWarning')} onConfirm={onReturn} onOpenChange={setExitOpen} />}</header>
      <div className="match-scoreboard">
        <div><strong>{names.local}</strong><small>{t(`tactics.strategies.${session.kernel.selection.local}.name`)}</small><small>{t('match.globalPower', { value: power.local.effective.global.toFixed(1) })}</small></div>
        <div className="match-score" role="status" aria-label={`${names.local} ${score.local}–${score.cpu} ${names.cpu}, ${status}`}><span>{score.local}</span><small>{status}</small><span>{score.cpu}</span></div>
        <div><strong>{names.cpu}</strong><small>{t(`tactics.strategies.${session.kernel.selection.cpu}.name`)}</small><small>{t('match.globalPower', { value: power.cpu.effective.global.toFixed(1) })}</small></div>
      </div>
      <div className="momentum" role="img" aria-label={t('live.momentum', { local: momentum, cpu: 100 - momentum })}>
        {!finished && <span className="live-chip"><i aria-hidden="true" />{t('live.inPlay')}</span>}
        <div className="momentum-bar" aria-hidden="true"><i className="momentum-local" style={{ width: `${momentum}%` }} /></div>
      </div>
      <div className="match-progress" aria-hidden="true"><span style={{ width: `${Math.min(100, minute / 90 * 100)}%` }} /></div>
      <div className="live-board-wrap">
        <TacticalBoard formations={session.kernel.input.formations ?? { local: '4-3-3', cpu: '4-3-3' }} lineups={{ local: session.kernel.sides.local.team.lineup, cpu: session.kernel.sides.cpu.team.lineup }} catalog={catalog} names={names} play={play} choices={choices} tick={shownCount} focus={focus} speed={speed} animate={animate} paused={paused || exitOpen} />
        {focusEvent?.type === 'recovery' && focusEvent.step && <div className="recovery-flash" key={`recovery:${shownCount}`} role="status">{t('moments.recovered')}</div>}
        {goal && <div className={`goal-flash${goal.aerial ? ' header-goal-flash' : ''}`} key={`goal:${shownCount}`} role="status"><svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="27" /><path d="m30 14 14 10-5 17H21l-5-17Z" /></svg>{t(goal.aerial ? 'aerial.goalCelebration' : 'match.goalCelebration', { team: goal.side ? names[goal.side] : '' })}</div>}
        <fieldset className="board-focus"><legend>{t('board.focus')}</legend>
          {(['full', 'local', 'cpu'] as const).map((id) => <label key={id}><input type="radio" name="board-focus" checked={focus === id} onChange={() => setFocus(id)} />{id === 'full' ? t('board.full') : t('board.zone', { name: names[id] })}</label>)}
        </fieldset>
      </div>
      <p className="live-now" role="status">{finished ? t('liveDT.fullTime') : focusEvent ? <><time>{focusEvent.minute}′</time> {eventText(focusEvent)}</> : t('liveDT.kickoff')}</p>
      {atPlay && view.play && <PlayPanel key={`${view.play.id}:${view.play.node}`} play={view.play} catalog={catalog} onChoose={(choice) => choosePlay(view.play!, choice)} />}
      {atWindow && (passDevice ? <Handover name={names.cpu} onReady={() => setHandover(session.window!.id)} /> : <DecisionPanel key={`${session.window!.id}:${side}`} session={session} side={side} name={names[side]} minute={minute} score={score} names={names} onConfirm={(order: Order) => {
        const next = confirmLiveOrder(current.current, session.window!.id, side, order, versusCpu, difficulty)
        if (next.ok) commit(next.value); else if (next.error !== 'DUPLICATE_COMMAND') setError(next.error)
      }} />)}
      {!finished && <div className="playback-controls" role="group" aria-label={t('navigation.playback')}>
        <button className="secondary-action" aria-pressed={paused} onClick={() => setPaused(!paused)}>{t(paused ? 'navigation.resume' : 'navigation.pause')}</button>
        <label>{t('navigation.speed')}<select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>{[1, 2, 4].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}</select></label>
        <label><input type="checkbox" checked={skipAnimation} onChange={(e) => setSkipAnimation(e.target.checked)} />{t('liveDT.skipAnimations')}</label>
        <button className="secondary-action" disabled={caughtUp && session.phase !== 'RUNNABLE'} onClick={nextManually}>{t('liveDT.nextBlock')}</button>
        {!rest && !session.window?.plans.local && !session.window?.plans.cpu && <ConfirmNavigation label={t('liveDT.simulateRest')} message={t('liveDT.keepWarning')} onOpenChange={setExitOpen} onConfirm={() => { setRest(true); setPaused(false) }} />}
        <button className="secondary-action" onClick={() => { void save() }}>{t('liveDT.savePause')}</button>
        {savedRevision !== null && <button className="secondary-action" disabled={savedRevision !== session.revision} onClick={() => { void restore() }}>{t('liveDT.restorePause')}</button>}
        {rest && <p role="status">{t('liveDT.keepMode')}</p>}
      </div>}
      <details className="moment-history"><summary>{t('moments.history')}</summary><div className="match-layout">
        <section className="match-narration"><h2>{t('liveDT.narration')}</h2>{events.length ? <ol ref={narration} aria-label={t('liveDT.narration')}>{events.map((item, index) => <li className={`event-${item.type}${item.type === 'goal' ? ' goal-event' : ''}`} key={`${item.minute}-${index}`}><time>{item.minute}'</time><i className="event-icon" aria-hidden="true">{EVENT_ICONS[item.type]}</i><span>{eventText(item)}</span>{item.tactic && <small className="event-tactic tactic-chip">{t('match.influence', { tactic: t(`match.tacticNotes.${item.tactic}`) })}</small>}</li>)}</ol> : <p>{t('liveDT.kickoff')}</p>}</section>
      </div></details>
      <MatchStatsPanel stats={stats} />
      <details className="live-power"><summary>{t('liveDT.powerDetail')}</summary><div className="team-power-grid">{(['local', 'cpu'] as const).map((id) => <article className="team-power-card" key={id}><h2>{names[id]}</h2><p>{t('liveDT.strategy')}: {t(`tactics.strategies.${session.kernel.selection[id]}.name`)}</p><p>{t('auctionUX.base', { value: power[id].base.global.toFixed(1) })}</p><p>{t('auctionUX.effective')}: <b>{power[id].effective.global.toFixed(1)}</b></p><p>{t('liveDT.changes', { count: session.benchMode[id] === 'manual-v1' ? Math.min(3 - session.entered[id].length, session.kernel.sides[id].unused.filter((playerId) => catalog.find((p) => p.id === playerId)?.position !== 'ARQ').length) : 0 })}</p></article>)}</div></details>
      {error && <p role="alert">{t('liveDT.error', { code: error })}</p>}
      {final?.ok && <section className="match-summary"><h2>{t('match.final')} · {score.local}–{score.cpu}</h2><TacticalSummary result={final.value.result} teamName={(id) => id ? names[id] : ''} /><div className="match-actions"><button className="secondary-action" onClick={() => setReplay(true)}>{t('match.replay')}</button></div><details><summary>{t('liveDT.audit')}</summary><p>{t('liveDT.localTrust')}</p><label>{t('liveDT.record')}<textarea readOnly value={JSON.stringify({ version: 'local-live-audit-v1', origin, final: session, result: final.value })} /></label></details></section>}
    </section>
  </main>
}
