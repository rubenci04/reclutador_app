import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { DRAFT_SLOTS } from '../draft/draftTypes'
import { beginBidding, createRecruiterDuel, currentRound, maximumSafeBid, nextAuctionRound, passAuction, placeBid, revealCoinToss, revealDiscardReplacement, revealNextAuctionRound, startCoinToss, startDuelMatch } from './auctionEngine'
import { CPU_STRATEGIES, decideCpu, privateValuation, takeCpuTurn, type CpuPublicContext } from './cpuPolicy'
import type { AuctionTransition } from './auctionTypes'
import { flagUrl, NATIONALITY_FLAGS, PHOTO_MANIFEST } from './visualAssets'
import { ARGENTINA_PLAYERS } from '../themed-modes/modeCatalog'
import fs from 'node:fs'
import { ARGENTINA_CANDIDATES, ARGENTINA_EXPANSION, validateArgentinaCandidates, type ArgentinaCandidate } from '../player-catalog/argentinaExpansion'

function get(result: AuctionTransition) { if (!result.ok) throw new Error(result.error); return result.game }
function create(seed:string) { const result=createRecruiterDuel(DRAFT_CATALOG,seed); if(!result.ok) throw new Error(result.error); return result.game }
function context():CpuPublicContext { const game=create('cpu-unit'); return { seed:game.seed, roundIndex:0, player:DRAFT_CATALOG.find((player)=>player.id===game.rounds[0].playerId)!, team:game.teams.recruiter_two, publicCatalog:DRAFT_CATALOG, acquiredIds:[] } }

