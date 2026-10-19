import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import { DRAFT_SLOTS } from '../draft/draftTypes'
import { startStrategyChoice } from '../tactics/strategyChoice'
import { chooseFormation, buySubstitute, reorderTeamLineup, startDuelMatch, swapBenchWithStarter } from './auctionEngine'
import { chooseCoach, declineCoach } from './coachHiring'
import { CoachMarket } from './CoachMarket'
import { TeamPowerPanel } from './TeamPowerPanel'
import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'
import { LineupOrganizer } from './LineupOrganizer'
import type { OnlineDuelBinding } from './onlineBinding'
import { StrategyChoicePanel } from './StrategyChoicePanel'
import { SubstituteMarket } from './SubstituteMarket'
import { StageGuide } from '../onboarding/StageGuide'

interface Props {
  readonly game: RecruiterDuelGame
  readonly online: OnlineDuelBinding
  readonly names: Readonly<Record<RecruiterId, string>>
  readonly catalog: readonly Player[]
}

const other = (side: RecruiterId): RecruiterId => (side === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one')

/**
 * Online version of the "teams complete" stage. Each person arranges only their own eleven, optionally buys substitutes,
 * and picks a strategy in secret (the server keeps it until both have chosen). Then the match starts for both.
 */
export function OnlineTeamsStage({ game, online, names, catalog }: Props) {
  const { t } = useTranslation()
  const mine = online.mySide; const theirs = other(mine)
  const [confirmed, setConfirmed] = useState(false)
  const [startFailed, setStartFailed] = useState(false)
  const iChose = online.strategyReady[mine]
  const bothChose = online.strategyReady.recruiter_one && online.strategyReady.recruiter_two
  const choice = useMemo(() => startStrategyChoice(), [])
  const starting = useRef(false)
  const { revealStrategies, submit } = online

  // Both picked: the server hands over the two strategies and either browser starts the same deterministic match.
  useEffect(() => {
    if (!bothChose || game.phase !== 'TEAMS_COMPLETED' || starting.current) return
    starting.current = true
    let cancelled = false
    void (async () => {
      try {
        const strategies = await revealStrategies()
        if (cancelled) return
        submit((current) => {
          if (current.phase !== 'TEAMS_COMPLETED') return current
          const started = startDuelMatch(current, catalog, strategies, true)
          return started.ok ? started.game : current
        })
      } catch { if (!cancelled) setStartFailed(true) }
      finally { starting.current = false }
    })()
    return () => { cancelled = true; starting.current = false }
  }, [bothChose, game.phase, catalog, revealStrategies, submit])

  const swap = (first: Parameters<typeof reorderTeamLineup>[2], second: Parameters<typeof reorderTeamLineup>[3]) => {
    online.submit((current) => { const result = reorderTeamLineup(current, mine, first, second); return result.ok ? result.game : current })
    return null
  }
  const benchSwap = (benchIndex: number, slot: string) => {
    const result = swapBenchWithStarter(game, mine, benchIndex, slot)
    if (result.ok) online.submit((current) => { const next = swapBenchWithStarter(current, mine, benchIndex, slot); return next.ok ? next.game : current })
    return result.ok
  }
  const hire = (coachId: string) => online.submit((current) => { const result = chooseCoach(current, mine, coachId); return result.ok ? result.game : current })
  const decline = () => online.submit((current) => { const result = declineCoach(current, mine); return result.ok ? result.game : current })
  const buy = (playerId: string) => online.submit((current) => { const result = buySubstitute(current, mine, playerId, catalog); return result.ok ? result.game : current })
  const names11 = (side: RecruiterId) => DRAFT_SLOTS.map((slot) => catalog.find((player) => player.id === game.teams[side].lineup[slot.id])?.name ?? '—').join(' · ')

  return <section className="teams-completed">
    <StageGuide stage={confirmed ? 'strategy' : 'squad'} />
    <p className="eyebrow"><span />{t('duel.teamsCompleted')}</p><h1>{t('duel.readyMatch')}</h1>
    <div className="team-comparison">{([mine, theirs] as const).map((side) => <article key={side}>
      <h2>{names[side]}{side === mine ? ` (${t('online.duel.you')})` : ''}</h2>
      <strong>{t('duel.spent', { amount: game.teams[side].spent })}</strong>
      {side === mine ? <p>{names11(side)}</p> : <p>{t('online.duel.rivalArranging')}</p>}
    </article>)}</div>
    {!iChose && <TeamPowerPanel game={game} catalog={catalog} sides={[mine]} names={names} />}
    {!iChose && <>
      <LineupOrganizer onFormationChange={(formation) => online.submit((current) => { const next = chooseFormation(current, mine, formation, catalog); return next.ok ? next.game : current })} game={game} participant={mine} name={names[mine]} catalog={catalog} confirmed={confirmed} locked={false}
        onSwap={swap} onBenchSwap={benchSwap} onConfirm={() => setConfirmed(true)} onEdit={() => setConfirmed(false)} />
      {game.config?.coaches && <CoachMarket game={game} participant={mine} name={names[mine]} locked={false} onHire={hire} onDecline={decline} />}
      <SubstituteMarket game={game} participant={mine} name={names[mine]} catalog={catalog} locked={false} onBuy={buy} />
      {confirmed
        ? <StrategyChoicePanel choice={choice} chooser={names[mine]} nextChooser={names[theirs]} names={{ first: names[mine], second: names[theirs] }}
          onConfirm={(strategy) => { void online.chooseStrategy(strategy) }} onHandover={() => {}} onStart={() => false} />
        : <p role="status">{t('online.duel.confirmFirst')}</p>}
    </>}
    {iChose && !bothChose && <p className="auction-banner" role="status"><strong>{t('online.duel.waitingStrategy', { name: names[theirs] })}</strong></p>}
    {bothChose && !startFailed && <p className="auction-banner" role="status"><strong>{t('online.duel.starting')}</strong></p>}
    {startFailed && <p className="auction-banner auction-banner-blocked" role="alert">{t('online.duel.startFailed')}</p>}
  </section>
}
