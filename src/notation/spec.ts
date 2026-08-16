import type { ExerciseBar } from '../music/exercise'
import type { Duration, EventTuplet } from '../music/rhythm'
import { spelledVexKey } from '../music/spelling'

/** One note or rest, in the form VexFlow needs. */
export interface NoteSpec {
  /** VexFlow key, e.g. "bb/3". Rests use the resting position. */
  key: string
  duration: Duration
  dots: number
  rest: boolean
  /** Set when this note belongs to a tuplet. */
  tuplet?: EventTuplet
  tieToNext: boolean
}

/** Rests sit on the middle line. */
export const REST_KEY = 'b/4'

export function bassSpecs(bar: ExerciseBar): NoteSpec[] {
  return bar.bass.map((pitch) => ({
    key: spelledVexKey(pitch),
    duration: 'q' as const,
    dots: 0,
    rest: false,
    tieToNext: false,
  }))
}

export function melodySpecs(bar: ExerciseBar): NoteSpec[] {
  return bar.melody.map((event) => ({
    key: event.spelled ? spelledVexKey(event.spelled) : REST_KEY,
    duration: event.dur,
    dots: event.dots,
    rest: event.rest,
    ...(event.tuplet ? { tuplet: event.tuplet } : {}),
    tieToNext: event.tie,
  }))
}
