import { describe, expect, it } from 'vitest'
import { noteName } from './names'

describe('noteName', () => {
  it('drops the octave and capitalises the letter', () => {
    expect(noteName('c/4')).toBe('C')
    expect(noteName('g/3')).toBe('G')
  })

  it('writes accidentals as the signs a reader sees on the staff', () => {
    expect(noteName('bb/3')).toBe('B♭')
    expect(noteName('f#/4')).toBe('F♯')
  })
})
