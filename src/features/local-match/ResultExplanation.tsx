import { useTranslation } from 'react-i18next'
import { GuideDialog } from '../../components/GuideDialog'
import type { MatchResult, MatchSide } from './matchTypes'
import { useState } from 'react'
import { coachById } from '../coaches/coachCatalog'
import { SQUAD_TIERS } from './squadQuality'
import { probabilityExplanation } from './probabilityExplanation'

/** Describes applied inputs; never claims a causal proof for a stochastic result. */
export function ResultExplanation({ result, name, note = '' }: { readonly result: MatchResult; readonly name: (side: MatchSide) => string; readonly note?: string }) {
  const { t } = useTranslation(); const [closed, setClosed] = useState(false)
  const strengths = result.effectiveStrengths ?? result.strengths
  const winner = result.winner === 'draw' ? null : result.winner
  const label = winner ? name(winner) : t('match.draw')
  const coachName = (side: MatchSide) => { const coach = coachById(result.coaches?.[side]?.id); return coach ? `${coach.name} ${coach.surname}` : t('playtest.none') }
  const tiers = (side: MatchSide) => `${name(side)}: ${SQUAD_TIERS.map((tier) => `${tier} ${result.quality?.initial[side].counts[tier] ?? 0}`).join(' · ')}`
  const adjustments = (side: MatchSide) => { const a = result.tactics?.adjustments[side]; return a ? `${a.attack} / ${a.defense} / ${a.midfield}` : '0 / 0 / 0' }
  const text = t('playtest.explain', {
    name: label, local: strengths.local.global, cpu: strengths.cpu.global,
    localQuality: result.quality?.meanBonus.local ?? 0, cpuQuality: result.quality?.meanBonus.cpu ?? 0,
    localCoach: coachName('local'), cpuCoach: coachName('cpu'),
    localFormation: result.formations?.local ?? '4-3-3', cpuFormation: result.formations?.cpu ?? '4-3-3',
    localTactic: t(`tactics.strategies.${result.tactics?.selection.local ?? 'NEUTRAL'}.name`), cpuTactic: t(`tactics.strategies.${result.tactics?.selection.cpu ?? 'NEUTRAL'}.name`),
  }) + '\n\n' + t('playtest.tiers', { local: tiers('local'), cpu: tiers('cpu') }) + '\n\n' + t('playtest.adjustments', { local: adjustments('local'), cpu: adjustments('cpu') }) + (result.actionModel === 'action-v3' ? '\n\n' + t('playtest.probabilities', probabilityExplanation(result)) : '') + '\n\n' + note
  if (closed) return <button className="secondary-action" onClick={() => setClosed(false)}>{t('playtest.why')}</button>
  return <GuideDialog title={t('playtest.resultTitle', { name: label })} body={text} onClose={() => setClosed(true)} />
}
