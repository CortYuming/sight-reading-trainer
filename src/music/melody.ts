import type { ChordSymbol } from './chord'
import type { BarEvent } from './rhythm'
import type { Rng } from './random'
import { chordTonePitchClasses, scalePitchClasses } from './chord'
import { MELODY_RANGE, pitchesWithClass } from './pitch'
import { TICKS_PER_BEAT } from './rhythm'

export interface MelodyEvent extends BarEvent {
  /** null for a rest. A tied pair repeats the same pitch on both events. */
  midi: number | null
}

const HOME = Math.round((MELODY_RANGE.min + MELODY_RANGE.max) / 2)

/** How often a note landing on a beat is a chord tone rather than a scale tone. */
const CHORD_TONE_ON_BEAT = 0.75

/**
 * Give every rhythmic slot a pitch.
 *
 * Notes that land on a beat mostly take chord tones, so the melody agrees with
 * the walking bass underneath; the notes in between move by step. The result is
 * a line that reads as music rather than as a rhythm exercise with pitches
 * sprinkled on top.
 */
export function generateMelody(
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
