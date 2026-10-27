import { createSeededRandom } from '../seededRandom'
import type { MatchSide } from '../matchTypes'
import {
  BASE_CHANCES_PER_SEGMENT, BASE_XG, CHANCES_MAX, CHANCES_MIN, CHANCE_KIND_WEIGHTS, DIFFICULTY_SPAN, ENGINE_STREAM_SUFFIX, K_ATTACK, K_MIDFIELD, K_MISS_BLOCK,
  K_MISS_SAVE, K_XG_DEFENSE, K_XG_KEEPER, MAX_CHANCES_PER_SIDE, MISS_WEIGHTS, MOMENT_MAX_OSCILLATION, MOMENT_MAX_PROBABILITY, MOMENT_MIN_PROBABILITY,
  OPEN_STYLE_WEIGHTS, POSSESSION_CHANCE_SHARE, POSSESSION_MAX, POSSESSION_MIN, POSSESSION_PER_MIDFIELD_POINT, SEGMENTS, TEMPO_SPILL, XG_MAX, XG_MIN,
  XG_SENSITIVITY, type ChanceKind, type OpenStyle,
} from './engineConstants'

/** The four lines of a team in one segment. Pure numbers: the model knows nothing about players, catalogs or screens. */
export interface Lines { readonly attack: number; readonly midfield: number; readonly defense: number; readonly keeper: number }
export interface SideSetup {
  /** One entry per segment (substitutions and the fading tactics change them during the match). */
  readonly lines: readonly Lines[]
  /** Offensive appetite of the tactic: positive gives more chances to both teams, negative fewer. */
  readonly tempo: number
}
export interface FiguresSetup { readonly seed: string; readonly sides: Readonly<Record<MatchSide, SideSetup>> }

export type MomentType = 'dribble' | 'through-ball' | 'cross' | 'shot' | 'free-kick' | 'corner' | 'penalty' | 'defense' | 'save'
export type MomentIntent = 'open' | 'break-tie' | 'extend' | 'comeback' | 'protect'
export type ChanceOutcome = 'goal' | 'save' | 'off' | 'blocked'

export interface Moment {
  readonly segment: number
  readonly type: MomentType
  /** The side whose player acts: the attacker of an attacking moment, the defender of a defensive one. */
  readonly side: MatchSide
  readonly intent: MomentIntent
  /** 0 (easy) to 1 (hard), from the relative strength of the protagonist against the rival. */
  readonly difficulty: number
  /** Goal probability of the chance behind the moment before the quality of the play moves it. */
  readonly baseProbability: number
}
export interface ResolvedMoment extends Moment {
  /** 0-1, from a minigame or automatic. */
  readonly quality: number
  readonly automatic: boolean
  /** Goal probability of the chance after the quality moved it (at most MOMENT_MAX_OSCILLATION from the base). */
  readonly probability: number
  readonly goal: boolean
}

export interface Chance {
  readonly segment: number
  /** Minute 1-90 inside the match. */
  readonly minute: number
  readonly side: MatchSide
  readonly kind: ChanceKind
  readonly style: OpenStyle | null
  readonly probability: number
  readonly outcome: ChanceOutcome
  /** 0-1 draw used by the caller to pick the shooter among the players, so the pick is part of the same stream. */
  readonly shooterRoll: number
  readonly moment: ResolvedMoment | null
}
export interface SegmentResult { readonly segment: number; readonly chances: readonly Chance[]; readonly score: Readonly<Record<MatchSide, number>>; readonly moment: ResolvedMoment | null }
export interface MatchProgress {
  readonly segments: readonly SegmentResult[]
  readonly score: Readonly<Record<MatchSide, number>>
  /** A moment waiting for the quality of a human, or null when the match is complete or needs nothing. */
  readonly waiting: Moment | null
  readonly finished: boolean
}

const SIDES: readonly MatchSide[] = ['local', 'cpu']
const rival = (side: MatchSide): MatchSide => side === 'local' ? 'cpu' : 'local'
const clamp = (value: number, lower: number, upper: number) => Math.max(lower, Math.min(upper, value))
const logit = (p: number) => Math.log(p / (1 - p))
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x))

/** Expected chances of `own` in a segment. Midfield decides who has the ball, attack against defence what is made of it, tempo opens or closes the game. */
export function chanceRate(own: Lines, other: Lines, ownTempo: number, otherTempo: number) {
  const edge = Math.exp(K_MIDFIELD * (own.midfield - other.midfield) / 10 + K_ATTACK * (own.attack - other.defense) / 10)
  return clamp(BASE_CHANCES_PER_SEGMENT * edge * (1 + ownTempo) * (1 + TEMPO_SPILL * otherTempo), CHANCES_MIN, CHANCES_MAX)
}

