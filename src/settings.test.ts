// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings, readSettings, saveSettings } from './settings'

describe('readSettings', () => {
  it('falls back on anything that is not an object', () => {
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(readSettings('deep')).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps the fields it recognises', () => {
    const stored = { keyName: 'G', progressionId: 'ii-v-i', level: 4, swing: 'straight' }
    const settings = readSettings(stored)
    expect(settings.keyName).toBe('G')
    expect(settings.progressionId).toBe('ii-v-i')
    expect(settings.level).toBe(4)
    expect(settings.swing).toBe('straight')
  })

  it('drops a value that is no longer offered without losing the others', () => {
    const settings = readSettings({ keyName: 'Gb', progressionId: 'ii-v-i' })
    expect(settings.keyName).toBe(DEFAULT_SETTINGS.keyName)
    expect(settings.progressionId).toBe('ii-v-i')
  })

  it('keeps the random key, which is a choice rather than a stale one', () => {
    expect(readSettings({ keyName: 'random' }).keyName).toBe('random')
  })

  it('clamps the tempo to the range the slider offers', () => {
    expect(readSettings({ bpm: 1000 }).bpm).toBe(240)
    expect(readSettings({ bpm: 5 }).bpm).toBe(40)
    expect(readSettings({ bpm: 90.4 }).bpm).toBe(90)
    expect(readSettings({ bpm: 'fast' }).bpm).toBe(DEFAULT_SETTINGS.bpm)
  })

  it('takes a switch only when it is really a boolean', () => {
    expect(readSettings({ countIn: false }).countIn).toBe(false)
    expect(readSettings({ countIn: 'no' }).countIn).toBe(DEFAULT_SETTINGS.countIn)
  })

  it('does not remember the seed', () => {
    expect(readSettings({ seed: 1234 })).not.toHaveProperty('seed')
  })
})

describe('loadSettings', () => {
  beforeEach(() => localStorage.clear())

  it('returns the defaults on a first visit', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('reads back what was saved', () => {
    const settings = { ...DEFAULT_SETTINGS, keyName: 'F', bpm: 120, playBass: false }
    saveSettings(settings)
    expect(loadSettings()).toEqual(settings)
  })

  it('survives a corrupt entry', () => {
    localStorage.setItem('sight-reading-trainer:settings', '{ not json')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
})
