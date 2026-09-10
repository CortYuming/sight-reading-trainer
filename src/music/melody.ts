import type { ChordSymbol } from './chord'
import type { BarEvent, Level } from './rhythm'
import type { Rng } from './random'
import type { Shape } from './shape'
import { chordTonePitchClasses, scalePitchClasses } from './chord'
import { MELODY_RANGE, nearestPitch, pitchClass, pitchesWithClass } from './pitch'
import { TICKS_PER_BEAT, repeatPeriod } from './rhythm'
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
 * How long the line keeps going the way it is going, and how long it is left
 * to its own devices afterwards, both in notes.
 *
 * A line that runs a few notes one way and then turns is what a player does;
 * distance from the last note, which is all the weighting used to be, has no
 * memory of direction and wanders. Leaning every note one way instead came out
 * insistent — the rests between the runs are what stop the device becoming a
 * tic.
 */
const RUN_MIN = 3
const RUN_SPAN = 4
const REST_MIN = 2
const REST_SPAN = 3

/** How much a note that carries the run on outweighs one that turns back. */
const INERTIA = 1.55

/** Standing still is worth less than moving, run or no run. */
const REPEATED_NOTE = 0.7

/**
 * How often an off-beat note steps outside the scale.
 *
 * Rare on purpose. A chromatic passing note is what a jazz line is full of, but
 * every one of them is an accidental to read, and at any real frequency the
 * page stops being a sight-reading exercise. The scale itself is left alone —
 * blue notes in the pool coloured every bar rather than the odd note.
 */
const CHROMATIC_CHANCE = 0.04

/** How often the note approaching the next bar comes from below rather than above. */
const APPROACH_FROM_BELOW = 0.6

