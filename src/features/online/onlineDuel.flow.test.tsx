import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../../i18n'
import { matchHistory } from '../history/matchHistory'
import { OnlineError, ONLINE_ERRORS, parseSnapshot } from './contracts'
import type { OnlineGateway } from './onlineGateway'
import { OnlinePage } from './OnlinePage'

/**
 * Two browsers, one real PostgreSQL (PGlite) running the actual migrations. Every RPC goes through the same SQL the
 * production database runs; only the realtime channel is replaced by an in-process notification.
 */
const db = new PGlite()
const hostId = '00000000-0000-4000-8000-0000000000b1'
const guestId = '00000000-0000-4000-8000-0000000000b2'
let lock: Promise<unknown> = Promise.resolve()
const watchers = new Set<() => void>()
const notify = () => watchers.forEach((callback) => callback())

function gatewayFor(user: string): OnlineGateway {
  async function rpc(name: string, args: unknown[]): Promise<unknown> {
    const run = async () => {
      await db.exec('reset role')
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user])
      await db.exec('set role authenticated')
      const placeholders = args.map((_, index) => `$${index + 1}`).join(',')
      try { return (await db.query<{ r: unknown }>(`select public.${name}(${placeholders}) as r`, args.map(value => (value !== null && typeof value === 'object' ? JSON.stringify(value) : value)))).rows[0].r }
      catch (error) {
        const code = ONLINE_ERRORS.find(candidate => (error as Error).message.includes(candidate))
        throw new OnlineError(code ?? 'NETWORK_ERROR')
      }
    }
    const next = lock.then(run, run)
    lock = next.catch(() => undefined)
    const value = await next
    // Only writes change the room (reads must not wake the watchers, or they would poll each other forever).
    if (!['online_snapshot', 'online_reveal_strategies'].includes(name)) notify()
    return value
  }
  return {
    authenticate: async () => user,
    create: async (name, actionId) => parseSnapshot(await rpc('online_create_room', [name, actionId])),
    join: async (code, name, actionId) => parseSnapshot(await rpc('online_join_room', [code, name, actionId])),
    snapshot: async (roomId) => parseSnapshot(await rpc('online_snapshot', [roomId])),
    command: async (command) => {
      const result = await rpc('online_command', [command.roomId, command.actionId, command.expectedVersion, command.actionType, JSON.stringify(command.payload)])
      return command.actionType === 'LEAVE' && result === null ? null : parseSnapshot(result)
    },
    startDuel: async (roomId, version, state, actionId) => parseSnapshot(await rpc('online_start_duel', [roomId, actionId, version, JSON.stringify(state)])),
    submitState: async (roomId, version, state, actionId) => parseSnapshot(await rpc('online_submit_state', [roomId, actionId, version, JSON.stringify(state)])),
    setStrategy: async (roomId, strategy) => parseSnapshot(await rpc('online_set_strategy', [roomId, strategy])),
    revealStrategies: async (roomId) => (await rpc('online_reveal_strategies', [roomId])) as Record<'recruiter_one' | 'recruiter_two', string>,
    forfeit: async (roomId, actionId) => parseSnapshot(await rpc('online_forfeit', [roomId, actionId])),
    watch: (_roomId, changed, status) => { watchers.add(changed); status('connected'); return () => { watchers.delete(changed) } },
  }
}

beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    insert into auth.users values ('${hostId}'),('${guestId}');`)
  await db.exec(readFileSync('supabase/migrations/202610180001_online_foundation.sql', 'utf8'))
  await db.exec(`create schema realtime;
    create table realtime.messages(topic text, extension text, payload jsonb);
    alter table realtime.messages enable row level security;
    grant usage on schema realtime to authenticated;
    grant select,insert on realtime.messages to authenticated;
    create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic',true) $$;
    create function realtime.send(payload jsonb,event text,topic text,private boolean) returns void language sql as $$ insert into realtime.messages values(topic,'broadcast',payload) $$;`)
  await db.exec(readFileSync('supabase/migrations/202610180002_online_lobby.sql', 'utf8'))
  await db.exec(readFileSync('supabase/migrations/202610190001_online_duel.sql', 'utf8'))
}, 60000)
afterAll(async () => { await db.close() })
beforeEach(() => {
  localStorage.clear(); matchHistory.forgetMemory()
  window.history.replaceState(null, '', '/')
  localStorage.setItem('reclutador.help.v1', JSON.stringify({ tutorialSeen: true, hints: false, dismissed: [] }))
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
})

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const pause = () => act(async () => { await sleep(60) })

async function twoPlayers() {
  const i18n = await createI18n('en')
  const hostBox = document.body.appendChild(document.createElement('div')); const guestBox = document.body.appendChild(document.createElement('div'))
  // Each browser has its own storage in real life; here the room is remembered per user id, which keeps them apart.
  const mount = (box: HTMLElement, user: string) => render(<I18nextProvider i18n={i18n}><OnlinePage onBack={() => {}} gateway={gatewayFor(user)} /></I18nextProvider>, { container: box })
  mount(hostBox, hostId); mount(guestBox, guestId)
  return { i18n, host: within(hostBox), guest: within(guestBox), hostBox, guestBox }
}
const press = (view: ReturnType<typeof within>, name: string | RegExp) => { const button = view.queryByRole('button', { name }); if (!button || (button as HTMLButtonElement).disabled) return false; fireEvent.click(button); return true }

describe('online duel, two browsers against the real database', () => {
  it('creates a room, joins by the invitation, plays the full duel and ends with the same result for both', async () => {
    const { host, guest } = await twoPlayers()
    await waitFor(() => expect(host.getByRole('button', { name: 'Create room' })).toBeEnabled())
    fireEvent.change(host.getByLabelText('Team or recruiter name'), { target: { value: 'Ana' } })
    fireEvent.click(host.getByRole('button', { name: 'Create room' }))
    const link = await waitFor(() => host.getByLabelText('Invitation link') as HTMLInputElement)
    const code = new URL(link.value).searchParams.get('online')!
    await waitFor(() => expect(guest.getByRole('button', { name: 'Join room' })).toBeEnabled())
    fireEvent.change(guest.getByLabelText('Team or recruiter name'), { target: { value: 'Beto' } })
    fireEvent.change(guest.getByLabelText('Invitation code'), { target: { value: code } })
    fireEvent.click(guest.getByRole('button', { name: 'Join room' }))
    await waitFor(() => expect(host.getAllByText('Beto').length).toBeGreaterThan(0))
    await waitFor(() => expect(guest.getByRole('button', { name: 'I am ready' })).toBeEnabled())
    fireEvent.click(guest.getByRole('button', { name: 'I am ready' }))
    // The host acts on the version it has seen: wait until it already shows the guest as ready.
    await waitFor(() => expect(host.getByText('READY')).toBeInTheDocument())
    fireEvent.click(host.getByRole('button', { name: 'I am ready' }))
    await waitFor(() => expect(host.getByRole('button', { name: 'Start room' })).toBeEnabled(), { timeout: 5000 })
    fireEvent.click(host.getByRole('button', { name: 'Start room' }))

    // The host chooses the coin; the guest only waits.
    await waitFor(() => expect(host.getByRole('button', { name: 'Heads' })).toBeInTheDocument(), { timeout: 5000 })
    await waitFor(() => expect(guest.getByText(/is choosing heads or tails/)).toBeInTheDocument())
    expect(guest.queryByRole('button', { name: 'Heads' })).toBeNull()
    fireEvent.click(host.getByRole('button', { name: 'Heads' }))

    // Auctions: whoever has the turn bids once in a while, otherwise passes; the other browser only waits.
    let turns = 0
    for (let step = 0; step < 900 && !(host.queryByText(/Teams complete|TEAMS COMPLETE/i) && guest.queryByText(/Teams complete|TEAMS COMPLETE/i)); step++) {
      for (const view of [host, guest]) {
        if (press(view, 'Start auction') || press(view, 'Confirm signing and continue') || press(view, 'Next round')) continue
        if (view.queryByRole('button', { name: 'Bid' }) && step % 3 !== 0 && press(view, 'Bid')) { turns++; continue }
        if (press(view, /^(Pass|Confirm shared discard|Confirm mandatory assignment)$/)) { turns++; continue }
        press(view, 'Bid')
      }
      await pause()
    }
    expect(turns).toBeGreaterThan(20)
    await waitFor(() => { expect(host.getByText(/TEAMS COMPLETE/i)).toBeInTheDocument(); expect(guest.getByText(/TEAMS COMPLETE/i)).toBeInTheDocument() }, { timeout: 10000 })

    // Each person arranges only their own team, then picks a strategy in secret.
    for (const view of [host, guest]) {
      await waitFor(() => expect(view.getByRole('button', { name: 'Confirm eleven' })).toBeEnabled())
      fireEvent.click(view.getByRole('button', { name: 'Confirm eleven' }))
    }
    for (const [view, pick] of [[host, 'Midfield control'], [guest, 'Low block']] as const) {
      await waitFor(() => expect(view.getByRole('button', { name: 'Confirm strategy' })).toBeInTheDocument())
      fireEvent.click(view.getByRole('radio', { name: new RegExp(pick) }))
      fireEvent.click(view.getByRole('button', { name: 'Confirm strategy' }))
      await pause()
    }
    // Both strategies chosen: the same match starts for both and ends with the same final score.
    await waitFor(() => { expect(host.getByText('Match in progress')).toBeInTheDocument(); expect(guest.getByText('Match in progress')).toBeInTheDocument() }, { timeout: 15000 })
    await waitFor(() => { expect(host.getByText('Full time')).toBeInTheDocument(); expect(guest.getByText('Full time')).toBeInTheDocument() }, { timeout: 30000 })
    const finalLine = (view: ReturnType<typeof within>) => view.getByRole('heading', { level: 2, name: /(Victory|Draw|Defeat) · \d–\d/ }).textContent!.split(' · ')[1]
    expect(finalLine(host)).toBe(finalLine(guest))
    expect(host.getAllByText(/Midfield control/).length).toBeGreaterThan(0)
    expect(guest.getAllByText(/Low block/).length).toBeGreaterThan(0)
    // Each browser stored the result from its own point of view.
    expect(matchHistory.getSnapshot().filter(entry => entry.opponent === 'online').length).toBeGreaterThan(0)
  }, 180000)

  it('ends the match for both when someone abandons', async () => {
    const { host, guest } = await twoPlayers()
    await waitFor(() => expect(host.getByRole('button', { name: 'Create room' })).toBeEnabled())
    fireEvent.change(host.getByLabelText('Team or recruiter name'), { target: { value: 'Ana' } })
    fireEvent.click(host.getByRole('button', { name: 'Create room' }))
    const code = new URL((await waitFor(() => host.getByLabelText('Invitation link') as HTMLInputElement)).value).searchParams.get('online')!
    await waitFor(() => expect(guest.getByRole('button', { name: 'Join room' })).toBeEnabled())
    fireEvent.change(guest.getByLabelText('Team or recruiter name'), { target: { value: 'Beto' } })
    fireEvent.change(guest.getByLabelText('Invitation code'), { target: { value: code } })
    fireEvent.click(guest.getByRole('button', { name: 'Join room' }))
    await waitFor(() => expect(guest.getByRole('button', { name: 'I am ready' })).toBeEnabled())
    fireEvent.click(guest.getByRole('button', { name: 'I am ready' }))
    // The host acts on the version it has seen: wait until it already shows the guest as ready.
    await waitFor(() => expect(host.getByText('READY')).toBeInTheDocument())
    fireEvent.click(host.getByRole('button', { name: 'I am ready' }))
    await waitFor(() => expect(host.getByRole('button', { name: 'Start room' })).toBeEnabled(), { timeout: 5000 })
    fireEvent.click(host.getByRole('button', { name: 'Start room' }))
    await waitFor(() => expect(guest.getByRole('button', { name: 'Abandon match' })).toBeInTheDocument(), { timeout: 10000 })
    fireEvent.click(guest.getByRole('button', { name: 'Abandon match' }))
    fireEvent.click(guest.getByRole('button', { name: 'Yes, abandon and lose' }))
    await waitFor(() => { expect(host.getByText('You win because your rival abandoned!')).toBeInTheDocument(); expect(guest.getByText('You abandoned the match: it counts as a defeat.')).toBeInTheDocument() }, { timeout: 10000 })
    expect(screen.getAllByText(/abandoned the match/i).length).toBeGreaterThan(0)
  }, 60000)
})
