import { useTranslation } from 'react-i18next'
import type { Coach } from '../features/coaches/coachTypes'

const HAIR = '#4a4650'
const JACKET = 'm44 66-20 10-9 32 13 5 12-25 1 30h38l1-30 12 25 13-5-9-32-20-10Z'

/** Original SVG figure of a coach in jacket, shirt and tie; same frame as PlayerAvatar. Neutral tones, no likeness of any person. */
export function CoachAvatar({ coach }: { readonly coach: Coach }) {
  const { t } = useTranslation()
  return <svg className="player-character coach-character" viewBox="0 0 120 150" role="img" aria-label={t('coach.avatar', { name: `${coach.name} ${coach.surname}` })}>
    <ellipse cx="60" cy="143" rx="35" ry="5" fill="#0004" />
    <path d="M43 109 40 140H54L60 113 66 140H80L77 109" fill="#1d2630" />
    <path d={JACKET} fill="#39424e" />
    <path d={JACKET} fill="none" stroke="#ffffff55" strokeWidth="2" />
    <path d="m48 65 12 22 12-22-6-3h-12Z" fill="#e9ecef" />
    <path d="m56 68 4 4 4-4-1 7 3 30-6 6-6-6 3-30Z" fill="#6b2d3a" />
    <path d="m60 66 0 44" stroke="#2a323c" strokeWidth="2" />
    <rect x="51" y="53" width="18" height="18" rx="6" fill="#bfae9a" />
    <ellipse cx="60" cy="36" rx="23" ry="27" fill="#d2c1ad" />
    <path d="M37 32C32 0 82-5 84 30L72 20 63 24 50 18Z" fill={HAIR} />
  </svg>
}
