import { useTranslation } from 'react-i18next'
import { ConfirmNavigation } from '../../components/ConfirmNavigation'
import type { Player } from '../../types/player'
import { PlayerIdentity } from './PlayerIdentity'
import { rankBadge } from '../player-catalog/categoryRanking'
import { PowerBadge } from './PowerBadge'
import type { RecruiterId } from './auctionTypes'
import { canDiscard, currentCard, DUAL_SIDES, dualComplete, isSideComplete, sideBudgetLeft, sideCounts, type DualDraft, type DualEvent } from './dualDraft'

interface Props {
  readonly draft: DualDraft
  readonly catalog: readonly Player[]
  readonly names: Readonly<Record<RecruiterId, string>>
  readonly categoryLabel: (mode: string) => string
  /** Sides driven by a person; the other one is the computer. */
  readonly humans: readonly RecruiterId[]
  readonly onSign: (side: RecruiterId) => void
  readonly onDiscard: (side: RecruiterId) => void
  readonly onContinue: () => void
  readonly onAbandon: () => void
}

const POSITIONS = ['ARQ', 'DEF', 'MED', 'DEL'] as const
const CAPACITY = { ARQ: 1, DEF: 4, MED: 3, DEL: 3 } as const

/** Two independent live draws on one screen: one for each recruiter (or the computer), each with its own cards, discards and budget. */
export function DualDraftScreen({ draft, catalog, names, categoryLabel, humans, onSign, onDiscard, onContinue, onAbandon }: Props) {
  const { t } = useTranslation()
  const player = (id: string) => catalog.find((candidate) => candidate.id === id)
  const eventText = (side: RecruiterId, event: DualEvent) => {
    const name = player(event.playerId)?.name ?? ''
    if (event.kind === 'sign') return t('dual.signed', { name: names[side], player: name, price: event.price })
    if (event.kind === 'discard') return t('dual.discarded', { name: names[side], player: name })
    return t('dual.skipped', { player: name, reason: t(`dual.reason.${event.reason}`) })
  }
  return <section className="dual-draft" aria-label={t('dual.title')}>
    <header className="dual-heading"><div><p className="eyebrow"><span />{t('dual.title')}</p><h1>{t('dual.subtitle')}</h1></div><ConfirmNavigation label={t('navigation.home')} message={t('navigation.recruitmentExitWarning')} onConfirm={onAbandon} /></header>
    <div className="dual-columns">{DUAL_SIDES.map((id) => {
      const side = draft.sides[id]; const card = currentCard(draft, id, catalog); const human = humans.includes(id)
      const complete = isSideComplete(side)
      const signed = side.signed.map((entry) => player(entry.playerId)).filter((candidate): candidate is Player => Boolean(candidate))
      const counts = sideCounts(draft, id, catalog)
      const strength = signed.length ? { kind: 'average' as const, value: signed.reduce((sum, candidate) => sum + candidate.overall_rating, 0) / signed.length, count: signed.length } : { kind: 'none' as const, value: 0, count: 0 }
      const allowDiscard = canDiscard(draft, id, catalog)
      return <article key={id} className={`dual-column dual-${id}`} aria-label={names[id]}>
        <h2>{names[id]}</h2>
        <p className="dual-category">{categoryLabel(side.category)}</p>
        <PowerBadge strength={strength} />
        <p className="dual-stats"><b>{t('dual.left', { amount: sideBudgetLeft(draft, id) })}</b><span>{t('dual.progress', { count: signed.length })}</span>
          <span className="hud-discards" aria-label={t('hud.discards', { count: side.discards, total: 3 })}>{[0, 1, 2].map((index) => <i key={index} className={index < side.discards ? 'on' : undefined} aria-hidden="true" />)}<span>{t('hud.discards', { count: side.discards, total: 3 })}</span></span></p>
        <ul className="dual-positions" aria-label={t('dual.positions')}>{POSITIONS.map((position) => <li key={position} className={`pos-${position}${counts[position] === CAPACITY[position] ? ' is-full' : ''}`}>{position} {counts[position]}/{CAPACITY[position]}</li>)}</ul>
        {complete ? <p className="dual-complete" role="status">{t('dual.complete')}</p>
          : card && <div className="dual-card" key={card.id}><PlayerIdentity player={card} rank={rankBadge(side.category, card.id)} />
            {human ? <div className="duel-actions">
              <button className="primary-action" onClick={() => onSign(id)}>{t('dual.sign', { price: card.price })}</button>
              <button className="secondary-action" disabled={!allowDiscard} onClick={() => onDiscard(id)}>{t('dual.discard', { count: side.discards })}</button>
              {!allowDiscard && <p className="market-hint">{t('dual.forced')}</p>}
            </div> : <p className="dual-thinking" role="status">{t('dual.thinking', { name: names[id] })}</p>}
          </div>}
        {side.events.length > 0 && <ul className="dual-events" aria-live="polite">{side.events.slice(-3).map((event, index) => <li key={`${side.cursor}-${index}`} className={`dual-event-${event.kind}`}>{eventText(id, event)}</li>)}</ul>}
        {signed.length > 0 && <ul className="dual-signed" aria-label={t('dual.signedList')}>{signed.map((candidate) => <li key={candidate.id} className={`pos-${candidate.position}`}><span className="pos-pill">{candidate.position}</span> {candidate.name} <b>{candidate.overall_rating}</b></li>)}</ul>}
      </article>
    })}</div>
    {dualComplete(draft) && <div className="duel-actions"><button className="primary-action" onClick={onContinue}>{t('dual.continue')}</button></div>}
  </section>
}
