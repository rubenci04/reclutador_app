/** Commercial presentation only. Technical identifiers stay versioned for saved-draft compatibility. */
export const PRODUCT = {
  name: 'Reclutador',
  technicalDraftStorageKey: 'draft-legends.draft-v1',
  catalogVersion: 'catalog_v1',
} as const

/**
 * Photos of players and coaches are off: every screen draws the figure instead (PlayerAvatar / CoachAvatar), no photo is requested and no
 * photo credits are shown. The photo files live in assets-archive/photos (not published). See docs/AVATARS-DESIGN.md before turning this on.
 */
export const SHOW_PLAYER_PHOTOS: boolean = false
