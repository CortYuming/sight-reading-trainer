import type { Accidental } from './pitch'
import { pitchClass, pitchClassName } from './pitch'

export type Quality =
  | 'maj7'
  | 'maj6'
  | 'dom7'
  | 'min7'
  | 'min6'
  | 'min7b5'
  | 'dim7'

export interface ChordSymbol {
  /** Pitch class of the root (0-11). */
  root: number
  quality: Quality
  /** Display text in the current key spelling, e.g. "Bbmaj7". */
  label: string
}

const ROOT_LETTERS: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
}

/** Longest suffixes first so that "m7b5" wins over "m7". */
const QUALITY_SUFFIXES: Array<[string, Quality]> = [
  ['maj7', 'maj7'],
  ['M7', 'maj7'],
  ['m7b5', 'min7b5'],
  ['dim7', 'dim7'],
  ['m7', 'min7'],
  ['-7', 'min7'],
  ['m6', 'min6'],
  ['7', 'dom7'],
  ['6', 'maj6'],
]

const QUALITY_LABELS: Record<Quality, string> = {
  maj7: 'maj7',
  maj6: '6',
  dom7: '7',
  min7: 'm7',
  min6: 'm6',
  min7b5: 'm7b5',
  dim7: 'dim7',
}

/** Semitones above the root. */
const CHORD_TONES: Record<Quality, number[]> = {
  maj7: [0, 4, 7, 11],
  maj6: [0, 4, 7, 9],
  dom7: [0, 4, 7, 10],
  min7: [0, 3, 7, 10],
  min6: [0, 3, 7, 9],
  min7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
}

const SCALES: Record<Quality, number[]> = {
  maj7: [0, 2, 4, 5, 7, 9, 11], // Ionian
  maj6: [0, 2, 4, 5, 7, 9, 11], // Ionian
  dom7: [0, 2, 4, 5, 7, 9, 10], // Mixolydian
  min7: [0, 2, 3, 5, 7, 9, 10], // Dorian
  min6: [0, 2, 3, 5, 7, 9, 10], // Dorian
  min7b5: [0, 2, 3, 5, 6, 8, 10], // Locrian natural 2
  dim7: [0, 2, 3, 5, 6, 8, 9, 11], // Whole-half diminished
}

/** Mixolydian b9 b13 — the sound of a V7 heading for a minor chord. */
const PHRYGIAN_DOMINANT = [0, 1, 4, 5, 7, 8, 10]

export function isMinorQuality(quality: Quality): boolean {
  return quality === 'min7' || quality === 'min6' || quality === 'min7b5' || quality === 'dim7'
}

export function parseChord(text: string, prefer: Accidental = 'flat'): ChordSymbol {
  const raw = text.trim().replace(/♯/g, '#').replace(/♭/g, 'b')
  const letter = raw[0]?.toUpperCase()
  if (!letter || !(letter in ROOT_LETTERS)) {
    throw new Error(`cannot parse chord root: "${text}"`)
  }

  let root = ROOT_LETTERS[letter]
  let rest = raw.slice(1)
  if (rest[0] === '#') {
    root = pitchClass(root + 1)
    rest = rest.slice(1)
  } else if (rest[0] === 'b') {
    root = pitchClass(root - 1)
    rest = rest.slice(1)
  }

  const match = QUALITY_SUFFIXES.find(([suffix]) => suffix === rest)
  if (!match) throw new Error(`unsupported chord quality: "${text}"`)

  return makeChord(root, match[1], prefer)
}

export function makeChord(root: number, quality: Quality, prefer: Accidental): ChordSymbol {
  const pc = pitchClass(root)
  return { root: pc, quality, label: pitchClassName(pc, prefer) + QUALITY_LABELS[quality] }
}

export function transposeChord(chord: ChordSymbol, semitones: number, prefer: Accidental): ChordSymbol {
  return makeChord(chord.root + semitones, chord.quality, prefer)
}

/** Pitch classes of the chord tones, root first. */
export function chordTonePitchClasses(chord: ChordSymbol): number[] {
  return CHORD_TONES[chord.quality].map((interval) => pitchClass(chord.root + interval))
}

/**
 * Pitch classes of the scale to improvise over this chord.
 * A dominant chord resolving to a minor chord borrows the phrygian dominant,
 * which is what makes E7 -> Am7 sound like jazz instead of an exercise.
 */
export function scalePitchClasses(chord: ChordSymbol, next?: ChordSymbol): number[] {
  const intervals =
    chord.quality === 'dom7' && next && isMinorQuality(next.quality)
      ? PHRYGIAN_DOMINANT
      : SCALES[chord.quality]
  return intervals.map((interval) => pitchClass(chord.root + interval))
}
