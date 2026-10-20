import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmNavigation } from '../../components/ConfirmNavigation'
import { STRATEGY_IDS, type StrategyId } from '../tactics/strategies'
import type { CpuDifficulty } from '../recruiter-duel/cpuPolicy'
import { advanceBlock, checkpointSession, exportResult, inspectSession, restoreSession } from './interactive'
import type { CheckpointAuthority, Order, Session } from './interactive'
import { confirmLiveOrder, currentPower, keepWindow } from './interactive/liveModel'
import { MatchScreen } from './MatchScreen'
import type { MatchSide } from './matchTypes'

interface Props {
  readonly origin: Session
  readonly versusCpu: boolean
  readonly difficulty: CpuDifficulty
  readonly names: Readonly<Record<MatchSide, string>>
  readonly onFinished: (session: Session) => void
  readonly onReturn: () => void
  readonly closed: boolean
}

function Handover({ name, onReady }: { name: string; onReady: () => void }) {
  const { t } = useTranslation()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])
  return <section className="live-handover" aria-label={t('liveDT.handover', { name })}><h2 ref={heading} tabIndex={-1}>{t('liveDT.handover', { name })}</h2><button className="primary-action" onClick={onReady}>{t('liveDT.ready', { name })}</button></section>
}

function DecisionControls({ session, side, name, onConfirm }: { session: Session; side: MatchSide; name: string; onConfirm: (order: Order) => void }) {
  const { t } = useTranslation()
  const [kind, setKind] = useState<'KEEP' | 'STRATEGY' | 'SUBSTITUTE'>('KEEP')
  const [strategy, setStrategy] = useState<StrategyId>(session.kernel.selection[side])
  const [incoming, setIncoming] = useState(''); const [outgoing, setOutgoing] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])
  const state = session.kernel.sides[side]
  const bench = session.kernel.input.catalog.filter((p) => state.unused.includes(p.id) && p.position !== 'ARQ' && !session.departed[side].includes(p.id))
  const inPlayer = bench.find((p) => p.id === incoming)
  const canSub = session.benchMode[side] === 'manual-v1' && session.entered[side].length < 3 && bench.length > 0
  const valid = kind !== 'SUBSTITUTE' || canSub && inPlayer && state.team.players.some((p) => p.id === outgoing && p.position === inPlayer.position)
  return <section className="live-decision" aria-label={t('liveDT.turn', { name })}>
    <h2 tabIndex={-1} ref={heading}>{t('liveDT.turn', { name })}</h2>
    <fieldset><legend>{t('liveDT.action')}</legend>{(['KEEP', 'STRATEGY', 'SUBSTITUTE'] as const).map((action) => <label key={action}><input type="radio" name="live-order" checked={kind === action} disabled={action === 'SUBSTITUTE' && !canSub} onChange={() => setKind(action)} />{t(`liveDT.${action}`)}</label>)}</fieldset>
    {kind === 'STRATEGY' && <label>{t('liveDT.strategy')}<select value={strategy} onChange={(e) => setStrategy(e.target.value as StrategyId)}>{STRATEGY_IDS.map((id) => <option key={id} value={id}>{t(`tactics.strategies.${id}.name`)}</option>)}</select></label>}
    {kind === 'SUBSTITUTE' && <div className="duel-actions"><label>{t('liveDT.in')}<select value={incoming} onChange={(e) => { setIncoming(e.target.value); setOutgoing('') }}><option value="">—</option>{bench.map((p) => <option key={p.id} value={p.id}>{p.name} · {t(`positions.${p.position}`)}</option>)}</select></label><label>{t('liveDT.out')}<select value={outgoing} onChange={(e) => setOutgoing(e.target.value)}><option value="">—</option>{state.team.players.filter((p) => p.position === inPlayer?.position).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>}
    <p>{t('liveDT.futureOnly')}</p>
    <button className="primary-action" disabled={!valid} onClick={() => onConfirm(kind === 'KEEP' ? { type: 'KEEP', parameters: {} } : kind === 'STRATEGY' ? { type: 'STRATEGY', parameters: { strategy } } : { type: 'SUBSTITUTE', parameters: { inId: incoming, outId: outgoing } })}>{t('liveDT.confirm')}</button>
  </section>
}

