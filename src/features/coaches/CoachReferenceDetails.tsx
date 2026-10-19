import { useTranslation } from 'react-i18next'
import type { Coach } from './coachTypes'
import { COACH_AS_OF_YEAR } from './coachRules'
import { referenceCareers } from '../player-catalog/referenceCareers'
import { flagUrl, NATIONALITY_FLAGS } from '../recruiter-duel/visualAssets'

/** One flag line and one reference line (club or national team plus the years); no second affiliation, no source links. */
export function CoachReferenceDetails({ coach }: { readonly coach: Coach }) {
  const { t, i18n } = useTranslation()
  const iso = NATIONALITY_FLAGS[coach.nationality as keyof typeof NATIONALITY_FLAGS]
  const country = iso?.startsWith('gb-') ? t('rosterUX.countries.' + coach.nationality) : iso ? new Intl.DisplayNames([i18n.language], { type: 'region' }).of(iso.toUpperCase()) : coach.nationality
  const period = referenceCareers(coach.id, coach.team)[0]
  const years = period ? `${period.from}–${period.to ?? t('playtest.present')}` : coach.status === 'ACTIVE' ? String(COACH_AS_OF_YEAR) : null
  return <div className="coach-reference-details">
    <span className="coach-nationality">{flagUrl(coach.nationality) && <img src={flagUrl(coach.nationality)} alt="" width="24" height="18" />}{country}</span>
    <strong className="coach-reference">{coach.team}{years && <span className="coach-years"> · {years}</span>}</strong>
  </div>
}
