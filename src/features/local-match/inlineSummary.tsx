import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import type { MatchResult, MatchSide } from './matchTypes'
import { resultAdvantages } from './resultAdvantages'
import { TacticalSummary } from './TacticalSummary'
import { playerName } from './simulator'

export type SummaryRow = { readonly key: string; readonly label: string; readonly local: string; readonly cpu: string; readonly lead?: MatchSide | null }
const ADVANTAGE_KEYS = ['power', 'attack', 'midfield', 'defense', 'stars', 'coach', 'possession', 'shots'] as const

/** Side-by-side comparison, a plain-language reading of what favoured each team and the decisive moments; the long detail is collapsed. */
export function InlineSummary({ result, name, catalog, rows, ranks, detail }: { readonly result: MatchResult; readonly name: (side: MatchSide) => string; readonly catalog: readonly Player[]; readonly rows: readonly SummaryRow[]; readonly ranks: (side: MatchSide) => readonly { tier: string; count: number }[]; readonly detail: string }) {
  const { t } = useTranslation()
  const strengths = result.effectiveStrengths ?? result.strengths
  const advantages = resultAdvantages(result)
  const label = (key: 'attack' | 'midfield' | 'defense') => t(`resultSummary.sector.${key}`)
  const sector = (side: MatchSide) => `${label('attack')} ${strengths[side].attack.toFixed(1)} · ${label('midfield')} ${strengths[side].midfield.toFixed(1)} · ${label('defense')} ${strengths[side].defense.toFixed(1)}`
  const coachBonus = (side: MatchSide) => { const c = result.coaches?.[side]; return c ? `${label('attack')} +${c.attack.toFixed(1)} · ${label('midfield')} +${c.midfield.toFixed(1)} · ${label('defense')} +${c.defense.toFixed(1)}` : '—' }
  const statLine = (side: MatchSide) => t('resultSummary.statLine', { shots: result.stats[side].shots, on: result.stats[side].shotsOnTarget, saves: result.stats[side].saves, possession: result.stats[side].possession })
  const goals = result.blocks.flatMap((block) => block.events).filter((event) => event.type === 'goal' && event.side)
  const table: readonly SummaryRow[] = [
    rows[0], { key: 'sectors', label: t('resultSummary.sectors'), local: sector('local'), cpu: sector('cpu') },
    rows[1], { key: 'coachBonus', label: t('resultSummary.coachBonus'), local: coachBonus('local'), cpu: coachBonus('cpu') }, ...rows.slice(2),
    { key: 'stats', label: t('resultSummary.stats'), local: statLine('local'), cpu: statLine('cpu') },
  ]
  const winner = result.winner === 'draw' ? null : result.winner
  return <section className="result-inline" aria-label={t('resultSummary.label')}>
    <h3>{t('resultSummary.title', { score: `${result.score.local}–${result.score.cpu}`, name: winner ? name(winner) : t('match.draw') })}</h3>
    <div className="result-grid" role="table" aria-label={t('resultCard.compare')}>
      <div className="result-head" role="row"><span role="columnheader" /><strong role="columnheader" className="side-local">{name('local')}</strong><strong role="columnheader" className="side-cpu">{name('cpu')}</strong></div>
      {table.map((row) => <div key={row.key} className="result-row" role="row"><span role="rowheader" className="result-label">{row.label}</span>
        <span role="cell" className={`result-cell side-local${row.lead === 'local' ? ' is-lead' : ''}`}>{row.local}</span><span role="cell" className={`result-cell side-cpu${row.lead === 'cpu' ? ' is-lead' : ''}`}>{row.cpu}</span></div>)}
      <div className="result-row" role="row"><span role="rowheader" className="result-label">{t('resultCard.ranks')}</span>{(['local', 'cpu'] as const).map((side) => <span key={side} role="cell" className={`result-cell result-ranks side-${side}`}>{ranks(side).map((entry) => <b key={entry.tier} className={`rank-chip rank-${entry.tier.replace('+', 'plus')}`}>{entry.tier} {entry.count}</b>)}</span>)}</div>
    </div>
    <div className="result-advantages">{(['local', 'cpu'] as const).map((side) => <p key={side}><strong>{name(side)}:</strong> {advantages[side].length ? ADVANTAGE_KEYS.filter((key) => advantages[side].includes(key)).map((key) => t(`resultSummary.adv.${key}`)).join(' · ') : t('resultSummary.adv.none')}</p>)}</div>
    <div className="result-moments"><strong>{t('resultSummary.moments')}</strong>{goals.length ? <ul>{goals.map((event, index) => <li key={index}>{event.minute}′ · {name(event.side!)} · {playerName(event, catalog) ?? t('resultSummary.goal')}</li>)}</ul> : <p>{t('resultSummary.noGoals')}</p>}</div>
    <p className="result-short">{t('resultSummary.caveat')}</p>
    <details className="result-detail"><summary>{t('resultCard.detail')}</summary><p>{detail}</p><TacticalSummary result={result} teamName={(id) => id ? name(id) : ''} /></details>
  </section>
}
