import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '../../components/LanguageSelector'
import { PRODUCT } from '../../config/product'
import { DRAFT_CATALOG } from '../draft/catalog'
import { DRAFT_SLOTS } from '../draft/draftTypes'
import { MatchScreen } from '../local-match/MatchScreen'
import { getPlayerTier } from '../player-catalog/getPlayerTier'
import { ModeSelector } from '../themed-modes/ModeSelector'
import type { ThemedModeId } from '../themed-modes/modeTypes'
import { beginBidding, completeDuelMatch, createRecruiterDuel, currentRound, maximumSafeBid, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealNextAuctionRound, startCoinToss, startDuelMatch } from './auctionEngine'
import type { AuctionTransition, CoinSide, RecruiterDuelGame, RecruiterId } from './auctionTypes'
import { PLAYER_CARD_VISUALS } from './playerVisuals'

interface AuctionPageProps { readonly onDraftFree: () => void }
const recruiterLabel = (t: (key: string) => string, participant: RecruiterId) => t(`duel.recruiters.${participant}`)
const playerById = (id: string) => DRAFT_CATALOG.find((player) => player.id === id)!

export function AuctionPage({ onDraftFree }: AuctionPageProps) {
  const { t } = useTranslation()
  const [seed, setSeed] = useState('hot-seat-001')
  const [mode, setMode] = useState<ThemedModeId>('GLOBAL_CLASSIC')
  const [game, setGame] = useState<RecruiterDuelGame | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offer, setOffer] = useState(0)
  const apply = (result: AuctionTransition) => {
    if (!result.ok) return setError(t(`duel.errors.${result.error}`))
    let next = result.game
    if (next.phase === 'NEXT_ROUND') {
      const revealed = revealNextAuctionRound(next)
      if (revealed.ok) next = revealed.game
    }
    if (next.phase === 'BIDDING' && next.activeParticipant) {
      const round = currentRound(next)
      if (round) setOffer(next.currentBid ? next.currentBid.amount + 1 : playerById(round.playerId).price)
    }
    setGame(next); setError(null)
  }
  const start = () => {
    const created = createRecruiterDuel(DRAFT_CATALOG, seed.trim() || 'hot-seat-001')
    if (!created.ok) return setError(t('duel.errors.auction_pool_unavailable'))
    setGame(created.game); setError(null)
  }
  const chooseCoin = (side: CoinSide) => game && apply(startCoinToss(game, side))
  useEffect(() => {
    if (game?.phase !== 'COIN_TOSS') return
    const timeout = window.setTimeout(() => setGame((current) => {
      if (current?.phase !== 'COIN_TOSS') return current
      const revealed = revealCoinToss(current)
      return revealed.ok ? revealed.game : current
    }), 850)
    return () => window.clearTimeout(timeout)
  }, [game?.phase])

  const round = game ? currentRound(game) : null
  const footballer = round ? playerById(round.playerId) : null
  const maximum = useMemo(() => game?.phase === 'BIDDING' && game.activeParticipant ? maximumSafeBid(game, game.activeParticipant, DRAFT_CATALOG) : 0, [game])
  const recordBid = () => game && game.activeParticipant && apply(placeBid(game, game.activeParticipant, offer, DRAFT_CATALOG))
  const recordPass = () => game && game.activeParticipant && apply(passAuction(game, game.activeParticipant, DRAFT_CATALOG))
  const names = { recruiter_one: t('duel.recruiters.recruiter_one'), recruiter_two: t('duel.recruiters.recruiter_two') }

  if (game && (game.phase === 'SIMULATING' || game.phase === 'MATCH_RESULT') && game.matchResult) {
    return <div className="draft-app duel-shell"><header className="draft-header"><a className="brand" href="#duel-main" aria-label={PRODUCT.name}><span className="brand-emblem">R</span><span>{PRODUCT.name}</span></a><LanguageSelector /></header><MatchScreen result={game.matchResult} localName={names.recruiter_one} cpuName={names.recruiter_two} onFinished={() => { if (game.phase === 'SIMULATING') apply(completeDuelMatch(game)) }} onRematch={() => { setGame(null); setSeed(`${game.seed}-rematch`) }} onReturn={() => setGame(null)} /></div>
  }
  return <div className="draft-app duel-shell">
    <header className="draft-header"><a className="brand" href="#duel-main" aria-label={PRODUCT.name}><span className="brand-emblem">R</span><span>{PRODUCT.name}</span></a><LanguageSelector /></header>
    <main id="duel-main" className="duel-page">
      {!game && <section className="duel-intro"><p className="eyebrow"><span />{t('duel.eyebrow')}</p><h1>{t('duel.title')}</h1><p>{t('duel.subtitle')}</p><ModeSelector selected={mode} onChange={setMode} /><label>{t('duel.seed')}<input value={seed} onChange={(event) => setSeed(event.target.value)} /></label><div className="duel-actions"><button className="primary-action" onClick={start}>{t('duel.start')}</button><button className="secondary-action" onClick={onDraftFree}>{t('duel.freeDraft')}</button></div></section>}
      {error && <p className="draft-alert" role="alert">{error}</p>}
      {game?.phase === 'LOBBY' && <section className="coin-toss coin-choice"><div className="coin">R</div><h1>{t('duel.chooseCoin')}</h1><p>{t('duel.chooseCoinDetail')}</p><div className="duel-actions"><button className="primary-action" onClick={() => chooseCoin('heads')}>{t('duel.heads')}</button><button className="secondary-action" onClick={() => chooseCoin('tails')}>{t('duel.tails')}</button></div></section>}
      {game?.phase === 'COIN_TOSS' && <section className="coin-toss" aria-live="polite"><div className="coin">R</div><h1>{t('duel.coinToss')}</h1><p>{t('duel.coinTossWaiting')}</p></section>}
      {game && ['REVEAL_PLAYER', 'BIDDING', 'ROUND_RESULT', 'TEAMS_COMPLETED'].includes(game.phase) && <>
        {game.phase !== 'TEAMS_COMPLETED' && round && footballer && <section className="auction-board" aria-live="polite"><div className="auction-heading"><p className="eyebrow"><span />{t('duel.round', { current: game.roundIndex + 1, total: game.rounds.length })}</p><p>{t('duel.opening', { participant: recruiterLabel(t, game.openingOrder[game.roundIndex]) })}</p></div><div className="recruiter-scores">{(['recruiter_one', 'recruiter_two'] as const).map((participant) => <div key={participant}><strong>{recruiterLabel(t, participant)}</strong><span>{t('duel.balance', { amount: 100 - game.teams[participant].spent })}</span><small>{t('duel.signings', { count: Object.values(game.teams[participant].lineup).filter(Boolean).length })}</small></div>)}</div><div className="single-player-card"><div className={`player-avatar tier-${getPlayerTier(footballer.overall_rating).toLowerCase()}`} aria-label={t('duel.placeholderAvatar', { player: footballer.name })}>{PLAYER_CARD_VISUALS[footballer.id]?.thumbnail ? <img src={PLAYER_CARD_VISUALS[footballer.id]?.thumbnail?.url} alt={t('duel.placeholderAvatar', { player: footballer.name })} /> : <><span>{footballer.nationality}</span><b>{footballer.overall_rating}</b></>}</div><article><small>{t('duel.playerDrawn')}</small><h2>{footballer.name}</h2><p>{t(`positions.${footballer.position}`)} · {footballer.club_tag} · {t('duel.tier', { tier: getPlayerTier(footballer.overall_rating) })}</p><b>{t('duel.basePrice', { amount: footballer.price })}</b></article></div>
          {game.phase === 'REVEAL_PLAYER' && <div className="duel-actions reveal-actions"><p>{t('duel.coinWinner', { participant: recruiterLabel(t, game.coinTossWinner!) })}</p><button className="primary-action" onClick={() => apply(beginBidding(game))}>{t('duel.beginBidding')}</button></div>}
          {game.phase === 'BIDDING' && game.activeParticipant && <section className="bid-panel"><h2>{t('duel.yourTurn', { participant: recruiterLabel(t, game.activeParticipant) })}</h2><p>{game.currentBid ? t('duel.currentBid', { amount: game.currentBid.amount, participant: recruiterLabel(t, game.currentBid.participant) }) : t('duel.noBid')}</p><label>{t('duel.offerAmount')}<input type="number" min={game.currentBid ? game.currentBid.amount + 1 : footballer.price} max={maximum} value={offer} onChange={(event) => setOffer(Number(event.target.value))} /></label><p>{t('duel.maximumBid', { amount: maximum })}</p><div className="duel-actions"><button className="primary-action" disabled={maximum < (game.currentBid ? game.currentBid.amount + 1 : footballer.price) || offer > maximum} onClick={recordBid}>{t('duel.bid')}</button><button className="secondary-action" onClick={recordPass}>{t('duel.pass')}</button></div></section>}
          {game.phase === 'ROUND_RESULT' && game.lastAward && <section className="award-result"><h2>{t('duel.roundResult')}</h2><p>{t('duel.awardPlayer', { participant: recruiterLabel(t, game.lastAward.winner), player: footballer.name, amount: game.lastAward.price })}</p><button className="primary-action" onClick={() => apply(nextAuctionRound(game, DRAFT_CATALOG))}>{t('duel.nextRound')}</button></section>}
        </section>}
        {game.phase === 'TEAMS_COMPLETED' && <section className="teams-completed"><p className="eyebrow"><span />{t('duel.teamsCompleted')}</p><h1>{t('duel.readyMatch')}</h1><div className="team-comparison">{(['recruiter_one', 'recruiter_two'] as const).map((participant) => <article key={participant}><h2>{recruiterLabel(t, participant)}</h2><strong>{t('duel.spent', { amount: game.teams[participant].spent })}</strong><p>{DRAFT_SLOTS.map((slot) => playerById(game.teams[participant].lineup[slot.id]!).name).join(' · ')}</p></article>)}</div><button className="primary-action" onClick={() => apply(startDuelMatch(game, DRAFT_CATALOG))}>{t('duel.startMatch')}</button></section>}
      </>}
    </main>
  </div>
}
