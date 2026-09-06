import type { Accidental, KeyDef } from './pitch'
import type { ChordSymbol } from './chord'
import { pitchClass, pitchClassName } from './pitch'
import { scalePitchClasses } from './chord'

export type NoteAccidental = '' | '#' | 'b'

export interface SpelledPitch {
  midi: number
  /** 'A' to 'G'. */
  letter: string
  accidental: NoteAccidental
  octave: number
}

export interface Spelling {
  letter: string
  accidental: NoteAccidental
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const LETTER_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11]

/** The order accidentals are laid out in a key signature. */
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B']
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F']

/** Which letters a key signature alters, and how. */
export type KeySignature = Map<string, NoteAccidental>

/**
 * A key's signature, worked out from its tonic: seven fifths up from C is one
 * sharp, and the same distance down is one flat, so the tonic alone gives the
 * count. `prefer` settles the enharmonic pair, where the count cannot.
 */
export function keySignature(key: KeyDef): KeySignature {
  const fifths = (key.root * 7) % 12
  const sharp = key.prefer === 'sharp'
  const order = sharp ? SHARP_ORDER : FLAT_ORDER
  const count = sharp ? fifths : (12 - fifths) % 12
  return new Map(order.slice(0, count).map((letter) => [letter, sharp ? '#' : 'b']))
}

/**
 * Spellings a guitarist would rather not read. They are all valid on paper,
 * but "Cb" in the middle of a line costs more than it explains, so those
 * pitches fall back to the plain sharp/flat name for the key.
 *
 * Unless the signature already writes it, in which case the reasoning turns
 * over: E# in F# major needs no accidental at all, while the F natural it
 * would fall back to needs a sign of its own. The awkward spelling is then
 * the plainer one on the page, and it is also the degree of the scale the
 * reader is in.
 */
function isAwkward(spelling: Spelling, signature: KeySignature): boolean {
  const { letter, accidental } = spelling
  if (signature.get(letter) === accidental) return false
  return (
    (accidental === 'b' && (letter === 'C' || letter === 'F')) ||
    (accidental === '#' && (letter === 'B' || letter === 'E'))
  )
}

/**
 * The octave a spelling sits in, read off its letter rather than off the pitch.
 * B#3 and Cb4 sound as C4 and B3, so taking the octave from the midi number
 * would put either of them an octave out.
 */
function octaveOfSpelling(midi: number, spelling: Spelling): number {
  const natural = LETTER_PITCH_CLASSES[letterIndexOf(spelling.letter)]
  const offset = spelling.accidental === '#' ? 1 : spelling.accidental === 'b' ? -1 : 0
  return Math.round((midi - offset - natural) / 12) - 1
}

function plainSpelling(pc: number, prefer: Accidental): Spelling {
  const name = pitchClassName(pc, prefer)
  return { letter: name[0], accidental: (name.slice(1) as NoteAccidental) || '' }
}

/** Spell a pitch class using a given letter, if a single accidental can do it. */
function spellWithLetter(letterIndex: number, pc: number): Spelling | null {
  const natural = LETTER_PITCH_CLASSES[letterIndex]
  const offset = ((pitchClass(pc) - natural + 18) % 12) - 6
  if (offset === 0) return { letter: LETTERS[letterIndex], accidental: '' }
  if (offset === 1) return { letter: LETTERS[letterIndex], accidental: '#' }
  if (offset === -1) return { letter: LETTERS[letterIndex], accidental: 'b' }
  return null
}

function letterIndexOf(letter: string): number {
  const index = LETTERS.indexOf(letter.toUpperCase())
  if (index < 0) throw new Error(`not a note letter: ${letter}`)
  return index
}

/**
 * Name every note of the chord's scale by walking the alphabet up from the
 * root, which is how the scale is written on paper: Fmaj7 in the key of C
 * spells its fourth degree Bb, never A#.
 */
export function chordScaleSpelling(
  chord: ChordSymbol,
  next: ChordSymbol | undefined,
  key: KeyDef,
): Map<number, Spelling> {
  const scale = scalePitchClasses(chord, next)
  const signature = keySignature(key)
  const prefer = key.prefer
  const map = new Map<number, Spelling>()

  // The diminished scale has eight notes, so one letter has to serve twice.
  // Rather than invent a rule for it, spell that scale plainly.
  if (scale.length !== 7) {
    for (const pc of scale) map.set(pc, plainSpelling(pc, prefer))
    return map
  }

  const rootLetter = letterIndexOf(chord.label[0])
  scale.forEach((pc, degree) => {
    const spelled = spellWithLetter((rootLetter + degree) % 7, pc)
    map.set(pc, spelled && !isAwkward(spelled, signature) ? spelled : plainSpelling(pc, prefer))
  })
  return map
}

function shift(accidental: NoteAccidental, by: 1 | -1): NoteAccidental | null {
  const order: NoteAccidental[] = ['b', '', '#']
  const index = order.indexOf(accidental) + by
  return index >= 0 && index < order.length ? order[index] : null
}

/**
 * Name a chromatic note from the scale note it leans on: rising notes are
 * sharpened from below (F to F#), falling notes flattened from above (G to Gb).
 */
function spellChromatic(
  pc: number,
  scaleMap: Map<number, Spelling>,
  rising: boolean,
  prefer: Accidental,
  signature: KeySignature,
): Spelling {
  const neighbour = rising ? scaleMap.get(pitchClass(pc - 1)) : scaleMap.get(pitchClass(pc + 1))
  if (neighbour) {
    const accidental = shift(neighbour.accidental, rising ? 1 : -1)
    if (accidental !== null) {
      const spelled = { letter: neighbour.letter, accidental }
      if (!isAwkward(spelled, signature)) return spelled
    }
  }
  return plainSpelling(pc, prefer)
}

/**
 * Spell a run of pitches in the context of one chord. Direction matters, so
 * the notes have to be spelled as a line rather than one at a time.
 */
export function spellSequence(
  midis: Array<number | null>,
  scaleMap: Map<number, Spelling>,
  key: KeyDef,
  startFrom: number | null = null,
): Array<SpelledPitch | null> {
  const signature = keySignature(key)
  let previous = startFrom
  return midis.map((midi) => {
    if (midi === null) return null
    const pc = pitchClass(midi)
    const rising = previous === null || midi >= previous
    const spelling =
      scaleMap.get(pc) ?? spellChromatic(pc, scaleMap, rising, key.prefer, signature)
    previous = midi
    return {
      midi,
      letter: spelling.letter,
      accidental: spelling.accidental,
      octave: octaveOfSpelling(midi, spelling),
    }
  })
}

/** e.g. "Bb3" */
export function spelledName(pitch: SpelledPitch): string {
  return `${pitch.letter}${pitch.accidental}${pitch.octave}`
}

/** VexFlow key string, e.g. "bb/3". */
export function spelledVexKey(pitch: SpelledPitch): string {
  return `${pitch.letter.toLowerCase()}${pitch.accidental}/${pitch.octave}`
}
