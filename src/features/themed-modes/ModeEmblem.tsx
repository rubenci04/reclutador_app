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

export function ModeEmblem({ visual }: { readonly visual: ModeVisual }) {
  const flags = visual.flags.map((code) => ({ code, url: flagUrl(code) })).filter((flag): flag is { code: string; url: string } => Boolean(flag.url))
  return <span className={`mode-emblem mode-emblem-${visual.kind}`} style={{ '--mode-accent': visual.accent } as CSSProperties} aria-hidden="true">
    {(visual.kind === 'globe' || visual.kind === 'globe-gold') && <Globe gold={visual.kind === 'globe-gold'} />}
    {visual.kind === 'single-flag' && flags.map((flag) => <img key={flag.code} className="mode-flag" src={flag.url} alt="" />)}
    {visual.kind === 'multi-flag' && <span className="mode-flag-fan">{flags.slice(0, 6).map((flag) => <img key={flag.code} className="mode-flag" src={flag.url} alt="" />)}</span>}
    <span className={`mode-variant ${visual.legend ? 'is-legend' : 'is-current'}`}>{visual.legend ? '★' : '⚡'}</span>
  </span>
}
