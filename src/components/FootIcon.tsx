import { useTranslation } from 'react-i18next'
import type { DominantFoot } from '../types/player'

/** Soles of both feet, drawn with a fixed left/right layout that never flips with the interface direction. */
const FOOT = (
  <g>
    <ellipse cx="7" cy="7.5" rx="4.2" ry="6.2" />
    <ellipse cx="5.6" cy="19.4" rx="3.1" ry="4.2" />
    <rect x="3.6" y="11" width="5.4" height="6" rx="2" />
  </g>
)

/** `decorative` hides the icon from assistive technology when an adjacent element already carries the localized label. */
export function FootIcon({ foot, decorative = false }: { readonly foot: DominantFoot; readonly decorative?: boolean }) {
  const { t } = useTranslation()
  const label = t(`foot.${foot}`)
  const left = foot === 'LEFT' || foot === 'BOTH', right = foot === 'RIGHT' || foot === 'BOTH'
  return <span className="foot-icon" dir="ltr" {...(decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': t('foot.label', { foot: label }) })} title={label}>
    <svg viewBox="0 0 28 26" aria-hidden="true" focusable="false">
      <g className={left ? 'foot-on' : 'foot-off'} data-foot="left">{FOOT}</g>
      <g className={right ? 'foot-on' : 'foot-off'} data-foot="right" transform="translate(28 0) scale(-1 1)">{FOOT}</g>
    </svg>
  </span>
}
