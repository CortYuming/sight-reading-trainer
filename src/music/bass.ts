import type { ChordSymbol } from './chord'
import type { Rng } from './random'
import { chordTonePitchClasses, scalePitchClasses } from './chord'
import { BASS_RANGE, nearestPitch, pitchClass } from './pitch'

/** Middle of the bass range — where a line starts before it has any history. */
const HOME = Math.round((BASS_RANGE.min + BASS_RANGE.max) / 2)

/**
 * A walking bass line: four quarter notes per bar.
 *
 * Beat 1 states the root, beats 2-3 outline the chord, and beat 4 approaches
 * the next bar's root from a semitone away or from its dominant, which is what
 * makes the bar boundaries pull forward.
 */
export function generateBass(chords: ChordSymbol[], rng: Rng): number[][] {
  const bars: number[][] = []
  let previous: number | null = null

  chords.forEach((chord, index) => {
    const next = chords[(index + 1) % chords.length]
    const tones = chordTonePitchClasses(chord)
    const upper = tones.slice(1) // 3rd, 5th, 7th
    const scale = scalePitchClasses(chord, next)

    const beat1 = nearestPitch(chord.root, previous ?? HOME, BASS_RANGE)

    const beat2pc = rng.pick(upper)
    const beat2 = place(beat2pc, beat1)

    const beat3pc = rng.pick(without([...upper, ...scale], beat2pc))
    const beat3 = place(beat3pc, beat2)

    const approaches = [
      pitchClass(next.root + 1),
      pitchClass(next.root - 1),
      pitchClass(next.root + 7),
    ]
    const weights = [2, 2, 1]
    const allowed = approaches.filter((pc) => pc !== beat3pc)
    const approach =
      allowed.length > 0
        ? rng.weighted(
            allowed,
            approaches.flatMap((pc, i) => (pc === beat3pc ? [] : [weights[i]])),
          )
        : rng.weighted(approaches, weights)
    const beat4 = place(approach, beat3)

    bars.push([beat1, beat2, beat3, beat4])
    previous = beat4
  })

  return bars
}

/** Put a pitch class in the octave closest to the note just played. */
function place(pc: number, target: number): number {
  return nearestPitch(pc, target, BASS_RANGE)
}

/** Drop one pitch class from a candidate list, keeping the list non-empty. */
function without(pitchClasses: number[], excluded: number): number[] {
  const kept = pitchClasses.filter((pc) => pc !== excluded)
  return kept.length > 0 ? kept : pitchClasses
}
