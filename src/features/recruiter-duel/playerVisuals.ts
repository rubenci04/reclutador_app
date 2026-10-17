/**
 * Optional, verified presentation data for future player-card thumbnails.
 * The current catalogue intentionally has no remote image URLs.
 */
export interface PlayerThumbnail {
  readonly url: string
  readonly sourceUrl: string
  readonly license: string
  readonly attribution: string
}

export interface PlayerCardVisual {
  readonly thumbnail?: PlayerThumbnail
}

export type PlayerCardVisualIndex = Readonly<Record<string, PlayerCardVisual | undefined>>

export const PLAYER_CARD_VISUALS: PlayerCardVisualIndex = {}
