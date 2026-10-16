import { assertOverallRating } from './rating'

/** Single pricing rule shared by future catalog, draft and server. Returns millions. */
export function calculatePlayerPrice(overallRating: number): number {
  assertOverallRating(overallRating)
  return Math.round(3 + 22 * Math.pow((overallRating - 75) / 24, 2.2))
}
