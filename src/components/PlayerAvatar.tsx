import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { KitFill } from './KitFill'
import { HAIR_COLORS, playerLook, SKIN_COLORS } from '../features/player-catalog/playerAppearance'
import { getClubVisual } from '../features/player-catalog/clubVisuals'
import type { Player } from '../types/player'

const JERSEY = 'm44 66-20 10-9 32 13 5 12-25 1 30h38l1-30 12 25 13-5-9-32-20-10Z'
const BUILD_WIDTH = { thin: .8, slim: .9, athletic: 1, muscular: 1.1, stocky: 1.16 } as const
const EAR_SIZE = { small: 3, medium: 4.2, large: 5.6 } as const
const HEAD = {
  oval: { rx: 23, ry: 27 }, round: { rx: 25, ry: 26 }, long: { rx: 21, ry: 29 },
} as const
/** Little circles along the hairline: the curl of curly and coily hair. */
const curls = (radius: number) => Array.from({ length: 9 }, (_, index) => { const angle = Math.PI * (1.08 + index * .105); return { cx: 60 + 27 * Math.cos(angle), cy: 30 + 31 * Math.sin(angle), r: radius } })
const MUSTACHE = 'M50 45Q55 41 60 44Q65 41 70 45Q65 48 60 47Q55 48 50 45Z'
const JAW = 'M39 38Q41 63 60 65Q79 63 81 38Q73 53 60 54Q47 53 39 38Z'
const JAW_LONG = 'M38 38Q40 72 60 80Q80 72 82 38Q74 55 60 56Q46 55 38 38Z'

/**
 * Original SVG character; no external image, no club logo, no claim to look like anybody. What is drawn comes from hand-entered editorial
 * traits (skin, hair, facial hair, build, one mark); a card without a record gets the neutral default.
 */
export function PlayerAvatar({ player }: { readonly player: Player }) {
  const { t } = useTranslation(); const colors = getClubVisual(player.club_tag)
  const look = playerLook(player.id); const skin = SKIN_COLORS[look.skin]; const hairFill = HAIR_COLORS[look.color]
  const clip = useId().replace(/:/g, '')
  const width = BUILD_WIDTH[look.build]; const ear = EAR_SIZE[look.ears]
  const curly = look.hair !== 'bald' && (look.texture === 'curly' || look.texture === 'coily')
  const head = look.face === 'square' ? <rect x="36" y="9" width="48" height="55" rx="15" fill={skin.head} />
    : look.face === 'triangle' ? <path d="M37 28C37 4 83 4 83 28C83 44 71 60 60 64C49 60 37 44 37 28Z" fill={skin.head} />
    : <ellipse cx="60" cy="36" rx={HEAD[look.face].rx} ry={HEAD[look.face].ry} fill={skin.head} />
  return <svg className="player-character" viewBox="0 0 120 150" role="img" aria-label={t('playtest.avatar', { name: player.name })}>
    <ellipse cx="60" cy="143" rx="35" ry="5" fill="#0004" />
    <g transform={`translate(60 0) scale(${width} 1) translate(-60 0)`}>
      <path d="M43 109 40 140H54L60 113 66 140H80L77 109" fill="#172536" />
      <defs><clipPath id={clip}><path d={JERSEY} /></clipPath></defs>
      <g clipPath={`url(#${clip})`}><KitFill pattern={colors.pattern ?? 'duo'} primary={colors.primary} secondary={colors.secondary} x={14} y={64} width={92} height={60} /></g>
      <path d={JERSEY} fill="none" stroke="#ffffff77" strokeWidth="2" />
      <path d="m48 65 12 9 12-9" fill="none" stroke={colors.secondary} strokeWidth="5" />
    </g>
    {look.hair === 'long' && <path d="M36 30C34 4 86 4 84 30L88 74 70 62H50L32 74Z" fill={hairFill} />}
    <rect x="51" y="53" width="18" height="18" rx="6" fill={skin.neck} />
    {look.mark === 'tattoo' && <path d="M53 58q7 3 14 0M53 63q7 3 14 0M54 68q6 2 12 0" fill="none" stroke="#2c3f66" strokeWidth="1.6" strokeLinecap="round" opacity=".85" />}
    <ellipse cx="37" cy="38" rx={ear} ry={ear * 1.25} fill={skin.neck} /><ellipse cx="83" cy="38" rx={ear} ry={ear * 1.25} fill={skin.neck} />
    {head}
    {look.facial === 'stubble' && <path d={JAW} fill={hairFill} opacity=".38" />}
    {look.facial === 'beard' && <path d={JAW_LONG} fill={hairFill} opacity=".92" />}
    {look.facial === 'goatee' && <path d="M54 55Q60 68 66 55Q60 58 54 55Z" fill={hairFill} />}
    {look.facial === 'sideburns' && <><path d="M37 28V47L42 50V28Z" fill={hairFill} /><path d="M83 28V47L78 50V28Z" fill={hairFill} /></>}
    {(look.facial === 'mustache' || look.facial === 'goatee' || look.facial === 'beard') && <path d={MUSTACHE} fill={hairFill} />}
    {look.hair === 'short' && <path d="M37 32C32 0 82-5 84 30L72 20 63 24 50 18Z" fill={hairFill} />}
    {look.hair === 'medium' && <path d="M35 40C28 -4 92-4 85 40L80 28 66 21 54 21 40 28Z" fill={hairFill} />}
    {look.hair === 'long' && <path d="M36 34C32 -2 88-2 84 34L74 22 62 25 48 20Z" fill={hairFill} />}
    {curly && curls(look.texture === 'coily' ? 4.6 : 6).map((bump, index) => <circle key={index} cx={bump.cx} cy={bump.cy} r={bump.r} fill={hairFill} />)}
    {look.mark === 'brows' && <path d="M47 27h10M63 27h10" stroke={hairFill} strokeWidth="3.2" strokeLinecap="round" />}
    {look.mark === 'scar' && <path d="M68 21l4 9" stroke="#8a4b4b" strokeWidth="1.6" strokeLinecap="round" />}
    {look.mark === 'mole' && <circle cx="70" cy="42" r="1.9" fill="#4a3326" />}
  </svg>
}
