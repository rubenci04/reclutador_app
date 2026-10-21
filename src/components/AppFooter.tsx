import { useTranslation } from 'react-i18next'

/** Author credit. Spelling confirmed by the project owner (DATA-REG-003A; it rectifies the earlier «Alvarrazin»). */
export const CREDIT_AUTHOR = 'Rubén E. Albarracín'
export const CREDIT_YEAR = 2026

/** One discreet footer at the end of the page content; part of the normal flow, never over interactive controls. */
export function AppFooter() {
  const { t } = useTranslation()
  return <footer className="app-credit"><small>{t('credit.label')}: {CREDIT_AUTHOR} © {CREDIT_YEAR}</small></footer>
}
