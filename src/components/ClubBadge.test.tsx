import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../i18n'
import { ClubBadge } from './ClubBadge'
import { clubVisuals, getClubVisual, neutralClubVisual } from '../features/player-catalog/clubVisuals'
import { DRAFT_CATALOG } from '../features/draft/catalog'
import { PlayerIdentity } from '../features/recruiter-duel/PlayerIdentity'
import { PlayerSelector } from '../features/draft/PlayerSelector'
import { createEmptyLineup } from '../features/draft/draftModel'
import { DRAFT_SLOTS } from '../features/draft/draftTypes'

function luminance(hex: string) {
  const channels = hex.slice(1).match(/../g)!.map((part) => parseInt(part,16)/255).map((value) => value <= .04045 ? value / 12.92 : ((value+.055)/1.055)**2.4)
  return channels[0]*.2126 + channels[1]*.7152 + channels[2]*.0722
}
function contrast(a:string,b:string) { const values=[luminance(a),luminance(b)].sort((x,y)=>y-x); return (values[0]+.05)/(values[1]+.05) }

describe('club colours and generic badges', () => {
  it('covers exactly the clubs in the current catalogue with stable IDs and valid colours', () => {
    expect(Object.keys(clubVisuals).sort()).toEqual([...new Set(DRAFT_CATALOG.map((player)=>player.club_tag))].sort())
    for(const [id,visual] of Object.entries(clubVisuals)) {
      expect(visual?.id).toBe(id); expect(visual?.name).not.toBe('')
      for(const value of [visual!.primary,visual!.secondary,visual!.contrast]) expect(value).toMatch(/^#[0-9A-F]{6}$/)
    }
    expect(getClubVisual('river_plate')).toMatchObject({name:'River Plate',primary:'#FFFFFF',secondary:'#CF2B38'})
    expect(getClubVisual('barcelona')).toMatchObject({primary:'#172C60',secondary:'#861C41'})
    expect(getClubVisual('real_madrid')).toMatchObject({primary:'#FFFFFF',secondary:'#C7A34D'})
  })
  it('uses a neutral fallback even for object prototype names', () => {
    for(const id of ['unknown_club','','toString','__proto__']) expect(getClubVisual(id)).toBe(neutralClubVisual)
  })
  it('keeps text readable independently from colours and outlines visible on the badge canvas', () => {
    const css=readFileSync('src/styles/index.css','utf8')
    expect(css).toContain('.club-name{color:#edf4e8')
    expect(css).toContain('border-radius:6px;background:#102016')
    expect(contrast('#edf4e8','#102016')).toBeGreaterThan(7)
    for(const visual of [...Object.values(clubVisuals),neutralClubVisual]) expect(contrast(visual!.contrast,'#102016')).toBeGreaterThan(3)
  })
  it.each([
    ['es-AR','Colores de River Plate','Distintivo de club neutral'],
    ['en','Colours of River Plate','Neutral club badge'],
    ['pt-BR','Cores de River Plate','Distintivo neutro de clube'],
  ] as const)('provides accessible names and identical geometry in %s', async (language,label,fallback) => {
    const i18n=await createI18n(language)
    render(<I18nextProvider i18n={i18n}><ClubBadge clubId="river_plate" /><ClubBadge clubId="unknown" /></I18nextProvider>)
    const badge=screen.getByRole('img',{name:label})
    expect(badge.children).toHaveLength(2); expect(badge.textContent).toBe('')
    expect(badge).toHaveStyle({'--club-primary':'#FFFFFF','--club-secondary':'#CF2B38'})
    expect(screen.getByRole('img',{name:fallback})).toHaveClass('club-badge')
    expect(screen.getByText('River Plate')).toBeInTheDocument()
  })
  it('integrates with the auction card while preserving its photograph, flag, rating and price', async () => {
    const i18n=await createI18n('en'); const player=DRAFT_CATALOG.find((candidate)=>candidate.id==='plr_038')!
    render(<I18nextProvider i18n={i18n}><PlayerIdentity player={player} /></I18nextProvider>)
    expect(screen.getByRole('img',{name:'Colours of FC Barcelona'})).toBeInTheDocument()
    expect(screen.getByRole('img',{name:'Photograph of Lionel Messi'})).toHaveAttribute('src','/assets/players/plr_038.jpg')
    expect(screen.getByRole('img',{name:'Flag of ARG'})).toBeInTheDocument()
    expect(screen.getByText(`Base ${player.price}M`)).toBeInTheDocument()
  })
  it('shows the shared badge in Free Draft catalogue cards', async () => {
    const i18n=await createI18n('en')
    render(<I18nextProvider i18n={i18n}><PlayerSelector slot={DRAFT_SLOTS[0]} lineup={createEmptyLineup()} onClose={()=>{}} onSign={()=>{}} /></I18nextProvider>)
    expect(screen.getAllByRole('img',{name:'Colours of FC Barcelona'}).length).toBeGreaterThan(0)
  })
})
