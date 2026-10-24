import { LiveSeriesScreen } from '../local-match/LiveSeriesScreen'
import { createDuelSession } from '../local-match/interactive/duelSession'
import type { Session } from '../local-match/interactive'
import { ConfirmNavigation } from '../../components/ConfirmNavigation'
import { DRAFT_CATALOG } from '../draft/catalog'
import { createCrossCategoryDraw, crossCategoryCatalog, finishDualDraft } from './crossCategoryDraw'
import { cpuAct, createDualDraft, discardCard, dualComplete, isSideComplete, signCard, type DualDraft } from './dualDraft'
import { DualDraftScreen } from './DualDraftScreen'
import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '../../components/LanguageSelector'
import { AudioControls } from '../audio/AudioControls'
import { CoinFace } from './FootballCoin'
import { DiceRoller } from './DiceRoller'
import { diceTier } from './diceTier'
import { useAuctionSounds } from './useAuctionSounds'
import { PRODUCT } from '../../config/product'
import { defaultBudgetForMode } from '../player-catalog/leagueCollections'
import { catalogForMode, PLAYABLE_MODES } from '../themed-modes/modeCatalog'
import { recordedCollection, RECORDED_COLLECTIONS } from '../player-catalog/recordedCollections'
import { DRAFT_SLOTS } from '../draft/draftTypes'
import type { Player } from '../../types/player'
import { AuctionBidPanel } from './AuctionBidPanel'
import { MatchScreen } from '../local-match/MatchScreen'
import { MatchSeriesScreen } from '../local-match/MatchSeriesScreen'
import { isValidOrganizedLineup } from '../local-match/simulator'
import { CPU_STRATEGIES, CPU_DIFFICULTIES, takeCpuTurn, type CpuStrategy, type CpuDifficulty } from './cpuPolicy'
import { CoachMarket } from './CoachMarket'
import { TeamPowerPanel } from './TeamPowerPanel'
import { autoChooseCoach, chooseCoach, declineCoach } from './coachHiring'
import { COACH_MARKET_V4, COACH_MAX_PRICE } from '../coaches/coachRules'
import { StageGuide } from '../onboarding/StageGuide'
import { ModeSelector } from '../themed-modes/ModeSelector'
import { EditionHero } from './EditionHero'
import type { ThemedModeId } from '../themed-modes/modeTypes'
import { chooseFormation, autoBuySubstitutes, buySubstitute, swapBenchWithStarter, budgetOf, autoCompleteAll, autoCompleteStep, canAutoComplete, previewAutoComplete, beginBidding, completeDuelMatch, createRecruiterDuel, currentRound, positionProgress, auctionAvailability, nextAuctionRound, passAuction, placeBid, reorderTeamLineup, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss, startDuelMatch } from './auctionEngine'
import type { AuctionTransition, CoinSide, RecruiterDuelGame, RecruiterId } from './auctionTypes'
import { PlayerIdentity, VisualCredits } from './PlayerIdentity'
import { FootballCoin } from './FootballCoin'
import { LineupOrganizer } from './LineupOrganizer'
import { SigningReveal } from './SigningReveal'
import { MatchSetupPanel } from './MatchSetupPanel'
import { DEFAULT_SETUP_DRAFT, type SetupDraft, CLASSIC_CONFIG, BENCH_SHOWCASE_V1, isShowcaseBench, DISCARDS_MARKER_V2, isValidBudget, nameIssues, parseMatchConfig, preflightMatchConfig, sanitizeName, MATCH_CONFIG_VERSION, type MatchConfig } from './matchConfig'
import { AuctionHud } from './AuctionHud'
import { CpuCompletionPanel, CpuSigningsSummary, QuickCompletePanel } from './AutoCompletePanel'
import { buildHudModel } from './hudModel'
import { StrategyChoicePanel } from './StrategyChoicePanel'
import { selectCpuStrategy } from '../tactics/cpuStrategy'
import { acknowledgeHandover, confirmStrategy, revealedStrategies, startStrategyChoice, type StrategyChoice, type ChoiceTransition } from '../tactics/strategyChoice'
import { TeamProgressBoard } from './TeamProgressBoard'
import type { FormationRole } from '../tactics/roles'
import type { StrategyId } from '../tactics/strategies'
import { CURRENT_DRAW_POLICY, createDrawContext, drawHistoryKey, newDrawSeed, parseReplay, readDrawHistory } from './drawHistory'
import { HelpTip } from '../onboarding/HelpTip'
import { helpTopicForPhase } from '../onboarding/helpTopics'
import { AbandonGame } from '../history/AbandonGame'
import { HistoryPanel } from '../history/HistoryPanel'
import { matchHistory, type HistoryOutcome } from '../history/matchHistory'
import { LiveMarketPanel } from './LiveMarketPanel'
import { useLiveMarket } from './liveMarket'
import { SubstituteMarket } from './SubstituteMarket'
import { BenchShowcase } from './BenchShowcase'
import { buyShowcaseCard, cpuShowcase, finishShowcase, passShowcaseTurn, showcaseClosed } from './benchShowcaseModel'
import { Wallet } from './Wallet'
import { AuctionHeader } from './AuctionHeader'
import { rankBadge } from '../player-catalog/categoryRanking'
import type { OnlineDuelBinding } from './onlineBinding'
import { OnlineTeamsStage } from './OnlineTeamsStage'
import { WinCelebration } from './WinCelebration'

interface AuctionPageProps { readonly onDraftFree: () => void; readonly onOnline?: () => void; readonly teamName?: string; readonly onEditName?: () => void; readonly nameStorageWarning?: boolean; /** Plays the shared game of an online room instead of a local one. */ readonly online?: OnlineDuelBinding }
/** Presentation time of the toss; the result is already stored when it starts. */
/** The coin flies for 2.2 s and rests on the stored face before the next phase; reduced motion gets a cross-fade of both faces instead of a flip. */
export const COIN_TOSS_MS = 2700
const COIN_TOSS_REDUCED_MS = 2200
const NO_AUTO_ROUNDS: ReadonlySet<number> = new Set()

