import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { helpStore, useHelpPrefs } from './helpStore'
import { TutorialDialog } from './TutorialDialog'

/** Opens the tutorial on the first visit and keeps a "How to play" button available afterwards. */
export function HelpLauncher() {
  const { t } = useTranslation()
  const prefs = useHelpPrefs()
  const [manual, setManual] = useState(false)
  const open = manual || !prefs.tutorialSeen
  const close = () => { helpStore.markTutorialSeen(); setManual(false) }
  return <>
    <button className="help-launcher" aria-label={t('tutorial.open')} title={t('tutorial.open')} onClick={() => setManual(true)}>?</button>
    {open && <TutorialDialog onClose={close} />}
  </>
}
