import { describe, expect, it } from 'vitest'
import type { Level } from './rhythm'
import { generateMelody } from './melody'
import { generateBarRhythm, TICKS_PER_BEAT } from './rhythm'
import { buildProgression, PROGRESSIONS } from './progression'
import { chordTonePitchClasses } from './chord'
import { KEYS, MELODY_RANGE, pitchClass } from './pitch'
import { createRng } from './random'

const SEEDS = Array.from({ length: 20 }, (_, i) => i * 11 + 5)

function build(level: Level, seed: number, progressionIndex = 0, keyIndex = 0) {
  const key = KEYS[keyIndex]
  const chords = buildProgression(PROGRESSIONS[progressionIndex], key.root, key.prefer)
  const rng = createRng(seed)
  const rhythms = chords.map(() => generateBarRhythm(level, rng))
  return { chords, melody: generateMelody(rhythms, chords, rng) }
}

describe('generateMelody', () => {
  it('gives every sounding event a pitch and every rest none', () => {
    for (const seed of SEEDS) {
      const { melody } = build(4, seed)
      for (const bar of melody) {
        for (const event of bar) {
          if (event.rest) expect(event.midi).toBeNull()
          else expect(event.midi).not.toBeNull()
        }
      }
    }
  })

  it('stays inside the guitar melody range', () => {
    for (const level of [1, 2, 3, 4] as Level[]) {
      for (const seed of SEEDS) {
        const { melody } = build(level, seed)
        for (const event of melody.flat()) {
          if (event.midi === null) continue
          expect(event.midi).toBeGreaterThanOrEqual(MELODY_RANGE.min)
          expect(event.midi).toBeLessThanOrEqual(MELODY_RANGE.max)
        }
      }
    }
  })

  it('holds the same pitch across a tie', () => {
    let tiesSeen = 0
    for (const seed of SEEDS) {
      const { melody } = build(4, seed)
      for (const bar of melody) {
        bar.forEach((event, i) => {
          if (!event.tie) return
          tiesSeen++
          expect(bar[i + 1].midi).toBe(event.midi)
        })
      }
    }
    expect(tiesSeen).toBeGreaterThan(0)
  })

  it('lands on chord tones most of the time on the beat', () => {
    let onBeat = 0
    let chordTones = 0
    for (const seed of SEEDS) {
      for (let p = 0; p < PROGRESSIONS.length; p++) {
        const { chords, melody } = build(3, seed, p)
        melody.forEach((bar, barIndex) => {
          const tones = chordTonePitchClasses(chords[barIndex])
          for (const event of bar) {
            if (event.midi === null) continue
            if (event.start % TICKS_PER_BEAT !== 0) continue
            onBeat++
            if (tones.includes(pitchClass(event.midi))) chordTones++
          }
        })
      }
    }
    expect(onBeat).toBeGreaterThan(100)
    expect(chordTones / onBeat).toBeGreaterThan(0.6)
  })

  it('moves by step or third, and rarely leaps', () => {
    let moves = 0
    let steps = 0
    let stepsOrThirds = 0
    let wideLeaps = 0
    for (const seed of SEEDS) {
      const { melody } = build(3, seed)
      const line = melody
        .flat()
        .map((e) => e.midi)
        .filter((midi): midi is number => midi !== null)
      for (let i = 1; i < line.length; i++) {
        const distance = Math.abs(line[i] - line[i - 1])
        if (distance === 0) continue
        moves++
        if (distance <= 2) steps++
        if (distance <= 4) stepsOrThirds++
        if (distance > 7) wideLeaps++
      }
    }
    expect(moves).toBeGreaterThan(100)
    expect(steps / moves).toBeGreaterThan(0.35)
    expect(stepsOrThirds / moves).toBeGreaterThan(0.7)
    expect(wideLeaps / moves).toBeLessThan(0.05)
  })

  it('is reproducible from a seed', () => {
    expect(build(4, 99).melody).toEqual(build(4, 99).melody)
  })
})
