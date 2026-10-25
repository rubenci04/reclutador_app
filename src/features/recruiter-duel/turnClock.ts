import type { RecruiterDuelGame, RecruiterId } from './auctionTypes'
import type { OnlineDuelBinding } from './onlineBinding'

/** Mirrors the server limits (supabase/migrations/202610250002_online_turn_timer.sql); the server still decides every claim. */
export const BID_TURN_SECONDS = 120
export const STRATEGY_SECONDS = 300
/** The server refuses a claim during this grace period after the deadline, so the button waits as well. */
export const CLAIM_GRACE_SECONDS = 5

export const formatClock = (seconds: number) => { const whole = Math.max(0, Math.ceil(seconds)); return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}` }

/** Who the server is waiting for: the bidder, or whoever has not chosen a strategy yet. Null when nobody is late-able. */
export function pendingSide(game: RecruiterDuelGame, online: OnlineDuelBinding): RecruiterId | null {
  if (game.phase === 'BIDDING') return game.activeParticipant
  if (game.phase === 'TEAMS_COMPLETED') {
    const { recruiter_one: one, recruiter_two: two } = online.strategyReady
    if (one && two) return null
    return !one && !two ? online.mySide : one ? 'recruiter_two' : 'recruiter_one'
  }
  return null
}

