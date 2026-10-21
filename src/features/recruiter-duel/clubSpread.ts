/**
 * club-spread-v3 presentation order: no two consecutive cards of the same reference club whenever a sequence exists.
 * Deterministic: it only reorders the already selected cards, walking them in the given (seeded) order and taking the first
 * one that keeps a clash-free arrangement of the rest possible. Nothing is added, dropped or repriced.
 */
export const CLUB_SPREAD_POLICY = 'club-spread-v3'

/** Can the multiset (club -> count) be laid out with no equal neighbours and a first card different from `last`? */
function arrangeable(counts: ReadonlyMap<string, number>, last: string | null): boolean {
  let total = 0, max = 0, maxClub = ''
  for (const [club, count] of counts) { total += count; if (count > max) { max = count; maxClub = club } }
  if (total === 0) return true
  if (max > Math.ceil(total / 2)) return false
  return !(total % 2 === 1 && max === (total + 1) / 2 && maxClub === last)
}

export function spreadClubs<T>(cards: readonly T[], clubOf: (card: T) => string): { readonly order: readonly T[]; readonly repeats: number } {
  const counts = new Map<string, number>()
  for (const card of cards) counts.set(clubOf(card), (counts.get(clubOf(card)) ?? 0) + 1)
  const remaining = [...cards]
  const order: T[] = []
  let last: string | null = null, repeats = 0
  while (remaining.length) {
    let pick = remaining.findIndex((card) => {
      const club = clubOf(card)
      if (club === last) return false
      const after = new Map(counts); after.set(club, (after.get(club) ?? 0) - 1)
      return arrangeable(after, club)
    })
    if (pick < 0) {
      // No clash-free continuation exists: keep the clubs with most cards left apart as long as possible and count the unavoidable repeats.
      const candidates = remaining.map((card, index) => ({ index, club: clubOf(card) })).filter((entry) => entry.club !== last)
      const best = (candidates.length ? candidates : remaining.map((card, index) => ({ index, club: clubOf(card) }))).sort((a, b) => (counts.get(b.club) ?? 0) - (counts.get(a.club) ?? 0) || a.index - b.index)[0]
      pick = best.index
    }
    const [card] = remaining.splice(pick, 1)
    const club = clubOf(card)
    if (club === last) repeats++
    counts.set(club, (counts.get(club) ?? 0) - 1)
    order.push(card); last = club
  }
  return { order, repeats }
}

/** Consecutive equal-club pairs of an already ordered sequence. */
export const clubRepeats = <T,>(cards: readonly T[], clubOf: (card: T) => string): number => cards.reduce((total, card, index) => total + (index > 0 && clubOf(card) === clubOf(cards[index - 1]) ? 1 : 0), 0)
