import type { ChordSymbol } from './chord'
import { isMinorQuality } from './chord'
import { pitchClass } from './pitch'

/** Degrees of the twelve semitones above the tonic, spelled as a reader says them. */
const DEGREES = [
  'I',
  '♭II',
  'II',
  '♭III',
  'III',
  'IV',
  '♭V',
  'V',
  '♭VI',
  'VI',
  '♭VII',
  'VII',
]

/**
 * Where a chord sits in the key, as a roman numeral: Cm7 in Bb is `ii`.
 *
 * The quality is left off. It is already on the chord name written directly
 * above, and the numeral is there to say which degree is being played — the
 * one thing the chord name does not say. A minor third turns the numeral
 * lowercase, which is how the ear hears the difference anyway.
 */
export function romanNumeral(chord: ChordSymbol, keyRoot: number): string {
  const degree = DEGREES[pitchClass(chord.root - keyRoot)]
  return isMinorQuality(chord.quality) ? degree.toLowerCase() : degree
}
