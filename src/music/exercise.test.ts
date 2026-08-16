import { describe, expect, it } from 'vitest'
import { generateExercise } from './exercise'
import { PROGRESSIONS } from './progression'
import { KEYS } from './pitch'
import { LEVELS, TICKS_PER_BAR, totalTicks } from './rhythm'


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
    // Four-bar forms go round twice.
    const cycle = ['Cm7', 'F7', 'Bbmaj7', 'Bbmaj7']
    expect(exercise.bars.map((b) => b.chord.label)).toEqual([...cycle, ...cycle])
  })

  it('spells sharp keys with sharps', () => {
    const exercise = generateExercise({
      keyName: 'G',
      progressionId: 'ii-v-i',
      level: 1,
      seed: 1,
    })
    const cycle = ['Am7', 'D7', 'Gmaj7', 'Gmaj7']
    expect(exercise.bars.map((b) => b.chord.label)).toEqual([...cycle, ...cycle])
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