/** Where the line is in a run: which way, how much longer, and whether resting. */
interface Run {
  dir: number
  left: number
  resting: boolean
}

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

    return events.map((event, index): MelodyEvent => {
      if (event.rest) {
        carried = null
        return { ...event, midi: null }
      }

      if (carried !== null) {
        const midi = carried
        carried = event.tie ? midi : null
        return { ...event, midi }
      }

      if (index === events.length - 1 && event.tie) {
        const midi = anticipate(nextChord, previous)
        previous = midi
        carried = midi
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
 * A bar of melody, note by note.
 *
 * Three things shape it beyond the note-to-note weighting. Where the rhythm
 * repeats a figure — which through the basics it always does — the pitches
 * repeat with it, moved a degree up or down the scale each time, so the bar
 * reads as one figure sequenced rather than as two unrelated halves saying the
 * same rhythm. The line keeps going the way it is going for a few notes at a
 * time, and is then left alone for a few more. And a bar is aimed at the one
 * after it: the coming chord is met on a chord tone, approached where there is
 * a note free to approach with, which is what the bass already does on beat 4.
 *
 * Notes that land on a beat still mostly take chord tones, so the melody agrees
 * with the walking bass underneath, and the notes in between still move by step.
 */
function noteByNote(
  barRhythms: BarEvent[][],
  chords: ChordSymbol[],
  rng: Rng,
): MelodyEvent[][] {
  let previous: number | null = null
  let previousInterval = 0
  let carried: number | null = null
  /** The chord tone the coming bar is to be met on, set by the bar before it. */
  let landing: number | null = null
  const run: Run = {
    dir: rng.chance(0.5) ? 1 : -1,
    left: RUN_MIN + rng.int(RUN_SPAN),
    resting: false,
  }

  return barRhythms.map((events, barIndex) => {
    const chord = chords[barIndex]
    const nextChord = chords[(barIndex + 1) % chords.length]
    const tones = chordTonePitchClasses(chord)
    const scale = scalePitchClasses(chord, nextChord)
    const ladder = scaleLadder(scale)

    const period = repeatPeriod(events)
    const direction = rng.chance(0.5) ? 1 : -1
    /** The first go round the figure, by offset within it: what to sequence. */
    const figure = new Map<number, number>()
    let opening = true

    function draw(event: BarEvent): number {
      if (opening && landing !== null) {
        opening = false
        return landing
      }
      opening = false

      const onBeat = event.start % TICKS_PER_BEAT === 0

      if (!onBeat && previous !== null && rng.chance(CHROMATIC_CHANCE)) {
        const step =
          previousInterval === 0 ? (rng.chance(0.5) ? 1 : -1) : Math.sign(previousInterval)
        const candidate = previous + step
        if (candidate >= MELODY_RANGE.min && candidate <= MELODY_RANGE.max) return candidate
      }

      const useChordTone = previous === null || (onBeat && rng.chance(CHORD_TONE_ON_BEAT))
      const midi = choosePitch(useChordTone ? tones : scale, previous, previousInterval, rng, run)
      advance(run, rng)
      return midi
    }

    const bar = events.map((event, index): MelodyEvent => {
      if (event.rest) {
        carried = null
        return { ...event, midi: null }
      }

      if (carried !== null) {
        const midi = carried
        carried = event.tie ? midi : null
        return { ...event, midi }
      }

      if (index === events.length - 1 && event.tie) {
        const midi = anticipate(nextChord, previous)
        previousInterval = previous === null ? 0 : midi - previous
        previous = midi
        carried = midi
        return { ...event, midi }
      }

      let midi: number
      if (period === null) {
        midi = draw(event)
      } else {
        const within = event.start % period
        const round = Math.floor(event.start / period)
        const opened = figure.get(within)
        if (round === 0 || opened === undefined) {
          midi = draw(event)
          if (round === 0) figure.set(within, midi)
        } else {
          midi = stepAlong(ladder, opened, direction * round)
        }
      }

      if (previous !== null) previousInterval = midi - previous
      previous = midi
      carried = event.tie ? midi : null
      return { ...event, midi }
    })

    // Point the bar at the one after it, and note where that one comes in.
    //
    // Where the bar is free — the mixed levels, whose beats are drawn one at a
    // time — its last note becomes a semitone neighbour of the chord tone the
    // next bar opens on, which is the approach the bass plays on beat 4. Where
    // a figure is being sequenced, its last note is the end of that figure:
    // overwriting it broke the sequence just as it landed, so there only the
    // landing is aimed and the figure is left to finish.
    if (barIndex < barRhythms.length - 1) {
      const sounding = bar.filter((event) => event.midi !== null && !event.tie)
      const last = sounding[sounding.length - 1]
      const from = last?.midi ?? previous ?? HOME
      const target = nearestPitch(rng.pick(chordTonePitchClasses(nextChord)), from, MELODY_RANGE)

      if (period === null && sounding.length >= 2 && last !== undefined) {
        const below = target - 1
        const above = target + 1
        const approach = rng.chance(APPROACH_FROM_BELOW)
          ? below >= MELODY_RANGE.min
            ? below
            : above
          : above <= MELODY_RANGE.max
            ? above
            : below
        last.midi = approach
        previousInterval = previous === null ? 0 : approach - previous
        previous = approach
      }
      landing = target
    }

    return bar
  })
}

/** The scale as the pitches it has in the melody range, low to high. */
function scaleLadder(pitchClasses: number[]): number[] {
  const ladder: number[] = []
  for (let midi = MELODY_RANGE.min; midi <= MELODY_RANGE.max; midi++) {
    if (pitchClasses.includes(pitchClass(midi))) ladder.push(midi)
  }
  return ladder
}

/**
 * Move a pitch along the scale by whole degrees, folding back the other way
 * where the range runs out rather than piling up against its end.
 */
function stepAlong(ladder: number[], from: number, degrees: number): number {
  let nearest = 0
  for (let i = 1; i < ladder.length; i++) {
    if (Math.abs(ladder[i] - from) < Math.abs(ladder[nearest] - from)) nearest = i
  }
  let to = nearest + degrees
  if (to < 0 || to >= ladder.length) to = nearest - degrees
  return ladder[Math.max(0, Math.min(ladder.length - 1, to))]
}

/** Count one note off the run, and swap between running and resting at its end. */
function advance(run: Run, rng: Rng): void {
  run.left--
  if (run.left > 0) return
  if (run.resting) {
    run.resting = false
    run.dir = -run.dir
    run.left = RUN_MIN + rng.int(RUN_SPAN)
  } else {
    run.resting = true
    run.left = REST_MIN + rng.int(REST_SPAN)
  }
}

/**
 * The note to hold over a barline: a chord tone of the bar being arrived at,
 * nearest to where the line already is.
 *
 * A jazz line anticipates — the coming chord is sounded an eighth before it is
 * due — and that is the whole point of tying across the barline. Holding the
 * current chord's note over instead would land a dissonance on the downbeat as
 * often as not.
 */
function anticipate(chord: ChordSymbol, previous: number | null): number {
  const target = previous ?? HOME
  const candidates = chordTonePitchClasses(chord).flatMap((pc) =>
    pitchesWithClass(pc, MELODY_RANGE),
  )
  return candidates.reduce(
    (best, c) => (Math.abs(c - target) < Math.abs(best - target) ? c : best),
    candidates[0],
  )
}

function choosePitch(
  pitchClasses: number[],
  previous: number | null,
  previousInterval: number,
  rng: Rng,
  run: Run,
): number {
  const candidates = pitchClasses.flatMap((pc) => pitchesWithClass(pc, MELODY_RANGE))

  if (previous === null) {
    return candidates.reduce(
      (best, c) => (Math.abs(c - HOME) < Math.abs(best - HOME) ? c : best),
      candidates[0],
    )
  }

  const weights = candidates.map((c) => score(c, previous, previousInterval, run))
  return rng.weighted(candidates, weights)
}

/**
 * Prefer stepwise motion, answer a leap by turning back, and while a run is
 * going, lean the way it is going.
 */
function score(
  candidate: number,
  previous: number,
  previousInterval: number,
  run: Run,
): number {
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

  if (run.resting) return weight
  const step = Math.sign(candidate - previous)
  if (step === 0) return weight * REPEATED_NOTE
  return weight * (step === run.dir ? INERTIA : 1 / INERTIA)
}
