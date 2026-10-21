import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import figures from '../../data/league-collections/europeFigures.json'
import preV1 from '../../data/league-collections/preEuropeTopCollections.json'
import preV2 from '../../data/league-collections/preEuropeTopV2Collections.json'
import { ALL_CURRENT, GLOBAL_CURRENT, MASTER_CATALOG, personKey } from './globalCollection'
import { EUROPE_CURRENT_POOL, EUROPE_TOP_REPORT, EUROPE_TOP_RESOLUTION, EUROPE_TOP_VERSION } from './europeTop150'
import { LEAGUE_PLAYERS, LEAGUE_PROVENANCE } from './leagueCollections'
import { calculatePlayerPrice } from './calculatePlayerPrice'
import { validatePlayer } from './validatePlayer'
import { catalogForMode } from '../themed-modes/modeCatalog'
import { catalogKey, createDrawContext, CURRENT_DRAW_POLICY, parseReplay } from '../recruiter-duel/drawHistory'
import { createRecruiterDuel } from '../recruiter-duel/auctionEngine'
import { CLASSIC_CONFIG } from '../recruiter-duel/matchConfig'
import { recordedCollection } from './recordedCollections'
import { normalizePlayerName as norm } from './playerIdentity'
import { AppFooter, CREDIT_AUTHOR } from '../../components/AppFooter'
import { createI18n } from '../../i18n'

const PRIORITY = ['Ousmane Dembélé', 'Michael Olise', 'Vitinha', 'Nuno Mendes', 'João Neves', 'Khvicha Kvaratskhelia', 'Fabián Ruiz', 'Dayot Upamecano', 'Ferran Torres', 'Jamal Musiala', 'Nico Schlotterbeck', 'Désiré Doué', 'Diogo Costa']
const europe = catalogForMode('EUROPE_CURRENT')

describe('DATA-REG-003A credit', () => {
  it.each([['es-AR', 'Idea y desarrollo'], ['en', 'Concept and development'], ['pt-BR', 'Ideia e desenvolvimento']] as const)('signs Rubén E. Albarracín in %s', async (language, label) => {
    const i18n = await createI18n(language)
    const { container } = render(<I18nextProvider i18n={i18n}><AppFooter /></I18nextProvider>)
    expect(container.textContent).toBe(`${label}: Rubén E. Albarracín © 2026`)
    expect(CREDIT_AUTHOR).toBe('Rubén E. Albarracín')
    expect(container.textContent).not.toMatch(/Alvarrazin/)
  })
})

