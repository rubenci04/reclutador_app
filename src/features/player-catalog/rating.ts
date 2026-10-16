import { OVERALL_RANGE } from '../../data/catalogRules'

export function assertOverallRating(value: number): void {
  if (!Number.isInteger(value) || value < OVERALL_RANGE.min || value > OVERALL_RANGE.max) {
    throw new RangeError('invalid_overall_rating')
  }
}
