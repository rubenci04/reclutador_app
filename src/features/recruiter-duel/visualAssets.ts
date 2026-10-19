import type { NATIONALITY_CODES } from '../../data/catalogRules'
import fetchedPhotos from '../../data/player-photos.json'

export const NATIONALITY_FLAGS = {
  ARG:'ar', BRA:'br', URU:'uy', CHI:'cl', COL:'co', PAR:'py', ECU:'ec', PER:'pe', VEN:'ve', MEX:'mx', USA:'us', CAN:'ca', ENG:'gb-eng', SCO:'gb-sct', WAL:'gb-wls', NED:'nl', GER:'de', FRA:'fr', ESP:'es', ITA:'it', POR:'pt', BEL:'be', CRO:'hr', POL:'pl', SWE:'se', DEN:'dk', NOR:'no', JPN:'jp', KOR:'kr', AUS:'au', SEN:'sn', CMR:'cm', CIV:'ci', GHA:'gh', NGA:'ng', EGY:'eg', MAR:'ma', ALG:'dz', SUI:'ch', ISL:'is', CRC:'cr', SVN:'si', AUT:'at', BIH:'ba', PAN:'pa', TUN:'tn', IRN:'ir', KSA:'sa', QAT:'qa',
} satisfies Partial<Record<(typeof NATIONALITY_CODES)[number], string>>

export function flagUrl(code: string) {
  const iso = NATIONALITY_FLAGS[code as keyof typeof NATIONALITY_FLAGS]
  return iso ? `/assets/flags/${iso}.svg` : undefined
}

export interface PhotoAsset {
  readonly playerId: string; readonly path: string; readonly sourceUrl: string; readonly author: string
  readonly license: string; readonly licenseUrl: string; readonly attribution: string
  readonly verifiedAt: string; readonly approval: 'approved' | 'pending' | 'rejected'; readonly notes: string
}
/** Free-licence Commons thumbnails (generated from the Wikimedia API metadata) plus the hand-reviewed pilot below. */
const FETCHED_PHOTOS = fetchedPhotos as readonly PhotoAsset[]
const PILOT_PHOTOS: readonly PhotoAsset[] = [{
  playerId:'plr_038', path:'/assets/players/plr_038.jpg',
  sourceUrl:'https://commons.wikimedia.org/wiki/File:Lionel_Messi_20180626.jpg', author:'Кирилл Венедиктов',
  license:'CC BY-SA 3.0', licenseUrl:'https://creativecommons.org/licenses/by-sa/3.0/',
  attribution:'Lionel Messi 20180626 — Кирилл Венедиктов / soccer.ru — CC BY-SA 3.0', verifiedAt:'2026-10-17', approval:'approved',
  notes:'Resized Commons thumbnail, 250 × 357, 32601 bytes. Thumbnail distributed under CC BY-SA 3.0. Photograph from 2018; no claim of catalogue reference year or endorsement.',
}]
export const PHOTO_MANIFEST: readonly PhotoAsset[] = [...PILOT_PHOTOS, ...FETCHED_PHOTOS.filter((photo) => !PILOT_PHOTOS.some((pilot) => pilot.playerId === photo.playerId))]
export function approvedPhoto(id: string) { return PHOTO_MANIFEST.find((photo) => photo.playerId === id && photo.approval === 'approved') }
export interface ClubAsset { readonly path:string; readonly sourceUrl:string; readonly license:string; readonly trademarkRestrictions:string; readonly approved:boolean }
export const CLUB_ASSETS: Readonly<Record<string, ClubAsset | undefined>> = {}
