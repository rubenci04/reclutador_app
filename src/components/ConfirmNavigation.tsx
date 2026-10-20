import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  readonly label: string
  readonly message: string
  readonly onConfirm: () => void
  readonly disabled?: boolean
  readonly onOpenChange?: (open: boolean) => void
}

/** Explicit exit, with Escape/cancel and predictable focus; never performs a game decision. */
export function ConfirmNavigation({ label, message, onConfirm, disabled, onOpenChange }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const committed = useRef(false)
  const title = useId(); const body = useId()
  useEffect(() => {
    if (!open || !dialog.current) return
    if (dialog.current.showModal) dialog.current.showModal()
    else dialog.current.setAttribute('open', '')
    cancel.current?.focus()
  }, [open])
  const close = () => { setOpen(false); onOpenChange?.(false); trigger.current?.focus() }
  return <>
    <button ref={trigger} className="secondary-action" disabled={disabled} onClick={() => { committed.current = false; setOpen(true); onOpenChange?.(true) }}>{label}</button>
    {open && <dialog ref={dialog} className="guide-dialog navigation-dialog" aria-labelledby={title} aria-describedby={body} onCancel={(event) => { event.preventDefault(); close() }} onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); close() }
      if (event.key === 'Tab') {
        const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('button')
        if (!buttons?.length) return
        const target = event.shiftKey ? buttons[0] : buttons[buttons.length - 1]
        if (document.activeElement === target) { event.preventDefault(); (event.shiftKey ? buttons[buttons.length - 1] : buttons[0]).focus() }
      }
    }}>
      <h2 id={title}>{t('navigation.confirmTitle')}</h2><p id={body}>{message}</p>
      <div className="duel-actions"><button ref={cancel} className="secondary-action" onClick={close}>{t('navigation.cancel')}</button><button className="primary-action" onClick={() => { if (committed.current) return; committed.current = true; close(); onConfirm() }}>{label}</button></div>
    </dialog>}
  </>
}
