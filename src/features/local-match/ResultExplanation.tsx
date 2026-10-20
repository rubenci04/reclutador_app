import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MatchResult, MatchSide } from './matchTypes'
import { coachById } from '../coaches/coachCatalog'
import { SQUAD_TIERS } from './squadQuality'
import { probabilityExplanation } from './probabilityExplanation'

/** Describes applied inputs as a short side-by-side card; never claims a causal proof for a stochastic result. The long detail stays one tap away. */
export function ResultExplanation({ result, name, note = '' }: { readonly result: MatchResult; readonly name: (side: MatchSide) => string; readonly note?: string }) {
  const { t } = useTranslation(); const [closed, setClosed] = useState(false)
  const ref = useRef<HTMLDialogElement>(null); const titleId = useId()
  const reopen = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (closed) { reopen.current?.focus(); return } const dialog = ref.current; if (dialog && !dialog.open) { if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', '') } }, [closed])
  const strengths = result.effectiveStrengths ?? result.strengths
  const winner = result.winner === 'draw' ? null : result.winner
  const label = winner ? name(winner) : t('match.draw')
  const coachName = (side: MatchSide) => { const coach = coachById(result.coaches?.[side]?.id); return coach ? `${coach.name} ${coach.surname}` : t('playtest.none') }
  const strategy = (side: MatchSide) => t(`tactics.strategies.${result.tactics?.selection[side] ?? 'NEUTRAL'}.name`)
  const ranks = (side: MatchSide) => SQUAD_TIERS.map((tier) => ({ tier, count: result.quality?.initial[side].counts[tier] ?? 0 })).filter((entry) => entry.count > 0)
  const adjustments = (side: MatchSide) => { const a = result.tactics?.adjustments[side]; return a ? `${a.attack} / ${a.defense} / ${a.midfield}` : '0 / 0 / 0' }
  const detail = t('playtest.adjustments', { local: adjustments('local'), cpu: adjustments('cpu') }) + (result.actionModel === 'action-v3' ? '\n\n' + t('playtest.probabilities', probabilityExplanation(result)) : '')
  const rows: readonly { readonly key: string; readonly label: string; readonly local: string; readonly cpu: string; readonly lead?: MatchSide | null }[] = [
    { key: 'power', label: t('resultCard.power'), local: strengths.local.global.toFixed(1), cpu: strengths.cpu.global.toFixed(1), lead: strengths.local.global === strengths.cpu.global ? null : strengths.local.global > strengths.cpu.global ? 'local' : 'cpu' },
    { key: 'coach', label: t('resultCard.coach'), local: coachName('local'), cpu: coachName('cpu') },
    { key: 'formation', label: t('resultCard.formation'), local: result.formations?.local ?? '4-3-3', cpu: result.formations?.cpu ?? '4-3-3' },
    { key: 'tactic', label: t('resultCard.tactic'), local: strategy('local'), cpu: strategy('cpu') },
  ]
  if (closed) return <button ref={reopen} className="secondary-action" onClick={() => setClosed(false)}>{t('playtest.why')}</button>
  return <dialog ref={ref} className="guide-dialog result-dialog" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); setClosed(true) }}>
    <h2 id={titleId}>{t('playtest.resultTitle', { name: label })}</h2>
    <div className="result-grid" role="table" aria-label={t('resultCard.compare')}>
      <div className="result-head" role="row"><span role="columnheader" /><strong role="columnheader" className="side-local">{name('local')}</strong><strong role="columnheader" className="side-cpu">{name('cpu')}</strong></div>
      {rows.map((row) => <div key={row.key} className="result-row" role="row">
        <span role="rowheader" className="result-label">{row.label}</span>
        <span role="cell" className={`result-cell side-local${row.lead === 'local' ? ' is-lead' : ''}`}>{row.local}</span>
        <span role="cell" className={`result-cell side-cpu${row.lead === 'cpu' ? ' is-lead' : ''}`}>{row.cpu}</span>
      </div>)}
      <div className="result-row" role="row">
        <span role="rowheader" className="result-label">{t('resultCard.ranks')}</span>
        {(['local', 'cpu'] as const).map((side) => <span key={side} role="cell" className={`result-cell result-ranks side-${side}`}>{ranks(side).map((entry) => <b key={entry.tier} className={`rank-chip rank-${entry.tier.replace('+', 'plus')}`}>{entry.tier} {entry.count}</b>)}</span>)}
      </div>
    </div>
    <p className="result-short">{t('resultCard.short')}</p>
    <details className="result-detail"><summary>{t('resultCard.detail')}</summary><p>{detail}</p></details>
    {note && <p className="result-note">{note}</p>}
    <button autoFocus className="primary-action" onClick={() => setClosed(true)}>{t('playtest.understood')}</button>
  </dialog>
}
