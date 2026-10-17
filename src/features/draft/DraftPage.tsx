import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '../../components/LanguageSelector'
import { DRAFT_BUDGET_MILLIONS } from '../../data/catalogRules'
import { getPlayerTier } from '../player-catalog/getPlayerTier'
import { DRAFT_CATALOG } from './catalog'
import { DraftPitch } from './DraftPitch'
import { summarizeDraft } from './draftModel'
import { PlayerSelector } from './PlayerSelector'
import { useDraftStore } from './draftState'
import { DRAFT_SLOTS, type DraftSlotId } from './draftTypes'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { MatchScreen } from '../local-match/MatchScreen'
import { MATCH_RULES_VERSION, type MatchResult } from '../local-match/matchTypes'
import { simulateMatch } from '../local-match/simulator'

function money(value: number) { return `${value}M` }

export function DraftPage() {
  const { t } = useTranslation()
  const lineup = useDraftStore((state) => state.lineup)
  const confirmed = useDraftStore((state) => state.confirmed)
  const message = useDraftStore((state) => state.message)
  const restoreIssue = useDraftStore((state) => state.restoreIssue)
  const selectPlayer = useDraftStore((state) => state.selectPlayer)
  const removePlayer = useDraftStore((state) => state.removePlayer)
  const reset = useDraftStore((state) => state.reset)
  const confirm = useDraftStore((state) => state.confirm)
  const edit = useDraftStore((state) => state.edit)
  const clearMessage = useDraftStore((state) => state.clearMessage)
  const clearRestoreIssue = useDraftStore((state) => state.clearRestoreIssue)
  const [selectedSlot, setSelectedSlot] = useState<DraftSlotId | null>(null)
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [matchRun, setMatchRun] = useState(0)
  const summary = summarizeDraft(lineup, DRAFT_CATALOG)
  const slot = DRAFT_SLOTS.find((item) => item.id === selectedSlot)
  const firstOpenSlot = DRAFT_SLOTS.find((item) => !lineup[item.id])?.id ?? 'GK'
  const tierCount = (tier: string) => summary.selectedPlayers.filter((player) => getPlayerTier(player.overall_rating) === tier).length
  const startCpuMatch = () => {
    if (!summary.canConfirm) return
    const nextRun = matchRun + 1
    const seed = `local-match-${nextRun}-${DRAFT_SLOTS.map((item) => lineup[item.id]).join('-')}`
    const cpu = generateCpuTeam(DRAFT_CATALOG, seed)
    setMatchRun(nextRun)
    setMatchResult(simulateMatch({ localLineup: lineup, cpuLineup: cpu.team.lineup, catalog: DRAFT_CATALOG, catalogVersion: 'catalog_v1', rulesVersion: MATCH_RULES_VERSION, seed }))
  }
  if (matchResult) return <div className="draft-app"><header className="draft-header"><a className="brand" href="#draft-main" aria-label="Draft Legends"><span className="brand-emblem">DL</span><span>Draft<span className="brand-light">Legends</span><span className="brand-dot">.</span></span></a><LanguageSelector /></header><MatchScreen key={matchResult.seed} result={matchResult} onRematch={startCpuMatch} onReturn={() => setMatchResult(null)} /></div>
  return <div className="draft-app">
    <a href="#draft-main" className="skip-link">{t('home.skip')}</a>
    <header className="draft-header"><a className="brand" href="#draft-main" aria-label="Draft Legends"><span className="brand-emblem">DL</span><span>Draft<span className="brand-light">Legends</span><span className="brand-dot">.</span></span></a><LanguageSelector /></header>
    <main id="draft-main">
      <section className="draft-hero"><div><p className="eyebrow"><span />{t('draft.edition')}</p><h1>{t('draft.title')}</h1><p>{t('draft.subtitle')}</p></div><button className="catalog-open" onClick={() => setSelectedSlot(firstOpenSlot)}>{t('draft.catalog')} <span>↗</span></button></section>
      {restoreIssue && <div className="draft-alert" role="alert">{t('draft.messages.invalidDraft')}<button onClick={clearRestoreIssue}>×</button></div>}
      {message && <div className="draft-alert" role="alert">{t(`draft.messages.${message}`)}<button onClick={clearMessage}>×</button></div>}
      <section className="draft-workspace" aria-label={t('game.myTeam')}>
        <aside className="draft-summary"><p className="eyebrow"><span />{t('draft.formation')}</p><h2>{t('game.myTeam')}</h2><div className="budget-amount"><small>{t('game.budget')}</small><strong>{money(DRAFT_BUDGET_MILLIONS)}</strong></div><dl className="summary-stats"><div><dt>{t('draft.selected')}</dt><dd>{summary.selectedCount}/11</dd></div><div><dt>{t('draft.spent')}</dt><dd>{money(summary.spent)}</dd></div><div><dt>{t('draft.remaining')}</dt><dd>{money(summary.remaining)}</dd></div><div><dt>{t('draft.minimumToFinish')}</dt><dd>{summary.minimumCompletionCost === null ? '—' : money(summary.minimumCompletionCost)}</dd></div></dl><p className={`viability ${summary.canCompleteWithinBudget ? 'is-good' : ''}`}>{summary.canCompleteWithinBudget ? t('draft.viability') : t('draft.messages.impossibleBudget')}</p><div className="draft-actions"><button className="primary-action" disabled={!summary.canConfirm} title={!summary.canConfirm ? t('draft.confirmDisabled') : undefined} onClick={confirm}>{t('draft.confirm')}</button><button className="secondary-action" onClick={reset}>{t('draft.reset')}</button></div></aside>
        <div className="pitch-area"><div className="pitch-heading"><span>{t('game.myTeam')}</span><span>{t('draft.formation')}</span></div><DraftPitch lineup={lineup} onChoose={setSelectedSlot} onRemove={removePlayer} /></div>
      </section>
      {confirmed && <section className="confirmation-card" aria-live="polite"><div><p className="eyebrow"><span />{t('draft.confirmTitle')}</p><h2>{summary.selectedPlayers.map((player) => player.name).join(' · ')}</h2><p>{t('draft.average')}: <b>{summary.averageRating}</b> · {t('draft.tiers')}: S {tierCount('S')} / A {tierCount('A')} / B {tierCount('B')} / C {tierCount('C')} / D {tierCount('D')}</p></div><div className="confirmation-actions"><button className="primary-action" onClick={startCpuMatch}>{t('match.playCpu')}</button><button className="secondary-action" onClick={edit}>{t('draft.edit')}</button></div></section>}
    </main>
    <footer className="draft-footer">{t('home.footer')}<span>PLAYTEST_150</span></footer>
    {slot && <PlayerSelector slot={slot} lineup={lineup} onClose={() => setSelectedSlot(null)} onSign={(playerId) => { selectPlayer(slot.id, playerId); if (!useDraftStore.getState().message) setSelectedSlot(null) }} />}
  </div>
}
