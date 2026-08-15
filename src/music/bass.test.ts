import { describe, expect, it } from 'vitest'
import { generateBass } from './bass'
import { buildProgression, PROGRESSIONS } from './progression'
import { BASS_RANGE, KEYS, pitchClass } from './pitch'
import { createRng } from './random'

const SEEDS = Array.from({ length: 20 }, (_, i) => i * 13 + 3)

function everyCase(run: (bass: number[][], chords: ReturnType<typeof buildProgression>) => void) {
  for (const key of KEYS) {
    for (const progression of PROGRESSIONS) {
      const chords = buildProgression(progression, key.root, key.prefer)
      for (const seed of SEEDS) {
        run(generateBass(chords, createRng(seed)), chords)
      }
    }
  }
}

describe('generateBass', () => {
  it('writes four quarter notes per bar', () => {
    everyCase((bass, chords) => {
      expect(bass).toHaveLength(chords.length)
      for (const bar of bass) expect(bar).toHaveLength(4)
    })
  })

  it('stays inside the guitar bass range', () => {
    everyCase((bass) => {
      for (const bar of bass) {
        for (const midi of bar) {
          expect(midi).toBeGreaterThanOrEqual(BASS_RANGE.min)
          expect(midi).toBeLessThanOrEqual(BASS_RANGE.max)
        }
      }
    })
  })

  it('states the root on beat 1', () => {
    everyCase((bass, chords) => {
      bass.forEach((bar, i) => {
        expect(pitchClass(bar[0])).toBe(chords[i].root)
      })
    })
  })

  it('approaches the next root on beat 4', () => {
    everyCase((bass, chords) => {
      bass.forEach((bar, i) => {
        const nextRoot = chords[(i + 1) % chords.length].root
        const allowed = [
          pitchClass(nextRoot + 1),
          pitchClass(nextRoot - 1),
          pitchClass(nextRoot + 7),
        ]
        expect(allowed).toContain(pitchClass(bar[3]))
      })
    })
  })

  it('never repeats the same note twice in a row', () => {
    everyCase((bass) => {
      const line = bass.flat()
      for (let i = 1; i < line.length; i++) {
        expect(pitchClass(line[i])).not.toBe(pitchClass(line[i - 1]))
      }
    })
  })

  it('never leaps further than an octave', () => {
    everyCase((bass) => {
      const line = bass.flat()
      for (let i = 1; i < line.length; i++) {
        expect(Math.abs(line[i] - line[i - 1])).toBeLessThanOrEqual(12)
      }
    })
  })

  it('is reproducible from a seed', () => {
    const chords = buildProgression(PROGRESSIONS[0], 10, 'flat')
    expect(generateBass(chords, createRng(7))).toEqual(generateBass(chords, createRng(7)))
  })
})
