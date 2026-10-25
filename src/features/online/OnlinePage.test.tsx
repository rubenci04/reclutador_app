import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createI18n, type Language } from '../../i18n'
import { CLASSIC_ONLINE, OnlineError, type RoomCommand, type RoomSnapshot } from './contracts'
import { OnlinePage } from './OnlinePage'
import { invitationUrl, readRememberedRoom, rememberRoom, type OnlineGateway } from './onlineGateway'
import { buildInitialDuel } from './onlineDuel'
import { DRAFT_CATALOG } from '../draft/catalog'
import { generateCpuTeam } from '../local-match/cpuTeam'
import { simulateMatch } from '../local-match/simulator'

const originalShare = Object.getOwnPropertyDescriptor(navigator, 'share')
const host = '00000000-0000-4000-8000-000000000001'
const guest = '00000000-0000-4000-8000-000000000002'
function fixture(): RoomSnapshot {
  return {roomId:'10000000-0000-4000-8000-000000000001',hostId:host,inviteCode:'a'.repeat(64),status:'WAITING',phase:'LOBBY',version:0,createdAt:'2026-10-18T12:00:00Z',expiresAt:'2026-10-19T12:00:00Z',deadlineAt:null,settings:CLASSIC_ONLINE,members:[{userId:host,name:'Boca',seat:1,ready:false}]}
}
function fakeGateway() {
  let state = fixture()
  let change = () => {}
  const stop = vi.fn()
  const gateway: OnlineGateway = {
    authenticate: vi.fn(async () => host),
    create: vi.fn(async () => structuredClone(state)),
    join: vi.fn(async () => structuredClone(state)),
    snapshot: vi.fn(async () => structuredClone(state)),
    command: vi.fn(async command => {
      if (command.actionType === 'LEAVE') return null
      state = {...state,version:state.version+1,members:state.members.map(m => m.userId === host && command.actionType === 'SET_READY' ? {...m,ready:command.payload.ready} : m)}
      return structuredClone(state)
    }),
    startDuel: vi.fn(async () => structuredClone(state)),
    submitState: vi.fn(async () => structuredClone(state)),
    setStrategy: vi.fn(async () => structuredClone(state)),
    revealStrategies: vi.fn(async () => ({ recruiter_one: 'NEUTRAL', recruiter_two: 'NEUTRAL' })),
    forfeit: vi.fn(async () => structuredClone(state)),
    closeRoom: vi.fn(async () => undefined),
    watch: vi.fn((_id, changed, status) => {change=changed; status('connected'); return stop}),
  }
  return {gateway,stop,update: (next: RoomSnapshot) => {state=next; change()}}
}
async function show(gateway?: OnlineGateway, language: Language = 'es-AR') {
  const i18n = await createI18n(language)
  const view = render(<I18nextProvider i18n={i18n}><OnlinePage onBack={() => {}} gateway={gateway} /></I18nextProvider>)
  return {...view,i18n}
}
beforeEach(() => {localStorage.clear(); window.history.replaceState(null,'','/'); vi.restoreAllMocks()})
afterEach(() => {
  vi.unstubAllEnvs()
  if (originalShare) Object.defineProperty(navigator, 'share', originalShare)
  else Reflect.deleteProperty(navigator, 'share')
})
describe('online lobby presentation using an explicit test adapter', () => {
  it('shows configuration absence safely and allows returning to the local menu', async () => {
    // A developer's .env.local must not change this case.
    vi.stubEnv('VITE_SUPABASE_URL', ''); vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    await show()
    expect(screen.getByRole('alert')).toHaveTextContent('VITE_SUPABASE_URL')
    expect(screen.getByRole('button',{name:'Crear sala'})).toBeDisabled()
    expect(screen.getByRole('button',{name:'Volver al inicio'})).toBeEnabled()
  })
  it.each(['es-AR','en','pt-BR'] as const)('creates a room and renders translated accessible controls in %s', async language => {
    const {gateway} = fakeGateway()
    const {i18n} = await show(gateway,language)
    await waitFor(() => expect(screen.getByRole('button',{name:i18n.t('online.create')})).toBeEnabled())
    await userEvent.type(screen.getByLabelText(i18n.t('online.name')),'Boca')
    await userEvent.click(screen.getByRole('button',{name:i18n.t('online.create')}))
    expect(await screen.findByText('Boca')).toBeInTheDocument()
    expect(screen.getByRole('button',{name:i18n.t('online.start')})).toBeDisabled()
    expect((screen.getByLabelText(i18n.t('online.shareLink')) as HTMLInputElement).value).toContain('online=')
    expect(gateway.create).toHaveBeenCalledWith('Boca',expect.any(String),'')
  })
  it('updates the rival without reloading, tolerates skipped versions and cleans its subscription', async () => {
    const fake = fakeGateway()
    const view = await show(fake.gateway)
    await waitFor(() => expect(screen.getByRole('button',{name:'Crear sala'})).toBeEnabled())
    await userEvent.click(screen.getByRole('button',{name:'Crear sala'}))
    await screen.findByText('Boca')
    await act(async () => fake.update({...fixture(),version:4,status:'READY',members:[{userId:host,name:'Boca',seat:1,ready:true},{userId:guest,name:'River',seat:2,ready:true}]}))
    expect(await screen.findByText('River')).toBeInTheDocument()
    expect(screen.getByRole('button',{name:'Iniciar sala'})).toBeEnabled()
    await userEvent.click(screen.getByRole('button',{name:'Todavía no estoy listo'}))
    expect(fake.gateway.command).toHaveBeenCalledWith(expect.objectContaining({expectedVersion:4,actionType:'SET_READY',payload:{ready:false}}))
    view.unmount(); expect(fake.stop).toHaveBeenCalledOnce()
  })
  it.each(['es-AR', 'en', 'pt-BR'] as const)('copies code and link separately and shares a translated invitation in %s', async language => {
    const user = userEvent.setup()
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    const clipboard = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    const fake = fakeGateway()
    fake.update({ ...fixture(), shortCode: 'ABC123' })
    rememberRoom(host, fixture().roomId)
    const { i18n } = await show(fake.gateway, language)
    expect(await screen.findByText('ABC123')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: i18n.t('audio.effects') })).toBeInTheDocument()
    expect(document.querySelector('.brand-emblem')).toHaveTextContent('R')
    await user.click(screen.getByRole('button', { name: i18n.t('online.copyCode') }))
    expect(clipboard).toHaveBeenLastCalledWith('ABC123')
    expect(await screen.findByText(i18n.t('online.codeCopied'))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: i18n.t('online.copy') }))
    expect(clipboard).toHaveBeenLastCalledWith(invitationUrl(fixture().inviteCode))
    expect(await screen.findByText(i18n.t('online.copied'))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: i18n.t('online.share') }))
    expect(share).toHaveBeenCalledWith({ title: 'Reclutador', text: i18n.t('online.shareText', { code: 'ABC123' }), url: invitationUrl(fixture().inviteCode) })
  })
  it('keeps sharing available without a short code, ignores cancellation and reports a real failure', async () => {
    const share = vi.fn().mockRejectedValueOnce(new DOMException('Cancelled', 'AbortError')).mockRejectedValueOnce(new Error('Unavailable'))
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    rememberRoom(host, fixture().roomId)
    const { i18n } = await show(fakeGateway().gateway)
    const button = await screen.findByRole('button', { name: i18n.t('online.share') })
    await userEvent.click(button)
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: invitationUrl(fixture().inviteCode) }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await userEvent.click(button)
    expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('online.shareFailed'))
  })
  it('hides native sharing when unavailable and reports clipboard failure', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Denied'))
    rememberRoom(host, fixture().roomId)
    const { i18n } = await show(fakeGateway().gateway)
    await screen.findByText('Boca')
    expect(screen.queryByRole('button', { name: i18n.t('online.share') })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: i18n.t('online.copy') }))
    expect(await screen.findByRole('alert')).toHaveTextContent(i18n.t('online.copyFailed'))
  })
  it('recovers a remembered room only for its authenticated owner', async () => {
    rememberRoom(host,fixture().roomId)
    expect(readRememberedRoom(guest)).toBeNull()
    const fake = fakeGateway()
    await show(fake.gateway)
    expect(await screen.findByText('Boca')).toBeInTheDocument()
    expect(fake.gateway.snapshot).toHaveBeenCalledWith(fixture().roomId)
  })
  it('does not allow creating another room while an existing room is being restored', async () => {
    rememberRoom(host,fixture().roomId)
    const fake = fakeGateway()
    let resolve: (room: RoomSnapshot) => void = () => {}
    fake.gateway.snapshot = vi.fn(() => new Promise<RoomSnapshot>(done => {resolve=done}))
    await show(fake.gateway)
    await waitFor(() => expect(fake.gateway.snapshot).toHaveBeenCalled())
    expect(screen.getByRole('button',{name:'Crear sala'})).toBeDisabled()
    await act(async () => resolve(fixture()))
    expect(await screen.findByText('Boca')).toBeInTheDocument()
  })
  it('reads a code from the invitation and verifies membership through join', async () => {
    window.history.replaceState(null,'','/?online='+'b'.repeat(64))
    const fake = fakeGateway()
    await show(fake.gateway)
    expect(screen.getByLabelText('Código o enlace de la sala')).toHaveValue('b'.repeat(64))
    await waitFor(() => expect(screen.getByRole('button',{name:'Ingresar a la sala'})).toBeEnabled())
    await userEvent.type(screen.getByLabelText('Nombre del equipo o reclutador'),'Boca')
    await userEvent.click(screen.getByRole('button',{name:'Ingresar a la sala'}))
    expect(fake.gateway.join).toHaveBeenCalledWith('b'.repeat(64),'Boca',expect.any(String))
  })
  it('retries an uncertain command with exactly the same action and version', async () => {
    const fake = fakeGateway()
    const commands: RoomCommand[] = []
    fake.gateway.command = vi.fn(async (c: RoomCommand): Promise<RoomSnapshot> => {
      commands.push(c)
      if (commands.length===1) throw new OnlineError('NETWORK_ERROR')
      return {...fixture(),version:1,members:[{userId:host,name:'Boca',seat:1,ready:true}]}
    })
    rememberRoom(host,fixture().roomId)
    await show(fake.gateway)
    await screen.findByText('Boca')
    await userEvent.click(screen.getByRole('button',{name:'Estoy listo'}))
    await userEvent.click(await screen.findByRole('button',{name:'Reintentar la misma operación'}))
    expect(commands).toHaveLength(2); expect(commands[0]).toEqual(commands[1])
    expect(await screen.findByRole('button',{name:'Todavía no estoy listo'})).toBeEnabled()
  })
  it('lets the host delete the room through the server and forgets local recovery metadata', async () => {
    const fake = fakeGateway(); rememberRoom(host,fixture().roomId)
    await show(fake.gateway); await screen.findByText('Boca')
    await userEvent.click(screen.getByRole('button',{name:'Eliminar sala'}))
    expect(fake.gateway.closeRoom).not.toHaveBeenCalled()
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Eliminar sala'}))
    expect(await screen.findByRole('button',{name:'Crear sala'})).toBeEnabled()
    expect(fake.gateway.closeRoom).toHaveBeenCalledTimes(1)
    expect(readRememberedRoom(host)).toBeNull()
  })
  it('returns from match playback to rooms without forfeiting, closing the room or starting another game', async () => {
    const fake = fakeGateway(); rememberRoom(host, fixture().roomId)
    const game = buildInitialDuel({ host: 'Boca', guest: 'River' })
    const matchResult = simulateMatch({ localLineup: generateCpuTeam(DRAFT_CATALOG, 'online-nav-one').team.lineup, cpuLineup: generateCpuTeam(DRAFT_CATALOG, 'online-nav-two').team.lineup, catalog: DRAFT_CATALOG, catalogVersion: 'catalog_v1', rulesVersion: 'local-match-v2', seed: 'online-nav' })
    const active: RoomSnapshot = { ...fixture(), status: 'IN_PROGRESS', state: { ...game, phase: 'SIMULATING', matchResult } }
    fake.gateway.snapshot = vi.fn(async () => active)
    await show(fake.gateway, 'en')
    const exit = await screen.findByRole('button', { name: 'Exit match' })
    await userEvent.click(exit)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('The room and recorded result will remain unchanged.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Exit match' }))
    expect(await screen.findByRole('button', { name: 'Create room' })).toBeEnabled()
    expect(screen.getByRole('heading', { name: 'Versus Online' })).toHaveFocus()
    expect(fake.gateway.forfeit).not.toHaveBeenCalled()
    expect(fake.gateway.closeRoom).not.toHaveBeenCalled()
    expect(fake.gateway.submitState).not.toHaveBeenCalled()
    expect(fake.gateway.startDuel).not.toHaveBeenCalled()
  })
})
