// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { LEVELS } from '../music/rhythm'
import { generateExercise } from '../music/exercise'
import { KEYS } from '../music/pitch'
import { PROGRESSIONS } from '../music/progression'
import { bassSpecs, melodySpecs } from './spec'
import type { NoteSpec } from './spec'
import { MEASURE_HEIGHT, drawMeasure } from './draw'


function render(notes: ReturnType<typeof melodySpecs>, keySignature: string, showHeader = true) {
  const container = document.createElement('div')
  drawMeasure(container, { notes, keySignature, width: 420, showHeader })
  return container
}

describe('drawMeasure', () => {
  it('draws an SVG staff', () => {
    const exercise = generateExercise({
      keyName: 'Bb',
      progressionId: 'ii-v-i',
      level: 1,
      seed: 3,
    })
    const svg = render(bassSpecs(exercise.bars[0]), 'Bb').querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.querySelectorAll('path').length).toBeGreaterThan(0)
  })

  it('draws every key, progression and level without throwing', { timeout: 60_000 }, () => {
    KEYS.forEach((key, keyIndex) => {
      PROGRESSIONS.forEach((progression, progressionIndex) => {
        const level = LEVELS[(keyIndex + progressionIndex) % LEVELS.length]
        const exercise = generateExercise({
          keyName: key.name,
          progressionId: progression.id,
          level,
          seed: 4242,
        })
        exercise.bars.forEach((bar, i) => {
          expect(() => render(bassSpecs(bar), key.name, i === 0)).not.toThrow()
          expect(() => render(melodySpecs(bar), key.name, i === 0)).not.toThrow()
        })
      })
    })
  })

  it(
    'draws triplets and sextuplets, which is where the tick maths can go wrong',
    { timeout: 60_000 },
    () => {
      const drawn = new Set<number>()
      for (let seed = 1; seed <= 24; seed++) {
        const exercise = generateExercise({
          keyName: 'C',
          progressionId: 'autumn',
          level: 6,
          seed,
        })
        for (const bar of exercise.bars) {
          const specs = melodySpecs(bar)
          for (const spec of specs) {
            if (spec.tuplet) drawn.add(spec.tuplet.numNotes)
          }
          expect(() => render(specs, 'C')).not.toThrow()
        }
      }
      expect([...drawn].sort()).toEqual([3, 6])
    },
  )

  it('keeps the extremes of both ranges inside the drawing', () => {
    const bar = (key: string): NoteSpec[] =>
      Array.from({ length: 4 }, () => ({
        key,
        duration: 'q' as const,
        dots: 0,
        rest: false,
        tieToNext: false,
      }))

    for (const key of ['e/3', 'b/5']) {
      const container = document.createElement('div')
      const bounds = drawMeasure(container, {
        notes: bar(key),
        keySignature: 'C',
        width: 400,
        showHeader: true,
      })
      expect(`${key} top: ${bounds.top >= 0}`).toBe(`${key} top: true`)
      expect(`${key} bottom: ${bounds.bottom <= MEASURE_HEIGHT}`).toBe(`${key} bottom: true`)
    }
  })

  it('never draws outside the measure height', { timeout: 60_000 }, () => {
    for (const key of KEYS) {
      for (const level of LEVELS) {
        const exercise = generateExercise({
          keyName: key.name,
          progressionId: 'autumn',
          level,
          seed: 808,
        })
        exercise.bars.forEach((bar, i) => {
          for (const notes of [bassSpecs(bar), melodySpecs(bar)]) {
            const container = document.createElement('div')
            const bounds = drawMeasure(container, {
              notes,
              keySignature: key.name,
              width: 400,
              showHeader: i === 0,
            })
            expect(bounds.top).toBeGreaterThanOrEqual(0)
            expect(bounds.bottom).toBeLessThanOrEqual(MEASURE_HEIGHT)
          }
        })
      }
    }
  })

  it('replaces the previous drawing instead of stacking SVGs', () => {
    const exercise = generateExercise({ keyName: 'F', progressionId: 'blues', level: 2, seed: 9 })
    const container = document.createElement('div')
    const specs = melodySpecs(exercise.bars[0])
    drawMeasure(container, { notes: specs, keySignature: 'F', width: 400, showHeader: true })
    drawMeasure(container, { notes: specs, keySignature: 'F', width: 300, showHeader: true })
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })
})
