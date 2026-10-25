import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { MODE_VISUALS } from '../themed-modes/modeVisuals'
import type { ThemedModeId } from '../themed-modes/modeTypes'
import { useEditionNames } from './editionNames'
import { categoryRanking } from '../player-catalog/categoryRanking'

interface Props {
  readonly mode: ThemedModeId
  /** Category of the second participant when it differs; shown next to the first, never mixed with it. */
  readonly rivalMode?: ThemedModeId
  readonly budget: number
  readonly reserve: number
  /** The start button, so the choice and its action are one block. */
  readonly children: ReactNode
}

/** The one place that states the selected edition, next to the start button; it follows the selection, the budget and the rival category. */
export function EditionHero({ mode, rivalMode, budget, reserve, children }: Props) {
  const { t } = useTranslation()
  const own = useEditionNames(mode)
  const rival = useEditionNames(rivalMode ?? mode)
  const accent = MODE_VISUALS[mode]?.accent ?? '#d5fb76'
  const top = categoryRanking(mode).size
  const different = rivalMode !== undefined && rivalMode !== mode
  return <section id="edition-hero" className="edition-hero" style={{ '--mode-accent': accent } as CSSProperties} aria-label={t('editionHero.label')}>
    <p className="edition-label">{t('editionHero.label')}</p>
    <h2 className="edition-title" data-testid="edition-title">{own.title}</h2>
    {own.edition && <p className="edition-name">{own.edition}</p>}
    {different && <p className="edition-rival">{t('editionHero.rival', { name: [rival.title, rival.edition].filter(Boolean).join(' · ') })}</p>}
    <p className="edition-meta">{t('editionHero.meta', { top, budget, reserve })}</p>
    {children}
  </section>
}
