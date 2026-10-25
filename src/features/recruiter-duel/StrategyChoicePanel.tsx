import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STRATEGY_IDS, type StrategyId } from '../tactics/strategies'
import { FormationGuide } from '../tactics/FormationGuide'
import { StrategyDiagram } from './StrategyDiagram'
import { revealedStrategies, type StrategyChoice } from '../tactics/strategyChoice'

interface Props {
  readonly choice: StrategyChoice
  /** Display name of whoever picks in the current step; never the rival's pick. */
  readonly chooser: string
  readonly nextChooser: string
  readonly names: { readonly first: string; readonly second: string }
  readonly onConfirm: (strategy: StrategyId) => void
  readonly onHandover: () => void
  /** Returns false when the match could not start, which releases the button. */
  readonly onStart: () => boolean
  /** Lets the person pick again before the match starts (only offered while the other side has not confirmed or, against the CPU, before the start). */
  readonly onChangeTactic?: () => void
  /** Against the CPU the reveal waits for the start, so changing your own pick never lets you counter the CPU's. */
  readonly sealSecond?: boolean
}

/** Secret simultaneous choice screen. Nothing the first recruiter picked is rendered until the reveal. */
export function StrategyChoicePanel({ choice, chooser, nextChooser, names, onConfirm, onHandover, onStart, onChangeTactic, sealSecond }: Props) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<StrategyId | null>(null)
  const revealed = revealedStrategies(choice)
  const root = useRef<HTMLDivElement>(null)
  const starting = useRef(false)
  // Each stage change brings the new stage into view and to the screen reader; the long recap above must not hide it.
  useEffect(() => {
    root.current?.scrollIntoView?.({ block: 'start' })
    root.current?.focus({ preventScroll: true })
  }, [choice.step])
  return <div className="strategy-stage" ref={root} tabIndex={-1}>{content()}</div>
  function content() {
  if (revealed) {
    return <section className="strategy-panel strategy-reveal" aria-live="polite">
      <h2>{t('strategyChoice.revealTitle')}</h2>
      <div className="strategy-reveal-grid">{(['first', 'second'] as const).map((side) => side === 'second' && sealSecond ? <article key={side} className="strategy-card strategy-revealed strategy-sealed"><h3>{names[side]}</h3><strong aria-hidden="true">?</strong><p>{t('strategyChoice.sealedCpu')}</p></article> : <article key={side} className="strategy-card strategy-revealed">
        <h3>{names[side]}</h3><StrategyDiagram id={revealed[side]} /><strong>{t(`tactics.strategies.${revealed[side]}.name`)}</strong>
        <p>{t(`tactics.strategies.${revealed[side]}.objective`)}</p>
      </article>)}<span className="vs-badge" aria-hidden="true">VS</span></div>
      <p className="strategy-note">{t('strategyChoice.noGuarantee')}</p>
      {onChangeTactic && <button className="secondary-action" onClick={onChangeTactic}>{t('strategyChoice.changeMine')}</button>}
      <button className="primary-action" onClick={() => { if (starting.current) return; starting.current = true; if (!onStart()) starting.current = false }}>{t('duel.startMatch')}</button>
    </section>
  }
  if (choice.step === 'HANDOVER') {
    return <section className="strategy-panel strategy-handover" aria-live="polite">
      <h2>{t('strategyChoice.handoverTitle', { participant: nextChooser })}</h2>
      <p>{t('strategyChoice.handoverBody', { previous: chooser, participant: nextChooser })}</p>
      <button className="primary-action" onClick={onHandover}>{t('strategyChoice.handoverReady', { participant: nextChooser })}</button>
      {onChangeTactic && <button className="secondary-action" onClick={onChangeTactic}>{t('strategyChoice.changeFor', { participant: names.first })}</button>}
    </section>
  }
  return <section className="strategy-panel" key={choice.step} aria-labelledby="strategy-title">
    <h2 id="strategy-title">{t('strategyChoice.title', { participant: chooser })}</h2>
    <p>{t('strategyChoice.instructions')}</p>
    {choice.step === 'FIRST' && <p className="strategy-note">{t('strategyChoice.formationHint')}</p>}
    <FormationGuide />
    <div className="strategy-grid" role="radiogroup" aria-labelledby="strategy-title">{STRATEGY_IDS.map((id) => <label key={id} className={`strategy-card${selected === id ? ' chosen' : ''}`}>
      <input type="radio" name="strategy" value={id} checked={selected === id} onChange={() => setSelected(id)} />
      <StrategyDiagram id={id} /><strong>{t(`tactics.strategies.${id}.name`)}</strong>
      <span><b><span aria-hidden="true">🎯</span> {t('strategyChoice.seeks')}</b> {t(`tactics.strategies.${id}.objective`)}</span>
      <span><b><span aria-hidden="true">⚡</span> {t('strategyChoice.advantage')}</b> {t(`tactics.strategies.${id}.advantages`)}</span>
      <span><b><span aria-hidden="true">⚠️</span> {t('strategyChoice.risk')}</b> {t(`tactics.strategies.${id}.risks`)}</span>
    </label>)}</div>
    <p className="strategy-note">{t('strategyChoice.noGuarantee')}</p>
    {choice.step === 'SECOND' && onChangeTactic && <button className="secondary-action" onClick={onChangeTactic}>{t('strategyChoice.changeFor', { participant: names.first })}</button>}
    <button className="primary-action" disabled={!selected} onClick={() => { if (selected) { const picked = selected; setSelected(null); onConfirm(picked) } }}>{t('strategyChoice.confirm')}</button>
  </section>
  }
}
