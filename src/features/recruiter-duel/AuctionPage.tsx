import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '../../components/LanguageSelector'
import { PRODUCT } from '../../config/product'
import { DRAFT_CATALOG } from '../draft/catalog'
import { DRAFT_SLOTS } from '../draft/draftTypes'
import { MatchScreen } from '../local-match/MatchScreen'
import { CPU_STRATEGIES, takeCpuTurn, type CpuStrategy } from './cpuPolicy'
import { ModeSelector } from '../themed-modes/ModeSelector'
import type { ThemedModeId } from '../themed-modes/modeTypes'
import { beginBidding, completeDuelMatch, createRecruiterDuel, currentRound, positionProgress, auctionAvailability, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealNextAuctionRound, startCoinToss, startDuelMatch } from './auctionEngine'
import type { AuctionTransition, CoinSide, RecruiterDuelGame } from './auctionTypes'
import { PlayerIdentity, VisualCredits } from './PlayerIdentity'
import { FootballCoin } from './FootballCoin'
import { TeamProgressBoard } from './TeamProgressBoard'
import { createDrawContext, DRAW_HISTORY_KEY, newDrawSeed, parseReplay, readDrawHistory } from './drawHistory'

interface AuctionPageProps { readonly onDraftFree: () => void }
const playerById = (id: string) => DRAFT_CATALOG.find((player) => player.id === id)!

