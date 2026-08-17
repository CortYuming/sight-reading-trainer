import type { ChordSymbol } from './chord'
import type { BarEvent, Level } from './rhythm'
import type { Rng } from './random'
import type { Shape } from './shape'
import { chordTonePitchClasses, scalePitchClasses } from './chord'
import { MELODY_RANGE, pitchesWithClass } from './pitch'
import { TICKS_PER_BEAT } from './rhythm'
import { realiseShape, shapeFits, shapesFor } from './shape'

/** How many offsets there are to try before an offset comes round again. */
const SCALE_DEGREES = 8

export interface MelodyEvent extends BarEvent {
  /** null for a rest. A tied pair repeats the same pitch on both events. */
  midi: number | null
}

const HOME = Math.round((MELODY_RANGE.min + MELODY_RANGE.max) / 2)

/** How often a note landing on a beat is a chord tone rather than a scale tone. */
const CHORD_TONE_ON_BEAT = 0.75

/**
 * Give every rhythmic slot a pitch, in whichever of the two ways the level asks
 * for: note by note up to level 10, from melodic shapes above it.
 */
export function generateMelody(
  barRhythms: BarEvent[][],
  chords: ChordSymbol[],
  level: Level,
  rng: Rng,
): MelodyEvent[][] {
  const shapes = shapesFor(level)
  return shapes
    ? fromShapes(barRhythms, chords, shapes, rng)
    : noteByNote(barRhythms, chords, rng)
}

/**
 * One shape per bar, laid over the rhythm and repeated until the bar runs out.
 *
 * It is the move the rhythm already makes through the basics — draw one figure
 * and repeat it across the beats — and the one page 20 of the book makes with
 * pitch. A repetition that does not fit is cut off at the barline, which is
 * where a phrase ends anyway, and because a bar carries one chord a shape never
 * straddles a chord change.
 *
 * Each repetition moves on up or down the scale, the whole bar going one way.
 * Repeating a shape in place would circle three notes and be nothing to read.
 */
function fromShapes(
  barRhythms: BarEvent[][],
  chords: ChordSymbol[],
  shapes: readonly Shape[],
  rng: Rng,
): MelodyEvent[][] {
  let previous: number | null = null
  let carried: number | null = null

  return barRhythms.map((events, barIndex) => {
    const chord = chords[barIndex]
    const nextChord = chords[(barIndex + 1) % chords.length]
    const shape = rng.pick(shapes)
    const direction = rng.chance(0.5) ? 1 : -1
    let round = 0
    let queue: number[] = []

    return events.map((event): MelodyEvent => {
      if (event.rest) {
        carried = null
        return { ...event, midi: null }
      }

      if (carried !== null) {
        const midi = carried
        carried = event.tie ? midi : null
        return { ...event, midi }
      }

      if (queue.length === 0) {
        // Skip past any offset the shape cannot fit in the melody range: the
        // sequence misses a rung, which is nothing, where forcing it would fold
        // the figure into the wrong shape, which is everything.
        let step = direction * shape.sequence * round
        for (let tries = 0; tries < SCALE_DEGREES; tries++) {
          if (shapeFits(shape, chord, nextChord, step)) break
          round++
          step = direction * shape.sequence * round
        }
        queue = realiseShape(shape, chord, nextChord, previous, step)
        round++
      }
      const midi = queue.shift() as number
      previous = midi
      carried = event.tie ? midi : null
      return { ...event, midi }
    })
  })
}

/**
 * Notes that land on a beat mostly take chord tones, so the melody agrees with
 * the walking bass underneath; the notes in between move by step. The result is
 * a line that reads as music rather than as a rhythm exercise with pitches
 * sprinkled on top.
 */
function noteByNote(
  barRhythms: BarEvent[][],
  chords: ChordSymbol[],
  rng: Rng,
): MelodyEvent[][] {
  let previous: number | null = null
  let previousInterval = 0
  let carried: number | null = null

  return barRhythms.map((events, barIndex) => {
    const chord = chords[barIndex]
    const nextChord = chords[(barIndex + 1) % chords.length]
    const tones = chordTonePitchClasses(chord)
    const scale = scalePitchClasses(chord, nextChord)

    return events.map((event): MelodyEvent => {
      if (event.rest) {
        carried = null
        return { ...event, midi: null }
      }

      if (carried !== null) {
        const midi = carried
        carried = event.tie ? midi : null
        return { ...event, midi }
      }

      const onBeat = event.start % TICKS_PER_BEAT === 0
      const useChordTone = previous === null || (onBeat && rng.chance(CHORD_TONE_ON_BEAT))
      const midi = choosePitch(useChordTone ? tones : scale, previous, previousInterval, rng)

      if (previous !== null) previousInterval = midi - previous
      previous = midi
      carried = event.tie ? midi : null
      return { ...event, midi }
    })
  })
}

function choosePitch(
  pitchClasses: number[],
  previous: number | null,
  previousInterval: number,
  rng: Rng,
): number {
  const candidates = pitchClasses.flatMap((pc) => pitchesWithClass(pc, MELODY_RANGE))

  if (previous === null) {
    return candidates.reduce(
      (best, c) => (Math.abs(c - HOME) < Math.abs(best - HOME) ? c : best),
      candidates[0],
    )
  }

  const weights = candidates.map((c) => score(c, previous, previousInterval))
  return rng.weighted(candidates, weights)
}

/** Prefer stepwise motion, and answer a leap by turning back. */
function score(candidate: number, previous: number, previousInterval: number): number {
  const distance = Math.abs(candidate - previous)
  let weight: number
  if (distance === 0) weight = 0.3
  else if (distance <= 2) weight = 3
  else if (distance <= 4) weight = 2
  else if (distance <= 7) weight = 0.8
  else weight = 0.05

  if (Math.abs(previousInterval) > 4) {
    const turningBack = Math.sign(candidate - previous) === -Math.sign(previousInterval)
    weight *= turningBack ? 2 : 0.5
  }
  return weight
}
