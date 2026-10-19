import { useTranslation } from 'react-i18next'
import { coachAge, coachEffect, coachReserveFor, COACH_AS_OF_YEAR } from '../coaches/coachRules'
import type { Coach } from '../coaches/coachTypes'
import { budgetOf } from './auctionEngine'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'
import { coachMarket, coachOf, coachOffers } from './coachHiring'

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
    <p>{t('coach.hired', { coach: label(hired), team: hired.team, price: hired.price, ...effectText(hired) })}</p>
  </section>
  if (!market.length) return null
  return <section className="coach-market" aria-label={t('coach.title', { name })}>
    <h3>{t('coach.title', { name })}</h3>
    <p className="market-left">{t('coach.left', { amount: left, count: coachOffers(game.seed, coachReserveFor(game.config), game.coachMode)[participant].length })}</p>
    {locked ? <p>{t('coach.closed')}</p> : <>
      <div className="market-options coach-grid">{coachOffers(game.seed, coachReserveFor(game.config), game.coachMode)[participant].map((coach) => <button key={coach.id} disabled={!market.some((c) => c.id === coach.id)} className="secondary-action coach-card" onClick={() => onHire(coach.id)}>
        <span className="coach-emblem" aria-hidden="true">{coach.name[0]}{coach.surname[0]}<b>{coach.tier}</b></span>
        <strong>{label(coach)}</strong>
        <span>{t(`coach.status.${coach.status}`)} · {coach.deathYear ? t('coach.lifespan', { birth: coach.birthYear, death: coach.deathYear, age: coachAge(coach) }) : t('coach.referenceAge', { year: COACH_AS_OF_YEAR, age: coachAge(coach) })}</span>
        <span>{t(coach.teamKind === 'NATIONAL' ? 'coach.referenceNational' : 'coach.referenceClub', { team: coach.team })}</span>
        {coach.secondaryTeam && <span>{t('coach.secondaryReference', { team: coach.secondaryTeam })}</span>}
        <span>{t('coach.cardLevel', { tier: coach.tier, focus: t(`coach.focus.${coach.focus}`), price: coach.price })}</span>
        <small>{t('coach.cardEffect', effectText(coach))}</small>
      </button>)}</div>
      <p className="market-hint">{t('coach.affinityHint')}</p>
      <p className="market-hint">{t('coach.contextHint')}</p>
      <button className="secondary-action" onClick={onDecline}>{t('coach.decline')}</button>
      <p className="market-hint">{t('coach.hint')}</p>
    </>}
  </section>
}
