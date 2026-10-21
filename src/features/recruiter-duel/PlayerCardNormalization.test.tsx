import { render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it } from 'vitest'
import { createI18n } from '../../i18n'
import { PlayerIdentity } from './PlayerIdentity'
import { FootIcon } from '../../components/FootIcon'
import { LEAGUE_PLAYERS, LEAGUE_PROVENANCE } from '../player-catalog/leagueCollections'
import { specificRoleCodes } from '../player-catalog/playerDetails'
import { nationalityName } from '../player-catalog/nationalityName'
import type { DominantFoot } from '../../types/player'
import es from '../../i18n/locales/es-AR/common.json'
import en from '../../i18n/locales/en/common.json'
import pt from '../../i18n/locales/pt-BR/common.json'

const player = (id: string) => LEAGUE_PLAYERS.find(p => p.id === id)!
const LANGUAGES = ['es-AR', 'en', 'pt-BR'] as const
const CARDS = ['import_ita_act_001', 'import_ita_leg_001', 'import_ita_leg_010', 'import_mex_act_001', 'import_mex_leg_001'] as const

describe('DATA-MX-001 player cards', () => {
  it.each(LANGUAGES)('shows editorial facts uniformly and no internal strings in %s', async (language) => {
    const i18n = await createI18n(language)
    for (const id of CARDS) {
      const p = player(id), source = LEAGUE_PROVENANCE.find(row => row.id === id)!
      const { container, unmount } = render(<I18nextProvider i18n={i18n}><PlayerIdentity player={p} /></I18nextProvider>)
      const text = container.textContent ?? ''
      expect(text, id).toContain(p.name)
      expect(text, id).toContain(source.club)
      expect(text, id).toContain(String(p.overall_rating))
      for (const forbidden of ['USER_SUPPLIED', '.txt', p.club_tag === source.club ? '@@' : p.club_tag, 'playtest.', 'collections.', 'foot.', 'Unknown club', 'clubBadge.']) expect(text, `${id}:${forbidden}`).not.toContain(forbidden)
      if (p.category === 'legend') {
        expect(text, id).toContain(source.sourceClubPeriod!.replace('-', '–'))
        expect(text, id).not.toContain(i18n.t('playtest.periodUnknown'))
      }
      expect(container.querySelector('.foot-icon')).not.toBeNull()
      unmount()
    }
  })
  it('turns every supplied tactical position into a localized role, never a raw key', () => {
    const roleKeys = [es, en, pt].map(locale => new Set(Object.keys(locale.playtest.roles)))
    for (const row of LEAGUE_PROVENANCE) {
      const codes = specificRoleCodes(player(row.id))
      expect(codes.length, row.id).toBeGreaterThan(0)
      for (const code of codes) for (const keys of roleKeys) expect(keys.has(code), `${row.id}:${code}`).toBe(true)
    }
  })
  it('localizes nationality names without exposing association codes', () => {
    const home = (code: string) => code
    expect(nationalityName('ARG', 'es-AR', home)).toBe('Argentina')
    expect(nationalityName('MEX', 'en', home)).toBe('Mexico')
    expect(nationalityName('POR', 'pt-BR', home)).toBe('Portugal')
    expect(nationalityName('ZAM', 'en', home)).toBe('Zambia')
    expect(nationalityName('ENG', 'en', () => 'England')).toBe('England')
  })
})

describe('FootIcon', () => {
  const states: readonly [DominantFoot, string[]][] = [['RIGHT', ['right']], ['LEFT', ['left']], ['BOTH', ['left', 'right']], ['UNKNOWN', []]]
  it.each(states)('highlights %s', async (foot, on) => {
    const i18n = await createI18n('en')
    const { container } = render(<I18nextProvider i18n={i18n}><FootIcon foot={foot} /></I18nextProvider>)
    const highlighted = [...container.querySelectorAll('.foot-on')].map(el => el.getAttribute('data-foot')).sort()
    expect(highlighted).toEqual(on.sort())
    expect(container.querySelectorAll('.foot-on,.foot-off')).toHaveLength(2)
    expect(screen.getByRole('img')).toHaveAccessibleName(/Dominant foot/)
    expect(container.querySelector('.foot-icon')?.getAttribute('dir')).toBe('ltr')
  })
})
