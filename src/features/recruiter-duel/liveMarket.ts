import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import type { AuctionRecord, RecruiterDuelGame, RecruiterId } from './auctionTypes'

export type LiveEventKind = 'bid' | 'outbid' | 'pass' | 'award' | 'discard' | 'auto' | 'next'
export interface LiveEvent { readonly key: string; readonly kind: LiveEventKind; readonly text: string }
export interface LiveMarket { readonly headline: LiveEvent | null; readonly history: readonly LiveEvent[] }
export const LIVE_HISTORY_SIZE = 8

interface Names { readonly recruiter_one: string; readonly recruiter_two: string }
type Translate = (key: string, options?: Record<string, unknown>) => string
interface Draft { kind: LiveEventKind; key: string; text: string; auto?: { winner: string; player: string; amount: number } }

/**
 * «MERCADO EN VIVO»: what happened, read only from the engine ledger (game.record) and the phase — nothing is announced before
 * the transition exists. The newest event is the headline and replaces the previous one; older ones form a short history, and
 * consecutive automatic awards are grouped into one line. `autoRounds` marks rounds the interface resolved for the CPU.
 */
export function buildLiveMarket(game: RecruiterDuelGame | null, catalog: readonly Player[], names: Names, autoRounds: ReadonlySet<number>, t: Translate): LiveMarket {
  if (!game) return { headline: null, history: [] }
  const player = (id: string) => catalog.find((candidate) => candidate.id === id)
  const events: Draft[] = []
  const lastBid = new Map<number, RecruiterId>()
  game.record.forEach((entry: AuctionRecord, index) => {
    const key = `${game.seed}:${index}`
    if (entry.type === 'bid') {
      const rival = lastBid.get(entry.round)
      lastBid.set(entry.round, entry.participant)
      const outbid = rival !== undefined && rival !== entry.participant
      const params = { participant: names[entry.participant], amount: entry.amount, player: player(game.rounds[entry.round]?.playerId ?? '')?.name ?? '' }
      events.push({ kind: outbid ? 'outbid' : 'bid', key, text: t(outbid ? 'liveMarket.outbid' : 'notices.bid', params) })
    } else if (entry.type === 'pass') events.push({ kind: 'pass', key, text: t('notices.pass', { participant: names[entry.participant] }) })
    else if (entry.type === 'discard') events.push({ kind: 'discard', key, text: t('notices.discard', { left: game.discardsRemaining, position: t(`positions.${player(entry.replacementId)?.position ?? 'DEF'}`) }) })
    else if (entry.type === 'award') {
      const params = { winner: names[entry.winner], player: player(entry.playerId)?.name ?? '', amount: entry.price }
      if (entry.reason === 'auto_complete' || autoRounds.has(entry.round)) events.push({ kind: 'auto', key, text: t('liveMarket.auto', params), auto: params })
      else events.push({ kind: 'award', key, text: t(entry.reason === 'voluntary_bid' ? 'notices.award' : entry.reason === 'double_pass_priority' ? 'notices.awardPriority' : 'notices.awardForced', params) })
    }
  })
  // Group consecutive automatic awards into one line.
  const grouped: LiveEvent[] = []
  for (let index = 0; index < events.length; index++) {
    const event = events[index]
    if (event.kind !== 'auto') { grouped.push(event); continue }
    let end = index
    while (end + 1 < events.length && events[end + 1].kind === 'auto') end++
    const last = events[end]
    grouped.push(end > index ? { kind: 'auto', key: last.key, text: t('liveMarket.autoGroup', { count: end - index + 1, ...last.auto }) } : event)
    index = end
  }
  // The card that comes next is the newest novelty while it waits to be discovered.
  const upcoming = game.phase === 'REVEAL_PLAYER' && game.roundIndex > 0 ? player(game.rounds[game.roundIndex]?.playerId ?? '') : undefined
  const next: LiveEvent[] = upcoming ? [{ kind: 'next', key: `${game.seed}:next:${game.roundIndex}`, text: t('liveMarket.next', { player: upcoming.name, position: t(`positions.${upcoming.position}`) }) }] : []
  const all = [...grouped, ...next]
  const headline = all.at(-1) ?? null
  const history = all.slice(0, -1).filter((event) => event.kind !== 'next').slice(-LIVE_HISTORY_SIZE).reverse()
  return { headline, history }
}

export function useLiveMarket(game: RecruiterDuelGame | null, catalog: readonly Player[], names: Names, autoRounds: ReadonlySet<number>): LiveMarket {
  const { t } = useTranslation()
  const { recruiter_one: one, recruiter_two: two } = names
  return useMemo(() => buildLiveMarket(game, catalog, { recruiter_one: one, recruiter_two: two }, autoRounds, t as Translate), [game, catalog, one, two, autoRounds, t])
}
