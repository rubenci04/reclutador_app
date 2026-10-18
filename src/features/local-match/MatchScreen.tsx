import { HelpTip } from '../onboarding/HelpTip'
import { TacticalSummary } from './TacticalSummary'
import { audio } from '../audio/audioEngine'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DRAFT_CATALOG } from '../draft/catalog'
import { playerName } from './simulator'
import type { MatchEvent, MatchResult, MatchSide } from './matchTypes'

interface MatchScreenProps {
  readonly result: MatchResult
  readonly onRematch: () => void
  readonly onReturn: () => void
  readonly localName?: string
  readonly cpuName?: string
  readonly onFinished?: () => void
}

function money(value: number) { return `${value}M` }

function teamPlayers(result: MatchResult, side: MatchSide) { return result[side].players.map((player) => player.name).join(' · ') }

export function MatchScreen({ result, onRematch, onReturn, localName, cpuName, onFinished }: MatchScreenProps) {
  const { t } = useTranslation()
  const [blockIndex, setBlockIndex] = useState(0)
  const [replayId, setReplayId] = useState(0)
  const reportedFinished = useRef(false)
  const finished = blockIndex >= result.blocks.length
  useEffect(() => {
    const interval = window.setInterval(() => setBlockIndex((current) => current >= result.blocks.length ? current : current + 1), 2500)
    return () => window.clearInterval(interval)
  }, [result.blocks.length, replayId])
  useEffect(() => { reportedFinished.current = false }, [result.seed, replayId])
  // Sounds follow what is on screen: only blocks that just became visible, once per replay.
  const heard = useRef<{ seed: string; replay: number; blocks: number; final: boolean } | null>(null)
  useEffect(() => {
    const shown = Math.min(blockIndex, result.blocks.length)
    const previous = heard.current
    if (!previous || previous.seed !== result.seed || previous.replay !== replayId) { heard.current = { seed: result.seed, replay: replayId, blocks: shown, final: finished }; return }
    for (const block of result.blocks.slice(previous.blocks, shown)) for (const item of block.events) if (item.type === 'goal') audio.play('goal')
    if (finished && !previous.final) audio.play('finalWhistle')
    heard.current = { seed: result.seed, replay: replayId, blocks: shown, final: finished }
  }, [blockIndex, replayId, result, finished])
  useEffect(() => { if (finished && !reportedFinished.current) { reportedFinished.current = true; onFinished?.() } }, [finished, onFinished])
  const visibleBlocks = result.blocks.slice(0, Math.min(blockIndex, result.blocks.length))
  const score = visibleBlocks.at(-1)?.score ?? { local: 0, cpu: 0 }
  const events = useMemo(() => visibleBlocks.flatMap((block) => block.events), [visibleBlocks])
  const recentGoal = visibleBlocks.at(-1)?.events.find((event) => event.type === 'goal')
  const outcome = result.winner === 'draw' ? 'draw' : result.winner === 'local' ? 'victory' : 'defeat'
  const teamName = (side: MatchSide | null) => side === 'local' ? (localName ?? t('game.myTeam')) : (cpuName ?? t('match.cpuTeam'))
  const eventText = (item: MatchEvent) => t(`match.events.${item.type}`, { team: teamName(item.side), player: playerName(item, DRAFT_CATALOG) ?? '', out: DRAFT_CATALOG.find((candidate) => candidate.id === item.outPlayerId)?.name ?? '' })
  return <main className="match-screen" aria-live="polite">
    <section className="match-card" aria-label={t('match.versus')}>
      <HelpTip topic="match" />
      <header className="match-heading"><p className="eyebrow"><span />{finished ? t('match.final') : t('match.playing')}</p><button className="secondary-action" onClick={onReturn}>{t('match.returnDraft')}</button></header>
      <div className="match-scoreboard"><div><strong>{teamName('local')}</strong><small>{money(result.local.spent)} · {result.local.averageRating} GRL</small><small>{t('match.globalPower', { value: result.strengths.local.global })}</small></div><div className="match-score"><span>{score.local}</span><small>{finished ? t(`match.${outcome}`) : t('match.minute', { minute: result.blocks[Math.min(blockIndex, 5)].minute })}</small><span>{score.cpu}</span></div><div><strong>{teamName('cpu')}</strong><small>{money(result.cpu.spent)} · {result.cpu.averageRating} GRL</small><small>{t('match.globalPower', { value: result.strengths.cpu.global })}</small></div></div>
      <p className="power-explanation">{t('match.powerExplanation')}</p>
      {recentGoal && <div className="goal-flash" key={result.seed + ':' + replayId + ':' + blockIndex} role="status"><svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="27" /><path d="m30 14 14 10-5 17H21l-5-17Z" /></svg>{t('match.goalCelebration', { team: teamName(recentGoal.side) })}</div>}
      <div className="match-progress" aria-label={t('match.progress')}><span style={{ width: `${(Math.min(blockIndex, 6) / 6) * 100}%` }} /></div>
      <div className="match-layout"><section className="match-narration"><h2>{t('match.versus')}</h2>{events.length ? <ol>{events.map((item, index) => <li className={item.type === 'goal' ? 'goal-event' : ''} key={`${item.minute}-${index}`}><time>{item.minute}'</time><span>{eventText(item)}</span>{item.tactic && <small className="event-tactic">{t('match.influence', { tactic: t(`match.tacticNotes.${item.tactic}`) })}</small>}</li>)}</ol> : <p>{t('match.minute', { minute: 0 })}</p>}</section><section className="match-stats"><h2>{t('match.statistics')}</h2>{(['shots', 'shotsOnTarget', 'saves', 'recoveries', 'possession'] as const).map((stat) => <div key={stat}><span>{result.stats.local[stat]}{stat === 'possession' ? '%' : ''}</span><small>{t(`match.${stat === 'shotsOnTarget' ? 'onTarget' : stat}`)}</small><span>{result.stats.cpu[stat]}{stat === 'possession' ? '%' : ''}</span></div>)}</section></div>
      {finished && <section className="match-summary"><h2>{t(`match.${outcome}`)} · {result.score.local}–{result.score.cpu}</h2><p>{teamPlayers(result, 'local')}</p><p>{teamPlayers(result, 'cpu')}</p><dl><div><dt>{t('match.attackPower')}</dt><dd>{result.strengths.local.attack} · {result.strengths.cpu.attack}</dd></div><div><dt>{t('match.defensePower')}</dt><dd>{result.strengths.local.defense} · {result.strengths.cpu.defense}</dd></div><div><dt>{t('match.midfieldControl')}</dt><dd>{result.strengths.local.midfield} · {result.strengths.cpu.midfield}</dd></div></dl><TacticalSummary result={result} teamName={teamName} /><div className="match-actions"><button className="primary-action" onClick={onRematch}>{t('match.rematch')}</button><button className="secondary-action" onClick={onRematch}>{t('match.newMatch')}</button><button className="secondary-action" onClick={() => { setBlockIndex(0); setReplayId((value) => value + 1) }}>{t('match.replay')}</button><button className="secondary-action" onClick={onReturn}>{t('match.returnDraft')}</button></div></section>}
    </section>
  </main>
}
