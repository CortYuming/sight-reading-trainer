import { describe, expect, it } from 'vitest'
import { buildProgression, PROGRESSIONS, findProgression } from './progression'
import { findKey } from './pitch'
import { parseChord } from './chord'
import { romanNumeral } from './numeral'

const inKey = (text: string, keyName: string) =>
  romanNumeral(parseChord(text), findKey(keyName).root)

describe('romanNumeral', () => {
  it('numbers the degrees of the key', () => {
    expect(inKey('Cmaj7', 'C')).toBe('I')
    expect(inKey('F7', 'C')).toBe('IV')
    expect(inKey('G7', 'C')).toBe('V')
  })

  it('writes a minor third as a lowercase numeral', () => {
    expect(inKey('Dm7', 'C')).toBe('ii')
    expect(inKey('Am7', 'C')).toBe('vi')
    expect(inKey('Bm7b5', 'C')).toBe('vii')
    expect(inKey('Cm6', 'C')).toBe('i')
  })

  it('reads the same in every key', () => {
    expect(inKey('Cm7', 'Bb')).toBe('ii')
    expect(inKey('F7', 'Bb')).toBe('V')
    expect(inKey('Bbmaj7', 'Bb')).toBe('I')
  })

  it('flattens a degree that is not in the major scale', () => {
    expect(inKey('Eb7', 'C')).toBe('♭III')
    expect(inKey('Bb7', 'C')).toBe('♭VII')
    expect(inKey('Ebm7', 'C')).toBe('♭iii')
  })

  it('gives every chord of every progression a numeral', () => {
    for (const progression of PROGRESSIONS) {
      const key = findKey('Bb')
      const chords = buildProgression(findProgression(progression.id), key.root, key.prefer)
      for (const chord of chords) {
        expect(`${chord.label}: ${romanNumeral(chord, key.root)}`).toMatch(
          /: [♭♯]?(i{1,3}|iv|vi{0,2}|I{1,3}|IV|VI{0,2})$/,
        )
      }
    }
  })
})
