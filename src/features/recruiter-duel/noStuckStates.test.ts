import { expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { createSeededRandom } from '../local-match/seededRandom'
import { auctionAvailability, beginBidding, createRecruiterDuel, currentRound, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss, startDuelMatch } from './auctionEngine'
import { takeCpuTurn } from './cpuPolicy'
import type { AuctionTransition, RecruiterDuelGame } from './auctionTypes'

it('never leaves a game stuck before the match: 120 seeded games with random human decisions, with and without CPU', () => {
  const problems: string[] = []
  for (let seed = 0; seed < 120; seed++) {
    const random = createSeededRandom(`fuzz-${seed}`)
    const created = createRecruiterDuel(DRAFT_CATALOG, `fz-${seed}`)
    if (!created.ok) { problems.push(`${seed}: create`); continue }
    const must = (r: AuctionTransition): RecruiterDuelGame => { if (!r.ok) throw new Error(r.error); return r.game }
    let game = must(beginBidding(must(revealCoinToss(must(startCoinToss(created.game, 'heads'))))))
    const cpuMode = seed % 2 === 0
    let steps = 0
    try {
      while (game.phase !== 'TEAMS_COMPLETED') {
        if (++steps > 800) throw new Error('loop')
        if (game.phase === 'DISCARD_RESULT') { game = must(revealDiscardReplacement(game)); continue }
        if (game.phase === 'NEXT_ROUND') { game = must(revealNextAuctionRound(game)); continue }
        if (game.phase === 'REVEAL_PLAYER') { game = must(beginBidding(game)); continue }
        if (game.phase === 'ROUND_RESULT') { game = must(nextAuctionRound(game, DRAFT_CATALOG)); continue }
        if (game.phase !== 'BIDDING') throw new Error(`phase ${game.phase}`)
        const who = game.activeParticipant!
        if (cpuMode && who === 'recruiter_two') { game = must(takeCpuTurn(game, DRAFT_CATALOG, 'BALANCED')); continue }
        const a = auctionAvailability(game, who, DRAFT_CATALOG)
        const wantsBid = a.bid.enabled && random() < .5
        if (wantsBid) game = must(placeBid(game, who, a.minimum + Math.floor(random() * Math.max(1, Math.min(4, a.maximum - a.minimum + 1))), DRAFT_CATALOG))
        else if (a.pass.enabled) game = must(passAuction(game, who, DRAFT_CATALOG))
        else if (a.bid.enabled) game = must(placeBid(game, who, a.minimum, DRAFT_CATALOG))
        else throw new Error(`stuck round ${game.roundIndex} ${currentRound(game)?.position} bid=${a.bid.reason} pass=${a.pass.reason}`)
      }
      const started = startDuelMatch(game, DRAFT_CATALOG)
      if (!started.ok) problems.push(`${seed}: start ${started.error}`)
    } catch (error) { problems.push(`${seed}${cpuMode ? ' cpu' : ''}: ${(error as Error).message}`) }
  }
  expect(problems).toEqual([])
}, 60_000)
