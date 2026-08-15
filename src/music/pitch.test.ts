import { describe, expect, it } from 'vitest'
import {
  BASS_RANGE,
  MELODY_RANGE,
  KEYS,
  findKey,
  nearestPitch,
  noteName,
  octaveOf,
  pitchClass,
  pitchesWithClass,
  toVexKey,
} from './pitch'

describe('pitchClass', () => {
  it('wraps into 0-11 in both directions', () => {
    expect(pitchClass(60)).toBe(0)
    expect(pitchClass(-1)).toBe(11)
    expect(pitchClass(13)).toBe(1)
  })
})

describe('noteName', () => {
  it('uses scientific octave numbers', () => {
    expect(noteName(60, 'sharp')).toBe('C4')
    expect(noteName(52, 'sharp')).toBe('E3')
    expect(noteName(83, 'sharp')).toBe('B5')
  })

  it('respects the accidental preference', () => {
    expect(noteName(63, 'flat')).toBe('Eb4')
    expect(noteName(63, 'sharp')).toBe('D#4')
  })
})

describe('octaveOf', () => {
  it('places middle C in octave 4', () => {
    expect(octaveOf(60)).toBe(4)
    expect(octaveOf(59)).toBe(3)
  })
})

describe('toVexKey', () => {
  it('lowercases the letter and keeps the accidental', () => {
    expect(toVexKey(63, 'flat')).toBe('eb/4')
    expect(toVexKey(66, 'sharp')).toBe('f#/4')
    expect(toVexKey(67, 'flat')).toBe('g/4')
  })
})

describe('pitchesWithClass', () => {
  it('lists every octave of the class inside the range', () => {
    expect(pitchesWithClass(0, { min: 52, max: 76 })).toEqual([60, 72])
  })

  it('returns an empty list when the class does not fit', () => {
    expect(pitchesWithClass(0, { min: 61, max: 71 })).toEqual([])
  })
})

describe('nearestPitch', () => {
  it('picks the octave closest to the target', () => {
    expect(nearestPitch(0, 70, { min: 52, max: 84 })).toBe(72)
    expect(nearestPitch(0, 62, { min: 52, max: 84 })).toBe(60)
  })

  it('throws when the class is unavailable in the range', () => {
    expect(() => nearestPitch(0, 65, { min: 61, max: 71 })).toThrow()
  })
})

describe('ranges', () => {
  it('keeps bass and melody apart so the two staves do not collide', () => {
    expect(BASS_RANGE.max).toBeLessThan(MELODY_RANGE.min)
  })
})

describe('KEYS', () => {
  it('covers the five practice keys', () => {
    expect(KEYS.map((k) => k.name)).toEqual(['F', 'Bb', 'Eb', 'C', 'G'])
  })

  it('spells flat keys with flats', () => {
    expect(findKey('Bb').prefer).toBe('flat')
    expect(findKey('G').prefer).toBe('sharp')
  })

  it('throws on an unknown key', () => {
    expect(() => findKey('Ab')).toThrow()
  })
})
