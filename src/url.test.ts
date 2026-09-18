// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { DEFAULT_LEVEL, DEFAULT_TEMPO } from './settings'
import { loadUrlState, readUrlState, saveUrlState, withUrlState } from './url'

describe('readUrlState', () => {
  it('reads a level and a tempo out of the query', () => {
    expect(readUrlState('?lv=5&bpm=90')).toEqual({ level: 5, bpm: 90 })
  })

  it('falls back on the defaults when the query says nothing', () => {
    expect(readUrlState('')).toEqual({ level: DEFAULT_LEVEL, bpm: DEFAULT_TEMPO })
  })

  it('falls back on a level that is not on the ladder', () => {
    expect(readUrlState('?lv=99').level).toBe(DEFAULT_LEVEL)
    expect(readUrlState('?lv=0').level).toBe(DEFAULT_LEVEL)
    expect(readUrlState('?lv=three').level).toBe(DEFAULT_LEVEL)
    expect(readUrlState('?lv=').level).toBe(DEFAULT_LEVEL)
  })

  it('holds a tempo to the range the slider offers', () => {
    expect(readUrlState('?bpm=1000').bpm).toBe(240)
    expect(readUrlState('?bpm=5').bpm).toBe(40)
    expect(readUrlState('?bpm=90.4').bpm).toBe(90)
    expect(readUrlState('?bpm=fast').bpm).toBe(DEFAULT_TEMPO)
    expect(readUrlState('?bpm=').bpm).toBe(DEFAULT_TEMPO)
  })

  it('takes one of the two even when the other is missing', () => {
    expect(readUrlState('?lv=7')).toEqual({ level: 7, bpm: DEFAULT_TEMPO })
  })
})

describe('withUrlState', () => {
  it('writes both parameters', () => {
    expect(withUrlState('', { level: 5, bpm: 90 })).toBe('?lv=5&bpm=90')
  })

  it('replaces what is already there rather than adding to it', () => {
    expect(withUrlState('?lv=1&bpm=40', { level: 5, bpm: 90 })).toBe('?lv=5&bpm=90')
  })

  it('leaves a parameter it knows nothing about alone', () => {
    expect(withUrlState('?debug=1', { level: 5, bpm: 90 })).toBe('?debug=1&lv=5&bpm=90')
  })
})

describe('saveUrlState', () => {
  it('shows up in the address bar, and reads back the same', () => {
    saveUrlState({ level: 9, bpm: 144 })
    expect(window.location.search).toBe('?lv=9&bpm=144')
    expect(loadUrlState()).toEqual({ level: 9, bpm: 144 })
  })

  it('does not stack up history entries', () => {
    const before = window.history.length
    saveUrlState({ level: 3, bpm: 100 })
    saveUrlState({ level: 4, bpm: 100 })
    expect(window.history.length).toBe(before)
  })
})
