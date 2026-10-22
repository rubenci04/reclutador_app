import { NATIONALITY_FLAGS } from '../recruiter-duel/visualAssets'

/** FIFA association codes without a flag asset; only used to ask the browser for a localized country name. */
const EXTRA_ISO: Readonly<Record<string, string>> = {
  ARM: 'AM', BUL: 'BG', COD: 'CD', CZE: 'CZ', EQG: 'GQ', GAB: 'GA', GEO: 'GE', GNB: 'GW', GRE: 'GR', GUI: 'GN', HUN: 'HU', IRL: 'IE', KVX: 'XK', LBR: 'LR',
  MKD: 'MK', MLI: 'ML', MNE: 'ME', NZL: 'NZ', ROU: 'RO', RSA: 'ZA', RUS: 'RU', SRB: 'RS', SVK: 'SK', TGO: 'TG', TRI: 'TT', TUR: 'TR', UKR: 'UA', UZB: 'UZ', ZAM: 'ZM',
}
/** Home nations are not ISO regions, so they come from translations. */
export const HOME_NATIONS: ReadonlySet<string> = new Set(['ENG', 'SCO', 'WAL', 'NIR'])

/** Localized country name; falls back to the association code. */
export function nationalityName(code: string, locale: string, homeNation: (code: string) => string): string {
  if (HOME_NATIONS.has(code)) return homeNation(code)
  const flag = NATIONALITY_FLAGS[code as keyof typeof NATIONALITY_FLAGS] as string | undefined
  const iso = EXTRA_ISO[code] ?? (flag && !flag.includes('-') ? flag.toUpperCase() : undefined)
  if (!iso) return code
  try { return new Intl.DisplayNames([locale], { type: 'region' }).of(iso) ?? code } catch { return code }
}
