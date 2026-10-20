import { useTranslation } from 'react-i18next'
import { helpStore, useHelpPrefs } from './helpStore'

export function StageGuide({ stage }: { readonly stage: string }) {
  const { t } = useTranslation()
  const prefs = useHelpPrefs()
  const topic = `stage:${stage}`
  if (!prefs.hints || prefs.dismissed.includes(topic)) return null
  return <details className="stage-guide"><summary>{t(`playtest.guides.${stage}.title`)}</summary>
    <p>{t(`playtest.guides.${stage}.body`)}</p>
    <button className="secondary-action" onClick={() => helpStore.dismiss(topic)}>{t('tips.dismiss')}</button>
    <button className="secondary-action" onClick={() => helpStore.setHints(false)}>{t('tips.disable')}</button>
  </details>
}