/** Goal probability of one chance: attack against defence and against the goalkeeper, scaled by how much the kind depends on them. */
export function goalProbability(kind: ChanceKind, attacker: Lines, defender: Lines) {
  const shift = (K_XG_DEFENSE * (attacker.attack - defender.defense) / 10 + K_XG_KEEPER * (attacker.attack - defender.keeper) / 10) * XG_SENSITIVITY[kind]
  return clamp(sigmoid(logit(BASE_XG[kind]) + shift), XG_MIN, XG_MAX)
}

/** Probability after the quality of a moment: 0.5 changes nothing, 1 gives the full oscillation to the protagonist, 0 takes it away. */
export function momentProbability(base: number, quality: number, role: 'attack' | 'defense') {
  const shift = (clamp(quality, 0, 1) - 0.5) * 2 * MOMENT_MAX_OSCILLATION
  return clamp(role === 'attack' ? base + shift : base - shift, MOMENT_MIN_PROBABILITY, MOMENT_MAX_PROBABILITY)
}

/** Inverse-CDF Poisson from a single uniform draw, so the count always costs exactly one draw. */
function poisson(mean: number, u: number) {
  let term = Math.exp(-mean)
  let cumulative = term
  let count = 0
  while (u > cumulative && count < MAX_CHANCES_PER_SIDE) { count++; term *= mean / count; cumulative += term }
  return count
}

function pick<T>(entries: readonly (readonly [T, number])[], u: number): T {
  let ticket = u * entries.reduce((sum, entry) => sum + entry[1], 0)
  for (const [value, weight] of entries) { ticket -= weight; if (ticket <= 0) return value }
  return entries[entries.length - 1][0]
}

function missOutcome(kind: ChanceKind, attacker: Lines, defender: Lines, u: number): Exclude<ChanceOutcome, 'goal'> {
  const base = MISS_WEIGHTS[kind]
  const save = base.save * Math.exp(K_MISS_SAVE * (defender.keeper - attacker.attack) / 10)
  const blocked = base.blocked * Math.exp(K_MISS_BLOCK * (defender.defense - attacker.attack) / 10)
  return pick<Exclude<ChanceOutcome, 'goal'>>([['save', save], ['off', base.off], ['blocked', blocked]], u)
}

/** Difficulty 0-1 from the relative strength: the protagonist's line against the one he faces. */
export function momentDifficulty(edge: number) { return clamp(0.5 - edge / (2 * DIFFICULTY_SPAN), 0, 1) }

function momentType(chance: { readonly kind: ChanceKind; readonly style: OpenStyle | null }, role: 'attack' | 'defense'): MomentType {
  const shotLike = chance.kind === 'penalty' || chance.kind === 'free-kick' || chance.style === 'shot'
  if (role === 'defense') return shotLike ? 'save' : 'defense'
  return chance.kind === 'open' ? chance.style! : chance.kind
}

/** What the scoreline asks of the protagonist: open the score, break a tie, extend or protect a lead, come back. */
export function momentIntent(difference: number, totalGoals: number, u: number): MomentIntent {
  if (difference === 0) return totalGoals === 0 ? 'open' : 'break-tie'
  if (difference < 0) return 'comeback'
  if (difference === 1) return u < 0.5 ? 'extend' : 'protect'
  return 'protect'
}

interface Draft { readonly segment: number; readonly minute: number; readonly side: MatchSide; readonly kind: ChanceKind; readonly style: OpenStyle | null; readonly goalRoll: number; readonly missRoll: number; readonly shooterRoll: number; readonly probability: number }

function drawSegment(random: () => number, setup: FiguresSetup, segment: number) {
  const lines = { local: setup.sides.local.lines[segment], cpu: setup.sides.cpu.lines[segment] }
  const tempo = { local: setup.sides.local.tempo, cpu: setup.sides.cpu.tempo }
  const counts = SIDES.map((side) => poisson(chanceRate(lines[side], lines[rival(side)], tempo[side], tempo[rival(side)]), random()))
  const drafts: Draft[] = []
  SIDES.forEach((side, index) => {
    for (let n = 0; n < counts[index]; n++) {
      const kind = pick(CHANCE_KIND_WEIGHTS, random())
      const style = kind === 'open' ? pick(OPEN_STYLE_WEIGHTS, random()) : (random(), null)
      const minute = segment * (90 / SEGMENTS) + 1 + Math.floor(random() * (90 / SEGMENTS))
      drafts.push({ segment, minute, side, kind, style, goalRoll: random(), missRoll: random(), shooterRoll: random(), probability: goalProbability(kind, lines[side], lines[rival(side)]) })
    }
  })
  drafts.sort((a, b) => a.minute - b.minute)
  // Fixed draws per segment whatever happens later: automatic quality (two draws averaged, mean 0.5) and the tie-break of the intent.
  const autoQuality = (random() + random()) / 2
  const intentRoll = random()
  return { drafts, lines, autoQuality, intentRoll }
}

