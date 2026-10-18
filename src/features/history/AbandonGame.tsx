import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  readonly versusCpu: boolean
  readonly names: { readonly recruiter_one: string; readonly recruiter_two: string }
  /** Receives who gives up; that side loses the duel. */
  readonly onAbandon: (participant: 'recruiter_one' | 'recruiter_two') => void
}

/** Two steps on purpose: giving up counts as a defeat and cannot be undone. */
export function AbandonGame({ versusCpu, names, onAbandon }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  if (!open) return <button className="secondary-action abandon-open" onClick={() => setOpen(true)}>{t('abandon.open')}</button>
  return <section className="abandon-panel" role="alertdialog" aria-labelledby="abandon-title">
    <h2 id="abandon-title">{t('abandon.title')}</h2>
    <p>{t(versusCpu ? 'abandon.warningCpu' : 'abandon.warningPerson')}</p>
    <div className="duel-actions">
      {versusCpu
        ? <button className="primary-action" onClick={() => onAbandon('recruiter_one')}>{t('abandon.confirm')}</button>
        : (['recruiter_one', 'recruiter_two'] as const).map((who) => <button key={who} className="primary-action" onClick={() => onAbandon(who)}>{t('abandon.confirmBy', { name: names[who] })}</button>)}
      <button className="secondary-action" onClick={() => setOpen(false)}>{t('abandon.cancel')}</button>
    </div>
  </section>
}
