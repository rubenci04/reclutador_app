import { useTranslation } from 'react-i18next'
import { getClubVisual } from '../features/player-catalog/clubVisuals'
import type { Player } from '../types/player'

/** Original SVG character; no external image, player likeness or club logo. */
export function PlayerAvatar({ player }: { readonly player: Player }) {
  const { t } = useTranslation(); const colors = getClubVisual(player.club_tag)
  return <svg className="player-character" viewBox="0 0 120 150" role="img" aria-label={t('playtest.avatar', { name: player.name })}>
    <ellipse cx="60" cy="143" rx="35" ry="5" fill="#0004" />
    <path d="M43 109 40 140H54L60 113 66 140H80L77 109" fill="#172536" />
    <path d="m44 66-20 10-9 32 13 5 12-25 1 30h38l1-30 12 25 13-5-9-32-20-10Z" fill={colors.primary} stroke="#ffffff77" strokeWidth="2" />
    <path d="M55 72h10v43H55Z" fill={colors.secondary} />
    <path d="m48 65 12 9 12-9" fill="none" stroke={colors.secondary} strokeWidth="5" />
    <rect x="51" y="53" width="18" height="18" rx="6" fill="#dba87f" />
    <ellipse cx="60" cy="36" rx="23" ry="27" fill="#dfb18a" />
    <path d="M37 32C32 0 82-5 84 30L72 20 63 24 50 18Z" fill="#302c32" />
    <circle cx="51" cy="37" r="2" fill="#302c32" /><circle cx="69" cy="37" r="2" fill="#302c32" />
    <path d="M53 49q7 6 14 0" fill="none" stroke="#855141" strokeWidth="2" strokeLinecap="round" />
  </svg>
}
