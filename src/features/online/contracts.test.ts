import { describe, expect, it } from 'vitest'
import { parseOnlineName, validateCommand, OnlineError } from './contracts'
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
})
