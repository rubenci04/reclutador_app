import { useTranslation } from 'react-i18next'
import type { MatchResult, MatchSide } from './matchTypes'

interface Props { readonly result: MatchResult; readonly teamName: (side: MatchSide) => string }

const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(1)}`

/** Explains the stored tactical outcome. Reads only `result.tactics`; nothing is recalculated. */
export function TacticalSummary({ result, teamName }: Props) {
  const { t } = useTranslation()
  const tactics = result.tactics
  if (!tactics) return null
  return <section className="tactical-summary" aria-label={t('match.tacticsTitle')}>
    <h3>{t('match.tacticsTitle')}</h3>
    <ul>{(['local', 'cpu'] as const).map((side) => {
      const strategy = tactics.selection[side]; const adjustment = tactics.adjustments[side]
      return <li key={side}>
        <strong>{teamName(side)}: {t(`tactics.strategies.${strategy}.name`)}</strong>
        {strategy === 'NEUTRAL'
          ? <span>{t('match.tacticsNone')}</span>
          : <span>{t('match.attackPower')} {signed(adjustment.attack)} · {t('match.defensePower')} {signed(adjustment.defense)} · {t('match.midfieldControl')} {signed(adjustment.midfield)}</span>}
      </li>
    })}</ul>
    <p>{t('match.tacticsNote')}</p>
  </section>
}
