export interface Point { readonly x: number; readonly y: number }
/** The ball trails a little behind and beside the pointer, so it never hides what is being pressed. */
export const BALL_OFFSET: Point = { x: 26, y: 22 }
/** Distance from the screen edge to the centre of the goal mouth where shots end. */
export const GOAL_INSET = 34

export const ballAt = (pointer: Point): Point => ({ x: pointer.x + BALL_OFFSET.x, y: pointer.y + BALL_OFFSET.y })

/** A shot goes to the goal on the side of the screen where the pointer is; `roll` (0..1) picks the corner so shots are never identical. */
export function shotTarget(pointer: Point, viewport: Point, roll: number): Point {
  const left = pointer.x < viewport.x / 2
  return { x: left ? GOAL_INSET : viewport.x - GOAL_INSET, y: viewport.y * (.4 + .2 * Math.min(1, Math.max(0, roll))) }
}
