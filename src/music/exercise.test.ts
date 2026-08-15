import { describe, expect, it } from 'vitest'
import type { Level } from './rhythm'
import { generateExercise } from './exercise'
import { PROGRESSIONS } from './progression'
import { KEYS } from './pitch'
import { TICKS_PER_BAR, totalTicks } from './rhythm'

const LEVELS: Level[] = [1, 2, 3, 4]

describe('generateExercise', () => {
  it('builds every combination of key, progression and level', () => {
    for (const key of KEYS) {
      for (const progression of PROGRESSIONS) {
        for (const level of LEVELS) {
          const exercise = generateExercise({
            keyName: key.name,
            progressionId: progression.id,
            level,
            seed: 1234,
          })
          expect(exercise.bars).toHaveLength(progression.barsInC.length)
          for (const bar of exercise.bars) {
            expect(bar.bass).toHaveLength(4)
            expect(totalTicks(bar.melody)).toBe(TICKS_PER_BAR)
          }
        }
      }
    }
  })

  it('transposes the progression into the requested key', () => {
    const exercise = generateExercise({
      keyName: 'Bb',
      progressionId: 'ii-v-i',
      level: 2,
      seed: 1,
    })
    expect(exercise.bars.map((b) => b.chord.label)).toEqual(['Cm7', 'F7', 'Bbmaj7', 'Bbmaj7'])
  })

  it('spells sharp keys with sharps', () => {
    const exercise = generateExercise({
      keyName: 'G',
      progressionId: 'ii-v-i',
      level: 1,
      seed: 1,
    })
    expect(exercise.bars.map((b) => b.chord.label)).toEqual(['Am7', 'D7', 'Gmaj7', 'Gmaj7'])
  })

  it('returns the same exercise for the same seed, and a different one otherwise', () => {
    const options = { keyName: 'F', progressionId: 'blues', level: 3, seed: 2026 } as const
    expect(generateExercise(options)).toEqual(generateExercise(options))
    expect(generateExercise({ ...options, seed: 2027 })).not.toEqual(generateExercise(options))
  })

  it('rejects unknown keys and progressions', () => {
    expect(() =>
      generateExercise({ keyName: 'Ab', progressionId: 'ii-v-i', level: 1, seed: 1 }),
    ).toThrow()
    expect(() =>
      generateExercise({ keyName: 'C', progressionId: 'giant-steps', level: 1, seed: 1 }),
    ).toThrow()
  })
})
