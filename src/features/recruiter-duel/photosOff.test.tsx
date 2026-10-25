import { existsSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { SHOW_PLAYER_PHOTOS } from '../../config/product'
import { CoachPortrait } from '../coaches/CoachPortrait'
import { COACH_CATALOG } from '../coaches/coachCatalog'
import { DRAFT_CATALOG } from '../draft/catalog'
import { AuctionPlayerBar } from './AuctionPlayerBar'
import { PlayerIdentity, VisualCredits } from './PlayerIdentity'
import { PHOTO_MANIFEST, approvedPhoto, coachPhoto } from './visualAssets'
import coachPhotos from '../../data/coach-photos.json'

describe('figures instead of photos (Sprint 9)', () => {
  it('has the photo switch off and returns no photo for any player or coach', () => {
    expect(SHOW_PLAYER_PHOTOS).toBe(false)
    expect(PHOTO_MANIFEST.length).toBeGreaterThan(200)
    expect(PHOTO_MANIFEST.every((photo) => approvedPhoto(photo.playerId) === undefined)).toBe(true)
    expect(coachPhotos.length).toBeGreaterThan(50)
    expect(coachPhotos.every((photo) => coachPhoto(photo.coachId) === undefined)).toBe(true)
  })
  it('does not publish the photo files and keeps the manifests', () => {
    expect(existsSync('public/assets/players')).toBe(false); expect(existsSync('public/assets/coaches')).toBe(false)
    expect(readdirSync('assets-archive/photos/players').length).toBeGreaterThan(200); expect(readdirSync('assets-archive/photos/coaches').length).toBeGreaterThan(50)
    expect(existsSync('src/data/player-photos.json')).toBe(true); expect(existsSync('src/data/coach-photos.json')).toBe(true)
  })
  it.each(['es-AR', 'en', 'pt-BR'] as const)('draws the figure for players and coaches, with no <img> photo and no photo credits, in %s', async (language) => {
    const i18n = await createI18n(language)
    const withPhoto = DRAFT_CATALOG.find((player) => approvedPhoto(player.id) === undefined && PHOTO_MANIFEST.some((photo) => photo.playerId === player.id))!
    const coach = COACH_CATALOG.find((candidate) => coachPhotos.some((photo) => photo.coachId === candidate.id))!
    const { container } = render(<I18nextProvider i18n={i18n}><PlayerIdentity player={withPhoto} /><AuctionPlayerBar player={withPhoto} /><CoachPortrait coach={coach} /><VisualCredits /></I18nextProvider>)
    expect(screen.getAllByRole('img', { name: i18n.t('playtest.avatar', { name: withPhoto.name }) }).length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole('img', { name: i18n.t('coach.avatar', { name: `${coach.name} ${coach.surname}` }) })).toBeInTheDocument()
    expect(container.querySelectorAll('img:not(.nationality-flag):not(.club-badge)')).toHaveLength(0)
    expect(container.querySelector('.visual-credits')).toBeNull()
    expect(container.textContent).not.toMatch(/CC BY|Wikimedia|Commons/)
    // One frame for both: a coach figure uses the same drawing class as a player figure.
    expect(container.querySelector('.coach-figure .player-character')).not.toBeNull()
  })
})
