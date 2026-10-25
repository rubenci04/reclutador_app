import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CoachAvatar } from '../../components/CoachAvatar'
import { coachPhoto } from '../recruiter-duel/visualAssets'
import type { Coach } from './coachTypes'

/** The coach's figure in the same frame as a player's; a photo only when photos are switched on (they are off by default). */
export function CoachPortrait({ coach }: { readonly coach: Coach }) {
  const { t } = useTranslation(); const [failed, setFailed] = useState(false)
  const photo = coachPhoto(coach.id)
  return <span className="coach-figure">
    {photo && !failed ? <img className="coach-photo" src={photo.path} alt={t('playtest.photoAlt', { name: `${coach.name} ${coach.surname}` })} onError={() => setFailed(true)} /> : <CoachAvatar coach={coach} />}
    <b className="coach-tier-chip" aria-hidden="true">{coach.tier}</b>
  </span>
}
