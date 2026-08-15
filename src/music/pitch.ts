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

/** Keys a jazz guitarist actually meets, plus G for open-position comfort. */
export const KEYS: KeyDef[] = [
  { name: 'F', root: 5, prefer: 'flat' },
  { name: 'Bb', root: 10, prefer: 'flat' },
  { name: 'Eb', root: 3, prefer: 'flat' },
  { name: 'C', root: 0, prefer: 'sharp' },
  { name: 'G', root: 7, prefer: 'sharp' },
]

export function findKey(name: string): KeyDef {
  const key = KEYS.find((k) => k.name === name)
  if (!key) throw new Error(`unknown key: ${name}`)
  return key
}
