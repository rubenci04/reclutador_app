import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import photos from '../../data/coach-photos.json'
import type { Coach } from './coachTypes'

export function CoachPortrait({ coach }: { readonly coach: Coach }) {
  const { t } = useTranslation(); const [failed, setFailed] = useState(false)
  const photo = photos.find((p) => p.coachId === coach.id)
  return photo && !failed
    ? <img className="coach-photo" src={photo.path} alt={t('playtest.photoAlt', { name: `${coach.name} ${coach.surname}` })} onError={() => setFailed(true)} />
    : <span className="coach-emblem" aria-hidden="true">{coach.name[0]}{coach.surname[0]}<b>{coach.tier}</b></span>
}
