import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STRATEGY_IDS, type StrategyId } from '../tactics/strategies'
import type { Order, Session } from './interactive'
import type { MatchSide } from './matchTypes'
import { visibleStats } from './playback'

/** One halftime decision can atomically include a strategy and one manual change. Other windows are substitution-only. */
export function HalftimePanel({ session, side, name, halftime, onConfirm }: { session: Session; side: MatchSide; name: string; halftime: boolean; onConfirm: (order: Order) => void }) {
  const { t } = useTranslation()
  const [change, setChange] = useState(false)
  const [strategy, setStrategy] = useState<StrategyId>(session.kernel.selection[side])
  const [sub, setSub] = useState(false)
  const [incoming, setIncoming] = useState(''); const [outgoing, setOutgoing] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])
  const state = session.kernel.sides[side]
  const catalog = session.kernel.input.catalog
  const bench = catalog.filter((p) => state.unused.includes(p.id) && p.position !== 'ARQ' && !session.departed[side].includes(p.id))
  const inPlayer = bench.find((p) => p.id === incoming)
  const canSub = session.benchMode[side] === 'manual-v1' && session.entered[side].length < 3 && bench.length > 0
  const valid = !sub || Boolean(inPlayer && state.team.players.some((p) => p.id === outgoing && p.position === inPlayer.position))
  const stats = visibleStats(session.kernel.blocks.flatMap((b) => b.events))
  const confirm = () => {
    const substitution = sub ? { inId: incoming, outId: outgoing } : null
    onConfirm(halftime && (change || sub) ? { type: 'HALFTIME', parameters: { strategy: change ? strategy : session.kernel.selection[side], substitution } } : substitution ? { type: 'SUBSTITUTE', parameters: substitution } : { type: 'KEEP', parameters: {} })
  }
  return <section className="live-decision halftime-card" aria-labelledby="halftime-heading">
    <h2 id="halftime-heading" tabIndex={-1} ref={heading}>{t(halftime ? 'halftime.title' : 'halftime.substitutions')} · {name}</h2>
    {halftime && <><p>{t('halftime.question')}</p><p className="halftime-stats">{t('halftime.stats', { local: stats.local.shots, cpu: stats.cpu.shots, onLocal: stats.local.shotsOnTarget, onCpu: stats.cpu.shotsOnTarget })}</p><label><input type="checkbox" checked={change} onChange={(e) => setChange(e.target.checked)} />{t('halftime.change')}</label>
      {change && <label className="live-field">{t('liveDT.strategy')}<select value={strategy} onChange={(e) => setStrategy(e.target.value as StrategyId)}>{STRATEGY_IDS.map((id) => <option key={id} value={id}>{t(`tactics.strategies.${id}.name`)}</option>)}</select></label>}</>}
    {canSub && <><label><input type="checkbox" checked={sub} onChange={(e) => setSub(e.target.checked)} />{t('halftime.addSub')}</label>
      {sub && <div className="live-field-row"><label className="live-field">{t('liveDT.in')}<select value={incoming} onChange={(e) => { setIncoming(e.target.value); setOutgoing('') }}><option value="">—</option>{bench.map((p) => <option key={p.id} value={p.id}>{p.name} · {t(`positions.${p.position}`)}</option>)}</select></label><label className="live-field">{t('liveDT.out')}<select value={outgoing} onChange={(e) => setOutgoing(e.target.value)}><option value="">—</option>{state.team.players.filter((p) => p.position === inPlayer?.position).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>}</>}
    <button className="primary-action live-confirm" disabled={!valid} onClick={confirm}>{t(change || sub ? 'halftime.confirm' : halftime ? 'halftime.keep' : 'halftime.cancel')}</button>
  </section>
}
