import { HelpTip } from '../onboarding/HelpTip'
import { TacticalSummary } from './TacticalSummary'
import { audio } from '../audio/audioEngine'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DRAFT_CATALOG } from '../draft/catalog'
import type { Player } from '../../types/player'
import { playbackFrames, visibleStats } from './playback'
import { ResultExplanation } from './ResultExplanation'
import { probabilityExplanation } from './probabilityExplanation'
import { playerName } from './simulator'
import type { MatchEvent, MatchResult, MatchSide } from './matchTypes'

interface MatchScreenProps {
  readonly resultExplanationNote?: string
  readonly result: MatchResult
  readonly onRematch: () => void
  readonly onNewMatch?: () => void
  readonly onReturn: () => void
  readonly localName?: string
  readonly cpuName?: string
  readonly onFinished?: () => void
  /** Players of the mode being played; Global (the 150) when omitted. */
  readonly catalog?: readonly Player[]
  readonly showNewMatchActions?: boolean
  readonly onReplayStart?: () => void
}

function money(value: number) { return `${value}M` }

function teamPlayers(result: MatchResult, side: MatchSide) { return result[side].players.map((player) => player.name).join(' · ') }

export function MatchScreen({ result, onRematch, onNewMatch = onRematch, onReturn, localName, cpuName, onFinished, catalog = DRAFT_CATALOG, showNewMatchActions = true, onReplayStart, resultExplanationNote }: MatchScreenProps) {
  const { t } = useTranslation()
  const playbackBlocks = useMemo(() => playbackFrames(result), [result])
  const intervalMs = (result.actionModel === 'action-v2' || result.actionModel === 'action-v3') ? 625 : 2500
  const [blockIndex, setBlockIndex] = useState(0)
  const [replayId, setReplayId] = useState(0)
  const reportedFinished = useRef(false)
  const finished = blockIndex >= playbackBlocks.length
  useEffect(() => {
    const interval = window.setInterval(() => setBlockIndex((current) => current >= playbackBlocks.length ? current : current + 1), intervalMs)
    return () => window.clearInterval(interval)
  }, [playbackBlocks.length, replayId, intervalMs])
  useEffect(() => { reportedFinished.current = false }, [result.seed, replayId])
  // Sounds follow what is on screen: only blocks that just became visible, once per replay.
  const heard = useRef<{ seed: string; replay: number; blocks: number; final: boolean } | null>(null)
  useEffect(() => {
    const shown = Math.min(blockIndex, playbackBlocks.length)
    const previous = heard.current
    if (!previous || previous.seed !== result.seed || previous.replay !== replayId) { heard.current = { seed: result.seed, replay: replayId, blocks: shown, final: finished }; return }
    for (const block of playbackBlocks.slice(previous.blocks, shown)) for (const item of block.events) if (item.type === 'goal') audio.play('goal')
    if (finished && !previous.final) audio.play('finalWhistle')
    heard.current = { seed: result.seed, replay: replayId, blocks: shown, final: finished }
  }, [blockIndex, replayId, result, finished, playbackBlocks])
  useEffect(() => { if (finished && !reportedFinished.current) { reportedFinished.current = true; onFinished?.() } }, [finished, onFinished])
  const visibleBlocks = playbackBlocks.slice(0, Math.min(blockIndex, playbackBlocks.length))
  const score = visibleBlocks.at(-1)?.score ?? { local: 0, cpu: 0 }
  const events = useMemo(() => visibleBlocks.flatMap((block) => block.events), [visibleBlocks])
  const displayedStats = (result.actionModel === 'action-v2' || result.actionModel === 'action-v3') && !finished ? visibleStats(events) : result.stats
  const recentGoal = visibleBlocks.at(-1)?.events.find((event) => event.type === 'goal')
  const recentAttack = visibleBlocks.at(-1)?.events.filter((event) => event.type === 'attack').at(-1)
  const outcome = result.winner === 'draw' ? 'draw' : result.winner === 'local' ? 'victory' : 'defeat'
  const powers = result.effectiveStrengths ?? result.strengths
  const teamName = (side: MatchSide | null) => side === 'local' ? (localName ?? t('game.myTeam')) : (cpuName ?? t('match.cpuTeam'))
  const eventText = (item: MatchEvent) => t(`match.events.${item.type}`, { team: teamName(item.side), player: playerName(item, catalog) ?? '', out: catalog.find((candidate) => candidate.id === item.outPlayerId)?.name ?? '' })
  return <main className="match-screen" aria-live="polite">
    {finished && result.seriesFormat === 'home-away' && <ResultExplanation key={result.seed + ':' + replayId} result={result} name={(side) => teamName(side)} note={resultExplanationNote} />}
    <section className="match-card" aria-label={t('match.versus')}>
      <HelpTip topic="match" />
      <header className="match-heading"><p className="eyebrow"><span />{finished ? t('match.final') : t('match.playing')}</p><button className="secondary-action" onClick={onReturn}>{t('match.returnDraft')}</button></header>
      <div className="match-scoreboard"><div><strong>{teamName('local')}</strong><small>{money(result.local.spent)} · {result.local.averageRating} GRL</small><small>{t('match.globalPower', { value: powers.local.global })}</small></div><div className="match-score"><span>{score.local}</span><small>{finished ? t(`match.${outcome}`) : t('match.minute', { minute: playbackBlocks[Math.min(blockIndex, playbackBlocks.length - 1)].minute })}</small><span>{score.cpu}</span></div><div><strong>{teamName('cpu')}</strong><small>{money(result.cpu.spent)} · {result.cpu.averageRating} GRL</small><small>{t('match.globalPower', { value: powers.cpu.global })}</small></div></div>
      <p className="power-explanation">{t('match.powerExplanation')} {result.actionModel && <small className="match-model">{t('match.model', { version: result.actionModel })}</small>}</p>
      {result.actionModel === 'action-v3' && <details className="match-probabilities"><summary>{t('playtest.measurable')}</summary><p>{t('playtest.probabilities', probabilityExplanation(result))}</p></details>}
      {(result.actionModel === 'action-v2' || result.actionModel === 'action-v3') && <p className="market-hint">{t('match.actionHelp')}</p>}
      {!finished && <div className={`live-match-pitch ${recentAttack?.side === 'cpu' ? 'toward-local' : ''}`} aria-label={t('series.livePitch')}><span className="live-center-circle" aria-hidden="true" /><span className="live-ball" aria-hidden="true">⚽</span><small>{recentAttack ? t('series.attacking', { name: teamName(recentAttack.side) }) : t('match.minute', { minute: 0 })}</small></div>}
      {recentGoal && <div className="goal-flash" key={result.seed + ':' + replayId + ':' + blockIndex} role="status"><svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="27" /><path d="m30 14 14 10-5 17H21l-5-17Z" /></svg>{t('match.goalCelebration', { team: teamName(recentGoal.side) })}</div>}
      <div className="match-progress" aria-label={t('match.progress')}><span style={{ width: `${(Math.min(blockIndex, playbackBlocks.length) / playbackBlocks.length) * 100}%` }} /></div>
      <div className="match-layout"><section className="match-narration"><h2>{t('match.versus')}</h2>{events.length ? <ol>{events.map((item, index) => <li className={item.type === 'goal' ? 'goal-event' : ''} key={`${item.minute}-${index}`}><time>{item.minute}'</time><span>{eventText(item)}</span>{item.tactic && <small className="event-tactic">{t('match.influence', { tactic: t(`match.tacticNotes.${item.tactic}`) })}</small>}</li>)}</ol> : <p>{t('match.minute', { minute: 0 })}</p>}</section><section className="match-stats"><h2>{t('match.statistics')}</h2>{(['shots', 'shotsOnTarget', 'saves', 'recoveries', 'possession'] as const).map((stat) => <div key={stat}><span>{displayedStats.local[stat]}{stat === 'possession' ? '%' : ''}</span><small>{t(`match.${stat === 'shotsOnTarget' ? 'onTarget' : stat}`)}</small><span>{displayedStats.cpu[stat]}{stat === 'possession' ? '%' : ''}</span></div>)}</section></div>
      {finished && <section className="match-summary"><h2>{t(`match.${outcome}`)} · {result.score.local}–{result.score.cpu}</h2><p>{teamPlayers(result, 'local')}</p><p>{teamPlayers(result, 'cpu')}</p><dl><div><dt>{t('match.attackPower')}</dt><dd>{powers.local.attack} · {powers.cpu.attack}</dd></div><div><dt>{t('match.defensePower')}</dt><dd>{powers.local.defense} · {powers.cpu.defense}</dd></div><div><dt>{t('match.midfieldControl')}</dt><dd>{powers.local.midfield} · {powers.cpu.midfield}</dd></div></dl><TacticalSummary result={result} teamName={teamName} /><div className="match-actions">{showNewMatchActions && <><button className="primary-action" onClick={onRematch}>{t('match.rematch')}</button><button className="secondary-action" onClick={onNewMatch}>{t('match.newMatch')}</button></>}<button className="secondary-action" onClick={() => { onReplayStart?.(); setBlockIndex(0); setReplayId((value) => value + 1) }}>{t('match.replay')}</button><button className="secondary-action" onClick={onReturn}>{t('match.returnDraft')}</button></div></section>}
    </section>
  </main>
}
