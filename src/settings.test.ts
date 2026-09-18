// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings, readSettings, saveSettings } from './settings'

describe('readSettings', () => {
  it('falls back on anything that is not an object', () => {
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(readSettings('deep')).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps the fields it recognises', () => {
    const stored = { keyName: 'G', progressionId: 'ii-v-i', swing: 'straight' }
    const settings = readSettings(stored)
    expect(settings.keyName).toBe('G')
    expect(settings.progressionId).toBe('ii-v-i')
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

  it('takes a switch only when it is really a boolean', () => {
    expect(readSettings({ countIn: false }).countIn).toBe(false)
    expect(readSettings({ countIn: 'no' }).countIn).toBe(DEFAULT_SETTINGS.countIn)
  })

  it('does not remember the seed', () => {
    expect(readSettings({ seed: 1234 })).not.toHaveProperty('seed')
  })

  it('leaves the level and the tempo to the URL, even if an old visit stored them', () => {
    const settings = readSettings({ level: 4, bpm: 120, keyName: 'G' })
    expect(settings).not.toHaveProperty('level')
    expect(settings).not.toHaveProperty('bpm')
    expect(settings.keyName).toBe('G')
  })
})

describe('loadSettings', () => {
  beforeEach(() => localStorage.clear())

  it('returns the defaults on a first visit', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('reads back what was saved', () => {
    const settings = { ...DEFAULT_SETTINGS, keyName: 'F', playBass: false }
    saveSettings(settings)
    expect(loadSettings()).toEqual(settings)
  })

  it('survives a corrupt entry', () => {
    localStorage.setItem('sight-reading-trainer:settings', '{ not json')
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS)
  })
})
