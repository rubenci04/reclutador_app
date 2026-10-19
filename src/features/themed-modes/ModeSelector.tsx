import { useTranslation } from 'react-i18next'
import { modeSource, PLAYABLE_MODES } from './modeCatalog'
import { THEMED_MODES } from './modes'
import { evaluateMode } from './filterEngine'
import type { ThemedModeId } from './modeTypes'
import { IMPORTED_MODE_IDS, defaultBudgetForMode } from '../player-catalog/leagueCollections'
import { preflightMatchConfig, CLASSIC_CONFIG } from '../recruiter-duel/matchConfig'

interface ModeSelectorProps { readonly selected: ThemedModeId; readonly onChange: (mode: ThemedModeId) => void }

export function ModeSelector({ selected, onChange }: ModeSelectorProps) {
  const { t } = useTranslation()
  const card = (mode: (typeof THEMED_MODES)[number]) => {
    const source = modeSource(mode.id)
    // These collections are explicitly supplied by the user; their scope is editorial,
    // not a claim of independently verified career metadata.
    const imported = IMPORTED_MODE_IDS.includes(mode.id)
    const viable = imported && preflightMatchConfig(source.players, { ...CLASSIC_CONFIG, budget: defaultBudgetForMode(mode.id), coaches: true, coachReserve: 8 }).ok
    const diagnostic = imported ? { eligibleCount: source.players.length, availability: viable ? 'available' : 'over_budget', reason: viable ? 'ready' : 'budget' } : evaluateMode(source.players, mode, source.metadata, source.allowedIds).diagnostic
    const playable = PLAYABLE_MODES.has(mode.id)
    const enabled = playable && diagnostic.availability === 'available'
    const state = enabled ? t('modes.available') : playable ? t(`modes.status.${diagnostic.reason}`) : t('modes.status.foundation')
    return <button key={mode.id} className={selected === mode.id ? 'is-selected' : ''} disabled={!enabled} onClick={() => onChange(mode.id)}><strong>{t(`modes.items.${mode.translationKey}.name`)}</strong><span>{t(`modes.items.${mode.translationKey}.description`)}</span><small>{diagnostic.eligibleCount} · {state}</small></button>
  }
  const upcoming = THEMED_MODES.filter((mode) => !PLAYABLE_MODES.has(mode.id))
  return <section className="mode-selector" aria-labelledby="mode-title"><div><p className="eyebrow"><span />{t('modes.label')}</p><h2 id="mode-title">{t('modes.title')}</h2></div><p className="market-hint">{t('collections.notice')}</p><div className="mode-list">{THEMED_MODES.filter((mode) => PLAYABLE_MODES.has(mode.id)).map(card)}</div>
    {upcoming.length > 0 && <details className="mode-upcoming"><summary>{t('modes.upcoming')} ({upcoming.length})</summary><div className="mode-list">{upcoming.map(card)}</div></details>}</section>
}
