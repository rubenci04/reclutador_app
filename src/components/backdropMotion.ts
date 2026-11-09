export interface Point { readonly x: number; readonly y: number }
/** Distance from the screen edge to the centre of the goal mouth where shots end. */
export const GOAL_INSET = 34
/** Keeps the ball on the pitch (inside the touchlines and the goals), whatever the pointer does. */
const MARGIN = 30

/** Where the ball rests for a pointer position: under it, but clamped to the pitch. The ball lives behind the interface, so it never covers anything. */
export const ballAt = (pointer: Point, viewport: Point): Point => ({
  x: Math.min(viewport.x - GOAL_INSET, Math.max(GOAL_INSET, pointer.x)),
  y: Math.min(viewport.y - MARGIN, Math.max(MARGIN, pointer.y)),
})

/** A shot goes to the goal on the side of the screen where the pointer is; `roll` (0..1) picks the corner so shots are never identical. */
export function shotTarget(pointer: Point, viewport: Point, roll: number): Point {
  const left = pointer.x < viewport.x / 2
  return { x: left ? GOAL_INSET : viewport.x - GOAL_INSET, y: viewport.y * (.4 + .2 * Math.min(1, Math.max(0, roll))) }
}