const finish = (draft: Draft, lines: Record<MatchSide, Lines>, moment: ResolvedMoment | null): Chance => {
  const probability = moment ? moment.probability : draft.probability
  const outcome = draft.goalRoll < probability ? 'goal' : missOutcome(draft.kind, lines[draft.side], lines[rival(draft.side)], draft.missRoll)
  return { segment: draft.segment, minute: draft.minute, side: draft.side, kind: draft.kind, style: draft.style, probability, outcome, shooterRoll: draft.shooterRoll, moment: moment && { ...moment, goal: outcome === 'goal' } }
}

/**
 * Plays the match segment by segment. Everything random is drawn from `seed + ':partido'` in a fixed order, so the same seed,
 * data and moment qualities always give the same match; a quality only changes the chance it belongs to.
 * `humanSides` are the sides whose moments wait for a quality in `qualities` (indexed by segment); every other moment is automatic.
 * With no human side the whole match runs without a screen (CPU, online, tests).
 */
export function runFiguresMatch(setup: FiguresSetup, qualities: Readonly<Record<number, number>> = {}, humanSides: readonly MatchSide[] = []): MatchProgress {
  const random = createSeededRandom(`${setup.seed}${ENGINE_STREAM_SUFFIX}`)
  const segments: SegmentResult[] = []
  const score = { local: 0, cpu: 0 }
  for (let segment = 0; segment < SEGMENTS; segment++) {
    const { drafts, lines, autoQuality, intentRoll } = drawSegment(random, setup, segment)
    let target: { draft: Draft; role: 'attack' | 'defense'; side: MatchSide; intent: MomentIntent } | null = null
    const candidates = (segment % 2 === 0 ? SIDES : [...SIDES].reverse()).filter((side) => (humanSides.length ? humanSides : SIDES).includes(side))
    for (const side of candidates) {
      const intent = momentIntent(score[side] - score[rival(side)], score.local + score.cpu, intentRoll)
      const role = intent === 'protect' ? 'defense' : 'attack'
      const chancesOf = drafts.filter((draft) => draft.side === (role === 'attack' ? side : rival(side)))
      if (!chancesOf.length) continue
      target = { draft: chancesOf.reduce((best, draft) => draft.probability > best.probability ? draft : best), role, side, intent }
      break
    }
    let moment: Moment | null = null
    if (target) {
      const { draft, role, side, intent } = target
      const own = lines[side]; const other = lines[rival(side)]
      const edge = role === 'attack' ? own.attack - (other.defense * 0.7 + other.keeper * 0.3) : (own.defense * 0.7 + own.keeper * 0.3) - other.attack
      moment = { segment, type: momentType(draft, role), side, intent, difficulty: momentDifficulty(edge), baseProbability: draft.probability }
      if (humanSides.includes(side) && qualities[segment] === undefined) return { segments, score: { ...score }, waiting: moment, finished: false }
    }
    const chances = drafts.map((draft) => {
      if (!target || !moment || draft !== target.draft) return finish(draft, lines, null)
      const automatic = qualities[segment] === undefined || !humanSides.includes(target.side)
      const quality = clamp(automatic ? autoQuality : qualities[segment], 0, 1)
      const probability = momentProbability(draft.probability, quality, target.role)
      return finish(draft, lines, { ...moment, quality, automatic, probability, goal: false })
    })
    for (const chance of chances) if (chance.outcome === 'goal') score[chance.side]++
    segments.push({ segment, chances, score: { ...score }, moment: chances.find((chance) => chance.moment)?.moment ?? null })
  }
  return { segments, score: { ...score }, waiting: null, finished: true }
}

/** The whole match without a screen: every moment is automatic. */
export const playFiguresMatch = (setup: FiguresSetup) => runFiguresMatch(setup)

/** Possession from the same model that decides the match: mean midfield gap, nudged by the realised share of chances. */
export function possessionShare(setup: FiguresSetup, progress: MatchProgress) {
  const gap = progress.segments.reduce((sum, { segment }) => sum + setup.sides.local.lines[segment].midfield - setup.sides.cpu.lines[segment].midfield, 0) / Math.max(1, progress.segments.length)
  const all = progress.segments.flatMap((segment) => segment.chances)
  const share = all.length ? all.filter((chance) => chance.side === 'local').length / all.length : 0.5
  return Math.round(clamp(50 + gap * POSSESSION_PER_MIDFIELD_POINT + (share - 0.5) * 100 * POSSESSION_CHANCE_SHARE, POSSESSION_MIN, POSSESSION_MAX))
}
