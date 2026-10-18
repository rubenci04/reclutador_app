import { coachById } from '../coaches/coachCatalog'
import { useTranslation } from 'react-i18next'
import type { MatchResult, MatchSide } from './matchTypes'
import { SQUAD_TIERS } from './squadQuality'

interface Props { readonly result: MatchResult; readonly teamName: (side: MatchSide) => string }

const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(1)}`

/** Explains the stored tactical outcome. Reads only `result.tactics`; nothing is recalculated. */
export function TacticalSummary({ result, teamName }: Props) {
  const { t } = useTranslation()
  const tactics = result.tactics
  if (!tactics) return null
  const advantage = result.rosterAdvantage
  const coachLine = (side: 'local' | 'cpu') => { const hired = result.coaches?.[side]; const coach = coachById(hired?.id); return `${teamName(side)}: ${hired && coach ? t('coach.effect', { coach: `${coach.name} ${coach.surname}`, attack: hired.attack.toFixed(1), defense: hired.defense.toFixed(1), midfield: hired.midfield.toFixed(1) }) : t('coach.none')}` }
  return <section className="tactical-summary" aria-label={t('match.tacticsTitle')}>
    <h3>{t('match.tacticsTitle')}</h3>
    {result.coaches && <p className="roster-advantage">{t('coach.result', { local: coachLine('local'), cpu: coachLine('cpu') })}</p>}
    {result.quality && <ul>{(['local', 'cpu'] as const).map((side) => <li key={side}>{t('match.qualitySummary', { team: teamName(side), counts: SQUAD_TIERS.map((tier) => `${tier}: ${result.quality!.initial[side].counts[tier]}`).join(' · '), bonus: result.quality!.meanBonus[side].toFixed(2) })}</li>)}</ul>}
    {advantage && <p className="roster-advantage">{advantage.side ? t('match.rosterAdvantage', { team: teamName(advantage.side), bonus: advantage.bonus.toFixed(1), difference: advantage.difference.toFixed(1) }) : t('match.rosterAdvantageNone')}</p>}
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