describe('CPU private valuations and visual contracts',()=>{
  it('can pass with money, respects its immutable valuation, and is reproducible',()=>{
    const value=context(); const maximum=privateValuation(value,'BALANCED')
    expect(decideCpu(value,'BALANCED',maximum,100).action).toBe('pass')
    expect(value.team.spent).toBe(0)
    expect(decideCpu(value,'BALANCED',null,100)).toEqual(decideCpu(value,'BALANCED',null,100))
    for(let bid=0;bid<30;bid++) expect(decideCpu(value,'BALANCED',bid,100).privateMaximum).toBe(maximum)
    expect(decideCpu(value,'BALANCED',null,0).action).toBe('pass')
  })
  it('uses distinct profiles and cannot inspect a future round through its public context',()=>{
    const value=context()
    expect(privateValuation(value,'AGGRESSIVE')).toBeGreaterThan(privateValuation(value,'CONSERVATIVE'))
    expect(Object.keys(value)).not.toContain('rounds')
    const full={...value,team:{...value.team,lineup:Object.fromEntries(DRAFT_SLOTS.map(slot=>[slot.id,'filled'])) as typeof value.team.lineup}}
    expect(decideCpu(full,'AGGRESSIVE',null,100)).toMatchObject({action:'pass',reason:'position_full'})
  })
  it('maps associations explicitly and keeps a licensed, local photo manifest',()=>{
    expect(NATIONALITY_FLAGS.ENG).toBe('gb-eng'); expect(NATIONALITY_FLAGS.SCO).toBe('gb-sct'); expect(NATIONALITY_FLAGS.WAL).toBe('gb-wls')
    expect(NATIONALITY_FLAGS.ARG).toBe('ar'); expect(NATIONALITY_FLAGS.KOR).toBe('kr'); expect(flagUrl('UNKNOWN')).toBeUndefined()
    for(const code of Object.keys(NATIONALITY_FLAGS)) expect(flagUrl(code)).toBeTruthy()
    for(const photo of PHOTO_MANIFEST) {
      expect(DRAFT_CATALOG.some(player=>player.id===photo.playerId) || ARGENTINA_PLAYERS.some(player=>player.id===photo.playerId)).toBe(true)
      expect(photo.path).toMatch(/^\/assets\/players\//); expect(photo.author).not.toBe(''); expect(photo.licenseUrl).toMatch(/^https:/); expect(photo.approval).toBe('approved')
      expect(photo.license).not.toBe(''); expect(photo.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\//); expect(photo.attribution).toContain(photo.license)
      expect(fs.existsSync(`public${photo.path}`)).toBe(true)
    }
    expect(new Set(PHOTO_MANIFEST.map(photo=>photo.playerId)).size).toBe(PHOTO_MANIFEST.length)
  })
  it('reserves four independent batches and rejects duplicate identities without generating players',()=>{
    expect(ARGENTINA_CANDIDATES).toHaveLength(0); expect(ARGENTINA_EXPANSION.batches).toHaveLength(4)
    expect(Object.values(ARGENTINA_EXPANSION.quotas).reduce((a,b)=>a+b,0)).toBe(200)
    const candidate:ArgentinaCandidate={canonicalId:'arg_001',identityKey:'test-person',position:'ARQ',inclusionReasons:['club_icon'],careers:[{clubId:'test',countryCode:'ARG',startedYear:2000,endedYear:2001,competitionIds:['test'],source:{provider:'editorial',url:'https://example.com',retrievedAt:'2026-10-17',verification:'verified'}}]}
    expect(validateArgentinaCandidates([candidate],DRAFT_CATALOG,new Set())).toBe(true)
    expect(validateArgentinaCandidates([candidate,candidate],DRAFT_CATALOG,new Set())).toBe(false)
    expect(validateArgentinaCandidates([candidate],DRAFT_CATALOG,new Set(['test-person']))).toBe(false)
  })
})

it('plays 3,000 CPU games against three simulated human policies with no illegal teams',()=>{
  const report=CPU_STRATEGIES.map(strategy=>({strategy,games:0,bids:0,passes:0,forcedAwards:0,priorityAwards:0,cpuSpent:0,humanSpent:0,wins:0,draws:0,losses:0}))
  for(let index=0;index<3000;index++) {
    const bucket=report[index%3]; let game=create(`cpu-stress-${index}`)
    game=get(revealCoinToss(get(startCoinToss(game,'heads'))))
    while(game.phase!=='TEAMS_COMPLETED') {
      game=get(beginBidding(game))
      while(game.phase==='BIDDING') {
        if(game.activeParticipant==='recruiter_two') game=get(takeCpuTurn(game,DRAFT_CATALOG,bucket.strategy))
        else {
          const player=DRAFT_CATALOG.find(candidate=>candidate.id===currentRound(game).playerId)!
          const minimum=game.currentBid ? game.currentBid.amount+1 : player.price
          const cap=maximumSafeBid(game,'recruiter_one',DRAFT_CATALOG)
          const policy=Math.floor(index/3)%3
          const interested=policy!==0 && minimum<=player.price+(policy===1?1:4)
          game=get(interested && cap>=minimum ? placeBid(game,'recruiter_one',minimum,DRAFT_CATALOG) : passAuction(game,'recruiter_one',DRAFT_CATALOG))
        }
      }
      if(game.phase==='DISCARD_RESULT'){game=get(revealDiscardReplacement(game));continue}
      game=get(nextAuctionRound(game,DRAFT_CATALOG))
      if(game.phase==='NEXT_ROUND') game=get(revealNextAuctionRound(game))
    }
    const all=Object.values(game.teams).flatMap(team=>Object.values(team.lineup))
    expect(new Set(all).size).toBe(22)
    for(const team of Object.values(game.teams)) {
      expect(team.spent).toBeGreaterThanOrEqual(0); expect(team.spent).toBeLessThanOrEqual(100)
      for(const slot of DRAFT_SLOTS) expect(DRAFT_CATALOG.find(player=>player.id===team.lineup[slot.id])?.position).toBe(slot.position)
    }
    for(const record of game.record) {
      if(record.type==='cpu_decision') {
        if(record.action==='bid'){bucket.bids++;expect(record.amount!).toBeLessThanOrEqual(record.privateMaximum)} else bucket.passes++
      }
      if(record.type==='award' && record.reason==='forced_viability') bucket.forcedAwards++
      if(record.type==='award' && record.reason==='double_pass_priority') bucket.priorityAwards++
    }
    bucket.games++;bucket.cpuSpent+=game.teams.recruiter_two.spent;bucket.humanSpent+=game.teams.recruiter_one.spent
    const result=get(startDuelMatch(game,DRAFT_CATALOG)).matchResult!
    if(result.winner==='cpu') bucket.wins++;else if(result.winner==='draw')bucket.draws++;else bucket.losses++
  }
  writeFileSync('docs/qa/CODEX-005C-stress.json',JSON.stringify({games:3000,humanPolicies:['always_pass','base_plus_1','base_plus_4'],report},null,2)+'\n')
},120000)
