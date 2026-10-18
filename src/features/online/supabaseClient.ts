import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { OnlineError } from './contracts'

export function readOnlineConfig(env: Record<string, unknown>): { url: string; key: string } | null {
  const url = env.VITE_SUPABASE_URL
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (typeof url !== 'string' || typeof key !== 'string' || !key.startsWith('sb_publishable_')) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) return null
    return { url: parsed.origin, key }
  } catch { return null }
}
let client: SupabaseClient | undefined
export function getOnlineClient(): SupabaseClient {
  const config = readOnlineConfig(import.meta.env)
  if (!config) throw new OnlineError('NOT_CONFIGURED')
  client ??= createClient(config.url, config.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  return client
}
// Deduplicate anonymous sign-in even when React StrictMode mounts twice.
const identities = new WeakMap<SupabaseClient, Promise<string>>()
export function ensureIdentity(supabase: SupabaseClient): Promise<string> {
  const pending = identities.get(supabase)
  if (pending) return pending
  const identity = (async () => {
    const existing = await supabase.auth.getSession()
    if (existing.error) throw new OnlineError('AUTH_REQUIRED')
    if (existing.data.session) return existing.data.session.user.id
    const result = await supabase.auth.signInAnonymously()
    if (result.error || !result.data.user) throw new OnlineError('AUTH_REQUIRED')
    return result.data.user.id
  })().finally(() => { identities.delete(supabase) })
  identities.set(supabase, identity)
  return identity
}