/** Presentation schedules blocks; every sporting transition is delegated to SIM-004B. */
export function LiveMatchScreen({ origin, versusCpu, difficulty, names, onFinished, onReturn, closed }: Props) {
  const { t } = useTranslation()
  const [session, setSession] = useState(origin)
  const current = useRef(origin)
  const [paused, setPaused] = useState(false); const [speed, setSpeed] = useState(1)
  const [exitOpen, setExitOpen] = useState(false); const [rest, setRest] = useState(false)
  const [handover, setHandover] = useState(''); const [error, setError] = useState('')
  const [skipAnimation, setSkipAnimation] = useState(false); const [replay, setReplay] = useState(false)
  const [savedRevision, setSavedRevision] = useState<number | null>(null)
  const saved = useRef<{ snapshot: string; authority: CheckpointAuthority } | null>(null)
  const saving = useRef(false); const mounted = useRef(true); const recorded = useRef(false)
  const main = useRef<HTMLElement>(null)
  useEffect(() => { mounted.current = true; main.current?.focus(); return () => { mounted.current = false } }, [])
  const commit = (next: Session) => { current.current = next; setSession(next); setError('') }
  const advance = (revision: number) => {
    const state = current.current
    if (state.revision !== revision || state.phase !== 'RUNNABLE') return
    const next = advanceBlock(state)
    if (next.ok) commit(next.value); else setError(next.error)
  }
  useEffect(() => {
    if (paused || exitOpen || session.phase === 'FINISHED' || session.phase === 'WINDOW' && !rest) return
    const revision = session.revision
    const timer = window.setTimeout(() => {
      if (current.current.revision !== revision) return
      if (current.current.phase === 'RUNNABLE') {
        const next = advanceBlock(current.current)
        if (next.ok) { current.current = next.value; setSession(next.value) }
      } else if (rest) {
        const next = keepWindow(current.current)
        if (next.ok) { current.current = next.value; setSession(next.value) }
      }
    }, (rest || skipAnimation ? 150 : 2500) / speed)
    return () => window.clearTimeout(timer)
  }, [paused, exitOpen, session.revision, session.phase, rest, skipAnimation, speed])
  useEffect(() => {
    if (session.phase === 'FINISHED' && !recorded.current) { recorded.current = true; onFinished(session) }
  }, [session, onFinished])
  const view = inspectSession(session)
  const side: MatchSide = !versusCpu && session.window?.plans.local ? 'cpu' : 'local'
  const passDevice = !versusCpu && session.window?.plans.local && handover !== session.window.id
  const final = session.phase === 'FINISHED' ? exportResult(session) : null
  const minute = view.blocks.at(-1)?.minute ?? 0
  const attack = view.blocks.at(-1)?.events.filter((event) => event.type === 'attack').at(-1)?.side
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
  if (replay && final?.ok) return <MatchScreen result={final.value.result} catalog={origin.kernel.input.catalog} localName={names.local} cpuName={names.cpu} onReturn={() => setReplay(false)} returnLabel={t('navigation.backSummary')} exitWarning={t('liveDT.closeReplay')} onRematch={() => {}} showNewMatchActions={false} />
  return <main id="match-main" ref={main} tabIndex={-1} className={`match-screen live-match${skipAnimation ? ' live-no-motion' : ''}`}>
    <section className="match-card" aria-label={t('liveDT.title')}>
      <header className="match-heading"><h1>{t('liveDT.title')}</h1>{session.phase === 'FINISHED' && closed ? <button className="secondary-action" onClick={onReturn}>{t('navigation.home')}</button> : <ConfirmNavigation label={t(session.phase === 'FINISHED' ? 'navigation.home' : 'navigation.exitMatch')} message={t('navigation.seriesExitWarning')} onConfirm={onReturn} onOpenChange={setExitOpen} />}</header>
      {passDevice ? <Handover name={names.cpu} onReady={() => setHandover(session.window!.id)} /> : <>
        <div className="match-scoreboard" role="status"><strong>{names.local}</strong><b>{view.score.local}–{view.score.cpu}</b><strong>{names.cpu}</strong><span>{minute}′</span></div>
        {session.phase !== 'FINISHED' && <p role="status">{session.phase === 'WINDOW' ? t('liveDT.window', { minute }) : attack ? t('series.attacking', { name: names[attack] }) : t('match.playing')}</p>}
        <div className="team-power-grid">{(['local', 'cpu'] as const).map((id) => { const power = currentPower(session, id); return <article className="team-power-card" key={id}><h2>{names[id]}</h2><p>{t('liveDT.strategy')}: {t(`tactics.strategies.${session.kernel.selection[id]}.name`)}</p><p>{t('auctionUX.base', { value: power.base.global.toFixed(1) })}</p><p>{t('auctionUX.effective')}: <b>{power.effective.global.toFixed(1)}</b></p><p>{t('liveDT.changes', { count: session.benchMode[id] === 'manual-v1' ? Math.min(3 - session.entered[id].length, session.kernel.sides[id].unused.filter((playerId) => session.kernel.input.catalog.find((p) => p.id === playerId)?.position !== 'ARQ').length) : 0 })}</p></article> })}</div>
        <section className="match-stats" aria-label={t('match.statistics')}>{(['shots', 'shotsOnTarget', 'saves', 'recoveries', 'possession'] as const).map((stat) => <p key={stat}>{t(`match.${stat === 'shotsOnTarget' ? 'onTarget' : stat}`)}: {view.stats.local[stat]} · {view.stats.cpu[stat]}</p>)}</section>
        {session.phase === 'WINDOW' && !rest && <DecisionControls key={`${session.window!.id}:${side}`} session={session} side={side} name={names[side]} onConfirm={(order) => {
          const next = confirmLiveOrder(current.current, session.window!.id, side, order, versusCpu, difficulty)
          if (next.ok) commit(next.value); else if (next.error !== 'DUPLICATE_COMMAND') setError(next.error)
        }} />}
        {session.phase !== 'FINISHED' && <div className="playback-controls" role="group" aria-label={t('navigation.playback')}>
          <button className="secondary-action" aria-pressed={paused} onClick={() => setPaused(!paused)}>{t(paused ? 'navigation.resume' : 'navigation.pause')}</button>
          <label>{t('navigation.speed')}<select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>{[1, 2, 4].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}</select></label>
          <label><input type="checkbox" checked={skipAnimation} onChange={(e) => setSkipAnimation(e.target.checked)} />{t('liveDT.skipAnimations')}</label>
          <button className="secondary-action" disabled={session.phase !== 'RUNNABLE'} onClick={() => advance(session.revision)}>{t('liveDT.nextBlock')}</button>
          {!rest && !session.window?.plans.local && !session.window?.plans.cpu && <ConfirmNavigation label={t('liveDT.simulateRest')} message={t('liveDT.keepWarning')} onOpenChange={setExitOpen} onConfirm={() => { setRest(true); setPaused(false) }} />}
          {rest && <p role="status">{t('liveDT.keepMode')}</p>}
          <button className="secondary-action" onClick={() => { void save() }}>{t('liveDT.savePause')}</button>
          {savedRevision !== null && <button className="secondary-action" disabled={savedRevision !== session.revision} onClick={() => { void restore() }}>{t('liveDT.restorePause')}</button>}
        </div>}
        <ol className="match-narration" aria-label={t('liveDT.confirmed')}>{view.blocks.map((block) => <li key={block.minute}>{block.minute}′ · {block.score.local}–{block.score.cpu}{block.events.filter((e) => e.type === 'goal' || e.type === 'substitution').map((e, i) => <span key={i}> · {t(`match.events.${e.type}`, { team: e.side ? names[e.side] : '', player: origin.kernel.input.catalog.find((p) => p.id === e.playerId)?.name ?? '', out: origin.kernel.input.catalog.find((p) => p.id === e.outPlayerId)?.name ?? '' })}</span>)}</li>)}</ol>
      </>}
      {error && <p role="alert">{t('liveDT.error', { code: error })}</p>}
      {final?.ok && <><h2>{t('match.final')} · {view.score.local}–{view.score.cpu}</h2><button className="secondary-action" onClick={() => setReplay(true)}>{t('match.replay')}</button><details><summary>{t('liveDT.audit')}</summary><p>{t('liveDT.localTrust')}</p><label>{t('liveDT.record')}<textarea readOnly value={JSON.stringify({ version: 'local-live-audit-v1', origin, final: session, result: final.value })} /></label></details></>}
    </section>
  </main>
}
