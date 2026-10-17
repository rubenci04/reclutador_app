import { clubVisuals } from './clubVisuals'

export interface ClubIdentity { readonly id: string; readonly name: string }

/** Stable IDs shared by historical references, current affiliations, histories and badges. */
export const clubRegistry: Readonly<Record<string, ClubIdentity | undefined>> = Object.freeze(Object.fromEntries([
  ...Object.values(clubVisuals).filter((club) => club !== undefined).map((club) => [club.id, { id: club.id, name: club.name }]),
  ...[
    ['inter_miami', 'Inter Miami CF'], ['pumas_unam', 'Pumas UNAM'], ['rosario_central', 'Rosario Central'],
    ['los_angeles_fc', 'Los Angeles FC'], ['belgrano', 'Belgrano'], ['genoa', 'Genoa'],
    ['santos', 'Santos FC'], ['monterrey', 'Monterrey'], ['fluminense', 'Fluminense'], ['hajduk_split', 'Hajduk Split'],
  ].map(([id, name]) => [id, { id, name }]),
]))

/** Explicit aliases only; no fuzzy matching or silently created club identities. */
const aliases: Readonly<Record<string, string | undefined>> = {
  'Inter Miami CF': 'inter_miami', inter_miami_cf: 'inter_miami', LAFC: 'los_angeles_fc', lafc: 'los_angeles_fc',
  'Atlético de Madrid': 'atletico_madrid', 'Atletico Madrid': 'atletico_madrid', 'FC Barcelona': 'barcelona',
  'Pumas UNAM': 'pumas_unam', 'Rosario Central': 'rosario_central', 'AC Milan': 'ac_milan',
}
export function canonicalClubId(value: string): string | null {
  if (Object.hasOwn(clubRegistry, value)) return value
  const alias = Object.hasOwn(aliases, value) ? aliases[value] : undefined
  return alias && Object.hasOwn(clubRegistry, alias) ? alias : null
}
export function getClubIdentity(id: string): ClubIdentity | undefined {
  return Object.hasOwn(clubRegistry, id) ? clubRegistry[id] : undefined
}