/** One whole round for a card the human cannot take: reveal, human pass, CPU decisions, award, next card. Null (do nothing) if anything is not a plain legal transition. */
function resolveIrrelevantRound(game: RecruiterDuelGame, catalog: readonly Player[], strategy: Parameters<typeof takeCpuTurn>[2], difficulty: Parameters<typeof takeCpuTurn>[3]): RecruiterDuelGame | null {
  const begun = beginBidding(game)
  if (!begun.ok) return null
  let current = begun.game
  for (let step = 0; step < 8 && current.phase === 'BIDDING'; step++) {
    if (current.activeParticipant === 'recruiter_one') {
      const availability = auctionAvailability(current, 'recruiter_one', catalog)
      if (availability.bid.enabled || !availability.pass.enabled) return null
      const passed = passAuction(current, 'recruiter_one', catalog)
      if (!passed.ok) return null
      current = passed.game
    } else {
      const turn = takeCpuTurn(current, catalog, strategy, difficulty)
      if (!turn.ok) return null
      current = turn.game
    }
  }
  if (current.phase !== 'ROUND_RESULT' || current.lastAward?.winner !== 'recruiter_two') return null
  const next = nextAuctionRound(current, catalog)
  if (!next.ok) return null
  const reveal = revealNextAuctionRound(next.game)
  return reveal.ok ? reveal.game : next.game
}
/** The exported context may carry the match configuration; anything invalid falls back to the classic rules. */
function replayConfig(text: string): MatchConfig {
  try { return parseMatchConfig((JSON.parse(text) as { config?: unknown }).config) ?? CLASSIC_CONFIG } catch { return CLASSIC_CONFIG }
}
const RECRUITER_IDS = ['recruiter_one', 'recruiter_two'] as const

