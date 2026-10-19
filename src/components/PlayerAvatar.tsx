import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { KitFill } from './KitFill'
import { playerAppearance, SKIN_COLORS } from '../features/player-catalog/playerAppearance'
import { getClubVisual } from '../features/player-catalog/clubVisuals'
import type { Player } from '../types/player'

const HAIR = '#302c32'
const JERSEY = 'm44 66-20 10-9 32 13 5 12-25 1 30h38l1-30 12 25 13-5-9-32-20-10Z'

/** Original SVG character; no external image, player likeness or club logo. */
export function PlayerAvatar({ player }: { readonly player: Player }) {
  const { t } = useTranslation(); const colors = getClubVisual(player.club_tag)
  const appearance = playerAppearance(player.id); const skin = SKIN_COLORS[appearance.skin]
  const clip = useId().replace(/:/g, '')
  return <svg className="player-character" viewBox="0 0 120 150" role="img" aria-label={t('playtest.avatar', { name: player.name })}>
    <ellipse cx="60" cy="143" rx="35" ry="5" fill="#0004" />
    <path d="M43 109 40 140H54L60 113 66 140H80L77 109" fill="#172536" />
    <defs><clipPath id={clip}><path d={JERSEY} /></clipPath></defs>
    <g clipPath={`url(#${clip})`}><KitFill pattern={colors.pattern ?? 'duo'} primary={colors.primary} secondary={colors.secondary} x={14} y={64} width={92} height={60} /></g>
    <path d={JERSEY} fill="none" stroke="#ffffff77" strokeWidth="2" />
    <path d="m48 65 12 9 12-9" fill="none" stroke={colors.secondary} strokeWidth="5" />
    {appearance.hair === 'long' && <path d="M36 30C34 4 86 4 84 30L88 74 70 62H50L32 74Z" fill={HAIR} />}
    <rect x="51" y="53" width="18" height="18" rx="6" fill={skin.neck} />
    <ellipse cx="60" cy="36" rx="23" ry="27" fill={skin.head} />
    {appearance.hair === 'short' && <path d="M37 32C32 0 82-5 84 30L72 20 63 24 50 18Z" fill={HAIR} />}
    {appearance.hair === 'medium' && <path d="M35 40C28 -4 92-4 85 40L80 28 66 21 54 21 40 28Z" fill={HAIR} />}
    {appearance.hair === 'long' && <path d="M36 34C32 -2 88-2 84 34L74 22 62 25 48 20Z" fill={HAIR} />}
  </svg>
}
