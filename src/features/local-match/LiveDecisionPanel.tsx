import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STRATEGY_IDS, type StrategyId } from '../tactics/strategies'
import type { Order, Session } from './interactive'
import type { MatchSide } from './matchTypes'

type Kind = 'KEEP' | 'STRATEGY' | 'SUBSTITUTE'

export function Handover({ name, onReady }: { name: string; onReady: () => void }) {
  const { t } = useTranslation()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  return <section className="live-handover" aria-label={t('liveDT.handover', { name })}><h2 ref={heading} tabIndex={-1}>{t('liveDT.handover', { name })}</h2><button className="primary-action" onClick={onReady}>{t('liveDT.ready', { name })}</button></section>
}

/** Coaching window rendered as part of the commentary: three clearly different choices, a plain-language summary, one confirmation. */
export function DecisionPanel({ session, side, name, minute, score, names, onConfirm }: { session: Session; side: MatchSide; name: string; minute: number; score: Readonly<Record<MatchSide, number>>; names: Readonly<Record<MatchSide, string>>; onConfirm: (order: Order) => void }) {
  const { t } = useTranslation()
  const [kind, setKind] = useState<Kind>('KEEP')
  const [strategy, setStrategy] = useState<StrategyId>(session.kernel.selection[side])
  const [incoming, setIncoming] = useState(''); const [outgoing, setOutgoing] = useState('')
  const heading = useRef<HTMLHeadingElement>(null); const card = useRef<HTMLElement>(null)
  // Focus the heading, then bring the whole card into view with the least scrolling so scoreboard and board stay visible when they fit.
  useEffect(() => { heading.current?.focus({ preventScroll: true }); card.current?.scrollIntoView?.({ block: 'nearest' }) }, [])
  const state = session.kernel.sides[side]
  const catalog = session.kernel.input.catalog
  const bench = catalog.filter((p) => state.unused.includes(p.id) && p.position !== 'ARQ' && !session.departed[side].includes(p.id))
  const inPlayer = bench.find((p) => p.id === incoming)
  const outPlayer = state.team.players.find((p) => p.id === outgoing && p.position === inPlayer?.position)
  const left = session.benchMode[side] === 'manual-v1' ? Math.max(0, 3 - session.entered[side].length) : 0
  const canSub = session.benchMode[side] === 'manual-v1' && left > 0 && bench.length > 0
  const valid = kind !== 'SUBSTITUTE' || Boolean(canSub && inPlayer && outPlayer)
  const choose = (action: Kind) => { if (action !== 'SUBSTITUTE' || canSub) setKind(action) }
  const summary = kind === 'KEEP' ? t('liveDT.willDo.KEEP') : kind === 'STRATEGY' ? t('liveDT.willDo.STRATEGY', { strategy: t(`tactics.strategies.${strategy}.name`) }) : inPlayer && outPlayer ? t('liveDT.willDo.SUBSTITUTE', { in: inPlayer.name, out: outPlayer.name }) : t('liveDT.willDo.pending')
  const order = (): Order => kind === 'KEEP' ? { type: 'KEEP', parameters: {} } : kind === 'STRATEGY' ? { type: 'STRATEGY', parameters: { strategy } } : { type: 'SUBSTITUTE', parameters: { inId: incoming, outId: outgoing } }
  return <section className="live-decision" ref={card} aria-label={t('liveDT.turn', { name })}>
    <h2 tabIndex={-1} ref={heading}>{t('liveDT.turn', { name })}</h2>
    <p className="live-moment">{t('liveDT.moment', { minute, home: names.local, away: names.cpu, homeGoals: score.local, awayGoals: score.cpu, strategy: t(`tactics.strategies.${session.kernel.selection[side]}.name`), count: left })}</p>
    <fieldset className="live-options"><legend>{t('liveDT.action')}</legend>
      {(['KEEP', 'STRATEGY', 'SUBSTITUTE'] as const).map((action) => <div key={action} className={`live-option live-option-${action}`} onClick={() => choose(action)}>
        <label><input type="radio" name="live-order" checked={kind === action} disabled={action === 'SUBSTITUTE' && !canSub} aria-describedby={`live-hint-${action}`} onChange={() => choose(action)} />{t(`liveDT.${action}`)}</label>
        <small id={`live-hint-${action}`}>{t(`liveDT.hint.${action}`)}</small>
      </div>)}
    </fieldset>
    {kind === 'STRATEGY' && <label className="live-field">{t('liveDT.strategy')}<select value={strategy} onChange={(e) => setStrategy(e.target.value as StrategyId)}>{STRATEGY_IDS.map((id) => <option key={id} value={id}>{t(`tactics.strategies.${id}.name`)}</option>)}</select></label>}
    {kind === 'SUBSTITUTE' && <div className="live-field-row"><label className="live-field">{t('liveDT.in')}<select value={incoming} onChange={(e) => { setIncoming(e.target.value); setOutgoing('') }}><option value="">—</option>{bench.map((p) => <option key={p.id} value={p.id}>{p.name} · {t(`positions.${p.position}`)}</option>)}</select></label><label className="live-field">{t('liveDT.out')}<select value={outgoing} onChange={(e) => setOutgoing(e.target.value)}><option value="">—</option>{state.team.players.filter((p) => p.position === inPlayer?.position).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>}
    <p className="live-summary" role="status">{summary} <small>{t('liveDT.futureOnly')}</small></p>
    <button className="primary-action live-confirm" disabled={!valid} onClick={() => onConfirm(order())}>{t('liveDT.confirm')}</button>
  </section>
}
