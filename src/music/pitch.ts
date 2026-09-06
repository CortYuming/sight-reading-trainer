import { createRng } from './random'

/**
 * Pitch helpers.
 *
 * All pitches in this app are **written** pitches, expressed as MIDI numbers
 * (60 = middle C = c/4). Guitar notation sounds one octave lower than written,
 * so playback must transpose by SOUNDING_OFFSET.
 */
export const SOUNDING_OFFSET = -12

export interface PitchRange {
  min: number
  max: number
}

/** Strings 6-4, low positions: written E3 - E4. */
export const BASS_RANGE: PitchRange = { min: 52, max: 64 }

/** Strings 3-1, low positions: written G4 - B5. */
export const MELODY_RANGE: PitchRange = { min: 67, max: 83 }

export type Accidental = 'sharp' | 'flat'

const NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

/** Pitch class (0-11) of a MIDI number, or of any integer. */
export function pitchClass(value: number): number {
  return ((value % 12) + 12) % 12
}

export function pitchClassName(value: number, prefer: Accidental): string {
  return (prefer === 'flat' ? NAMES_FLAT : NAMES_SHARP)[pitchClass(value)]
}

/** Scientific pitch name, e.g. 63 -> "Eb4". */
export function noteName(midi: number, prefer: Accidental): string {
  return pitchClassName(midi, prefer) + octaveOf(midi)
}

export function octaveOf(midi: number): number {
  return Math.floor(midi / 12) - 1
}

/** VexFlow key string, e.g. 63 -> "eb/4". */
export function toVexKey(midi: number, prefer: Accidental): string {
  const name = pitchClassName(midi, prefer)
  return `${name[0].toLowerCase()}${name.slice(1)}/${octaveOf(midi)}`
}

/** Every pitch inside `range` that has the given pitch class. */
export function pitchesWithClass(pc: number, range: PitchRange): number[] {
  const wanted = pitchClass(pc)
  const result: number[] = []
  for (let midi = range.min; midi <= range.max; midi++) {
    if (pitchClass(midi) === wanted) result.push(midi)
  }
  return result
}

/**
 * The pitch of the given class that sits closest to `target` within `range`.
 * Ties resolve downward, which keeps lines from drifting to the ceiling.
 */
export function nearestPitch(pc: number, target: number, range: PitchRange): number {
  const candidates = pitchesWithClass(pc, range)
  if (candidates.length === 0) {
    throw new Error(`no pitch of class ${pc} inside ${range.min}-${range.max}`)
  }
  let best = candidates[0]
  for (const c of candidates) {
    if (Math.abs(c - target) < Math.abs(best - target)) best = c
  }
  return best
}

export interface KeyDef {
  name: string
  /** Pitch class of the tonic. */
  root: number
  prefer: Accidental
}

/**
 * All twelve keys, in circle-of-fifths order: C, then flats deepening to Db,
 * then the crossover and sharps thinning back to G. A key signature therefore
 * changes by one accidental from one entry to the next, which is the order a
 * reader works through them in.
 *
 * Where the two spellings meet the key is written F# rather than Gb. Six
 * accidentals either way, so the count does not decide it; the chords do. A
 * blues in Gb wants Cb for its IV, which this app spells B, leaving a chart
 * with six flats in the signature and a B7 over the bar. In F# the same
 * chords come out F#7, B7, C#7, all of a piece.
 */
export const KEYS: KeyDef[] = [
  { name: 'C', root: 0, prefer: 'sharp' },
  { name: 'F', root: 5, prefer: 'flat' },
  { name: 'Bb', root: 10, prefer: 'flat' },
  { name: 'Eb', root: 3, prefer: 'flat' },
  { name: 'Ab', root: 8, prefer: 'flat' },
  { name: 'Db', root: 1, prefer: 'flat' },
  { name: 'F#', root: 6, prefer: 'sharp' },
  { name: 'B', root: 11, prefer: 'sharp' },
  { name: 'E', root: 4, prefer: 'sharp' },
  { name: 'A', root: 9, prefer: 'sharp' },
  { name: 'D', root: 2, prefer: 'sharp' },
  { name: 'G', root: 7, prefer: 'sharp' },
]

/**
 * Stands among the keys for "draw one". It is not a key itself: it is resolved
 * to one of the twelve when the exercise is generated.
 */
export const RANDOM_KEY = 'random'

/**
 * Keeps the draw off the stream the exercise itself is generated from, so that
 * a random draw landing on Bb gives the same bars as asking for Bb outright.
 */
const KEY_DRAW_SALT = 0x9e3779b9

export function findKey(name: string): KeyDef {
  const key = KEYS.find((k) => k.name === name)
  if (!key) throw new Error(`unknown key: ${name}`)
  return key
}

/**
 * The key an exercise is actually in. A random key is drawn from the seed
 * rather than from Math.random, so the exercise stays reproducible: coming
 * back to a seed comes back to the key it was read in, and the reader is not
 * handed a different one on the way.
 */
export function resolveKey(name: string, seed: number): KeyDef {
  if (name !== RANDOM_KEY) return findKey(name)
  return KEYS[createRng(seed ^ KEY_DRAW_SALT).int(KEYS.length)]
}
