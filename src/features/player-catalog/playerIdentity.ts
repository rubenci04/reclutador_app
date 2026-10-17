import aliases from '../../data/catalog_v1/identityAliases.json'

export function normalizePlayerName(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
}

/** Explicit, reviewed aliases only. No fuzzy matching or guessing by surname/club. */
export function createIdentityResolver(registry: Readonly<Record<string, readonly string[]>>) {
  const index = new Map<string, string>()
  for (const [id, names] of Object.entries(registry)) {
    for (const name of names) {
      const key = normalizePlayerName(name)
      const previous = index.get(key)
      if (!key || (previous !== undefined && previous !== id)) {
        throw new Error(`ambiguous_player_alias:${name}`)
      }
      index.set(key, id)
    }
  }
  return (name: string): string | undefined => index.get(normalizePlayerName(name))
}

export const resolvePlayerIdentity = createIdentityResolver(aliases)

export function playerIdentityKey(name: string): string {
  const id = resolvePlayerIdentity(name)
  return id ? `player:${id}` : `name:${normalizePlayerName(name)}`
}
