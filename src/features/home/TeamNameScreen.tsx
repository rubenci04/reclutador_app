import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '../../components/LanguageSelector'
import { PRODUCT } from '../../config/product'
import { validateTeamName, type TeamNameError } from './teamName'
export function TeamNameScreen({ initialName, warning, onSave, onCancel }: { readonly initialName: string | null; readonly warning: boolean; readonly onSave: (name: string) => void; readonly onCancel?: () => void }) {
  const { t } = useTranslation(), [value, setValue] = useState(initialName ?? ''), [error, setError] = useState<TeamNameError | null>(null), heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  return <div className="draft-app"><header className="draft-header"><b className="brand">{PRODUCT.name}</b><LanguageSelector /></header>
    <main className="team-name-screen"><form className="match-card" onSubmit={(event) => { event.preventDefault(); const result = validateTeamName(value); setError(result.error); if (result.name) onSave(result.name) }}>
      <p className="eyebrow">{PRODUCT.name}</p><h1 ref={heading} tabIndex={-1}>{t('teamName.question')}</h1>
      <label htmlFor="local-team-name">{t('teamName.label')}</label><input id="local-team-name" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="organization" aria-invalid={error !== null} aria-describedby={error ? 'team-name-error' : undefined} />
      {error && <p id="team-name-error" role="alert">{t(`teamName.errors.${error}`)}</p>}
      {warning && <p role="status">{t('teamName.storageWarning')}</p>}
      <button className="primary-action" type="submit">{t('teamName.continue')}</button>
      {onCancel && <button className="secondary-action" type="button" onClick={onCancel}>{t('teamName.cancel')}</button>}
    </form></main>
  </div>
}
