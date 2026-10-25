import { describe, expect, it } from 'vitest'
import { CLASSIC_ONLINE, parseOnlineName, parseSnapshot, validateCommand, OnlineError } from './contracts'
import { readOnlineConfig } from './supabaseClient'

describe('online wire contracts', () => {
  it('sanitizes visible names without using them as identity', () => {
    expect(parseOnlineName('  Boca\n Juniors  ')).toBe('Boca Juniors')
    for (const name of ['', ' '.repeat(5), 'a'.repeat(25), null, 4]) expect(() => parseOnlineName(name)).toThrow(OnlineError)
  })
  it('rejects stale-shaped commands, invalid payloads and forged identifiers', () => {
    const command = { roomId: crypto.randomUUID(), actionId: crypto.randomUUID(), expectedVersion: 0, actionType: 'SET_READY' as const, payload: { ready: true } }
    expect(() => validateCommand(command)).not.toThrow()
    expect(() => validateCommand({ ...command, expectedVersion: -1 })).toThrow()
    expect(() => validateCommand({ ...command, roomId: 'guessed' })).toThrow()
    expect(() => validateCommand({ ...command, payload: { ready: 'true' } } as never)).toThrow()
    expect(() => validateCommand({ ...command, payload: { ready: true, budget: 200 } } as never)).toThrow()
  })
  it('accepts only public publishable configuration and rejects secret/legacy keys', () => {
    expect(readOnlineConfig({})).toBeNull()
    expect(readOnlineConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_no' })).toBeNull()
    expect(readOnlineConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example' })).toEqual({ url: 'https://example.supabase.co', key: 'sb_publishable_example' })
  })
  it('tolerates a snapshot without serverNow (servers not migrated yet) but not a malformed one', () => {
    const host = crypto.randomUUID()
    const snapshot = { roomId: crypto.randomUUID(), hostId: host, inviteCode: 'a'.repeat(64), status: 'IN_PROGRESS', phase: 'AUCTION', version: 3, createdAt: '2026-10-25T12:00:00Z', expiresAt: '2026-10-26T12:00:00Z', deadlineAt: '2026-10-25T12:02:00Z', settings: CLASSIC_ONLINE, members: [{ userId: host, name: 'Ana', seat: 1, ready: true }] }
    expect(parseSnapshot(snapshot).serverNow).toBeUndefined()
    expect(parseSnapshot({ ...snapshot, serverNow: '2026-10-25T12:00:01Z' }).serverNow).toBe('2026-10-25T12:00:01Z')
    expect(() => parseSnapshot({ ...snapshot, serverNow: 'yesterday-ish' })).toThrow(OnlineError)
  })
})