export function AuctionPage({ onDraftFree }: AuctionPageProps) {
  const { t } = useTranslation()
  const [opponentMode, setOpponentMode] = useState<'hotseat' | 'cpu'>('hotseat')
  const [strategy, setStrategy] = useState<CpuStrategy>('BALANCED')
  const [pauseMs, setPauseMs] = useState(650)
  const [replayText, setReplayText] = useState('')
  const [storageWarning, setStorageWarning] = useState(false)
  const [mode, setMode] = useState<ThemedModeId>('GLOBAL_CLASSIC')
  const [game, setGame] = useState<RecruiterDuelGame | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [offerInput, setOfferInput] = useState<{ key: string; value: number } | null>(null)
  const apply = (result: AuctionTransition) => {
    if (!result.ok) return setError(t(`duel.errors.${result.error}`))
    let next = result.game
    if (next.phase === 'NEXT_ROUND') {
      const revealed = revealNextAuctionRound(next)
      if (revealed.ok) next = revealed.game
    }
    setGame(next); setError(null)
  }
  const start = () => {
    const saved = readDrawHistory({ getItem: (key) => window.localStorage.getItem(key) }, DRAFT_CATALOG)
    const recent = saved.history.games.flatMap((entry) => {
      const previous = createRecruiterDuel(DRAFT_CATALOG, entry.seed, entry.context)
      return previous.ok ? [previous.game.rounds.map((item) => item.playerId)] : []
    })
    const context = createDrawContext(DRAFT_CATALOG, recent)
    let seed: string
    try { seed = newDrawSeed() }
    catch { return setError(t('draw.randomError')) }
    const created = createRecruiterDuel(DRAFT_CATALOG, seed, context)
    if (!created.ok) return setError(t('duel.errors.auction_pool_unavailable'))
    setGame(created.game); setError(null)
    let warning = saved.warning
    try { window.localStorage.setItem(DRAW_HISTORY_KEY, JSON.stringify({ version: 1, games: [...saved.history.games, { seed, context }].slice(-5) })) }
    catch { warning = true }
    setStorageWarning(warning)
  }
  const reproduce = () => {
    const replay = parseReplay(replayText, DRAFT_CATALOG)
    if (!replay) return setError(t('draw.invalidReplay'))
    const created = createRecruiterDuel(DRAFT_CATALOG, replay.seed, replay.context)
    if (!created.ok) return setError(t('duel.errors.auction_pool_unavailable'))
    setGame(created.game); setError(null); setStorageWarning(false)
  }
  const chooseCoin = (side: CoinSide) => setGame((current) => {
    if (!current || current.phase !== 'LOBBY') return current
    const result = startCoinToss(current, side)
    return result.ok ? result.game : current
  })
  useEffect(() => {
    if (game?.phase !== 'COIN_TOSS') return
    const timeout = window.setTimeout(() => setGame((current) => {
      if (current?.phase !== 'COIN_TOSS') return current
      const revealed = revealCoinToss(current)
      return revealed.ok ? revealed.game : current
    }), window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 850)
    return () => window.clearTimeout(timeout)
  }, [game?.phase])

  const cpuTurn = opponentMode === 'cpu' && game?.phase === 'BIDDING' && game.activeParticipant === 'recruiter_two'
  useEffect(() => {
    if (!cpuTurn || !game) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => setGame((current) => {
      if (!current || current.phase !== 'BIDDING' || current.activeParticipant !== 'recruiter_two') return current
      const result = takeCpuTurn(current, DRAFT_CATALOG, strategy)
      return result.ok ? result.game : current
    }), reduced ? Math.min(pauseMs, 150) : pauseMs)
    return () => window.clearTimeout(timer)
  }, [cpuTurn, game, strategy, pauseMs])
  const lastCpuDecision = game?.record.filter((entry) => entry.type === 'cpu_decision' && entry.round === game.roundIndex).at(-1)
  const round = game ? currentRound(game) : null
  const footballer = round ? playerById(round.playerId) : null
  const minimum = game?.currentBid ? game.currentBid.amount + 1 : footballer?.price ?? 0
  const offerKey = game ? [game.seed, game.roundIndex, game.activeParticipant, game.currentBid?.amount ?? 0].join(':') : ''
  const offer = offerInput?.key === offerKey ? offerInput.value : minimum
  const availability = game && game.activeParticipant ? auctionAvailability(game, game.activeParticipant, DRAFT_CATALOG, offer, cpuTurn) : null
  const progress = game?.activeParticipant && round ? positionProgress(game.teams[game.activeParticipant], round.position) : null
  const recordBid = () => !cpuTurn && game && game.activeParticipant && apply(placeBid(game, game.activeParticipant, offer, DRAFT_CATALOG))
  const recordPass = () => !cpuTurn && game && game.activeParticipant && apply(passAuction(game, game.activeParticipant, DRAFT_CATALOG))
  const names = { recruiter_one: t('duel.recruiters.recruiter_one'), recruiter_two: opponentMode === 'cpu' ? 'CPU' : t('duel.recruiters.recruiter_two') }

  if (game && (game.phase === 'SIMULATING' || game.phase === 'MATCH_RESULT') && game.matchResult) {
    return <div className="draft-app duel-shell"><header className="draft-header"><a className="brand" href="#duel-main" aria-label={PRODUCT.name}><span className="brand-emblem">R</span><span>{PRODUCT.name}</span></a><LanguageSelector /></header><MatchScreen result={game.matchResult} localName={names.recruiter_one} cpuName={names.recruiter_two} onFinished={() => { if (game.phase === 'SIMULATING') apply(completeDuelMatch(game)) }} onRematch={start} onReturn={() => setGame(null)} /></div>
  }
  return <div className="draft-app duel-shell">
    <header className="draft-header"><a className="brand" href="#duel-main" aria-label={PRODUCT.name}><span className="brand-emblem">R</span><span>{PRODUCT.name}</span></a><LanguageSelector /></header>
    <main id="duel-main" className="duel-page">
      {!game && <section className="duel-intro"><p className="eyebrow"><span />{t('duel.eyebrow')}</p><h1>{t('duel.title')}</h1><p>{t('duel.subtitle')}</p><label>{t('cpu.opponent')}<select value={opponentMode} onChange={(event) => setOpponentMode(event.target.value as 'hotseat' | 'cpu')}><option value="hotseat">{t('cpu.hotseat')}</option><option value="cpu">{t('cpu.versus')}</option></select></label>{opponentMode === 'cpu' && <><label>{t('cpu.strategy')}<select value={strategy} onChange={(event) => setStrategy(event.target.value as CpuStrategy)}>{CPU_STRATEGIES.map((item) => <option key={item} value={item}>{t('cpu.profiles.' + item)}</option>)}</select></label><label>{t('cpu.pause')}<input type="number" min={0} max={3000} step={50} value={pauseMs} onChange={(event) => setPauseMs(Math.max(0, Math.min(3000, Number(event.target.value))))} /></label></>}<ModeSelector selected={mode} onChange={setMode} /><details className="draw-replay"><summary>{t('draw.reproduce')}</summary><p>{t('draw.explanation')}</p><label>{t('draw.context')}<textarea value={replayText} onChange={(event) => setReplayText(event.target.value)} /></label><button className="secondary-action" onClick={reproduce}>{t('draw.reproduce')}</button></details><div className="duel-actions"><button className="primary-action" onClick={start}>{t('duel.start')}</button><button className="secondary-action" onClick={onDraftFree}>{t('duel.freeDraft')}</button></div></section>}
      {error && <p className="draft-alert" role="alert">{error}</p>}
      {game?.phase === 'LOBBY' && <section className="coin-toss coin-choice"><FootballCoin side="heads" /><h1>{t('duel.chooseCoin')}</h1><p>{t('duel.chooseCoinDetail')}</p><div className="duel-actions"><button className="primary-action" onClick={() => chooseCoin('heads')}>{t('duel.heads')}</button><button className="secondary-action" onClick={() => chooseCoin('tails')}>{t('duel.tails')}</button></div></section>}
      {game?.phase === 'COIN_TOSS' && <section className="coin-toss" aria-live="polite"><FootballCoin side={game.coinResult ?? 'heads'} tossing /><h1>{t('duel.coinToss')}</h1><p>{t('duel.coinTossWaiting')}</p></section>}
      {game && ['REVEAL_PLAYER', 'BIDDING', 'ROUND_RESULT', 'TEAMS_COMPLETED'].includes(game.phase) && <>
        {game.phase !== 'TEAMS_COMPLETED' && round && footballer && <section className="auction-board" aria-live="polite"><div className="auction-heading"><p className="eyebrow"><span />{t('duel.round', { current: game.roundIndex + 1, total: game.rounds.length })}</p><p>{t('duel.opening', { participant: names[game.openingOrder[game.roundIndex]] })}</p></div><div className="recruiter-scores">{(['recruiter_one', 'recruiter_two'] as const).map((participant) => <div key={participant}><strong>{names[participant]}</strong><span>{t('duel.balance', { amount: 100 - game.teams[participant].spent })}</span><small>{t('duel.signings', { count: Object.values(game.teams[participant].lineup).filter(Boolean).length })}</small></div>)}</div><PlayerIdentity key={footballer.id} player={footballer} />
          {game.phase === 'REVEAL_PLAYER' && <div className="duel-actions reveal-actions">{game.roundIndex === 0 && <><FootballCoin side={game.coinResult!} /><p>{t('coin.result', { side: t(`duel.${game.coinResult}`), participant: names[game.coinTossWinner!] })}</p></>}<button className="primary-action" onClick={() => apply(beginBidding(game))}>{t('duel.beginBidding')}</button></div>}
          {game.phase === 'BIDDING' && game.activeParticipant && !cpuTurn && <section className="bid-panel"><h2>{t('duel.yourTurn', { participant: names[game.activeParticipant] })}</h2><p>{game.currentBid ? t('duel.currentBid', { amount: game.currentBid.amount, participant: names[game.currentBid.participant] }) : t('duel.noBid')}</p><label>{t('duel.offerAmount')}<input type="number" min={game.currentBid ? game.currentBid.amount + 1 : footballer.price} max={availability?.maximum} value={Number.isNaN(offer) ? '' : offer} onChange={(event) => setOfferInput({ key: offerKey, value: event.target.value === '' ? NaN : Number(event.target.value) })} /></label><p>{t('duel.maximumBid', { amount: availability?.maximum })}</p>{progress && <p id="position-capacity">{t(progress.remaining ? 'teamProgress.missing' : 'teamProgress.full', { position: t(`positions.${footballer.position}`), ...progress })}</p>}<p id="auction-action-reason" role="status">{availability?.bid.reason ? t('auctionActions.blocks.' + availability.bid.reason) : t('auctionActions.available')}</p><div className="duel-actions"><button className="primary-action" aria-describedby="auction-action-reason position-capacity" disabled={!availability?.bid.enabled} onClick={recordBid}>{t('duel.bid')}</button><button className="secondary-action" aria-describedby="auction-assignment" disabled={!availability?.pass.enabled} onClick={recordPass}>{t(availability?.passAward?.reason && availability.passAward.reason !== 'voluntary_bid' ? 'auctionActions.confirmAssignment' : 'duel.pass')}</button></div></section>}
          {game.phase === 'BIDDING' && availability && <p id="auction-assignment" className="assignment-notice" role="status">{availability.passAward ? t(availability.passAward.reason === 'voluntary_bid' ? 'auctionActions.passAwards' : 'auctionActions.mandatory', { participant: names[availability.passAward.winner], amount: availability.passAward.price }) : availability.fallback ? t('auctionActions.doublePass', { participant: names[availability.fallback.winner], amount: availability.fallback.price }) : null}</p>}
          {cpuTurn && <section className="bid-panel" role="status">{t('auctionActions.blocks.CPU_THINKING')}</section>}
          {lastCpuDecision?.type === 'cpu_decision' && <p className="cpu-status" role="status">{t(lastCpuDecision.action === 'bid' ? 'cpu.bids' : 'cpu.passes', {amount:lastCpuDecision.amount})}</p>}
          {game.phase === 'ROUND_RESULT' && game.lastAward && <section className="award-result"><h2>{t(game.lastAward.reason === 'voluntary_bid' ? 'duel.roundResult' : 'cpu.mandatory')}</h2>{opponentMode === 'cpu' && game.lastAward.winner === 'recruiter_two' && game.lastAward.reason === 'voluntary_bid' && <p>{t('cpu.wins')}</p>}<p>{t('duel.awardPlayer', { participant: names[game.lastAward.winner], player: footballer.name, amount: game.lastAward.price })}</p><button className="primary-action" onClick={() => apply(nextAuctionRound(game, DRAFT_CATALOG))}>{t('duel.nextRound')}</button></section>}
        </section>}
        {game.phase === 'TEAMS_COMPLETED' && <section className="teams-completed"><p className="eyebrow"><span />{t('duel.teamsCompleted')}</p><h1>{t('duel.readyMatch')}</h1><div className="team-comparison">{(['recruiter_one', 'recruiter_two'] as const).map((participant) => <article key={participant}><h2>{names[participant]}</h2><strong>{t('duel.spent', { amount: game.teams[participant].spent })}</strong><p>{DRAFT_SLOTS.map((slot) => playerById(game.teams[participant].lineup[slot.id]!).name).join(' · ')}</p></article>)}</div><button className="primary-action" onClick={() => apply(startDuelMatch(game, DRAFT_CATALOG))}>{t('duel.startMatch')}</button></section>}
      </>}
      {game && <><TeamProgressBoard game={game} catalog={DRAFT_CATALOG} names={names} /><details className="draw-replay"><summary>{t('draw.export')}</summary><p>{t('draw.explanation')}</p><label>{t('draw.context')}<textarea readOnly value={JSON.stringify({ seed: game.seed, context: game.drawContext })} /></label></details></>}
      {storageWarning && <p role="status">{t('draw.storageWarning')}</p>}
      <VisualCredits />
    </main>
  </div>
}
