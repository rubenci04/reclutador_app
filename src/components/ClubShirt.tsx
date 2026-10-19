import { useId } from 'react'
import { KitFill } from './KitFill'
import type { ClubVisual } from '../features/player-catalog/clubVisuals'

const BODY = 'M19 3 5 12 1 26 13 30 17 22 17 53 47 53 47 22 51 30 63 26 59 12 45 3 39 9 25 9Z'

/** Pitch shirt in the club's colours and pattern; without a club it keeps the neutral two-tone look. */
export function ClubShirt({ colors }: { readonly colors: ClubVisual }) {
  const clip = useId().replace(/:/g, '')
  return <svg viewBox="0 0 64 56" aria-hidden="true">
    <defs><clipPath id={clip}><path d={BODY} /></clipPath></defs>
    <g clipPath={`url(#${clip})`}><KitFill pattern={colors.pattern ?? 'duo'} primary={colors.primary} secondary={colors.secondary} x={0} y={0} width={64} height={56} /></g>
    <path d={BODY} fill="none" />
  </svg>
}
