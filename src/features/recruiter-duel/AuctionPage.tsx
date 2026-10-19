import { DRAFT_CATALOG } from '../draft/catalog'
import { createCrossCategoryDraw, crossCategoryCatalog } from './crossCategoryDraw'
import { useCallback, useEffect, useMemo, useState, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '../../components/LanguageSelector'
import { AudioControls } from '../audio/AudioControls'
import { CoinFace } from './FootballCoin'
import { useAuctionSounds } from './useAuctionSounds'
import { PRODUCT } from '../../config/product'
import { defaultBudgetForMode } from '../player-catalog/leagueCollections'
import { catalogForMode, PLAYABLE_MODES } from '../themed-modes/modeCatalog'
import { DRAFT_SLOTS } from '../draft/draftTypes'
import { MatchScreen } from '../local-match/MatchScreen'
import { MatchSeriesScreen } from '../local-match/MatchSeriesScreen'
import { isValidOrganizedLineup } from '../local-match/simulator'
import { CPU_STRATEGIES, CPU_DIFFICULTIES, takeCpuTurn, type CpuStrategy, type CpuDifficulty } from './cpuPolicy'
import { CoachMarket } from './CoachMarket'
import { TeamPowerPanel } from './TeamPowerPanel'
import { autoChooseCoach, chooseCoach, declineCoach } from './coachHiring'
import { COACH_MAX_PRICE } from '../coaches/coachRules'
import { coachById } from '../coaches/coachCatalog'
import { StageGuide } from '../onboarding/StageGuide'
import { ModeSelector } from '../themed-modes/ModeSelector'
import type { ThemedModeId } from '../themed-modes/modeTypes'
import { chooseFormation, autoBuySubstitutes, buySubstitute, swapBenchWithStarter, budgetOf, autoCompleteAll, autoCompleteStep, canAutoComplete, previewAutoComplete, beginBidding, completeDuelMatch, createRecruiterDuel, currentRound, positionProgress, auctionAvailability, nextAuctionRound, passAuction, placeBid, reorderTeamLineup, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss, startDuelMatch } from './auctionEngine'
import type { AuctionTransition, CoinSide, RecruiterDuelGame, RecruiterId } from './auctionTypes'
import { PlayerIdentity, VisualCredits } from './PlayerIdentity'
import { FootballCoin } from './FootballCoin'
import { LineupOrganizer } from './LineupOrganizer'
import { MatchSetupPanel } from './MatchSetupPanel'
import { DEFAULT_SETUP_DRAFT, type SetupDraft, CLASSIC_CONFIG, isValidBudget, nameIssues, parseMatchConfig, preflightMatchConfig, sanitizeName, MATCH_CONFIG_VERSION, type MatchConfig } from './matchConfig'
import { AuctionHud } from './AuctionHud'
import { CpuCompletionPanel, QuickCompletePanel } from './AutoCompletePanel'
import { buildHudModel } from './hudModel'
import { StrategyChoicePanel } from './StrategyChoicePanel'
import { selectCpuStrategy } from '../tactics/cpuStrategy'
import { acknowledgeHandover, confirmStrategy, revealedStrategies, startStrategyChoice, type StrategyChoice, type ChoiceTransition } from '../tactics/strategyChoice'
import { TeamProgressBoard } from './TeamProgressBoard'
import type { FormationRole } from '../tactics/roles'
import type { StrategyId } from '../tactics/strategies'
import { createDrawContext, drawHistoryKey, newDrawSeed, parseReplay, readDrawHistory } from './drawHistory'
import { HelpTip } from '../onboarding/HelpTip'
import { helpTopicForPhase } from '../onboarding/helpTopics'
import { AbandonGame } from '../history/AbandonGame'
import { HistoryPanel } from '../history/HistoryPanel'
import { matchHistory, type HistoryOutcome } from '../history/matchHistory'
import { NoticeToasts } from './NoticeToasts'
import { SubstituteMarket } from './SubstituteMarket'
import { useAuctionNotices } from './useAuctionNotices'
import type { OnlineDuelBinding } from './onlineBinding'
import { OnlineTeamsStage } from './OnlineTeamsStage'
import { WinCelebration } from './WinCelebration'

interface AuctionPageProps { readonly onDraftFree: () => void; readonly onOnline?: () => void; /** Plays the shared game of an online room instead of a local one. */ readonly online?: OnlineDuelBinding }
/** Presentation time of the toss; the result is already stored when it starts. */
export const COIN_TOSS_MS = 1500
/** The exported context may carry the match configuration; anything invalid falls back to the classic rules. */
function replayConfig(text: string): MatchConfig {
  try { return parseMatchConfig((JSON.parse(text) as { config?: unknown }).config) ?? CLASSIC_CONFIG } catch { return CLASSIC_CONFIG }
}
const RECRUITER_IDS = ['recruiter_one', 'recruiter_two'] as const

export function AuctionPage({ onDraftFree, onOnline, online }: AuctionPageProps) {
  const { t } = useTranslation()
  const [opponentMode, setOpponentMode] = useState<'hotseat' | 'cpu'>('hotseat')
  const [strategy, setStrategy] = useState<CpuStrategy>('BALANCED')
  const [difficulty, setDifficulty] = useState<CpuDifficulty>('NORMAL')
  const [pauseMs, setPauseMs] = useState(650)
  const [replayText, setReplayText] = useState('')
  const [storageWarning, setStorageWarning] = useState(false)
  const [secondCategory, setSecondCategory] = useState<ThemedModeId | 'same'>('same')
  const [mode, setMode] = useState<ThemedModeId>('GLOBAL_CLASSIC')
  /** Mode of the running game; the setup screen follows `mode`. */
  const [gameMode, setGameMode] = useState<ThemedModeId>('GLOBAL_CLASSIC')
  const [localGame, setLocalGame] = useState<RecruiterDuelGame | null>(null)
  const game = online ? online.game : localGame
  /** Online, every change is an intent applied to the latest shared state; leaving the game exits the room. */
  const onlineSubmit = online?.submit; const onlineExit = online?.exit
  const setGame = useCallback((value: SetStateAction<RecruiterDuelGame | null>) => {
    if (!onlineSubmit) return setLocalGame(value)
    if (value === null) return onlineExit?.()
    onlineSubmit((current) => (typeof value === 'function' ? value(current) : value) ?? current)
  }, [onlineSubmit, onlineExit])
  const catalog = useMemo(() => game && (game.legacyCatalog || online && !game.manualBench) ? DRAFT_CATALOG : game?.categoryPair ? crossCategoryCatalog(game.categoryPair.recruiter_one, game.categoryPair.recruiter_two) : catalogForMode(game ? game.coachMode ?? gameMode : mode), [game, gameMode, mode, online])
  const playerById = (id: string) => catalog.find((player) => player.id === id)!
  const [error, setError] = useState<string | null>(null)
  const [autoFailedSeed, setAutoFailedSeed] = useState<string | null>(null)
  const [setup, setSetup] = useState<SetupDraft>(DEFAULT_SETUP_DRAFT)
  const [strategyChoice, setStrategyChoice] = useState<{ seed: string; choice: StrategyChoice } | null>(null)
  const [lineupConfirmed, setLineupConfirmed] = useState<{ seed: string; recruiter_one: boolean; recruiter_two: boolean }>({ seed: '', recruiter_one: false, recruiter_two: false })
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
  const customBudget = Number(setup.budgetText)
  const customConfig: MatchConfig = { version: MATCH_CONFIG_VERSION, budget: customBudget, names: { recruiter_one: sanitizeName(setup.nameOne), recruiter_two: sanitizeName(setup.nameTwo) }, substitutes: setup.substitutes, ...(setup.coaches ? { coaches: true, coachReserve: setup.coachReserve ?? COACH_MAX_PRICE } : {}) }
  const setupPreflight = isValidBudget(customBudget) ? preflightMatchConfig(catalog, customConfig) : { ok: false as const, reason: 'budget_range' as const }
  const classicConfig = { ...CLASSIC_CONFIG, budget: Math.max(defaultBudgetForMode(mode), secondCategory === 'same' ? 0 : defaultBudgetForMode(secondCategory)) }
  const config = setup.mode === 'custom' ? customConfig : setup.coaches ? { ...classicConfig, coaches: true, coachReserve: setup.coachReserve ?? COACH_MAX_PRICE } : classicConfig
  const canStart = preflightMatchConfig(catalog, config).ok && (setup.mode === 'classic' || (setupPreflight.ok && Object.keys(nameIssues(customConfig.names)).length === 0))
  const start = () => {
    if (!canStart) return
    const saved = readDrawHistory({ getItem: (key) => window.localStorage.getItem(key) }, catalog, drawHistoryKey(mode))
    const recent = saved.history.games.flatMap((entry) => {
      const previous = createRecruiterDuel(catalog, entry.seed, entry.context)
      return previous.ok ? [previous.game.rounds.map((item) => item.playerId)] : []
    })
    const context = createDrawContext(catalog, recent, 'rarity-v2')
    let seed: string
    try { seed = newDrawSeed() }
    catch { return setError(t('draw.randomError')) }
    const created = secondCategory !== 'same' && secondCategory !== mode ? createCrossCategoryDraw(mode, secondCategory, seed, config) : createRecruiterDuel(catalog, seed, context, config)
    if (!created.ok) return setError(t(`duel.errors.${created.error}`))
    setGameMode(mode); setGame({ ...created.game, coachMode: mode, manualBench: true }); setError(null)
    let warning = saved.warning
    try { window.localStorage.setItem(drawHistoryKey(mode), JSON.stringify({ version: 1, games: [...saved.history.games, { seed, context }].slice(-5) })) }
    catch { warning = true }
    setStorageWarning(warning)
  }
  const reproduce = () => {
    try {
      const raw = JSON.parse(replayText) as { seed?: unknown; categoryPair?: Record<string, unknown> }
      const pair = raw.categoryPair
      if (pair && typeof raw.seed === 'string' && raw.seed.length > 0 && raw.seed.length <= 256 && [...PLAYABLE_MODES].includes(pair.recruiter_one as ThemedModeId) && [...PLAYABLE_MODES].includes(pair.recruiter_two as ThemedModeId)) {
        const first = pair.recruiter_one as ThemedModeId; const second = pair.recruiter_two as ThemedModeId
        const created = createCrossCategoryDraw(first, second, raw.seed, replayConfig(replayText))
        if (!created.ok) return setError(t('draw.invalidReplay'))
        setMode(first); setGameMode(first); setSecondCategory(second); setGame(created.game); setError(null); return
      }
    } catch { /* Standard replay validation below reports malformed data. */ }
    const legacy = parseReplay(replayText, DRAFT_CATALOG)
    if (legacy) {
      const created = createRecruiterDuel(DRAFT_CATALOG, legacy.seed, legacy.context, replayConfig(replayText))
      if (!created.ok) return setError(t('draw.invalidReplay'))
      setMode('GLOBAL_CLASSIC'); setGameMode('GLOBAL_CLASSIC'); setSecondCategory('same'); setGame({ ...created.game, legacyCatalog: true }); setError(null); return
    }
    const replayMode = [...PLAYABLE_MODES].find((candidate) => parseReplay(replayText, catalogForMode(candidate)))
    const replayCatalog = replayMode ? catalogForMode(replayMode) : null
    const replay = replayCatalog ? parseReplay(replayText, replayCatalog) : null
    if (!replayMode || !replayCatalog || !replay) return setError(t('draw.invalidReplay'))
    const created = createRecruiterDuel(replayCatalog, replay.seed, replay.context, replayConfig(replayText))
    if (!created.ok) return setError(t(`duel.errors.${created.error}`))
    setMode(replayMode); setGameMode(replayMode); setGame({ ...created.game, coachMode: replayMode, manualBench: true }); setError(null); setStorageWarning(false)
  }
  const chooseCoin = (side: CoinSide) => setGame((current) => {
    if (!current || current.phase !== 'LOBBY') return current
    const result = startCoinToss(current, side)
    return result.ok ? result.game : current
  })
  useAuctionSounds(game)
  const revealToss = useCallback(() => setGame((current) => {
    if (current?.phase !== 'COIN_TOSS') return current
    const revealed = revealCoinToss(current)
    return revealed.ok ? revealed.game : current
  }), [setGame])
  useEffect(() => {
    if (game?.phase !== 'COIN_TOSS') return
    const timeout = window.setTimeout(revealToss, window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : COIN_TOSS_MS)
    return () => window.clearTimeout(timeout)
  }, [game?.phase, revealToss])

  useEffect(() => {
    if (game?.phase !== 'DISCARD_RESULT') return
    const timer = window.setTimeout(() => setGame((current) => {
      if (!current || current.phase !== 'DISCARD_RESULT') return current
      const revealed = revealDiscardReplacement(current)
      return revealed.ok ? revealed.game : current
    }), window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 350)
    return () => window.clearTimeout(timer)
  }, [game?.phase, setGame])

  useEffect(() => {
    if (opponentMode !== 'cpu' || game?.phase !== 'TEAMS_COMPLETED') return
    const next = autoBuySubstitutes(autoChooseCoach(game, 'recruiter_two'), 'recruiter_two', catalog)
    if (next === game) return
    // Deferred like the other automatic steps, so the screen never changes inside the render pass.
    const timer = window.setTimeout(() => setGame((current) => (current === game ? next : current)), 0)
    return () => window.clearTimeout(timer)
  }, [opponentMode, game, catalog, setGame])
  const cpuTurn = opponentMode === 'cpu' && game?.phase === 'BIDDING' && game.activeParticipant === 'recruiter_two'
  /** Online: the other person is the one who has to act. */
  const remoteTurn = !!online && game?.phase === 'BIDDING' && game.activeParticipant !== online.mySide
  useEffect(() => {
    if (!cpuTurn || !game) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => setGame((current) => {
      if (!current || current.phase !== 'BIDDING' || current.activeParticipant !== 'recruiter_two') return current
      const result = takeCpuTurn(current, catalog, strategy, difficulty)
      return result.ok ? result.game : current
    }), reduced ? Math.min(pauseMs, 150) : pauseMs)
    return () => window.clearTimeout(timer)
  }, [cpuTurn, game, strategy, difficulty, pauseMs, catalog, setGame])
  const auctionHudPhase = game !== null && ['REVEAL_PLAYER', 'BIDDING', 'DISCARD_RESULT', 'ROUND_RESULT', 'NEXT_ROUND'].includes(game.phase)
  const hud = useMemo(() => game && auctionHudPhase ? buildHudModel(game, catalog) : null, [game, auctionHudPhase, catalog])
  const cpuLineup = game?.teams.recruiter_two.lineup
  const cpuStrategy = useMemo(() => opponentMode === 'cpu' && game?.phase === 'TEAMS_COMPLETED' && cpuLineup ? selectCpuStrategy(cpuLineup, catalog, game.seed) : undefined, [opponentMode, game, cpuLineup, catalog])
  const recordDuel = (id: string, outcome: HistoryOutcome, score: { recruiter_one: number; recruiter_two: number } | null, abandonedBy: 'recruiter_one' | 'recruiter_two' | null) => {
    matchHistory.record({ id, at: new Date().toISOString(), mode: gameMode, opponent: opponentMode, names: { recruiter_one: names.recruiter_one, recruiter_two: names.recruiter_two }, outcome, score, abandonedBy })
  }
  const abandon = (participant: 'recruiter_one' | 'recruiter_two') => {
    if (!game) return
    if (online) return online.forfeit()
    recordDuel(game.seed, participant === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one', null, participant)
    setStrategyChoice(null); setError(null); setGame(null)
  }
  /** Starts the match. Returns false when the engine refuses, so the start button can be used again. */
  const playMatch = (current: RecruiterDuelGame, first: StrategyId, second: StrategyId) => {
    const result = startDuelMatch(current, catalog, { recruiter_one: first, recruiter_two: second }, true)
    apply(result)
    // Local history records the series winner after the final playback.
    return result.ok
  }
  const quickTaker = game ? RECRUITER_IDS.find((participant) => canAutoComplete(game, participant) && (!online || participant === online.mySide)) : undefined
  const cpuAuto = quickTaker === 'recruiter_two' && opponentMode === 'cpu' && autoFailedSeed !== game?.seed
  const humanQuick = quickTaker && !cpuAuto ? quickTaker : undefined
  const quickPreview = useMemo(() => game && humanQuick ? previewAutoComplete(game, humanQuick, catalog) : null, [game, humanQuick, catalog])
  useEffect(() => {
    if (!cpuAuto || !game) return
    const timer = window.setTimeout(() => {
      const step = autoCompleteStep(game, 'recruiter_two', catalog)
      if (step.ok) return setGame(step.game)
      setAutoFailedSeed(game.seed); setError(t('autoComplete.cpuFailed'))
    }, window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 450)
    return () => window.clearTimeout(timer)
  }, [cpuAuto, game, t, catalog, setGame])
  const lastCpuDecision = game?.record.filter((entry) => entry.type === 'cpu_decision' && entry.round === game.roundIndex && entry.playerId === currentRound(game)?.playerId).at(-1)
  const round = game ? currentRound(game) : null
  const footballer = round ? playerById(round.playerId) : null
  const minimum = game?.currentBid ? game.currentBid.amount + 1 : footballer?.price ?? 0
  const offerKey = game ? [game.seed, game.roundIndex, currentRound(game)?.playerId, game.activeParticipant, game.currentBid?.amount ?? 0].join(':') : ''
  const offer = offerInput?.key === offerKey ? offerInput.value : minimum
  const availability = game && game.activeParticipant && !remoteTurn ? auctionAvailability(game, game.activeParticipant, catalog, offer, cpuTurn) : null
  const progress = game?.activeParticipant && round ? positionProgress(game.teams[game.activeParticipant], round.position) : null
  const orderingDone = (participant: RecruiterId) => (opponentMode === 'cpu' && participant === 'recruiter_two') || (lineupConfirmed.seed === game?.seed && lineupConfirmed[participant])
  const setOrderingDone = (participant: RecruiterId, value: boolean) => game && setLineupConfirmed((current) => ({ ...(current.seed === game.seed ? current : { seed: game.seed, recruiter_one: false, recruiter_two: false }), [participant]: value }))
  const swapLineup = (participant: RecruiterId, first: FormationRole, second: FormationRole) => {
    if (!game) return null
    const result = reorderTeamLineup(game, participant, first, second)
    if (result.ok) setGame(result.game)
    return result.ok ? null : result.error
  }
  const benchSwap = (participant: RecruiterId, benchIndex: number, slot: FormationRole) => {
    if (!game) return false
    const result = swapBenchWithStarter(game, participant, benchIndex, slot)
    if (result.ok) setGame(result.game)
    return result.ok
  }
  const recordBid = () => !cpuTurn && game && game.activeParticipant && apply(placeBid(game, game.activeParticipant, offer, catalog))
  const recordPass = () => !cpuTurn && game && game.activeParticipant && apply(passAuction(game, game.activeParticipant, catalog))
  const blockedMessage = (() => {
    if (!game || !game.activeParticipant || game.phase !== 'BIDDING' || remoteTurn || cpuTurn || !footballer || !availability) return null
    const reason = availability.bid.reason
    if (!reason || reason === 'NOT_YOUR_TURN' || reason === 'ACTION_PENDING' || reason === 'CPU_THINKING') return null
    const team = game.teams[game.activeParticipant]; const left = budgetOf(game) - team.spent
    if (reason === 'POSITION_FULL') return t('auctionBanner.blocked.POSITION_FULL', { position: t(`positions.${footballer.position}`), filled: progress?.filled ?? 0, capacity: progress?.capacity ?? 0 })
    if (reason === 'INSUFFICIENT_BUDGET') return t('auctionBanner.blocked.INSUFFICIENT_BUDGET', { left, price: minimum })
    if (reason === 'FUTURE_BUDGET_RESERVED' && availability.maximum < minimum) return t('auctionBanner.blocked.FUTURE_BUDGET_RESERVED', { player: footballer.name, price: minimum, need: game.rounds.slice(game.roundIndex).reduce((sum, entry) => sum + (catalog.find((player) => player.id === entry.playerId)?.price ?? 0), 0), total: 2 * budgetOf(game) - game.teams.recruiter_one.spent - game.teams.recruiter_two.spent, maximum: availability.maximum })
    return t('auctionActions.blocks.' + reason)
  })()
  /** The active recruiter already has this position full: nothing to decide, so no buttons and the pass happens by itself. */
  const mustSkip = !!game && game.phase === 'BIDDING' && !!game.activeParticipant && !cpuTurn && !remoteTurn && availability?.bid.reason === 'POSITION_FULL'
  const skipper = game?.activeParticipant
  useEffect(() => {
    if (!mustSkip || !skipper) return
    const timer = window.setTimeout(() => setGame((current) => {
      if (!current || current.phase !== 'BIDDING' || current.activeParticipant !== skipper) return current
      const result = passAuction(current, skipper, catalog)
      return result.ok ? result.game : current
    }), window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 900)
    return () => window.clearTimeout(timer)
  }, [mustSkip, skipper, game?.roundIndex, catalog, setGame])
  const blockedKey = game ? [game.seed, game.roundIndex, game.activeParticipant, game.currentBid?.amount ?? 0].join(':') : ''
  const { notices, push, dismiss } = useAuctionNotices(game, catalog, { recruiter_one: game?.config?.names.recruiter_one ?? t('duel.recruiters.recruiter_one'), recruiter_two: game?.config?.names.recruiter_two ?? (opponentMode === 'cpu' ? 'CPU' : t('duel.recruiters.recruiter_two')) }, blockedMessage && availability && !['INVALID_OFFER'].includes(availability.bid.reason ?? '') ? { key: blockedKey, message: blockedMessage } : null)
  const names = { recruiter_one: game?.config?.names.recruiter_one ?? t('duel.recruiters.recruiter_one'), recruiter_two: game?.config?.names.recruiter_two ?? (opponentMode === 'cpu' ? 'CPU' : t('duel.recruiters.recruiter_two')) }

  if (game && (game.phase === 'SIMULATING' || game.phase === 'MATCH_RESULT') && game.matchResult) {
    const Screen = online && !game.matchResult.actionModel ? MatchScreen : MatchSeriesScreen
    return <div className="draft-app duel-shell"><header className="draft-header"><a className="brand" href="#duel-main" aria-label={PRODUCT.name}><span className="brand-emblem">R</span><span>{PRODUCT.name}</span></a><AudioControls /><LanguageSelector /></header><Screen key={game.matchResult.seed} onSeriesFinished={(winner, wins) => { if (!online) recordDuel(game.seed, winner === 'local' ? 'recruiter_one' : 'recruiter_two', { recruiter_one: wins.local, recruiter_two: wins.cpu }, null) }} result={game.matchResult} catalog={catalog} localName={names.recruiter_one} cpuName={names.recruiter_two} onFinished={() => { if (!online && game.phase === 'SIMULATING') apply(completeDuelMatch(game)) }} onNewMatch={online ? online.exit : () => setGame(null)} onRematch={online ? online.exit : start} onReturn={() => setGame(null)} /></div>
  }
  return <div className="draft-app duel-shell">
    <header className="draft-header"><a className="brand" href="#duel-main" aria-label={PRODUCT.name}><span className="brand-emblem">R</span><span>{PRODUCT.name}</span></a><AudioControls /><LanguageSelector /></header>
    <main id="duel-main" className="duel-page">
      {!game && <section className="duel-intro"><p className="eyebrow"><span />{t('duel.eyebrow')}</p><h1>{t('duel.title')}</h1><p>{t('duel.subtitle')}</p><label>{t('cpu.opponent')}<select value={opponentMode} onChange={(event) => setOpponentMode(event.target.value as 'hotseat' | 'cpu')}><option value="hotseat">{t('cpu.hotseat')}</option><option value="cpu">{t('cpu.versus')}</option></select></label>{opponentMode === 'cpu' && <><label>{t('cpu.strategy')}<select value={strategy} onChange={(event) => setStrategy(event.target.value as CpuStrategy)}>{CPU_STRATEGIES.map((item) => <option key={item} value={item}>{t('cpu.profiles.' + item)}</option>)}</select></label><label>{t('cpu.difficulty')}<select value={difficulty} onChange={(event) => setDifficulty(event.target.value as CpuDifficulty)}>{CPU_DIFFICULTIES.map((item) => <option key={item} value={item}>{t('cpu.difficulties.' + item)}</option>)}</select></label><p>{t('cpu.difficultyHint')}</p><label>{t('cpu.pause')}<input type="number" min={0} max={3000} step={50} value={pauseMs} onChange={(event) => setPauseMs(Math.max(0, Math.min(3000, Number(event.target.value))))} /></label></>}<MatchSetupPanel classicBudget={classicConfig.budget} draft={setup} onChange={setSetup} versusCpu={opponentMode === 'cpu'} preflight={setupPreflight} /><ModeSelector selected={mode} onChange={setMode} /><label>{t('playtest.opponentCategory')}<select value={secondCategory} onChange={(e) => setSecondCategory(e.target.value as ThemedModeId | 'same')}><option value="same">{t('playtest.sameCategory')}</option>{[...PLAYABLE_MODES].filter((id) => id !== 'ARGENTINA_CLUBS').map((id) => <option key={id} value={id}>{t('categoryTree.options.' + id)}</option>)}</select></label>{secondCategory !== 'same' && secondCategory !== mode && <p>{t('playtest.mixedHelp')}</p>}<HistoryPanel /><details className="draw-replay"><summary>{t('draw.reproduce')}</summary><p>{t('draw.explanation')}</p><label>{t('draw.context')}<textarea value={replayText} onChange={(event) => setReplayText(event.target.value)} /></label><button className="secondary-action" onClick={reproduce}>{t('draw.reproduce')}</button></details><div className="duel-actions">{onOnline && <button className="secondary-action" onClick={onOnline}>{t('online.menu')}</button>}<button className="primary-action" disabled={!canStart} onClick={start}>{t('duel.start')}</button><button className="secondary-action" onClick={onDraftFree}>{t('duel.freeDraft')}</button></div></section>}
      {(() => { const topic = helpTopicForPhase(game?.phase); return topic && !(game && ['SIMULATING', 'MATCH_RESULT', 'DISCARD_RESULT', 'COIN_TOSS', 'NEXT_ROUND'].includes(game.phase)) ? <HelpTip topic={topic} /> : null })()}
      {online && online.connection !== 'connected' && <p className="auction-banner auction-banner-blocked" role="status">{t('online.connection.' + online.connection)}</p>}
      {game && <AbandonGame versusCpu={opponentMode === 'cpu'} names={names} onAbandon={abandon} onlySide={online?.mySide} />}
      {game && !game.categoryPair && !hud && <p className="discard-counter" role="status">{t('discards.available', { count: game.discardsRemaining })}{game.discardsRemaining === 0 && <span> · {t('discards.exhausted')}</span>}</p>}
      {game?.phase === 'DISCARD_RESULT' && game.lastDiscard && <section className="discard-scene" aria-live="polite"><h2>{t('discards.newDraw')}</h2><div className="card-discard"><PlayerIdentity player={playerById(game.lastDiscard.playerId)} /></div></section>}
      {hud && game && <AuctionHud hud={hud} names={names} onShowPitches={() => document.getElementById('team-progress')?.scrollIntoView({ behavior: 'smooth' })} />}
      {error && game?.phase !== 'TEAMS_COMPLETED' && <p className="draft-alert" role="alert">{error}</p>}
      {game?.phase === 'LOBBY' && online && online.mySide !== 'recruiter_one' && <section className="coin-toss" role="status"><h1>{t('duel.chooseCoin')}</h1><p>{t('online.duel.waitingCoin', { name: names.recruiter_one })}</p></section>}
      {game?.phase === 'LOBBY' && !(online && online.mySide !== 'recruiter_one') && <section className="coin-toss coin-choice"><h1>{t('duel.chooseCoin')}</h1><p>{t('duel.chooseCoinDetail')}</p><div className="coin-faces">{(['heads', 'tails'] as const).map((side) => <button key={side} className="coin-face-choice" aria-label={t(`duel.${side}`)} onClick={() => chooseCoin(side)}><CoinFace side={side} /><strong aria-hidden="true">{t(`duel.${side}`)}</strong><small aria-hidden="true">{t(`coin.faces.${side}`)}</small></button>)}</div></section>}
      {game?.phase === 'COIN_TOSS' && <section className="coin-toss" aria-live="polite"><FootballCoin side={game.coinResult ?? 'heads'} tossing /><h1>{t('duel.coinToss')}</h1><p>{t('duel.coinTossWaiting')}</p><button className="secondary-action" onClick={revealToss}>{t('coin.skip')}</button></section>}
      {game && ['REVEAL_PLAYER', 'BIDDING', 'ROUND_RESULT', 'TEAMS_COMPLETED'].includes(game.phase) && <>
        {humanQuick && quickPreview && game.phase !== 'TEAMS_COMPLETED' && <QuickCompletePanel participantName={names[humanQuick]} rivalName={names[humanQuick === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one']} catalog={catalog} preview={quickPreview} onConfirm={() => apply(autoCompleteAll(game, humanQuick, catalog))} />}
        {cpuAuto && (() => {
          const signed = game.record.filter((entry) => entry.type === 'award' && entry.reason === 'auto_complete')
          const last = signed.at(-1)
          return <CpuCompletionPanel cpuName={names.recruiter_two} done={signed.length} total={signed.length + game.rounds.length - game.roundIndex} lastPlayer={last?.type === 'award' ? playerById(last.playerId).name : null} lastPrice={last?.type === 'award' ? last.price : null}
            onSkip={() => { const result = autoCompleteAll(game, 'recruiter_two', catalog); if (result.ok) apply(result); else { setAutoFailedSeed(game.seed); setError(t('autoComplete.cpuFailed')) } }} />
        })()}
        {game.phase !== 'TEAMS_COMPLETED' && !cpuAuto && round && footballer && <section className="auction-board" aria-live="polite"><div className="auction-heading"><p className="eyebrow"><span />{t('duel.round', { current: game.roundIndex + 1, total: game.rounds.length })}</p><p>{t('duel.opening', { participant: names[game.openingOrder[game.roundIndex]] })}</p></div><div className="auction-candidate" key={footballer.id}><PlayerIdentity player={footballer} /></div>
          {game.phase === 'REVEAL_PLAYER' && <div className="duel-actions reveal-actions">{game.roundIndex === 0 && <><FootballCoin side={game.coinResult!} /><p>{t('coin.result', { side: t(`duel.${game.coinResult}`), participant: names[game.coinTossWinner!] })}</p></>}<button className="primary-action" onClick={() => apply(beginBidding(game))}>{t('duel.beginBidding')}</button></div>}
          {mustSkip && game.activeParticipant && footballer && <section className="bid-panel auction-banner auction-banner-blocked" role="status"><strong>{t('auctionActions.autoSkip', { participant: names[game.activeParticipant], position: t(`positions.${footballer.position}`) })}</strong></section>}
          {game.phase === 'BIDDING' && game.activeParticipant && !cpuTurn && !remoteTurn && !mustSkip && <section className="bid-panel"><h2>{t('duel.yourTurn', { participant: names[game.activeParticipant] })}</h2>{(() => { const rival = names[game.activeParticipant === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one']; const blocked = availability?.bid.reason
      if (blockedMessage && (blocked === 'POSITION_FULL' || blocked === 'FUTURE_BUDGET_RESERVED' || blocked === 'INSUFFICIENT_BUDGET')) return <div className="auction-banner auction-banner-blocked" role="alert"><strong>{blockedMessage}</strong></div>
      return <div className="auction-banner" role="status"><strong>{game.currentBid ? t('auctionBanner.rivalBid', { rival, amount: game.currentBid.amount }) : t('auctionBanner.open')}</strong><ul><li>{t('auctionBanner.ifBid', { amount: Number.isNaN(offer) ? minimum : offer, rival })}</li><li>{game.currentBid ? t('auctionBanner.ifPass', { rival, player: footballer.name, amount: game.currentBid.amount }) : t('auctionBanner.ifPassNoBid', { rival })}</li></ul></div> })()}<p className={game.currentBid ? 'bid-highlight' : undefined} key={game.currentBid?.amount ?? 0}>{game.currentBid ? t('duel.currentBid', { amount: game.currentBid.amount, participant: names[game.currentBid.participant] }) : t('duel.noBid')}</p><label>{t('duel.offerAmount')}<input type="number" min={game.currentBid ? game.currentBid.amount + 1 : footballer.price} max={availability?.maximum} value={Number.isNaN(offer) ? '' : offer} onChange={(event) => setOfferInput({ key: offerKey, value: event.target.value === '' ? NaN : Number(event.target.value) })} /></label><p>{t('duel.maximumBid', { amount: availability?.maximum })}</p>{progress && <p id="position-capacity">{t(progress.remaining ? 'teamProgress.missing' : 'teamProgress.full', { position: t(`positions.${footballer.position}`), ...progress })}</p>}<p id="auction-action-reason" role="status">{availability?.bid.reason ? t('auctionActions.blocks.' + availability.bid.reason) : t('auctionActions.available')}</p><div className="duel-actions"><span className="blockable" onClick={() => { if (!availability?.bid.enabled && blockedMessage) push('warning', blockedMessage) }}><button className="primary-action" aria-describedby="auction-action-reason position-capacity" disabled={!availability?.bid.enabled} onClick={recordBid}>{t('duel.bid')}</button></span><span className="blockable" onClick={() => { if (availability && !availability.pass.enabled && availability.pass.reason) push('warning', t('auctionActions.blocks.' + availability.pass.reason)) }}><button className="secondary-action" aria-describedby="auction-assignment" disabled={!availability?.pass.enabled} onClick={recordPass}>{t(availability?.replacement && game.passedParticipants.length ? 'discards.confirm' : availability?.passAward && !game.currentBid && availability.passAward.winner === game.activeParticipant ? 'auctionActions.claim' : availability?.passAward?.reason && availability.passAward.reason !== 'voluntary_bid' ? 'auctionActions.confirmAssignment' : 'duel.pass')}</button></span></div></section>}
          {game.phase === 'BIDDING' && availability?.discardReason && <p className="assignment-notice" role="status">{t('discards.noReplacement')}</p>}
          {game.phase === 'BIDDING' && availability && <p id="auction-assignment" className="assignment-notice" role="status">{availability.replacement ? t('discards.doublePass', { count: game.discardsRemaining, position: t(`positions.${footballer!.position}`) }) : availability.passAward ? t(availability.passAward.reason === 'voluntary_bid' ? 'auctionActions.passAwards' : 'auctionActions.mandatory', { participant: names[availability.passAward.winner], amount: availability.passAward.price }) : availability.fallback ? t('auctionActions.doublePass', { participant: names[availability.fallback.winner], amount: availability.fallback.price }) : availability.pass.reason ? t('auctionActions.blocks.' + availability.pass.reason) : null}</p>}
          {remoteTurn && game.activeParticipant && <section className="bid-panel auction-banner" role="status"><strong>{t('online.duel.waitingBid', { name: names[game.activeParticipant] })}</strong></section>}
          {cpuTurn && <section className="bid-panel" role="status">{t('auctionActions.blocks.CPU_THINKING')}</section>}
          {lastCpuDecision?.type === 'cpu_decision' && <p className="cpu-status" role="status">{t(lastCpuDecision.action === 'bid' ? 'cpu.bids' : 'cpu.passes', {amount:lastCpuDecision.amount})}</p>}
          {game.phase === 'ROUND_RESULT' && game.lastAward && <section className="award-result">{game.lastAward.reason === 'voluntary_bid' && (online ? game.lastAward.winner === online.mySide : (opponentMode !== 'cpu' || game.lastAward.winner === 'recruiter_one')) && <WinCelebration participant={names[game.lastAward.winner]} player={footballer.name} amount={game.lastAward.price} />}{game.lastAward.reason === 'voluntary_bid' && <p className="auction-banner auction-banner-won" role="status"><strong>{(() => { const viewer = online ? online.mySide : opponentMode === 'cpu' ? 'recruiter_one' : null; const award = game.lastAward; return viewer && award.winner !== viewer ? t('auctionBanner.youPassed', { winner: names[award.winner], player: footballer.name, amount: award.price }) : t('auctionBanner.rivalPassed', { rival: names[award.winner === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one'], winner: names[award.winner], player: footballer.name, amount: award.price }) })()}</strong></p>}<h2>{t(game.lastAward.reason === 'voluntary_bid' ? 'duel.roundResult' : 'cpu.mandatory')}</h2>{opponentMode === 'cpu' && game.lastAward.winner === 'recruiter_two' && game.lastAward.reason === 'voluntary_bid' && <p>{t('cpu.wins')}</p>}<p>{t('duel.awardPlayer', { participant: names[game.lastAward.winner], player: footballer.name, amount: game.lastAward.price })}</p><button className="primary-action" onClick={() => apply(nextAuctionRound(game, catalog))}>{t(game.lastAward.reason === 'voluntary_bid' ? 'auctionBanner.confirmSigning' : 'duel.nextRound')}</button></section>}
        </section>}
        {game.phase === 'TEAMS_COMPLETED' && online && <OnlineTeamsStage game={game} online={online} names={names} catalog={catalog} />}
        {game.phase === 'TEAMS_COMPLETED' && !online && (() => {
          if (!RECRUITER_IDS.every((participant) => isValidOrganizedLineup(game.teams[participant].lineup, catalog, budgetOf(game), game.teams[participant].formation))) {
            return <section className="teams-completed" role="alert"><p>{t('recovery.invalidTeams')}</p><button className="primary-action" onClick={() => setGame(null)}>{t('recovery.restart')}</button></section>
          }
          const humans = RECRUITER_IDS.filter((participant) => !(opponentMode === 'cpu' && participant === 'recruiter_two'))
          const pending = humans.find((participant) => !orderingDone(participant))
          const bothReady = !pending
          const choice = bothReady ? (strategyChoice?.seed === game.seed ? strategyChoice.choice : startStrategyChoice(cpuStrategy)) : null
          const revealed = choice ? revealedStrategies(choice) : null
          const stage = !bothReady ? 1 : revealed ? 3 : 2
          const keep = (result: ChoiceTransition) => result.ok && setStrategyChoice({ seed: game.seed, choice: result.choice })
          return <section className="teams-completed">
            <p className="eyebrow"><span />{t('duel.teamsCompleted')}</p><h1>{t('duel.readyMatch')}</h1>
            <StageGuide key={game.seed} stage={!bothReady ? 'squad' : revealed ? 'ready' : 'strategy'} /><p className="stage-indicator" role="status">{t('stages.step', { current: stage, total: 3, label: t(['stages.order', 'stages.strategy', 'stages.reveal'][stage - 1]) })}</p>
            {choice && !choice.secondIsCpu && (choice.step === 'HANDOVER' || choice.step === 'SECOND') && <p className="stage-indicator" role="status">{t('stages.waitingSecond', { first: names.recruiter_one, second: names.recruiter_two })}</p>}
            <TeamPowerPanel game={game} catalog={catalog} sides={RECRUITER_IDS} names={names} />
            <details className="lineup-recap" open={!bothReady}>
              <summary>{t('stages.showTeams')}</summary>
              <div className="team-comparison">{RECRUITER_IDS.map((participant) => <article key={participant}><h2>{names[participant]}</h2><strong>{t('duel.spent', { amount: game.teams[participant].spent })}</strong><p>{DRAFT_SLOTS.map((slot) => playerById(game.teams[participant].lineup[slot.id]!).name).join(' · ')}</p></article>)}</div>
              {(pending ? [pending] : humans).map((participant) => <div key={participant}><LineupOrganizer onFormationChange={(formation) => apply(chooseFormation(game, participant, formation, catalog))} locked={strategyChoice?.seed === game.seed && strategyChoice.choice.step !== 'FIRST'} game={game} participant={participant} name={names[participant]} catalog={catalog} confirmed={orderingDone(participant)} onSwap={(first, second) => swapLineup(participant, first, second)} onBenchSwap={(benchIndex, slot) => benchSwap(participant, benchIndex, slot)} onConfirm={() => setOrderingDone(participant, true)} onEdit={() => setOrderingDone(participant, false)} /><SubstituteMarket game={game} participant={participant} name={names[participant]} catalog={catalog} locked={strategyChoice?.seed === game.seed && strategyChoice.choice.step !== 'FIRST'} onBuy={(playerId) => { const signed = catalog.find((player) => player.id === playerId); const result = buySubstitute(game, participant, playerId, catalog); apply(result); if (result.ok && signed) push('success', t('notices.substituteBought', { participant: names[participant], player: signed.name, price: signed.price })) }} />{game.config?.coaches && <CoachMarket game={game} participant={participant} name={names[participant]} locked={strategyChoice?.seed === game.seed && strategyChoice.choice.step !== 'FIRST'} onDecline={() => apply(declineCoach(game, participant))} onHire={(coachId) => { const hired = coachById(coachId); apply(chooseCoach(game, participant, coachId)); if (hired) push('success', t('coach.hired2', { coach: `${hired.name} ${hired.surname}`, price: hired.price })) }} />}</div>)}
              {opponentMode === 'cpu' && <p>{t('lineup.cpuKeeps')}</p>}
              {!bothReady && <p role="status">{t('lineup.waiting')}</p>}
            </details>
            {choice && <>
              {opponentMode === 'cpu' && !revealed && <p role="status">{t('strategyChoice.cpuFixed')}</p>}
              <StrategyChoicePanel choice={choice} chooser={choice.step === 'SECOND' ? names.recruiter_two : names.recruiter_one} nextChooser={names.recruiter_two} names={{ first: names.recruiter_one, second: names.recruiter_two }}
                onConfirm={(strategy) => keep(confirmStrategy(choice, strategy))} onHandover={() => keep(acknowledgeHandover(choice))} onStart={() => revealed !== null && playMatch(game, revealed.first, revealed.second)} />
            </>}
            {error && <div className="draft-alert" role="alert"><p>{error}</p><button className="secondary-action" onClick={() => { setStrategyChoice(null); setError(null) }}>{t('recovery.retry')}</button></div>}
          </section>
        })()}
      </>}
      {game && <><TeamProgressBoard game={game} catalog={catalog} names={names} /><details className="draw-replay"><summary>{t('draw.export')}</summary><p>{t('draw.explanation')}</p><label>{t('draw.context')}<textarea readOnly value={JSON.stringify({ seed: game.seed, context: game.drawContext, ...(game.categoryPair ? { categoryPair: game.categoryPair } : {}), ...(game.config ? { config: game.config } : {}) })} /></label></details></>}
      <NoticeToasts notices={notices} onDismiss={dismiss} />
      {storageWarning && <p role="status">{t('draw.storageWarning')}</p>}
      <VisualCredits />
    </main>
  </div>
}
