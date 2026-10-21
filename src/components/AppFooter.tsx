import { useTranslation } from 'react-i18next'

/** Author credit. The spelling below is the one the project owner supplied for UX-DRAW-007 (see docs/qa/UX-DRAW-007.md). */
export const CREDIT_AUTHOR = 'Rubén E. Alvarrazin'
export const CREDIT_YEAR = 2026

/** One discreet footer at the end of the page content; part of the normal flow, never over interactive controls. */
export function AppFooter() {
  const { t } = useTranslation()
  return <footer className="app-credit"><small>{t('credit.label')}: {CREDIT_AUTHOR} © {CREDIT_YEAR}</small></footer>
}
