import { describe, expect, it } from 'vitest'
import {
  chordTonePitchClasses,
  isMinorQuality,
  makeChord,
  parseChord,
  scalePitchClasses,
  transposeChord,
} from './chord'

describe('parseChord', () => {
  it('reads roots with accidentals', () => {
    expect(parseChord('Bbmaj7', 'flat')).toMatchObject({ root: 10, quality: 'maj7' })
    expect(parseChord('F#m7', 'sharp')).toMatchObject({ root: 6, quality: 'min7' })
  })

  it('reads every supported quality', () => {
    expect(parseChord('Cmaj7').quality).toBe('maj7')
    expect(parseChord('CM7').quality).toBe('maj7')
    expect(parseChord('C7').quality).toBe('dom7')
    expect(parseChord('Cm7').quality).toBe('min7')
    expect(parseChord('C-7').quality).toBe('min7')
    expect(parseChord('Cm7b5').quality).toBe('min7b5')
    expect(parseChord('Cdim7').quality).toBe('dim7')
    expect(parseChord('C6').quality).toBe('maj6')
    expect(parseChord('Cm6').quality).toBe('min6')
  })

  it('does not confuse m7b5 with m7', () => {
    expect(parseChord('Am7b5').quality).toBe('min7b5')
  })

  it('labels using the requested spelling', () => {
    expect(parseChord('A#m7', 'flat').label).toBe('Bbm7')
    expect(parseChord('Bbm7', 'sharp').label).toBe('A#m7')
  })

  it('rejects unknown input', () => {
    expect(() => parseChord('H7')).toThrow()
    expect(() => parseChord('C13')).toThrow()
    expect(() => parseChord('')).toThrow()
  })
})

describe('transposeChord', () => {
  it('moves the root and keeps the quality', () => {
    const dm7 = parseChord('Dm7', 'flat')
    expect(transposeChord(dm7, 5, 'flat')).toMatchObject({ root: 7, quality: 'min7', label: 'Gm7' })
  })

  it('wraps past the octave', () => {
    expect(transposeChord(parseChord('Bb7', 'flat'), 3, 'flat').label).toBe('Db7')
  })
})

describe('chordTonePitchClasses', () => {
  it('spells a dominant seventh', () => {
    expect(chordTonePitchClasses(parseChord('G7'))).toEqual([7, 11, 2, 5])
  })

  it('spells a half-diminished chord', () => {
    expect(chordTonePitchClasses(parseChord('Bm7b5'))).toEqual([11, 2, 5, 9])
  })
})

describe('scalePitchClasses', () => {
  it('uses mixolydian for a dominant going to a major chord', () => {
    const g7 = parseChord('G7')
    const cmaj7 = parseChord('Cmaj7')
    expect(scalePitchClasses(g7, cmaj7)).toEqual([7, 9, 11, 0, 2, 4, 5])
  })

  it('switches to phrygian dominant when the target is minor', () => {
    const e7 = parseChord('E7')
    const am7 = parseChord('Am7')
    // E F G# A B C D — the b9/b13 sound over a minor resolution.
    expect(scalePitchClasses(e7, am7)).toEqual([4, 5, 8, 9, 11, 0, 2])
  })

  it('leaves non-dominant chords alone', () => {
    const dm7 = parseChord('Dm7')
    expect(scalePitchClasses(dm7, parseChord('Am7'))).toEqual([2, 4, 5, 7, 9, 11, 0])
  })
})

describe('isMinorQuality', () => {
  it('counts every minor-flavoured quality', () => {
    expect(isMinorQuality('min7')).toBe(true)
    expect(isMinorQuality('min7b5')).toBe(true)
    expect(isMinorQuality('dim7')).toBe(true)
    expect(isMinorQuality('min6')).toBe(true)
    expect(isMinorQuality('maj7')).toBe(false)
    expect(isMinorQuality('dom7')).toBe(false)
  })
})

describe('makeChord', () => {
  it('normalises the root into 0-11', () => {
    expect(makeChord(14, 'min7', 'flat')).toMatchObject({ root: 2, label: 'Dm7' })
  })
})
