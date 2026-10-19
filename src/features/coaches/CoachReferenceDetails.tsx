import { useTranslation } from 'react-i18next'
import type { Coach } from './coachTypes'
import { COACH_AS_OF_YEAR } from './coachRules'
import { referenceCareers } from '../player-catalog/referenceCareers'
import { flagUrl, NATIONALITY_FLAGS } from '../recruiter-duel/visualAssets'

export function CoachReferenceDetails({ coach }: { readonly coach: Coach }) {
  const { t, i18n } = useTranslation()
  const iso = NATIONALITY_FLAGS[coach.nationality as keyof typeof NATIONALITY_FLAGS]
  const country = iso?.startsWith('gb-') ? t('rosterUX.countries.' + coach.nationality) : iso ? new Intl.DisplayNames([i18n.language], { type: 'region' }).of(iso.toUpperCase()) : coach.nationality
  const teams = [...new Set([coach.team, coach.secondaryTeam].filter((team): team is string => Boolean(team)))]
  return <div className="coach-reference-details">
    <span className="coach-nationality">{flagUrl(coach.nationality) && <img src={flagUrl(coach.nationality)} alt="" width="24" height="18" />}{t('rosterUX.nationality', { country })}</span>
    {teams.map((team, index) => {
      const periods = referenceCareers(coach.id, team)
      return <div key={team} className="coach-career-spell">
        <strong>{t(index ? 'coach.secondaryReference' : coach.teamKind === 'NATIONAL' ? 'coach.referenceNational' : 'coach.referenceClub', { team })}</strong>
        {periods.length ? <span aria-label={t('rosterUX.referenceYears', { team })}>{periods.map((p) => `${p.from}–${p.to ?? t('playtest.present')}`).join(' · ')}</span> : <small>{coach.status === 'ACTIVE' ? t('coach.referenceYear', { year: COACH_AS_OF_YEAR }) : t('rosterUX.unknownYears')}</small>}
        {periods[0] && <a href={periods[0].url} target="_blank" rel="noreferrer">{t('rosterUX.careerSource')}</a>}
      </div>
    })}
  </div>
}
