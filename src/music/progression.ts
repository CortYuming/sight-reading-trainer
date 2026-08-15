import type { Accidental } from './pitch'
import type { ChordSymbol } from './chord'
import { parseChord, transposeChord } from './chord'

export interface Progression {
  id: string
  name: string
  /** One chord per bar, written in the key of C. */
  barsInC: string[]
}

export const PROGRESSIONS: Progression[] = [
  {
    id: 'ii-v-i',
    name: 'ii-V-I',
    barsInC: ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'],
  },
  {
    id: 'turnaround',
    name: 'I-vi-ii-V',
    barsInC: ['Cmaj7', 'Am7', 'Dm7', 'G7'],
  },
  {
    id: 'blues',
    name: 'Jazz Blues',
    barsInC: ['C7', 'F7', 'C7', 'C7', 'F7', 'F7', 'C7', 'A7', 'Dm7', 'G7', 'C7', 'G7'],
  },
  {
    id: 'minor-ii-v',
    name: 'Minor ii-V-i',
    barsInC: ['Dm7b5', 'G7', 'Cm6', 'Cm6'],
  },
  {
    id: 'autumn',
    name: 'Autumn Leaves (A)',
    barsInC: ['Dm7', 'G7', 'Cmaj7', 'Fmaj7', 'Bm7b5', 'E7', 'Am7', 'Am7'],
  },
]

export function findProgression(id: string): Progression {
  const found = PROGRESSIONS.find((p) => p.id === id)
  if (!found) throw new Error(`unknown progression: ${id}`)
  return found
}

/** Transpose a progression from its C reference into the target key. */
export function buildProgression(
  progression: Progression,
  keyRoot: number,
  prefer: Accidental,
): ChordSymbol[] {
  return progression.barsInC.map((text) =>
    transposeChord(parseChord(text, prefer), keyRoot, prefer),
  )
}
