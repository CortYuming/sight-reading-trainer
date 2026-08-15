// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { Level } from '../music/rhythm'
import { generateExercise } from '../music/exercise'
import { KEYS } from '../music/pitch'
import { PROGRESSIONS } from '../music/progression'
import { bassSpecs, melodySpecs } from './spec'
import { drawMeasure } from './draw'

const LEVELS: Level[] = [1, 2, 3, 4]

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
    'draws triplets and ties, which is where the tick maths can go wrong',
    { timeout: 60_000 },
    () => {
      let tripletsDrawn = 0
      let tiesDrawn = 0
      for (let seed = 1; seed <= 8; seed++) {
        const exercise = generateExercise({
          keyName: 'C',
          progressionId: 'autumn',
          level: 4,
          seed,
        })
        for (const bar of exercise.bars) {
          const specs = melodySpecs(bar)
          if (specs.some((s) => s.triplet !== undefined)) tripletsDrawn++
          if (specs.some((s) => s.tieToNext)) tiesDrawn++
          expect(() => render(specs, 'C')).not.toThrow()
        }
      }
      expect(tripletsDrawn).toBeGreaterThan(0)
      expect(tiesDrawn).toBeGreaterThan(0)
    },
  )

  it('replaces the previous drawing instead of stacking SVGs', () => {
    const exercise = generateExercise({ keyName: 'F', progressionId: 'blues', level: 2, seed: 9 })
    const container = document.createElement('div')
    const specs = melodySpecs(exercise.bars[0])
    drawMeasure(container, { notes: specs, keySignature: 'F', width: 400, showHeader: true })
    drawMeasure(container, { notes: specs, keySignature: 'F', width: 300, showHeader: true })
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })
})
