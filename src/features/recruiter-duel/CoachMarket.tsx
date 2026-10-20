import { CoachReferenceDetails } from '../coaches/CoachReferenceDetails'
import { CoachPortrait } from '../coaches/CoachPortrait'
import { useTranslation } from 'react-i18next'
import { coachAge, coachEffect, COACH_AS_OF_YEAR } from '../coaches/coachRules'
import type { Coach } from '../coaches/coachTypes'
import { budgetOf } from './auctionEngine'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'
import { coachMarket, coachOf, coachOffersFor } from './coachHiring'

interface Props {
  readonly game: RecruiterDuelGame
  readonly participant: RecruiterId
  readonly name: string
  /** True once the strategy step started: the squads are closed. */
  readonly locked: boolean
  readonly onHire: (coachId: string) => void
  readonly onDecline: () => void
}

/** Optional step after the squads: spend what is left on one coach from a seeded offer. */
export function CoachMarket({ game, participant, name, locked, onHire, onDecline }: Props) {
  const { t } = useTranslation()
  const hired = coachOf(game, participant)
  const left = budgetOf(game) - game.teams[participant].spent
  const market = coachMarket(game, participant)
  const label = (coach: Coach) => `${coach.name} ${coach.surname}`
  const effectText = (coach: Coach) => { const e = coachEffect(coach); return { attack: e.attack.toFixed(1), defense: e.defense.toFixed(1), midfield: e.midfield.toFixed(1) } }
  if (hired) return <section className="coach-market" aria-label={t('coach.title', { name })}>
    <h3>{t('coach.title', { name })}</h3>
    <article className="coach-card coach-hired-card" data-tier={hired.tier} data-focus={hired.focus}>
      <CoachPortrait coach={hired} />
      <strong>{label(hired)}</strong>
      <span>{t('coach.cardLevel', { tier: hired.tier, focus: t(`coach.focus.${hired.focus}`), price: hired.price })}</span>
      <details className="coach-details"><summary>{t('squad.coachDetails')}</summary>
        <span>{t(`coach.status.${hired.status}`)}</span><CoachReferenceDetails coach={hired} />
        <p>{t('coach.hired', { coach: label(hired), team: hired.team, price: hired.price, ...effectText(hired) })}</p>
      </details>
    </article>
  </section>
  if (!market.length) return null
  return <section className="coach-market" aria-label={t('coach.title', { name })}>
    <h3>{t('coach.title', { name })}</h3>
    <p className="market-left">{t('squad.coachBudget', { amount: left })}</p>
    {locked ? <p>{t('coach.closed')}</p> : <>
      <div className="market-options coach-grid">{coachOffersFor(game, participant).map((coach) => <article key={coach.id} className="coach-card" data-tier={coach.tier} data-focus={coach.focus}>
        <CoachPortrait coach={coach} />
        <strong>{label(coach)}</strong>

        <span>{t('coach.cardLevel', { tier: coach.tier, focus: t(`coach.focus.${coach.focus}`), price: coach.price })}</span>
        <details className="coach-details"><summary>{t('squad.coachDetails')}</summary>
          <span>{t(`coach.status.${coach.status}`)} · {coach.deathYear ? t('coach.lifespan', { birth: coach.birthYear, death: coach.deathYear, age: coachAge(coach) }) : t('coach.referenceAge', { year: COACH_AS_OF_YEAR, age: coachAge(coach) })}</span>
          <CoachReferenceDetails coach={coach} /><small>{t('coach.cardEffect', effectText(coach))}</small>
        </details>
        <button className="primary-action" disabled={!market.some((c) => c.id === coach.id)} aria-label={t('coach.hireCard', { name: label(coach), price: coach.price })} onClick={() => onHire(coach.id)}>{t('squad.hire', { price: coach.price })}</button>
      </article>)}</div>
      <details className="coach-help"><summary>{t('squad.coachHelp')}</summary><p className="market-hint">{t('coach.affinityHint')}</p>
      <p className="market-hint">{t('coach.contextHint')}</p>

      <p className="market-hint">{t('coach.hint')}</p></details><button className="secondary-action" onClick={onDecline}>{t('coach.decline')}</button>
    </>}
  </section>
}