describe('DATA-REG-003A priority Europe figures (ranks 1-50)', () => {
  it('resolves every pending row of ranks 1-50 and registers the status honestly', () => {
    expect(EUROPE_TOP_VERSION).toBe('europe-top-150-v2')
    expect(EUROPE_TOP_RESOLUTION.filter((row) => row.rank <= 50 && row.status !== 'RECONCILED')).toEqual([])
    expect(figures).toHaveLength(13)
    expect(EUROPE_TOP_REPORT.reconciled).toBe(106 + 13)
    expect(EUROPE_TOP_REPORT.provisional).toHaveLength(150 - 119)
    expect(EUROPE_TOP_REPORT.missing.every((row) => row.rank > 50)).toBe(true)
    for (const name of PRIORITY) {
      const row = EUROPE_TOP_RESOLUTION.find((r) => r.name === name)!
      expect(row.status, name).toBe('RECONCILED')
      expect(europe.some((p) => p.id === row.editionId), name).toBe(true)
    }
  })
  it('creates independent 2026 editions with provenance, documented club and valid derived data', () => {
    expect(new Set(figures.map((row) => row.id)).size).toBe(13)
    const allIds = LEAGUE_PLAYERS.map((p) => p.id)
    for (const row of figures) {
      const player = LEAGUE_PLAYERS.find((p) => p.id === row.id)!
      expect(player.category).toBe('contemporary')
      expect(player.reference_year).toBe(2026)
      expect(player.club_tag).toBe(row.club_tag)
      expect(player.price).toBe(calculatePlayerPrice(row.sourceRating))
      expect(player.overall_rating).toBe(row.sourceRating)
      expect(player.dominantFoot).toBe(row.dominantFoot)
      expect(row.sourceUrl).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//)
      expect(row.sourceFile).toContain('Ranking global de futbolistas 2026')
      expect(row.provenanceNote.length).toBeGreaterThan(5)
      expect(validatePlayer(player, allIds).valid, row.id).toBe(true)
      expect(LEAGUE_PROVENANCE.some((p) => p.id === row.id && p.league === 'EUR')).toBe(true)
    }
    // Verified feet only where the source states them; the rest stay UNKNOWN (BOTH where the page says either foot).
    expect(Object.fromEntries(figures.map((row) => [row.name, row.dominantFoot]))).toMatchObject({ 'Michael Olise': 'LEFT', 'Fabián Ruiz': 'LEFT', 'Khvicha Kvaratskhelia': 'RIGHT', 'Jamal Musiala': 'UNKNOWN', 'Diogo Costa': 'UNKNOWN' })
  })
  it('keeps homonyms and historical editions apart and does not touch national Top 150s', () => {
    const key = (id: string) => personKey(MASTER_CATALOG.find((p) => p.id === id)!)
    expect(key('import_eur_act_vitinha_psg')).not.toBe(key('import_ita_act_175'))
    expect(key('import_eur_act_ferran_torres')).not.toBe(key('import_esp_esp_leg_fernando_jose_torres_sanz'))
    expect(key('import_eur_act_diogo_costa')).not.toBe(key('import_esp_esp_leg_diego_da_silva_costa'))
    expect(MASTER_CATALOG.find((p) => p.id === 'import_eur_act_khvicha_kvaratskhelia')!.category).toBe('contemporary')
    expect(MASTER_CATALOG.some((p) => p.id === 'import_ita_leg_131' && p.category === 'legend')).toBe(true)
    for (const mode of ['SPAIN_LEAGUE', 'ENGLAND_LEAGUE', 'ITALY_CURRENT', 'ARGENTINA_CURRENT', 'BRAZIL_CURRENT', 'MEXICO_CURRENT'] as const) expect(catalogForMode(mode).some((p) => p.id.startsWith('import_eur_')), mode).toBe(false)
    for (const name of ['Rodri', 'Kylian Mbappé', 'Lamine Yamal', 'Pedri']) expect(europe.filter((p) => norm(p.name) === norm(name))).toHaveLength(1)
  })
  it('keeps Europe Actualidad at exactly 150 unique identities and adds no duplicates to Global Actual', () => {
    expect(europe).toBe(EUROPE_CURRENT_POOL)
    expect(europe).toHaveLength(150)
    expect(new Set(europe.map(personKey)).size).toBe(150)
    expect(new Set(GLOBAL_CURRENT.map(personKey)).size).toBe(GLOBAL_CURRENT.length)
    expect(new Set(ALL_CURRENT.map(personKey)).size).toBe(ALL_CURRENT.length)
    for (const row of figures) expect(GLOBAL_CURRENT.some((p) => p.id === row.id)).toBe(true)
    const ranked = EUROPE_TOP_RESOLUTION.filter((row) => row.status === 'RECONCILED')
    expect(europe.slice(0, ranked.length).map((p) => p.id)).toEqual(ranked.map((row) => row.editionId))
  })
  it('keeps europe-top-150-v1 and the earlier pool reproducible', () => {
    for (const snapshot of [preV1.EUROPE_CURRENT, preV2.EUROPE_CURRENT]) {
      const old = snapshot.map((id) => MASTER_CATALOG.find((p) => p.id === id)!)
      expect(recordedCollection(catalogKey(old))?.map((p) => p.id)).toEqual(snapshot)
      expect(parseReplay(JSON.stringify({ seed: 'old', context: createDrawContext(old, [], 'rarity-v2') }), old)).not.toBeNull()
    }
    expect(preV2.EUROPE_CURRENT).toHaveLength(150)
    expect(preV2.EUROPE_CURRENT.join()).not.toBe(europe.map((p) => p.id).join())
  })
  it('stays economically playable', () => {
    const config = { ...CLASSIC_CONFIG, budget: 150, coaches: true, coachReserve: 8 }
    for (let index = 0; index < 10; index++) expect(createRecruiterDuel(europe, `reg-${index}`, createDrawContext(europe, [], CURRENT_DRAW_POLICY), config).ok, `reg-${index}`).toBe(true)
    expect(europe.filter((p) => p.position === 'ARQ').length).toBeGreaterThanOrEqual(8)
  })
})
