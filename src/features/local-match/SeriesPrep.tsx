import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import { FORMATION_IDS, type FormationId } from '../tactics/formations'
import { acknowledgeHandover, confirmStrategy, revealedStrategies, startStrategyChoice, type ChoiceTransition, type StrategyChoice } from '../tactics/strategyChoice'
import { StrategyChoicePanel } from '../recruiter-duel/StrategyChoicePanel'
import { changeSeriesFormation, type SeriesSetup } from './matchSeries'
import type { MatchSide } from './matchTypes'

interface Props {
  readonly setup: SeriesSetup
  readonly catalog: readonly Player[]
  readonly names: Readonly<Record<MatchSide, string>>
  /** True when the second side is a person too (hot-seat): it picks its own formation and strategy. */
  readonly secondIsHuman: boolean
  readonly onStart: (setup: SeriesSetup) => void
  readonly onCancel?: () => void
}

/** Between two games of a series: each person may change formation (same players) and strategy, then the next game is played. */
export function SeriesPrep({ setup: initial, catalog, names, secondIsHuman, onStart, onCancel }: Props) {
  const { t } = useTranslation()
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [])
  const [setup, setSetup] = useState(initial)
  const [choice, setChoice] = useState<StrategyChoice>(() => startStrategyChoice(secondIsHuman ? undefined : initial.tactics?.cpu ?? 'NEUTRAL'))
  const sides: readonly MatchSide[] = secondIsHuman ? ['local', 'cpu'] : ['local']
  const keep = (result: ChoiceTransition) => { if (result.ok) setChoice(result.choice) }
  const formationOf = (side: MatchSide): FormationId => setup.formations?.[side] ?? '4-3-3'
  const change = (side: MatchSide, formation: FormationId) => { const next = changeSeriesFormation(setup, side, formation, catalog); if (next) setSetup(next) }
  const canUse = (side: MatchSide, formation: FormationId) => formation === formationOf(side) || changeSeriesFormation(setup, side, formation, catalog) !== null
  return <section className="series-prep" aria-label={t('seriesPrep.title')}>
    <h3 ref={heading} tabIndex={-1}>{t('seriesPrep.title')}</h3>
    {onCancel && choice.step === 'FIRST' && <button className="secondary-action" onClick={onCancel}>{t('navigation.backSummary')}</button>}
    <p>{t('seriesPrep.help')}</p>
    <div className="series-prep-formations">{sides.map((side) => <label key={side}>{t('seriesPrep.formationOf', { name: names[side] })}
      <select value={formationOf(side)} disabled={choice.step !== 'FIRST'} onChange={(event) => change(side, event.target.value as FormationId)}>
        {FORMATION_IDS.map((id) => <option key={id} value={id} disabled={!canUse(side, id)}>{id}</option>)}
      </select></label>)}</div>
    {sides.every((side) => FORMATION_IDS.every((id) => id === formationOf(side) || !canUse(side, id))) && <p className="strategy-note">{t('seriesPrep.noOptions')}</p>}
    <StrategyChoicePanel choice={choice} chooser={choice.step === 'SECOND' ? names.cpu : names.local} nextChooser={names.cpu} names={{ first: names.local, second: names.cpu }}
      onConfirm={(strategy) => keep(confirmStrategy(choice, strategy))} onHandover={() => keep(acknowledgeHandover(choice))}
      onStart={() => {
        const revealed = revealedStrategies(choice)
        if (!revealed) return false
        onStart({ ...setup, tactics: { local: revealed.first, cpu: revealed.second } })
        return true
      }} />
  </section>
}