export function AuctionPage({ onOnline, online, teamName, onEditName, nameStorageWarning = false }: AuctionPageProps) {
  const { t } = useTranslation()
  const categoryLabel = (id: ThemedModeId) => t(id === 'ARGENTINA_CLUBS' ? 'modes.items.argentinaClubs.name' : 'categoryTree.options.' + id)
  const [entryChosen, setEntryChosen] = useState(false)
  const entryHeading = useRef<HTMLHeadingElement>(null)
  const [opponentMode, setOpponentMode] = useState<'hotseat' | 'cpu'>('hotseat')
  const [strategy, setStrategy] = useState<CpuStrategy>('BALANCED')
  const [difficulty, setDifficulty] = useState<CpuDifficulty>('HARD')
  const [pauseMs, setPauseMs] = useState(650)
  const [replayText, setReplayText] = useState('')
  const [storageWarning, setStorageWarning] = useState(false)
  const [secondCategory, setSecondCategory] = useState<ThemedModeId | 'same'>('same')
  const [mode, setMode] = useState<ThemedModeId>('GLOBAL_CLASSIC')
  /** Mode of the running game; the setup screen follows `mode`. */
  const [gameMode, setGameMode] = useState<ThemedModeId>('GLOBAL_CLASSIC')
  /** Live draw in progress for two different categories (local games only); becomes a normal game once both elevens are complete. */
  const [dual, setDual] = useState<{ readonly draft: DualDraft; readonly first: ThemedModeId; readonly second: ThemedModeId; readonly vsCpu: boolean } | null>(null)
  const [liveOrigin, setLiveOrigin] = useState<Session | null>(null)
  const [matchMode, setMatchMode] = useState<'live' | 'quick'>('live')
  const [localGame, setLocalGame] = useState<RecruiterDuelGame | null>(null)
  const game = online ? online.game : localGame
  const entryVisible = !game && !dual
  useEffect(() => { if (entryVisible) entryHeading.current?.focus() }, [entryChosen, entryVisible])
  const [pitchesOpen, setPitchesOpen] = useState(false)

  const auctionAction = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (game?.phase === 'ROUND_RESULT' || game?.phase === 'REVEAL_PLAYER') auctionAction.current?.focus({ preventScroll: true })
  }, [game?.phase, game?.roundIndex])
  /** Online, every change is an intent applied to the latest shared state; leaving the game exits the room. */
  const onlineSubmit = online?.submit; const onlineExit = online?.exit
  const setGame = useCallback((value: SetStateAction<RecruiterDuelGame | null>) => {
    if (!onlineSubmit) return setLocalGame(value)
    if (value === null) return onlineExit?.()
    onlineSubmit((current) => (typeof value === 'function' ? value(current) : value) ?? current)
  }, [onlineSubmit, onlineExit])
  const catalog = useMemo(() => game && (game.legacyCatalog || online && !game.manualBench) ? DRAFT_CATALOG : recordedCollection(game?.drawContext?.catalogKey) ?? (game?.categoryPair ? crossCategoryCatalog(game.categoryPair.recruiter_one, game.categoryPair.recruiter_two) : catalogForMode(game ? game.coachMode ?? gameMode : mode)), [game, gameMode, mode, online])
  const playerById = (id: string) => catalog.find((player) => player.id === id)!
  const [error, setError] = useState<string | null>(null)
  const [autoFailedSeed, setAutoFailedSeed] = useState<string | null>(null)
  /** Rounds the interface closed for the CPU because the human had no legal action in them (shown as automatic awards). */
  const [autoRoundState, setAutoRoundState] = useState<{ seed: string; rounds: ReadonlySet<number> }>({ seed: '', rounds: new Set() })
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
  const customConfig: MatchConfig = { version: MATCH_CONFIG_VERSION, budget: customBudget, names: { recruiter_one: sanitizeName(setup.nameOne), recruiter_two: sanitizeName(setup.nameTwo) }, substitutes: setup.substitutes, ...(setup.coaches ? { coaches: true, coachReserve: setup.coachReserve ?? COACH_MAX_PRICE, coachMarket: COACH_MARKET_V4 } : {}), bench: BENCH_SHOWCASE_V1, discards: DISCARDS_MARKER_V2 }
  const setupPreflight = isValidBudget(customBudget) ? preflightMatchConfig(catalog, customConfig) : { ok: false as const, reason: 'budget_range' as const }
  const classicConfig = { ...CLASSIC_CONFIG, bench: BENCH_SHOWCASE_V1, discards: DISCARDS_MARKER_V2, budget: Math.max(defaultBudgetForMode(mode), secondCategory === 'same' ? 0 : defaultBudgetForMode(secondCategory)) }
  const config = setup.mode === 'custom' ? customConfig : setup.coaches ? { ...classicConfig, coaches: true, coachReserve: setup.coachReserve ?? COACH_MAX_PRICE, coachMarket: COACH_MARKET_V4 } : classicConfig
  const canStart = preflightMatchConfig(catalog, config).ok && (setup.mode === 'classic' || (setupPreflight.ok && Object.keys(nameIssues(customConfig.names)).length === 0))
  const start = () => {
    if (!canStart) return
    setMatchMode('live')
    const saved = readDrawHistory({ getItem: (key) => window.localStorage.getItem(key) }, catalog, drawHistoryKey(mode))
    const recent = saved.history.games.flatMap((entry) => {
      const previous = createRecruiterDuel(catalog, entry.seed, entry.context)
      return previous.ok ? [previous.game.rounds.map((item) => item.playerId)] : []
    })
    const context = createDrawContext(catalog, recent, CURRENT_DRAW_POLICY)
    let seed: string
    try { seed = newDrawSeed() }
    catch { return setError(t('draw.randomError')) }
    if (secondCategory !== 'same' && secondCategory !== mode && !online) {
      const live = createDualDraft(mode, secondCategory, seed, config)
      if (!live.ok) return setError(t(`duel.errors.${live.error}`))
      setGameMode(mode); setDual({ draft: live.draft, first: mode, second: secondCategory, vsCpu: opponentMode === 'cpu' }); setError(null)
    } else {
      const created = secondCategory !== 'same' && secondCategory !== mode ? createCrossCategoryDraw(mode, secondCategory, seed, config) : createRecruiterDuel(catalog, seed, context, config)
      if (!created.ok) return setError(t(`duel.errors.${created.error}`))
      setGameMode(mode); setGame({ ...created.game, coachMode: mode, manualBench: true }); setError(null)
    }
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
    const prior = RECORDED_COLLECTIONS.find(row => parseReplay(replayText, row.players))
    const replayMode = prior?.mode ?? [...PLAYABLE_MODES].find((candidate) => parseReplay(replayText, catalogForMode(candidate)))
    const replayCatalog = prior?.players ?? (replayMode ? catalogForMode(replayMode) : null)
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
    const timeout = window.setTimeout(revealToss, window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? COIN_TOSS_REDUCED_MS : COIN_TOSS_MS)
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
    const next = autoBuySubstitutes(autoChooseCoach(game, 'recruiter_two', catalog, selectCpuStrategy(game.teams.recruiter_two.lineup, catalog, game.seed, difficulty)), 'recruiter_two', catalog)
    // bench-showcase-v1: the CPU buys only on its own chances of the fixed showcase.
    const withBench = cpuShowcase(next, 'recruiter_two', catalog)
    if (withBench === game) return
    // Deferred like the other automatic steps, so the screen never changes inside the render pass.
    const timer = window.setTimeout(() => setGame((current) => (current === game ? withBench : current)), 0)
    return () => window.clearTimeout(timer)
  }, [opponentMode, game, catalog, difficulty, setGame])
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
  const cpuStrategy = useMemo(() => opponentMode === 'cpu' && game?.phase === 'TEAMS_COMPLETED' && cpuLineup ? selectCpuStrategy(cpuLineup, catalog, game.seed, difficulty) : undefined, [opponentMode, game, cpuLineup, catalog, difficulty])
  const recordDuel = (id: string, outcome: HistoryOutcome, score: { recruiter_one: number; recruiter_two: number } | null, abandonedBy: 'recruiter_one' | 'recruiter_two' | null) => {
    matchHistory.record({ id, at: new Date().toISOString(), mode: gameMode, opponent: opponentMode, names: { recruiter_one: names.recruiter_one, recruiter_two: names.recruiter_two }, outcome, score, abandonedBy })
  }
  const goHome = () => {
    if (online) return online.exit()
    setLiveOrigin(null); setDual(null); setGame(null); setEntryChosen(false); setStrategyChoice(null); setError(null)
  }
  const abandon = (participant: 'recruiter_one' | 'recruiter_two') => {
    if (!game) return
    if (online) return online.forfeit()
    recordDuel(game.seed, participant === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one', null, participant)
    goHome()
  }
  /** Starts the match. Returns false when the engine refuses, so the start button can be used again. */
  const playMatch = (current: RecruiterDuelGame, first: StrategyId, second: StrategyId) => {
    if (!online && current.manualBench && matchMode === 'live') {
      const created = createDuelSession(current, catalog, { recruiter_one: first, recruiter_two: second }, opponentMode === 'cpu' ? 'directed-header-v1' : false, true, opponentMode === 'cpu', opponentMode === 'cpu', opponentMode === 'cpu', { precisionShot: opponentMode === 'cpu', defenseMini: opponentMode === 'cpu', shootout: opponentMode === 'cpu' })
      if (!created.ok) { setError(t('liveDT.error', { code: created.error })); return false }
      setLiveOrigin(created.value)
      return true
    }
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
  /** Editorial position in the category being played (the assigned category of each participant in a crossing). Hidden in historical games: their catalogue is a frozen one. */
  const rankingFor = (player: Player | null, participant?: RecruiterId) => {
    if (!game || !player || game.legacyCatalog || recordedCollection(game.drawContext?.catalogKey)) return null
    if (!game.categoryPair) return rankBadge(game.coachMode ?? mode, player.id)
    const own = participant ?? game.activeParticipant ?? 'recruiter_one'
    return rankBadge(game.categoryPair[own], player.id) ?? rankBadge(game.categoryPair[own === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one'], player.id)
  }
  const offerKey = game ? [game.seed, game.roundIndex, currentRound(game)?.playerId, game.activeParticipant, game.currentBid?.amount ?? 0].join(':') : ''
  const offer = offerInput?.key === offerKey ? offerInput.value : minimum
  const availability = game && game.activeParticipant && !remoteTurn ? auctionAvailability(game, game.activeParticipant, catalog, offer, cpuTurn) : null
  const progress = game?.activeParticipant && round ? positionProgress(game.teams[game.activeParticipant], round.position) : null
  const orderingDone = (participant: RecruiterId) => (opponentMode === 'cpu' && participant === 'recruiter_two') || (lineupConfirmed.seed === game?.seed && lineupConfirmed[participant])
  /** Confirming the squad closes the optional bench for that participant: the remaining chances go to the other one. */
  const finishBench = (participant: RecruiterId) => { if (!game || !isShowcaseBench(game.config)) return; const result = finishShowcase(game, participant, catalog); if (result.ok) setGame(result.game) }
  const setOrderingDone = (participant: RecruiterId, value: boolean) => game && (value && finishBench(participant), setLineupConfirmed((current) => ({ ...(current.seed === game.seed ? current : { seed: game.seed, recruiter_one: false, recruiter_two: false }), [participant]: value })))
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
  /** Same transition as the «continue» button; used by the button and by the automatic close of rounds the human cannot act on. */
  const advanceRound = () => setGame((current) => {
    if (!current || current.phase !== 'ROUND_RESULT' || current.roundIndex !== game?.roundIndex) return current
    const next = nextAuctionRound(current, catalog); if (!next.ok) return current
    const reveal = revealNextAuctionRound(next.game); return reveal.ok ? reveal.game : next.game
  })
  /** Local game against the CPU only: the CPU took a card of a line the human already filled (or the engine forced it), so there is no human decision left. */
  const noHumanDecision = !!game && !online && opponentMode === 'cpu' && game.phase === 'ROUND_RESULT' && !!game.lastAward && game.lastAward.winner === 'recruiter_two' && game.lastAward.reason !== 'auto_complete'
    && (game.lastAward.reason === 'forced_viability' || (footballer !== null && positionProgress(game.teams.recruiter_one, footballer.position).remaining === 0))
  useEffect(() => {
    if (!noHumanDecision) return
    const timer = window.setTimeout(advanceRound, window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 1400)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noHumanDecision, game?.roundIndex])
  /** Whose wallet is shown: the online player, the human against the CPU, otherwise whoever acts now (bidder, round opener or the recruiter organising the squad). */
  const walletSide: RecruiterId | null = !game || !['REVEAL_PLAYER', 'BIDDING', 'ROUND_RESULT', 'NEXT_ROUND', 'DISCARD_RESULT', 'TEAMS_COMPLETED'].includes(game.phase) ? null
    : online ? online.mySide : opponentMode === 'cpu' ? 'recruiter_one' : game.phase === 'TEAMS_COMPLETED' ? RECRUITER_IDS.find((participant) => !orderingDone(participant)) ?? 'recruiter_one' : game.activeParticipant ?? hud?.turn ?? 'recruiter_one'
  const names = { recruiter_one: (!online ? teamName : undefined) ?? game?.config?.names.recruiter_one ?? t('duel.recruiters.recruiter_one'), recruiter_two: game?.config?.names.recruiter_two ?? (opponentMode === 'cpu' ? 'CPU' : t('duel.recruiters.recruiter_two')) }
  const autoRounds = autoRoundState.seed === game?.seed ? autoRoundState.rounds : NO_AUTO_ROUNDS
  const liveMarket = useLiveMarket(game, catalog, names, autoRounds)
  /**
   * Local game against the CPU only. At the reveal of a card of a line the human already filled, the human has no legal action and the CPU
   * is the only possible recipient: the round is resolved through the engine's own transitions (reveal, human pass, CPU turn, award, next card).
   * It stops by itself as soon as a card the human can still acquire shows up, and never touches hot-seat or online games.
   */
  const autoRound = !!game && !online && opponentMode === 'cpu' && game.phase === 'REVEAL_PLAYER' && footballer !== null && !cpuAuto && positionProgress(game.teams.recruiter_one, footballer.position).remaining === 0
  useEffect(() => {
    if (!autoRound || !game) return
    const timer = window.setTimeout(() => {
      const resolved = resolveIrrelevantRound(game, catalog, strategy, difficulty)
      if (!resolved) return
      setAutoRoundState((current) => ({ seed: game.seed, rounds: new Set([...(current.seed === game.seed ? current.rounds : []), game.roundIndex]) }))
      setGame((current) => (current === game ? resolved : current))
    }, window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 450)
    return () => window.clearTimeout(timer)
  }, [autoRound, game, catalog, strategy, difficulty, setGame])

  const dualFirst = dual?.first; const dualSecond = dual?.second
  const dualCatalog = useMemo(() => dualFirst && dualSecond ? crossCategoryCatalog(dualFirst, dualSecond) : [], [dualFirst, dualSecond])
  const cpuCursor = dual?.draft.sides.recruiter_two.cursor; const dualVsCpu = dual?.vsCpu; const cpuDone = dual ? isSideComplete(dual.draft.sides.recruiter_two) : true
  // The computer decides on its own cards at a readable pace, independently of the person.
  useEffect(() => {
    if (!dualVsCpu || cpuDone) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => setDual((current) => {
      if (!current || isSideComplete(current.draft.sides.recruiter_two)) return current
      const result = cpuAct(current.draft, 'recruiter_two', crossCategoryCatalog(current.first, current.second))
      return result.ok ? { ...current, draft: result.draft } : current
    }), reduced ? 150 : 1100)
    return () => window.clearTimeout(timer)
  }, [dualVsCpu, cpuCursor, cpuDone])
  const dualAct = (id: RecruiterId, act: typeof signCard) => setDual((current) => {
    if (!current) return current
    const result = act(current.draft, id, crossCategoryCatalog(current.first, current.second))
    return result.ok ? { ...current, draft: result.draft } : current
  })
  const finishDual = () => {
    if (!dual || !dualComplete(dual.draft)) return
    const created = finishDualDraft(dual.draft, dual.first, dual.second)
    if (!created.ok) return setError(t(`duel.errors.${created.error}`))
    setGame({ ...created.game, coachMode: dual.first, manualBench: true }); setDual(null); setError(null)
  }
  if (dual && !game) {
    const dualNames = { recruiter_one: teamName ?? dual.draft.config.names.recruiter_one ?? t('duel.recruiters.recruiter_one'), recruiter_two: dual.draft.config.names.recruiter_two ?? (dual.vsCpu ? 'CPU' : t('duel.recruiters.recruiter_two')) }
    return <div className="draft-app duel-shell"><header className="draft-header"><a className="brand" href="#duel-main" aria-label={PRODUCT.name}><span className="brand-emblem">R</span><span>{PRODUCT.name}</span></a><AudioControls /><LanguageSelector /></header>
      <main id="duel-main" className="duel-page">
        <DualDraftScreen draft={dual.draft} catalog={dualCatalog} names={dualNames} categoryLabel={(id) => categoryLabel(id as ThemedModeId)} humans={dual.vsCpu ? ['recruiter_one'] : ['recruiter_one', 'recruiter_two']}
          onSign={(id) => dualAct(id, signCard)} onDiscard={(id) => dualAct(id, discardCard)} onContinue={finishDual} onAbandon={goHome} />
        {error && <div className="draft-alert" role="alert"><p>{error}</p></div>}
      </main></div>
  }
  if (liveOrigin && game && !online) return <div className="draft-app duel-shell"><header className="draft-header"><a className="brand" href="#match-main">{PRODUCT.name}</a><AudioControls /><LanguageSelector /></header><LiveSeriesScreen origin={liveOrigin} acquisition={game} versusCpu={opponentMode === 'cpu'} difficulty={difficulty} names={{ local: names.recruiter_one, cpu: names.recruiter_two }} onReturn={goHome} onRematch={() => { setLiveOrigin(null); start() }} onNewMatch={() => { setLiveOrigin(null); setGame(null) }} onSeriesFinished={(winner, wins) => recordDuel(game.seed, winner === 'local' ? 'recruiter_one' : 'recruiter_two', { recruiter_one: wins.local, recruiter_two: wins.cpu }, null)} /></div>
  if (game && (game.phase === 'SIMULATING' || game.phase === 'MATCH_RESULT') && game.matchResult) {
    const Screen = online && !game.matchResult.actionModel ? MatchScreen : MatchSeriesScreen
    return <div className="draft-app duel-shell"><header className="draft-header"><a className="brand" href="#match-main" aria-label={PRODUCT.name}><span className="brand-emblem">R</span><span>{PRODUCT.name}</span></a><AudioControls /><LanguageSelector /></header><Screen key={game.matchResult.seed} canAdjust={!online} secondIsHuman={opponentMode !== 'cpu'} onSeriesFinished={(winner, wins) => { if (!online) recordDuel(game.seed, winner === 'local' ? 'recruiter_one' : 'recruiter_two', { recruiter_one: wins.local, recruiter_two: wins.cpu }, null) }} result={game.matchResult} catalog={catalog} localName={names.recruiter_one} cpuName={names.recruiter_two} onFinished={() => { if (!online && game.phase === 'SIMULATING') apply(completeDuelMatch(game)) }} showNewMatchActions={!online} returnLabel={online ? t('navigation.rooms') : undefined} exitWarning={online ? t('navigation.onlinePlaybackExit') : undefined} onNewMatch={online ? undefined : () => setGame(null)} onRematch={online ? online.exit : start} onReturn={goHome} /></div>
  }
  return <div className="draft-app duel-shell">
    <header className="draft-header"><a className="brand" href="#duel-main" aria-label={PRODUCT.name}><span className="brand-emblem">R</span><span>{PRODUCT.name}</span></a><AudioControls /><LanguageSelector /></header>
    <main id="duel-main" className="duel-page">
      {game && <div className="auction-top-strip"><section className="active-category-banner" aria-label={t('rosterUX.category')}><span>{t('rosterUX.category')}</span><strong>{categoryLabel(game.categoryPair?.recruiter_one ?? game.coachMode ?? mode)}</strong>{game.categoryPair && <small>{names.recruiter_two} · {categoryLabel(game.categoryPair.recruiter_two)}</small>}</section>{!online && <ConfirmNavigation label={t('navigation.home')} message={t('navigation.recruitmentExitWarning')} onConfirm={goHome} />}<AbandonGame versusCpu={opponentMode === 'cpu'} names={names} onAbandon={abandon} onlySide={online?.mySide} /></div>}
      {!game && <section className="duel-intro entry-flow">
        <p className="eyebrow"><span />{t('entry.eyebrow')}</p><h1>{t('duel.title')}</h1>
        {teamName && !online && <div className="team-name-home"><strong>{teamName}</strong><button className="secondary-action" onClick={onEditName}>{t('teamName.edit')}</button></div>}
        {nameStorageWarning && <p role="status">{t('teamName.storageWarning')}</p>}
        <p className="entry-caption">{t('entry.intro')}</p>
        {!entryChosen ? <>
          <h2 ref={entryHeading} tabIndex={-1}>{t('entry.chooseRival')}</h2>
          <div className="entry-rivals">
            <button className="primary-action" onClick={() => { setOpponentMode('cpu'); setEntryChosen(true) }}>{t('entry.cpu')}</button>
            {onOnline && <button className="secondary-action" onClick={onOnline}>{t('entry.online')}</button>}
            <button className="secondary-action" onClick={() => { setOpponentMode('hotseat'); setEntryChosen(true) }}>{t('entry.local')}</button>
          </div>

        </> : <>
          <button className="secondary-action" onClick={() => setEntryChosen(false)}>{t('entry.back')}</button>
          <h2 ref={entryHeading} tabIndex={-1}>{t(opponentMode === 'cpu' ? 'entry.cpu' : 'entry.local')}</h2>
          <EditionHero mode={mode} rivalMode={secondCategory === 'same' ? undefined : secondCategory} budget={config.budget} reserve={config.coaches ? config.coachReserve ?? 0 : 0}>
            <button className="primary-action edition-start" disabled={!canStart} onClick={start}>{t('duel.start')}</button>
          </EditionHero>
          <ModeSelector selected={mode} onChange={setMode} />
          <details className="entry-options"><summary>{t('entry.customize')}</summary>
            <label>{t('cpu.opponent')}<select value={opponentMode} onChange={(event) => setOpponentMode(event.target.value as 'hotseat' | 'cpu')}><option value="hotseat">{t('cpu.hotseat')}</option><option value="cpu">{t('cpu.versus')}</option></select></label>
            {opponentMode === 'cpu' && <><label>{t('cpu.strategy')}<select value={strategy} onChange={(event) => setStrategy(event.target.value as CpuStrategy)}>{CPU_STRATEGIES.map((item) => <option key={item} value={item}>{t('cpu.profiles.' + item)}</option>)}</select></label><label>{t('cpu.difficulty')}<select value={difficulty} onChange={(event) => setDifficulty(event.target.value as CpuDifficulty)}>{CPU_DIFFICULTIES.map((item) => <option key={item} value={item}>{t('cpu.difficulties.' + item)}</option>)}</select></label><p>{t('cpu.difficultyHint')}</p><label>{t('cpu.pause')}<input type="number" min={0} max={3000} step={50} value={pauseMs} onChange={(event) => setPauseMs(Math.max(0, Math.min(3000, Number(event.target.value))))} /></label><div className="cpu-pause-presets" role="group" aria-label={t('cpu.pause')}>{([['fast', 250], ['normal', 650], ['slow', 1200]] as const).map(([key, ms]) => <button key={key} type="button" className="secondary-action" aria-pressed={pauseMs === ms} onClick={() => setPauseMs(ms)}>{t(`cpu.pausePreset.${key}`, { ms })}</button>)}</div></>}
            <MatchSetupPanel classicBudget={classicConfig.budget} draft={setup} onChange={setSetup} versusCpu={opponentMode === 'cpu'} preflight={setupPreflight} />
            <label>{t('playtest.opponentCategory')}<select value={secondCategory} onChange={(e) => setSecondCategory(e.target.value as ThemedModeId | 'same')}><option value="same">{t('playtest.sameCategory')}</option>{[...PLAYABLE_MODES].filter((id) => id !== 'ARGENTINA_CLUBS').map((id) => <option key={id} value={id}>{t('categoryTree.options.' + id)}</option>)}</select></label>{secondCategory !== 'same' && secondCategory !== mode && <p>{t('playtest.mixedHelp')}</p>}
          </details>
        </>}

        <details className="entry-options"><summary>{t('entry.more')}</summary><HistoryPanel /><details className="draw-replay"><summary>{t('draw.reproduce')}</summary><p>{t('draw.explanation')}</p><label>{t('draw.context')}<textarea value={replayText} onChange={(event) => setReplayText(event.target.value)} /></label><button className="secondary-action" onClick={reproduce}>{t('draw.reproduce')}</button></details></details>
      </section>}
      {(() => { const topic = helpTopicForPhase(game?.phase); return game && topic && !(game && ['SIMULATING', 'MATCH_RESULT', 'DISCARD_RESULT', 'COIN_TOSS', 'NEXT_ROUND'].includes(game.phase)) ? <HelpTip topic={topic} /> : null })()}
      {online && online.connection !== 'connected' && <p className="auction-banner auction-banner-blocked" role="status">{t('online.connection.' + online.connection)}</p>}
      {game && walletSide && (hud ? <AuctionHeader game={game} catalog={catalog} side={walletSide} name={names[walletSide]} hud={hud} /> : <Wallet game={game} catalog={catalog} side={walletSide} name={names[walletSide]} />)}
      {game && !game.categoryPair && !hud && <p className="discard-counter" role="status">{t('discards.available', { count: game.discardsRemaining })}{game.discardsRemaining === 0 && <span> · {t('discards.exhausted')}</span>}</p>}
      {game?.phase === 'DISCARD_RESULT' && game.lastDiscard && <section className="discard-scene" aria-live="polite"><h2>{t('discards.newDraw')}</h2><DiceRoller key={game.lastDiscard.playerId} position={playerById(game.lastDiscard.playerId).position} tier={diceTier(playerById(game.lastDiscard.playerId).overall_rating)} roundNumber={game.roundIndex + 1} /><div className="card-discard"><PlayerIdentity player={playerById(game.lastDiscard.playerId)} /></div></section>}
      {hud && game && <AuctionHud hud={hud} names={names} viewer={walletSide ?? 'recruiter_one'} currentPosition={game.phase === 'BIDDING' || game.phase === 'REVEAL_PLAYER' ? footballer?.position : undefined} onShowPitches={() => { setPitchesOpen(true); const court = document.getElementById('team-progress'); court?.focus({ preventScroll: true }); court?.scrollIntoView?.({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }) }} />}
      {game && ['REVEAL_PLAYER', 'BIDDING', 'ROUND_RESULT', 'NEXT_ROUND', 'DISCARD_RESULT'].includes(game.phase) && <LiveMarketPanel market={liveMarket} />}
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
        {game.phase !== 'TEAMS_COMPLETED' && !cpuAuto && round && footballer && <section className="auction-board" aria-live="polite"><div className="auction-heading"><span className="category-chip">{categoryLabel(game.coachMode ?? mode)}</span><p>{t('duel.opening', { participant: names[game.openingOrder[game.roundIndex]] })}</p></div><div className="auction-candidate" key={footballer.id}><PlayerIdentity player={footballer} /></div>
          {game.phase === 'REVEAL_PLAYER' && <div className="duel-actions reveal-actions">{game.roundIndex === 0 && <><FootballCoin side={game.coinResult!} /><p>{t('coin.result', { side: t(`duel.${game.coinResult}`), participant: names[game.coinTossWinner!] })}</p></>}<button ref={auctionAction} className="primary-action" onClick={() => apply(beginBidding(game))}>{t('duel.beginBidding')}</button></div>}
          {mustSkip && game.activeParticipant && footballer && <section className="bid-panel auction-banner auction-banner-blocked" role="status"><strong>{t('auctionActions.autoSkip', { participant: names[game.activeParticipant], position: t(`positions.${footballer.position}`) })}</strong></section>}
          {game.phase === 'BIDDING' && game.activeParticipant && !cpuTurn && !remoteTurn && !mustSkip && <AuctionBidPanel game={game} side={game.activeParticipant} footballer={footballer} names={names} availability={availability} offer={offer} minimum={minimum} onOffer={(value) => setOfferInput({ key: offerKey, value })} blockedMessage={blockedMessage} progress={progress} hud={hud ?? null}
            passLabel={t(availability?.replacement && game.passedParticipants.length ? 'discards.confirm' : availability?.passAward && !game.currentBid && availability.passAward.winner === game.activeParticipant ? 'auctionActions.claim' : availability?.passAward?.reason && availability.passAward.reason !== 'voluntary_bid' ? 'auctionActions.confirmAssignment' : 'duel.pass')}
            assignmentSpecial={!!availability && !!(availability.replacement || (availability.passAward && availability.passAward.reason !== 'voluntary_bid') || availability.pass.reason)}
            assignment={availability ? <p id="auction-assignment" className="assignment-notice" role="status">{availability.replacement ? t('discards.doublePass', { count: game.discardsRemaining, position: t(`positions.${footballer.position}`) }) : availability.passAward ? t(availability.passAward.reason === 'voluntary_bid' ? 'auctionActions.passAwards' : 'auctionActions.mandatory', { participant: names[availability.passAward.winner], amount: availability.passAward.price }) : availability.fallback ? t('auctionActions.doublePass', { participant: names[availability.fallback.winner], amount: availability.fallback.price }) : availability.pass.reason ? t('auctionActions.blocks.' + availability.pass.reason) : null}</p> : null}
            onBid={recordBid} onPass={recordPass} />}
          {game.phase === 'BIDDING' && availability?.discardReason && <p className="assignment-notice" role="status">{t('discards.noReplacement')}</p>}
          {remoteTurn && game.activeParticipant && <section className="bid-panel auction-banner" role="status"><strong>{t('online.duel.waitingBid', { name: names[game.activeParticipant] })}</strong></section>}
          {cpuTurn && <section className="bid-panel" role="status">{t('auctionActions.blocks.CPU_THINKING')}</section>}
          {lastCpuDecision?.type === 'cpu_decision' && <p className="cpu-status" role="status">{t(lastCpuDecision.action === 'bid' ? 'cpu.bids' : 'cpu.passes', {amount:lastCpuDecision.amount})}</p>}
          {game.phase === 'ROUND_RESULT' && game.lastAward && <section className="award-result"><SigningReveal rank={rankingFor(footballer, game.lastAward.winner)} />{game.lastAward.reason === 'voluntary_bid' && (online ? game.lastAward.winner === online.mySide : (opponentMode !== 'cpu' || game.lastAward.winner === 'recruiter_one')) && <WinCelebration participant={names[game.lastAward.winner]} player={footballer.name} amount={game.lastAward.price} />}{game.lastAward.reason === 'voluntary_bid' && <p className="auction-banner auction-banner-won" role="status"><strong>{(() => { const viewer = online ? online.mySide : opponentMode === 'cpu' ? 'recruiter_one' : null; const award = game.lastAward; return viewer && award.winner !== viewer ? t('auctionBanner.youPassed', { winner: names[award.winner], player: footballer.name, amount: award.price }) : t('auctionBanner.rivalPassed', { rival: names[award.winner === 'recruiter_one' ? 'recruiter_two' : 'recruiter_one'], winner: names[award.winner], player: footballer.name, amount: award.price }) })()}</strong></p>}<h2>{t(game.lastAward.reason === 'voluntary_bid' ? 'duel.roundResult' : 'cpu.mandatory')}</h2>{opponentMode === 'cpu' && game.lastAward.winner === 'recruiter_two' && game.lastAward.reason === 'voluntary_bid' && <p>{t('cpu.wins')}</p>}<p>{t('duel.awardPlayer', { participant: names[game.lastAward.winner], player: footballer.name, amount: game.lastAward.price })}</p><button ref={auctionAction} className="primary-action" onClick={advanceRound}>{t(game.lastAward.reason === 'voluntary_bid' ? 'auctionBanner.confirmSigning' : 'duel.nextRound')}</button></section>}
        </section>}
        {game.phase === 'TEAMS_COMPLETED' && online && <OnlineTeamsStage game={game} online={online} names={names} catalog={catalog} />}
        {game.phase === 'TEAMS_COMPLETED' && !online && opponentMode === 'cpu' && <CpuSigningsSummary name={names.recruiter_two} items={game.record.flatMap((entry) => entry.type === 'award' && entry.reason === 'auto_complete' && entry.winner === 'recruiter_two' ? [{ player: playerById(entry.playerId).name, position: t(`positions.${playerById(entry.playerId).position}`), price: entry.price }] : [])} />}
        {game.phase === 'TEAMS_COMPLETED' && !online && (() => {
          if (!RECRUITER_IDS.every((participant) => isValidOrganizedLineup(game.teams[participant].lineup, catalog, budgetOf(game), game.teams[participant].formation))) {
            return <section className="teams-completed" role="alert"><p>{t('recovery.invalidTeams')}</p><button className="primary-action" onClick={goHome}>{t('recovery.restart')}</button></section>
          }
          const humans = RECRUITER_IDS.filter((participant) => !(opponentMode === 'cpu' && participant === 'recruiter_two'))
          const pending = humans.find((participant) => !orderingDone(participant))
          const bothReady = !pending
          const choice = bothReady ? (strategyChoice?.seed === game.seed ? strategyChoice.choice : startStrategyChoice(cpuStrategy)) : null
          const revealed = choice ? revealedStrategies(choice) : null
          const stage = !bothReady ? 1 : revealed ? 3 : 2
          const coachOpen = (pending ? [pending] : humans).some((participant) => game.config?.coaches && !game.teams[participant].coachId && !game.teams[participant].coachDeclined)
          const lockerStep = coachOpen ? 1 : isShowcaseBench(game.config) && !online && !showcaseClosed(game, catalog) ? 2 : 3
          const keep = (result: ChoiceTransition) => result.ok && setStrategyChoice({ seed: game.seed, choice: result.choice })
          return <section className="teams-completed">
            <p className="eyebrow"><span />{t('duel.teamsCompleted')}</p><h1>{t('duel.readyMatch')}</h1>
            <StageGuide key={game.seed} stage={!bothReady ? 'squad' : revealed ? 'ready' : 'strategy'} /><p className="stage-indicator" role="status">{t('stages.step', { current: stage, total: 3, label: t(['stages.order', 'stages.strategy', 'stages.reveal'][stage - 1]) })}</p>
            {choice && !choice.secondIsCpu && (choice.step === 'HANDOVER' || choice.step === 'SECOND') && <p className="stage-indicator" role="status">{t('stages.waitingSecond', { first: names.recruiter_one, second: names.recruiter_two })}</p>}
            {bothReady && <TeamPowerPanel game={game} catalog={catalog} sides={RECRUITER_IDS} names={names} />}
            {!bothReady && <details className="lineup-recap" open>
              <summary>{t('stages.showTeams')}</summary>
              <div className="team-comparison">{RECRUITER_IDS.map((participant) => <article key={participant}><h2>{names[participant]}</h2><strong>{t('duel.spent', { amount: game.teams[participant].spent })}</strong><p>{DRAFT_SLOTS.map((slot) => playerById(game.teams[participant].lineup[slot.id]!).name).join(' · ')}</p></article>)}</div>
              <ol className="locker-steps" aria-label={t('locker.stepsLabel')}>{(['coach', 'subs', 'lineup'] as const).map((key, index) => <li key={key} className={index + 1 === lockerStep ? 'is-current' : index + 1 < lockerStep ? 'is-done' : undefined} aria-current={index + 1 === lockerStep ? 'step' : undefined}><b>{index + 1}</b> {t(`locker.${key}`)}</li>)}</ol>
              {(pending ? [pending] : humans).map((participant) => <div key={`coach-${participant}`}>{game.config?.coaches && !game.teams[participant].coachDeclined && <CoachMarket game={game} participant={participant} name={names[participant]} locked={strategyChoice?.seed === game.seed && strategyChoice.choice.step !== 'FIRST'} onDecline={() => apply(declineCoach(game, participant))} onHire={(coachId) => { apply(chooseCoach(game, participant, coachId)) }} />}</div>)}
              {isShowcaseBench(game.config) && !online && <BenchShowcase game={game} catalog={catalog} names={names} humans={humans} onBuy={(participant, playerId) => apply(buyShowcaseCard(game, participant, playerId, catalog))} onPass={(participant) => apply(passShowcaseTurn(game, participant, catalog))} onFinish={finishBench} />}{(pending ? [pending] : humans).map((participant) => <div key={`squad-${participant}`}>{(!game.config?.coaches || game.teams[participant].coachId || game.teams[participant].coachDeclined) && <><SubstituteMarket game={game} participant={participant} name={names[participant]} catalog={catalog} locked={strategyChoice?.seed === game.seed && strategyChoice.choice.step !== 'FIRST'} onBuy={(playerId) => apply(buySubstitute(game, participant, playerId, catalog))} /><LineupOrganizer rankFor={rankingFor} onFormationChange={(formation) => apply(chooseFormation(game, participant, formation, catalog))} locked={strategyChoice?.seed === game.seed && strategyChoice.choice.step !== 'FIRST'} game={game} participant={participant} name={names[participant]} catalog={catalog} confirmed={orderingDone(participant)} onSwap={(first, second) => swapLineup(participant, first, second)} onBenchSwap={(benchIndex, slot) => benchSwap(participant, benchIndex, slot)} onConfirm={() => setOrderingDone(participant, true)} onEdit={() => setOrderingDone(participant, false)} /></>}</div>)}


            </details>}
            {revealed && game.manualBench && <fieldset className="match-mode"><legend>{t('liveDT.mode')}</legend><label><input type="radio" name="match-mode" checked={matchMode === 'live'} onChange={() => setMatchMode('live')} />{t('liveDT.direct')}</label><label><input type="radio" name="match-mode" checked={matchMode === 'quick'} onChange={() => setMatchMode('quick')} />{t('liveDT.quick')}</label></fieldset>}
            {choice && <>
              {opponentMode === 'cpu' && !revealed && <p role="status">{t('strategyChoice.cpuFixed')}</p>}
              <StrategyChoicePanel choice={choice} chooser={choice.step === 'SECOND' ? names.recruiter_two : names.recruiter_one} nextChooser={names.recruiter_two} names={{ first: names.recruiter_one, second: names.recruiter_two }}
                onConfirm={(strategy) => keep(confirmStrategy(choice, strategy))} onHandover={() => keep(acknowledgeHandover(choice))} onStart={() => revealed !== null && playMatch(game, revealed.first, revealed.second)} />
            </>}
            {error && <div className="draft-alert" role="alert"><p>{error}</p><button className="secondary-action" onClick={() => { setStrategyChoice(null); setError(null) }}>{t('recovery.retry')}</button></div>}
          </section>
        })()}
      </>}
      {game && <>{game.phase !== 'TEAMS_COMPLETED' && <TeamProgressBoard rankFor={rankingFor} open={pitchesOpen} onOpenChange={setPitchesOpen} game={game} catalog={catalog} names={names} />}<details className="draw-replay"><summary>{t('draw.export')}</summary><p>{t('draw.explanation')}</p><label>{t('draw.context')}<textarea readOnly value={JSON.stringify({ seed: game.seed, context: game.drawContext, ...(game.categoryPair ? { categoryPair: game.categoryPair } : {}), ...(game.config ? { config: game.config } : {}) })} /></label></details></>}
      {storageWarning && <p role="status">{t('draw.storageWarning')}</p>}
      <VisualCredits />
    </main>
  </div>
}
