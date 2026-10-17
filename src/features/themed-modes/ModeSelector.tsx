import { useTranslation } from 'react-i18next'
import { DRAFT_CATALOG } from '../draft/catalog'
import { EMPTY_METADATA } from './metadata'
import { THEMED_MODES } from './modes'
import { evaluateMode } from './filterEngine'
import type { ThemedModeId } from './modeTypes'

interface ModeSelectorProps { readonly selected: ThemedModeId; readonly onChange: (mode: ThemedModeId) => void }

export function ModeSelector({ selected, onChange }: ModeSelectorProps) {
  const { t } = useTranslation()
  return <section className="mode-selector" aria-labelledby="mode-title"><div><p className="eyebrow"><span />{t('modes.label')}</p><h2 id="mode-title">{t('modes.title')}</h2></div><div className="mode-list">{THEMED_MODES.map((mode) => {
    const diagnostic = evaluateMode(DRAFT_CATALOG, mode, EMPTY_METADATA).diagnostic
    const enabled = mode.id === 'GLOBAL_CLASSIC' && diagnostic.availability === 'available'
    const state = enabled ? t('modes.available') : mode.id === 'GLOBAL_CLASSIC' ? t(`modes.status.${diagnostic.reason}`) : t('modes.status.foundation')
    return <button key={mode.id} className={selected === mode.id ? 'is-selected' : ''} disabled={!enabled} onClick={() => onChange(mode.id)}><strong>{t(`modes.items.${mode.translationKey}.name`)}</strong><span>{t(`modes.items.${mode.translationKey}.description`)}</span><small>{diagnostic.eligibleCount} · {state}</small></button>
  })}</div></section>
}
