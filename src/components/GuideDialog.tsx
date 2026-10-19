import { useEffect, useRef, useId } from 'react'
import { useTranslation } from 'react-i18next'

/** Mandatory acknowledgement for a new stage. Native dialog provides focus containment. */
export function GuideDialog({ title, body, onClose }: { readonly title: string; readonly body: string; readonly onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null); const { t } = useTranslation()
  const titleId = useId()
  useEffect(() => { const dialog = ref.current; if (dialog && !dialog.open) { if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '') } }, [])
  return <dialog ref={ref} className="guide-dialog" aria-labelledby={titleId} onCancel={(e) => e.preventDefault()}>
    <span className="guide-ball" aria-hidden="true">⚽</span><h2 id={titleId}>{title}</h2><p>{body}</p>
    <button autoFocus className="primary-action" onClick={onClose}>{t('playtest.understood')}</button>
  </dialog>
}
