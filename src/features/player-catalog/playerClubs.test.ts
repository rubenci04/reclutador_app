import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { DRAFT_CATALOG } from '../draft/catalog'
import { canonicalClubId, clubRegistry, getClubIdentity } from './clubRegistry'
import { capturePlayerClubs, PLAYER_CLUB_AUDIT_2026_10_17 as PLAYER_CLUB_AUDIT, validatePlayerClubSnapshots } from './playerClubs'
import type { PlayerClubSnapshot } from './playerClubTypes'

const messi = DRAFT_CATALOG.find((player) => player.id === 'plr_038')!

describe('dated current club audit', () => {
  it('audits exactly 25 existing identities, keeps unknown explicit and validates all evidence', () => {
    expect(PLAYER_CLUB_AUDIT).toHaveLength(25)
    expect(new Set(PLAYER_CLUB_AUDIT.map((row) => row.playerId)).size).toBe(25)
    expect(validatePlayerClubSnapshots(PLAYER_CLUB_AUDIT, DRAFT_CATALOG)).toEqual({valid:true,issues:[]})
    expect(PLAYER_CLUB_AUDIT.filter((row) => row.verificationStatus === 'VERIFIED')).toHaveLength(19)
    expect(PLAYER_CLUB_AUDIT.filter((row) => row.careerStatus === 'UNKNOWN')).toHaveLength(6)
  })
  it('separates Messi and Romero current clubs from untouched reference clubs', () => {
    expect(capturePlayerClubs(messi,'2026-10-17')).toMatchObject({referenceClubId:'barcelona',currentClubId:'inter_miami',careerStatus:'ACTIVE',asOfDate:'2026-10-17'})
    const romero = DRAFT_CATALOG.find((player) => player.id === 'plr_016')!
    expect(capturePlayerClubs(romero,'2026-10-17')).toMatchObject({referenceClubId:'tottenham_hotspur',currentClubId:'atletico_madrid',announcedAt:'2026-08-15',announcementDateVerification:'USER_SUPPLIED'})
    expect(capturePlayerClubs(romero)).toMatchObject({currentClubId:'atletico_madrid',announcedAt:'2026-08-15',announcementDateVerification:'VERIFIED',asOfDate:'2026-10-18'})
    expect(romero.club_tag).toBe('tottenham_hotspur')
    const belgrano = capturePlayerClubs(romero,'2026-10-17').clubHistory.find((spell) => spell.clubId === 'belgrano')!
    expect(belgrano).toMatchObject({countryCode:'ARG',verificationStatus:'VERIFIED',startedYear:2016,endedYear:2018})
    expect(belgrano.source.url).toBe(belgrano.sourceUrl)
  })
  it('keeps unreviewed players unknown rather than using the reference as current', () => {
    const player=DRAFT_CATALOG.find((candidate) => candidate.id === 'plr_001')!
    expect(capturePlayerClubs(player, '2026-10-16')).toMatchObject({referenceClubId:'bayern_munich',currentClubId:null,careerStatus:'UNKNOWN',sourceUrl:null,historyCoverage:'NOT_REVIEWED'})
  })
  it('supports ACTIVE, RETIRED, FREE_AGENT and UNKNOWN with consistent nullability', () => {
    const base=capturePlayerClubs(messi)
    for(const careerStatus of ['ACTIVE','RETIRED','FREE_AGENT','UNKNOWN'] as const) {
      const row:PlayerClubSnapshot={...base,careerStatus,currentClubId:careerStatus==='ACTIVE'?'inter_miami':null,verificationStatus:careerStatus==='UNKNOWN'?'PENDING':'VERIFIED'}
      expect(validatePlayerClubSnapshots([row],DRAFT_CATALOG).valid).toBe(true)
      if(careerStatus!=='ACTIVE') expect(validatePlayerClubSnapshots([{...row,currentClubId:'inter_miami'}],DRAFT_CATALOG).valid).toBe(false)
    }
  })
  it('rejects bad dates, IDs, duplicates, unverified assignments and missing evidence', () => {
    const base=capturePlayerClubs(messi)
    for(const patch of [
      {currentClubId:'Inter Miami CF'}, {referenceClubId:'inter_miami'}, {playerId:'plr_999'},
      {asOfDate:'2026-02-30'}, {asOfDate:'yesterday'}, {sourceUrl:null}, {sourceUrl:'javascript:alert(1)'},
      {verificationStatus:'PENDING'}, {careerStatus:'SUSPENDED'}, {revision:0},
      {announcedAt:'2026-11-01',announcementDateVerification:'VERIFIED'},
      {clubHistory:[{clubId:'unregistered'}]},
    ]) expect(validatePlayerClubSnapshots([{...base,...patch}],DRAFT_CATALOG).valid).toBe(false)
    expect(validatePlayerClubSnapshots([base,base],DRAFT_CATALOG).valid).toBe(false)
    expect(validatePlayerClubSnapshots(null,DRAFT_CATALOG).valid).toBe(false)
  })
  it('resolves explicit club aliases without registering spelling duplicates or object prototypes', () => {
    expect(canonicalClubId('Inter Miami CF')).toBe('inter_miami')
    expect(canonicalClubId('inter_miami_cf')).toBe('inter_miami')
    expect(canonicalClubId('Atlético de Madrid')).toBe('atletico_madrid')
    expect(canonicalClubId('__proto__')).toBeNull()
    expect(getClubIdentity('toString')).toBeUndefined()
    expect(Object.values(clubRegistry).every((club) => canonicalClubId(club!.id)===club!.id)).toBe(true)
    for(const player of DRAFT_CATALOG) expect(getClubIdentity(player.club_tag)).toBeDefined()
  })
  it('captures independent revisions and never replaces a prior dated view with a future update', () => {
    const before=capturePlayerClubs(messi,'2026-10-17')
    const retained=capturePlayerClubs(messi,'2026-10-17')
    const future:PlayerClubSnapshot={...before,asOfDate:'2027-01-01',revision:2,careerStatus:'FREE_AGENT',currentClubId:null}
    const revisions=[before,future]
    expect(capturePlayerClubs(messi,'2026-10-17',revisions)).toEqual(retained)
    expect(capturePlayerClubs(messi,'2027-01-01',revisions).careerStatus).toBe('FREE_AGENT')
    expect(capturePlayerClubs(messi,'2026-01-01',revisions).careerStatus).toBe('UNKNOWN')
    const corrupted={...future,currentClubId:'bad',careerStatus:'ACTIVE' as const}
    expect(capturePlayerClubs(messi,'2027-01-01',[before,corrupted]).careerStatus).toBe('UNKNOWN')
    Reflect.set(before.clubHistory[0], 'clubId', 'test')
    expect(retained.clubHistory[0].clubId).toBe('inter_miami')
    expect(capturePlayerClubs(messi).clubHistory[0].clubId).toBe('inter_miami')
  })
  it('preserves all sporting catalogue fields byte-for-byte after normalization, including ratings and prices', () => {
    expect(createHash('sha256').update(JSON.stringify(DRAFT_CATALOG)).digest('hex')).toBe('7b728e9904ebca303475bc8782ec29f4966d7e8925519b52a15753285c9bb220')
  })
})
