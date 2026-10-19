import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../i18n'
import { PlayerAvatar } from './PlayerAvatar'
import { ClubBadge } from './ClubBadge'
import { DRAFT_CATALOG } from '../features/draft/catalog'
import { getClubVisual } from '../features/player-catalog/clubVisuals'
import { playerAppearance, preferredFoot, SKIN_COLORS } from '../features/player-catalog/playerAppearance'

describe('player character', () => {
  it('draws no eyes or mouth and uses the neutral default when there is no appearance record', async () => {
    const i18n = await createI18n('en')
    const player = DRAFT_CATALOG[0]
    const { container } = render(<I18nextProvider i18n={i18n}><PlayerAvatar player={player} /></I18nextProvider>)
    expect(container.querySelectorAll('circle')).toHaveLength(0)
    expect(container.querySelector('path[stroke="#855141"]')).toBeNull()
    expect(playerAppearance('unknown-id')).toEqual({ skin: 'tan', hair: 'short' })
    expect(container.querySelector(`ellipse[fill="${SKIN_COLORS.tan.head}"]`)).not.toBeNull()
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
