import { describe, expect, it } from 'vitest'
import { parseChord } from './chord'
import { chordScaleSpelling, spellSequence, spelledName, spelledVexKey } from './spelling'
import { generateExercise } from './exercise'
import { KEYS } from './pitch'
import { PROGRESSIONS } from './progression'
import type { Level } from './rhythm'

function names(midis: number[], chordText: string, prefer: 'sharp' | 'flat', nextText?: string) {
  const chord = parseChord(chordText, prefer)
  const next = nextText ? parseChord(nextText, prefer) : undefined
  const map = chordScaleSpelling(chord, next, prefer)
  return spellSequence(midis, map, prefer).map((p) => (p === null ? 'r' : spelledName(p)))
}

describe('chordScaleSpelling', () => {
  it('spells the fourth of Fmaj7 as Bb even in a sharp key', () => {
    // 70 is the pitch a plain sharp key would call A#.
    expect(names([70], 'Fmaj7', 'sharp')).toEqual(['Bb4'])
  })

  it('spells the leading tone of a dominant as a sharp', () => {
    // F# over D7, not Gb.
    expect(names([66], 'D7', 'flat')).toEqual(['F#4'])
  })

  it('follows the alphabet up from the root', () => {
    const scale = [58, 60, 62, 63, 65, 67, 69] // Bb C D Eb F G A
    expect(names(scale, 'Bbmaj7', 'flat')).toEqual(['Bb3', 'C4', 'D4', 'Eb4', 'F4', 'G4', 'A4'])
  })

  it('keeps the altered notes of a dominant going to a minor chord readable', () => {
    // E7 to Am7 uses phrygian dominant: E F G# A B C D.
    expect(names([64, 65, 68, 69], 'E7', 'sharp', 'Am7')).toEqual(['E4', 'F4', 'G#4', 'A4'])
  })

  it('avoids Cb and B#', () => {
    for (const key of KEYS) {
      for (const progression of PROGRESSIONS) {
        for (const level of [1, 2, 3, 4] as Level[]) {
          const exercise = generateExercise({
            keyName: key.name,
            progressionId: progression.id,
            level,
            seed: 77,
          })
          for (const bar of exercise.bars) {
            const spelled = [...bar.bass, ...bar.melody.map((e) => e.spelled)]
            for (const pitch of spelled) {
              if (!pitch) continue
              expect(`${pitch.letter}${pitch.accidental}`).not.toBe('Cb')
              expect(`${pitch.letter}${pitch.accidental}`).not.toBe('Fb')
              expect(`${pitch.letter}${pitch.accidental}`).not.toBe('B#')
              expect(`${pitch.letter}${pitch.accidental}`).not.toBe('E#')
            }
          }
        }
      }
    }
  })
})

describe('spellSequence', () => {
  it('sharpens a rising chromatic note and flattens a falling one', () => {
    // C major scale context; 66 is the note between F and G.
    expect(names([65, 66, 67], 'Cmaj7', 'sharp')).toEqual(['F4', 'F#4', 'G4'])
    expect(names([67, 66, 65], 'Cmaj7', 'sharp')).toEqual(['G4', 'Gb4', 'F4'])
  })

  it('passes rests through', () => {
    const map = chordScaleSpelling(parseChord('Cmaj7'), undefined, 'sharp')
    expect(spellSequence([60, null, 62], map, 'sharp').map((p) => p?.midi ?? null)).toEqual([
      60,
      null,
      62,
    ])
  })

  it('keeps the spelled pitch equal to the sounding pitch', () => {
    for (const key of KEYS) {
      for (const progression of PROGRESSIONS) {
        const exercise = generateExercise({
          keyName: key.name,
          progressionId: progression.id,
          level: 4,
          seed: 5,
        })
        for (const bar of exercise.bars) {
          for (const pitch of bar.bass) {
            const offset = pitch.accidental === '#' ? 1 : pitch.accidental === 'b' ? -1 : 0
            const natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[pitch.letter]
            expect(natural).toBeDefined()
            expect((natural as number) + offset + 12 * (pitch.octave + 1)).toBe(pitch.midi)
          }
        }
      }
    }
  })
})

describe('spelledVexKey', () => {
  it('writes the VexFlow key form', () => {
    expect(spelledVexKey({ midi: 58, letter: 'B', accidental: 'b', octave: 3 })).toBe('bb/3')
    expect(spelledVexKey({ midi: 66, letter: 'F', accidental: '#', octave: 4 })).toBe('f#/4')
    expect(spelledVexKey({ midi: 60, letter: 'C', accidental: '', octave: 4 })).toBe('c/4')
  })
})
