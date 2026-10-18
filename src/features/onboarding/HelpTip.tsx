import { useTranslation } from 'react-i18next'
import type { HelpTopic } from './helpTopics'
import { helpStore, useHelpPrefs } from './helpStore'

/** One short contextual tip. Hidden when tips are off or this topic was dismissed; no timers, nothing steals focus. */
export function HelpTip({ topic }: { readonly topic: HelpTopic }) {
  const { t } = useTranslation()
  const prefs = useHelpPrefs()
  if (!prefs.hints || prefs.dismissed.includes(topic)) return null
  return <aside className="help-tip" role="note" aria-label={t('tips.label')}>
    <p>{t(`tips.${topic}`)}</p>
    <button className="secondary-action" onClick={() => helpStore.dismiss(topic)}>{t('tips.dismiss')}</button>
    <button className="secondary-action" onClick={() => helpStore.setHints(false)}>{t('tips.disable')}</button>
  </aside>
}
