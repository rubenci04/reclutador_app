import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Player } from '../../types/player'
import type { AuctionRecord, RecruiterDuelGame, RecruiterId } from './auctionTypes'
import { useToasts, type NoticeTone } from './useToasts'

export type { Notice, NoticeTone } from './useToasts'

/**
 * Plain-language messages for what just happened (bids, passes, awards, discards) and for what a person cannot do and why.
 * Records already on screen when the page opens never produce a message; only what is added afterwards does.
 */
export function useAuctionNotices(game: RecruiterDuelGame | null, catalog: readonly Player[], namesInput: Readonly<Record<RecruiterId, string>>, blocked: { readonly key: string; readonly message: string } | null) {
  const { t } = useTranslation()
  // The caller builds the names object on every render; only the two strings matter, so keep the callbacks stable.
  const { recruiter_one: one, recruiter_two: two } = namesInput
  const names = useMemo(() => ({ recruiter_one: one, recruiter_two: two }), [one, two])
  const { notices, push, dismiss } = useToasts()
  const seen = useRef<{ seed: string; records: number } | null>(null)
  const warned = useRef(new Set<string>())

  const playerName = useCallback((id: string) => catalog.find((player) => player.id === id)?.name ?? '', [catalog])
  const describe = useCallback((entry: AuctionRecord, current: RecruiterDuelGame): { tone: NoticeTone; text: string } | null => {
    if (entry.type === 'bid') return { tone: 'info', text: t('notices.bid', { participant: names[entry.participant], amount: entry.amount, player: playerName(current.rounds[entry.round]?.playerId ?? '') }) }
    if (entry.type === 'pass') return { tone: 'info', text: t('notices.pass', { participant: names[entry.participant] }) }
    if (entry.type === 'discard') {
      const replacement = catalog.find((player) => player.id === entry.replacementId)
      return { tone: 'warning', text: t('notices.discard', { left: current.discardsRemaining, position: replacement ? t(`positions.${replacement.position}`) : '' }) }
    }
    if (entry.type === 'award') {
      const params = { winner: names[entry.winner], player: playerName(entry.playerId), amount: entry.price }
      if (entry.reason === 'voluntary_bid') return { tone: 'success', text: t('notices.award', params) }
      if (entry.reason === 'double_pass_priority') return { tone: 'warning', text: t('notices.awardPriority', params) }
      if (entry.reason === 'forced_viability') return { tone: 'warning', text: t('notices.awardForced', params) }
    }
    return null
  }, [catalog, names, playerName, t])

  useEffect(() => {
    if (!game) { seen.current = null; return }
    const previous = seen.current
    seen.current = { seed: game.seed, records: game.record.length }
    if (!previous || previous.seed !== game.seed) return
    const fresh = game.record.slice(previous.records).map((entry) => describe(entry, game)).filter((item): item is { tone: NoticeTone; text: string } => item !== null)
    if (!fresh.length) return
    // A batch (early completion) is summarised by its last event, so the screen is not flooded.
    const last = fresh.at(-1)!
    const timer = window.setTimeout(() => push(last.tone, last.text), 0)
    return () => window.clearTimeout(timer)
  }, [game, describe, push])

  // "You cannot bid" appears by itself the first time it applies to a turn, not only when a button is clicked.
  const blockedKey = blocked?.key; const blockedMessage = blocked?.message
  useEffect(() => {
    if (!blockedKey || !blockedMessage || warned.current.has(blockedKey)) return
    warned.current.add(blockedKey)
    const timer = window.setTimeout(() => push('warning', blockedMessage), 0)
    return () => window.clearTimeout(timer)
  }, [blockedKey, blockedMessage, push])

  return { notices, push, dismiss }
}
