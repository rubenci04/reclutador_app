import type { CSSProperties } from 'react'
import { flagUrl } from '../recruiter-duel/visualAssets'
import type { ModeVisual } from './modeVisuals'

function Globe({ gold }: { readonly gold: boolean }) {
  const ocean = gold ? '#4a3a0c' : '#0e3f49'; const land = gold ? '#fbbf24' : '#7ee0c4'; const line = gold ? '#fde68a' : '#d5fb76'
  return <svg className="mode-globe" data-testid={gold ? 'globe-gold' : 'globe'} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <ellipse cx="24" cy="24" rx="22" ry="8" fill="none" stroke={line} strokeWidth="1" opacity=".55" transform="rotate(-24 24 24)" />
    <circle cx="24" cy="24" r="15" fill={ocean} stroke={line} strokeWidth="1.5" />
    <path d="M14 17c3-3 7-2 8 1s-3 4-2 7-4 3-5 0-3-5-1-8zM27 14c3-1 7 1 6 4s-3 3-3 6 2 6-1 7-4-3-3-6-3-8 1-11z" fill={land} />
    <path d="M24 9v30M10 24h28" stroke={line} strokeWidth=".7" opacity=".6" />
    <ellipse cx="24" cy="24" rx="7" ry="15" fill="none" stroke={line} strokeWidth=".7" opacity=".6" />
    {gold && <path d="M38 6l1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z" fill="#fde68a" stroke="#b45309" strokeWidth=".6" />}
  </svg>
}

/** Simplified silhouettes: recognisable outlines, not cartography. */
const MAPS = {
  'south-america': { box: '0 0 60 80', points: '16,6 26,2 36,6 46,10 56,18 52,24 58,30 50,40 44,48 40,58 34,70 30,78 26,76 26,64 24,52 18,44 12,36 10,26 8,16' },
  europe: { box: '0 0 80 70', points: '6,40 10,30 8,22 16,16 14,8 24,4 30,10 36,6 44,2 56,4 66,2 74,10 70,18 62,22 66,30 58,36 62,44 54,50 46,46 42,56 34,52 28,60 20,56 22,48 12,46' },
} as const

function MapShape({ map }: { readonly map: keyof typeof MAPS }) {
  return <svg className="mode-map" data-testid={`map-${map}`} viewBox={MAPS[map].box} aria-hidden="true" focusable="false"><polygon points={MAPS[map].points} /></svg>
}

/** Faded artwork behind a category's name: the country flag, a globe or the continent's map. */
export function ModeBackdrop({ visual }: { readonly visual: ModeVisual }) {
  const flag = visual.flags[0] ? flagUrl(visual.flags[0]) : undefined
  return <span className={`mode-backdrop mode-backdrop-${visual.kind}`} style={{ '--mode-accent': visual.accent } as CSSProperties} aria-hidden="true">
    {(visual.kind === 'globe' || visual.kind === 'globe-gold') && <Globe gold={visual.kind === 'globe-gold'} />}
    {visual.kind === 'single-flag' && flag && <img className="mode-flag" src={flag} alt="" />}
    {visual.kind === 'map' && visual.map && <MapShape map={visual.map} />}
  </span>
}

/** Football for current players, star for legends. */
export function VariantIcon({ legend }: { readonly legend: boolean }) {
  return <span className={`mode-variant ${legend ? 'is-legend' : 'is-current'}`} data-testid={legend ? 'icon-legend' : 'icon-current'} aria-hidden="true">{legend ? '★' : '⚽'}</span>
}
