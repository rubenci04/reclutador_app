import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { helpStore, useHelpPrefs } from './helpStore'
import { TUTORIAL_KEYS, TUTORIAL_STEPS } from './helpTopics'

interface Props { readonly onClose: () => void }

/** First-visit guide. Closing it by any route (finish, skip, Esc) marks it as seen. */
export function TutorialDialog({ onClose }: Props) {
  const { t } = useTranslation()
  const prefs = useHelpPrefs()
  const [index, setIndex] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const step = TUTORIAL_STEPS[index]
  const last = index === TUTORIAL_STEPS.length - 1

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    return () => previous?.focus?.()
  }, [])
  useEffect(() => { heading.current?.focus() }, [index])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.stopPropagation(); onClose(); return }
    if (event.key !== 'Tab' || !root.current) return
    const items = Array.from(root.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'))
    if (!items.length) return
    const first = items[0]; const end = items[items.length - 1]
    if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { event.preventDefault(); end.focus() }
    else if (!event.shiftKey && document.activeElement === end) { event.preventDefault(); first.focus() }
  }

  return <div className="tutorial-backdrop" onKeyDown={onKeyDown}>
    <div className="tutorial-dialog" role="dialog" aria-modal="true" aria-labelledby="tutorial-title" ref={root}>
      <p className="eyebrow"><span />{t('tutorial.progress', { current: index + 1, total: TUTORIAL_STEPS.length })}</p>
      <h2 id="tutorial-title" tabIndex={-1} ref={heading}>{t(`tutorial.steps.${step}.title`)}</h2>
      <p className="tutorial-body">{t(`tutorial.steps.${step}.body`)}</p>
      {step === 'keys' && <ul className="tutorial-keys">{TUTORIAL_KEYS.map((key) => <li key={key}>{t(`tutorial.keys.${key}`)}</li>)}</ul>}
      {last && <label className="tutorial-hints"><input type="checkbox" checked={prefs.hints} onChange={(event) => helpStore.setHints(event.target.checked)} /> {t('tutorial.showHints')}</label>}
      <div className="duel-actions">
        {index > 0 && <button className="secondary-action" onClick={() => setIndex(index - 1)}>{t('tutorial.previous')}</button>}
        {!last && <button className="primary-action" onClick={() => setIndex(index + 1)}>{t('tutorial.next')}</button>}
        {last && <button className="primary-action" onClick={onClose}>{t('tutorial.finish')}</button>}
        {!last && <button className="secondary-action" onClick={onClose}>{t('tutorial.skip')}</button>}
      </div>
    </div>
  </div>
}
