import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../i18n'
import { DRAFT_CATALOG } from '../features/draft/catalog'
import { PlayerClubDetails } from './PlayerClubDetails'
import * as clubs from '../features/player-catalog/playerClubs'

afterEach(() => vi.restoreAllMocks())
const messi=DRAFT_CATALOG.find((player) => player.id==='plr_038')!
describe('current and reference club presentation', () => {
  it.each([
    ['es-AR','Club actual','Club de referencia · 2019','Distintivo neutral para Inter Miami CF'],
    ['en','Current club','Reference club · 2019','Neutral badge for Inter Miami CF'],
    ['pt-BR','Clube atual','Clube de referência · 2019','Distintivo neutro para Inter Miami CF'],
  ] as const)('distinguishes both affiliations and badges in %s', async (language,current,reference,badge) => {
    const i18n=await createI18n(language)
    render(<I18nextProvider i18n={i18n}><PlayerClubDetails player={messi} /></I18nextProvider>)
    const currentRow=screen.getByText(current).parentElement!
    expect(within(currentRow).getByText('Inter Miami CF')).toBeInTheDocument()
    expect(within(currentRow).getByRole('img',{name:badge})).toHaveStyle({'--club-primary':'#38434D'})
    const referenceRow=screen.getByText(reference).parentElement!
    expect(within(referenceRow).getByText('FC Barcelona')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href',clubs.capturePlayerClubs(messi).sourceUrl)
  })
  it('does not present historical Real Madrid as Marcelo current club', async () => {
    const i18n=await createI18n('en'); const player=DRAFT_CATALOG.find((candidate)=>candidate.id==='plr_009')!
    render(<I18nextProvider i18n={i18n}><PlayerClubDetails player={player} /></I18nextProvider>)
    expect(within(screen.getByText('Current club').parentElement!).getByText('Retired')).toBeInTheDocument()
    expect(within(screen.getByText('Reference club · 2017').parentElement!).getByText('Real Madrid')).toBeInTheDocument()
  })
  it('shows pending current information instead of inferring a club or free-agent status', async () => {
    const i18n=await createI18n('en'); const player=DRAFT_CATALOG.find((candidate)=>candidate.id==='plr_007')!
    render(<I18nextProvider i18n={i18n}><PlayerClubDetails player={player} /></I18nextProvider>)
    const current=screen.getByText('Current club').parentElement!
    expect(within(current).getByText('Unverified')).toBeInTheDocument()
    expect(within(current).queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByText('Free agent')).not.toBeInTheDocument()
  })
  it('renders verified FREE_AGENT distinctly, using a synthetic snapshot only in this test', async () => {
    const original=clubs.capturePlayerClubs(messi)
    vi.spyOn(clubs,'capturePlayerClubs').mockReturnValue({...original,careerStatus:'FREE_AGENT',currentClubId:null})
    const i18n=await createI18n('en')
    render(<I18nextProvider i18n={i18n}><PlayerClubDetails player={messi} /></I18nextProvider>)
    expect(within(screen.getByText('Current club').parentElement!).getByText('Free agent')).toBeInTheDocument()
  })
})
