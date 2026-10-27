import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../i18n'
import { PlayerAvatar } from './PlayerAvatar'
import { ClubBadge } from './ClubBadge'
import { DRAFT_CATALOG } from '../features/draft/catalog'
import { getClubVisual } from '../features/player-catalog/clubVisuals'
import appearanceData from '../data/player-appearance.json'
import { HAIR_COLORS, playerAppearance, playerLook, preferredFoot, SKIN_COLORS } from '../features/player-catalog/playerAppearance'

describe('player character', () => {
  it('draws no eyes or mouth and uses the neutral default when there is no appearance record', async () => {
    const i18n = await createI18n('en')
    const player = { ...DRAFT_CATALOG[0], id: 'unknown-id' }
    const { container } = render(<I18nextProvider i18n={i18n}><PlayerAvatar player={player} /></I18nextProvider>)
    expect(container.querySelectorAll('circle')).toHaveLength(0)
    expect(container.querySelector('path[stroke="#855141"]')).toBeNull()
    expect(playerAppearance('unknown-id')).toEqual({ skin: 'tan', hair: 'short' })
    expect(container.querySelector(`ellipse[fill="${SKIN_COLORS.tan.head}"]`)).not.toBeNull()
  })
  it('draws the hand-entered traits of a card: hair colour and curls, beard, build, ears and one mark', async () => {
    const i18n = await createI18n('en')
    const look = (id: string) => playerLook(id)
    expect(playerLook('unknown-id')).toMatchObject({ color: 'black', texture: 'straight', facial: 'none', face: 'oval', build: 'athletic', mark: null })
    const entries = Object.keys(appearanceData as Record<string, unknown>)
    expect(entries.length).toBeGreaterThan(1400)
    const find = (test: (value: ReturnType<typeof playerLook>) => boolean) => entries.find((id) => test(look(id)))!
    const draw = (id: string) => render(<I18nextProvider i18n={i18n}><PlayerAvatar player={{ ...DRAFT_CATALOG[0], id }} /></I18nextProvider>).container
    const blonde = draw(find((value) => value.color === 'blonde' && value.hair !== 'bald'))
    expect(blonde.innerHTML).toContain(HAIR_COLORS.blonde)
    expect(draw(find((value) => value.texture === 'coily' && value.hair !== 'bald')).querySelectorAll('circle').length).toBeGreaterThanOrEqual(9)
    expect(draw(find((value) => value.facial === 'beard')).innerHTML).toContain('M38 38Q40 72')
    expect(draw(find((value) => value.mark === 'scar')).querySelector('path[stroke="#8a4b4b"]')).not.toBeNull()
    expect(draw(find((value) => value.mark === 'mole')).querySelectorAll('circle').length).toBeGreaterThan(0)
    expect(draw(find((value) => value.build === 'stocky')).innerHTML).toContain('scale(1.16 1)')
    expect(draw(find((value) => value.face === 'square')).querySelector('rect[rx="15"]')).not.toBeNull()
    // Different people no longer all look the same.
    const shapes = new Set(entries.slice(0, 200).map((id) => draw(id).innerHTML.replace(/clipw*/g, ''))); expect(shapes.size).toBeGreaterThan(20)
  })
  it('never invents a preferred foot', () => { expect(preferredFoot('unknown-id')).toBeUndefined() })
})

describe('kit patterns', () => {
  it('gives known clubs a pattern that echoes their usual kit and keeps their colours', () => {
    expect(getClubVisual('barcelona').pattern).toBe('stripes')
    expect(getClubVisual('boca_juniors').pattern).toBe('hband')
    expect(getClubVisual('river_plate').pattern).toBe('sash')
    expect(getClubVisual('real_madrid').pattern).toBe('plain')
    expect(getClubVisual('barcelona')).toMatchObject({ primary: '#172C60', secondary: '#861C41' })
  })
  it('draws the pattern inside the badge', async () => {
    const i18n = await createI18n('en')
    const { container } = render(<I18nextProvider i18n={i18n}><ClubBadge clubId="barcelona" /></I18nextProvider>)
    expect(container.querySelectorAll('svg g[clip-path] path').length).toBeGreaterThan(2)
  })
})
