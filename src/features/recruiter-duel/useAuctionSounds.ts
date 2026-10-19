import { useEffect, useRef } from 'react'
import { audio } from '../audio/audioEngine'
import type { SoundId } from '../audio/soundEffects'
import type { AuctionPhase, AuctionRecord, RecruiterDuelGame } from './auctionTypes'

const SOUND_FOR_RECORD: Partial<Record<AuctionRecord['type'], SoundId>> = { bid: 'bid', award: 'award', discard: 'discard', coin_toss: 'coinLand' }
/** Winning the auction has its own cue; forced and completion awards keep the plain one. */
export const soundForRecord = (entry: AuctionRecord): SoundId | undefined => (entry.type === 'award' && entry.reason === 'voluntary_bid' ? 'signing' : SOUND_FOR_RECORD[entry.type])

/**
 * Plays each auction sound exactly once, from what is NEW in the stored game (records appended, phase entered).
 * Re-renders, strict-mode effect replays and a first render of an existing game produce no sound.
 */
export function useAuctionSounds(game: RecruiterDuelGame | null) {
  const seen = useRef<{ seed: string; records: number; phase: AuctionPhase } | null>(null)
  useEffect(() => {
    if (!game) { seen.current = null; return }
    const previous = seen.current
    if (previous && previous.seed === game.seed) {
      if (game.phase === 'COIN_TOSS' && previous.phase !== 'COIN_TOSS') audio.play('coinToss')
      if ((game.phase === 'REVEAL_PLAYER' || game.phase === 'DISCARD_RESULT') && previous.phase !== game.phase) audio.play('diceRoll')
      // One sound per kind per update, so a batch of records (early completion) is a single cue.
      const cues = new Set<SoundId>()
      for (const entry of game.record.slice(previous.records)) {
        const sound = soundForRecord(entry)
        if (sound) cues.add(sound)
      }
      cues.forEach((sound) => audio.play(sound))
    }
    seen.current = { seed: game.seed, records: game.record.length, phase: game.phase }
  }, [game])
}
