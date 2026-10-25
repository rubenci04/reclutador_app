import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ModeBackdrop, VariantIcon } from './ModeEmblem'
import { MODE_VISUALS, groupVisual } from './modeVisuals'
import { useTranslation } from 'react-i18next'
import { modeSource, PLAYABLE_MODES } from './modeCatalog'
import { THEMED_MODES } from './modes'
import { evaluateMode } from './filterEngine'
import type { ThemedModeId } from './modeTypes'
import { IMPORTED_MODE_IDS, defaultBudgetForMode } from '../player-catalog/leagueCollections'
import { preflightMatchConfig, CLASSIC_CONFIG } from '../recruiter-duel/matchConfig'
import { CATEGORY_GROUPS, type CategoryGroupId } from './categoryTree'
import { REGIONAL_MODE_IDS } from './regionalCatalog'
import { useEditionNames } from '../recruiter-duel/editionNames'

interface ModeSelectorProps { readonly selected: ThemedModeId; readonly onChange: (mode: ThemedModeId) => void }

export function ModeSelector({ selected, onChange }: ModeSelectorProps) {
  const { t } = useTranslation()
  const [openGroup, setOpenGroup] = useState<CategoryGroupId | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const previousGroup = useRef(openGroup)
  useEffect(() => {
    if (previousGroup.current !== openGroup) heading.current?.focus()
    previousGroup.current = openGroup
  }, [openGroup])
  const group = CATEGORY_GROUPS.find((item) => item.id === openGroup)
  // Every choice made by the person (not a change of the parent) is announced and brings the edition title into view.
  const [choices, setChoices] = useState(0)
  const edition = useEditionNames(selected)
  useEffect(() => {
    if (choices === 0) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    document.getElementById('edition-hero')?.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }, [choices])
  const choose = (id: ThemedModeId) => { onChange(id); setChoices((count) => count + 1) }
  /** Tapping a category selects it at once: the edition you are already on, otherwise Current (or the first one available). */
  const openCategory = (item: (typeof CATEGORY_GROUPS)[number]) => {
    setOpenGroup(item.id)
    const modes = item.modes as readonly ThemedModeId[]
    const target = modes.includes(selected) ? selected : modes.find(enabledOf)
    if (target) choose(target)
  }
  const statusOf = (id: ThemedModeId) => {
    const mode = THEMED_MODES.find((item) => item.id === id)!
    const source = modeSource(mode.id)
    // These collections are explicitly supplied by the user; their scope is editorial,
    // not a claim of independently verified career metadata.
    const imported = mode.id === 'GLOBAL_CLASSIC' || IMPORTED_MODE_IDS.includes(mode.id) || REGIONAL_MODE_IDS.includes(mode.id)
    const viable = imported && preflightMatchConfig(source.players, { ...CLASSIC_CONFIG, budget: defaultBudgetForMode(mode.id), coaches: true, coachReserve: 8 }).ok
    const diagnostic = imported ? { eligibleCount: source.players.length, availability: viable ? 'available' : 'over_budget', reason: viable ? 'ready' : 'budget' } : evaluateMode(source.players, mode, source.metadata, source.allowedIds).diagnostic
    const playable = PLAYABLE_MODES.has(mode.id)
    const enabled = playable && diagnostic.availability === 'available'
    return { mode, playable, enabled, diagnostic }
  }
  const enabledOf = (id: ThemedModeId) => statusOf(id).enabled
  const card = (id: ThemedModeId) => {
    const { mode, playable, enabled, diagnostic } = statusOf(id)
    const state = enabled ? t('modes.available') : playable ? t(`modes.status.${diagnostic.reason}`) : t('modes.status.foundation')
    const visual = MODE_VISUALS[mode.id]
    return <button key={mode.id} className={`mode-card ${selected === mode.id ? 'is-selected' : ''}`} style={{ '--mode-accent': visual.accent } as CSSProperties} aria-pressed={selected === mode.id} disabled={!enabled} onClick={() => choose(mode.id)}><VariantIcon legend={visual.legend} /><strong>{t(`categoryTree.options.${id}`)}</strong><small className={`mode-state ${enabled ? 'is-ready' : 'is-pending'}`}>{diagnostic.eligibleCount} · {state} · {defaultBudgetForMode(id)}M</small></button>
  }
  return <section className="mode-selector" aria-labelledby="mode-title">
    <p className="sr-only" role="status" aria-live="polite">{choices > 0 ? t('categoryTree.selectedAnnounce', { name: [edition.title, edition.edition].filter(Boolean).join(' · ') }) : ''}</p>
    <div><p className="eyebrow"><span />{t('modes.label')}</p><h2 id="mode-title" ref={heading} tabIndex={-1}>{group ? t(`categoryTree.groups.${group.id}`) : t('categoryTree.title')}</h2></div>
    <details className="collection-help"><summary>{t('entry.collectionHelp')}</summary><p>{t('playtest.poolHelp')}</p></details>
    {group ? <>
      <button className="secondary-action category-back" onClick={() => setOpenGroup(null)}>{t('categoryTree.back')}</button>
      <p className="market-hint">{t(group.id === 'europe' || group.id === 'latinAmerica' ? 'categoryTree.nationalityHelp' : 'categoryTree.editionHelp')}</p>
      {group.modes.map((id) => <section key={id} className="variant-section"><h3><VariantIcon legend={MODE_VISUALS[id].legend} /> {t(MODE_VISUALS[id].legend ? 'categoryTree.legendsTitle' : 'categoryTree.currentTitle')}</h3><div className="mode-list">{card(id)}</div></section>)}
    </> : <>
      <p className="market-hint">{t('categoryTree.help')}</p>
      <div className="mode-list category-groups">{CATEGORY_GROUPS.map((item) => <button key={item.id} className={`mode-card ${(item.modes as readonly ThemedModeId[]).includes(selected) ? 'is-selected' : ''}`} style={{ '--mode-accent': groupVisual(item.id).accent } as CSSProperties} onClick={() => openCategory(item)}>
        <ModeBackdrop visual={groupVisual(item.id)} /><strong>{t(`categoryTree.groups.${item.id}`)}</strong><span>{t('categoryTree.open')}</span>
      </button>)}</div>
    </>}
  </section>
}
