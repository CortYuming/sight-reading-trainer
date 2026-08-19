import { describe, expect, it } from 'vitest'
import type { Level } from './rhythm'
import { generateMelody } from './melody'
import { generateBarRhythms } from './rhythm'
import { buildProgression, PROGRESSIONS } from './progression'
import { KEYS, MELODY_RANGE } from './pitch'
import { createRng } from './random'
import { parseChord } from './chord'
import { realiseShape, shapeFits, shapesFor } from './shape'

const SEEDS = Array.from({ length: 20 }, (_, i) => i * 11 + 5)

/** Levels that bring one direction, and the level each of them mixes into. */
const FAMILIES: Array<{ solo: Level[]; mixed: Level; names: string[] }> = [
  {
    solo: [11, 12, 13, 14],
    mixed: 15,
    names: ['up-up', 'up-down', 'down-down', 'down-up'],
  },
  {
    solo: [16, 17, 18, 19, 20, 21],
    mixed: 22,
    names: [
      'up-up-up',
      'up-up-down',
      'up-down-up',
      'down-down-down',
      'down-up-up',
      'down-up-down',
    ],
  },
]

const EVERY_SHAPE = FAMILIES.flatMap((f) => shapesFor(f.mixed) ?? [])

const directions = (pitches: number[]): number[] =>
  pitches.slice(1).map((p, i) => Math.sign(p - pitches[i]))

let realisations: Array<{ fits: boolean; pitches: number[] }> | null = null

/**
 * Every shape, over every chord of every form, at both ends of the range and
 * from every degree. One flat key and one sharp one, which is every spelling
 * there is; running all five only repeats the work.
 */
function everyRealisation(): Array<{ fits: boolean; pitches: number[] }> {
  if (realisations !== null) return realisations
  const out: Array<{ fits: boolean; pitches: number[] }> = []
  for (const key of [KEYS[0], KEYS[KEYS.length - 1]]) {
    for (const progression of PROGRESSIONS) {
      for (const chord of buildProgression(progression, key.root, key.prefer)) {
        for (const shape of EVERY_SHAPE) {
          for (const from of [MELODY_RANGE.min, MELODY_RANGE.max]) {
            for (let offset = 0; offset < 7; offset++) {
              out.push({
                fits: shapeFits(shape, chord, undefined, offset),
                pitches: realiseShape(shape, chord, undefined, from, offset),
              })
            }
          }
        }
      }
    }
  }
  realisations = out
  return out
}

describe('realiseShape', () => {
  const cmaj7 = parseChord('Cmaj7')

  it('takes its direction from the degrees alone', () => {
    const up = realiseShape({ id: 'up-up', degrees: [1, 3, 5], sequence: 1 }, cmaj7, undefined, null)
    expect(directions(up)).toEqual([1, 1])

    const down = realiseShape(
      { id: 'down-down', degrees: [5, 3, 1], sequence: 1 },
      cmaj7,
      undefined,
      null,
    )
    expect(directions(down)).toEqual([-1, -1])
  })

  it('moves the whole shape on when it comes round again', () => {
    const shape = { id: 'up-up', degrees: [1, 3, 5], sequence: 1 }
    const first = realiseShape(shape, cmaj7, undefined, null, 0)
    const second = realiseShape(shape, cmaj7, undefined, first[2], 1)
    // C-E-G then D-F-A: every note a degree higher, none of them repeated.
    expect(second.every((p) => !first.includes(p))).toBe(true)
    expect(directions(second)).toEqual([1, 1])
  })

  // The eight note line from page 20 of the book. Nothing tells it to turn at
  // the 4 — the degrees do, which is the whole reason shapes are held this way.
  it('turns where a Little Jazz Line turns', () => {
    const line = realiseShape(
      { id: 'little-jazz-line', degrees: [1, 3, 5, 7, 4, 3, 6, 5], sequence: 3 },
      cmaj7,
      undefined,
      null,
    )
    expect(directions(line)).toEqual([1, 1, 1, -1, -1, 1, -1])
  })

  // G is the one root with two octaves inside the range, and a narrow shape is
  // the one that fits at both of them, so this is the case that can show the
  // entry moving with the line.
  it('enters from whichever of its notes is nearest', () => {
    const shape = { id: 'up-down', degrees: [1, 2, 1], sequence: 1 }
    const gmaj7 = parseChord('Gmaj7')
    const low = realiseShape(shape, gmaj7, undefined, MELODY_RANGE.min)
    const high = realiseShape(shape, gmaj7, undefined, MELODY_RANGE.max)
    expect(low[0]).toBe(MELODY_RANGE.min)
    expect(high[0]).toBe(MELODY_RANGE.min + 12)
  })

  it('stays inside the guitar melody range', () => {
    const outside = everyRealisation()
      .flatMap(({ pitches }) => pitches)
      .filter((pitch) => pitch < MELODY_RANGE.min || pitch > MELODY_RANGE.max)
    expect(outside).toEqual([])
  })

  // Where a shape fits, it keeps its contour: the widest step any three note
  // shape asks for is the fifth of down-up, so nothing inside a figure reaches
  // further. Where it does not fit the notes fold, which is why the melody
  // skips those offsets rather than using them.
  it('never reaches past a fifth inside a shape that fits', () => {
    const fitted = everyRealisation().filter(({ fits }) => fits)
    const wide = fitted.flatMap(({ pitches }) =>
      pitches.slice(1).map((pitch, i) => Math.abs(pitch - pitches[i])).filter((step) => step > 8),
    )
    expect(wide).toEqual([])
    expect(fitted.length).toBeGreaterThan(1000)
  })
})

describe('shapesFor', () => {
  it('gives the rhythm levels nothing', () => {
    for (const level of [1, 5, 10] as Level[]) expect(shapesFor(level)).toBeNull()
  })

  it('gives each shape level one direction, and one length', () => {
    for (const { solo } of FAMILIES) {
      for (const level of solo) {
        const shapes = shapesFor(level) ?? []
        expect(new Set(shapes.map((s) => s.id)).size).toBe(1)
        expect(new Set(shapes.map((s) => s.degrees.length)).size).toBe(1)
      }
    }
  })

  it('brings every direction in once before mixing them', () => {
    for (const { solo, mixed, names } of FAMILIES) {
      const alone = solo.flatMap((l) => shapesFor(l) ?? [])
      expect([...new Set(alone.map((s) => s.id))]).toEqual(names)
      expect(shapesFor(mixed)).toEqual(alone)
    }
  })

  // A cell that ends one degree above where it started would, moved on by one,
  // begin the next cell on the note the last one finished.
  it('never lets a repetition start on the note before it', () => {
    for (const shape of EVERY_SHAPE) {
      const rise = shape.degrees[shape.degrees.length - 1] - shape.degrees[0]
      expect(shape.sequence).not.toBe(rise)
    }
  })
})

describe('a melody built from shapes', () => {
  function build(seed: number, progressionIndex = 0, level: Level = 11) {
    const key = KEYS[0]
    const chords = buildProgression(PROGRESSIONS[progressionIndex], key.root, key.prefer)
    const rng = createRng(seed)
    const rhythms = generateBarRhythms(level, chords.length, rng)
    return { chords, melody: generateMelody(rhythms, chords, level, rng) }
  }

  const SHAPE_LEVELS = FAMILIES.flatMap((f) => [...f.solo, f.mixed])

  it('gives every sounding event a pitch and every rest none', () => {
    for (const level of SHAPE_LEVELS) {
      for (const seed of SEEDS) {
        for (const event of build(seed, 0, level).melody.flat()) {
          if (event.rest) expect(event.midi).toBeNull()
          else expect(event.midi).not.toBeNull()
        }
      }
    }
  })

  it('stays inside the guitar melody range', () => {
    for (const level of SHAPE_LEVELS) {
      for (const seed of SEEDS) {
        for (const event of build(seed, 0, level).melody.flat()) {
          if (event.midi === null) continue
          expect(event.midi).toBeGreaterThanOrEqual(MELODY_RANGE.min)
          expect(event.midi).toBeLessThanOrEqual(MELODY_RANGE.max)
        }
      }
    }
  })

  // Including the ties that cross a barline, where the note held is the first
  // of the bar after.
  it('holds the same pitch across a tie', () => {
    let tiesSeen = 0
    for (const seed of SEEDS) {
      const melody = build(seed).melody
      melody.forEach((bar, b) => {
        bar.forEach((event, i) => {
          if (!event.tie) return
          tiesSeen++
          const next = i + 1 < bar.length ? bar[i + 1] : melody[b + 1]?.[0]
          expect(next?.midi).toBe(event.midi)
        })
      })
    }
    expect(tiesSeen).toBeGreaterThan(0)
  })

  // No shape reaches past a fifth, so almost nothing in the line does. What is
  // left is the joins: the melody range is an octave and a half, which for some
  // shapes leaves only one place to fit, and the next cell has to go there
  // whether or not it is near. Those are the wide moves, and they fall in the
  // seams rather than inside a figure.
  it('moves within a fifth nearly all the time', () => {
    let moves = 0
    let withinFifth = 0
    for (const seed of SEEDS) {
      for (let p = 0; p < PROGRESSIONS.length; p++) {
        const line = build(seed, p)
          .melody.flat()
          .map((e) => e.midi)
          .filter((midi): midi is number => midi !== null)
        for (let i = 1; i < line.length; i++) {
          const distance = Math.abs(line[i] - line[i - 1])
          if (distance === 0) continue
          moves++
          if (distance <= 8) withinFifth++
        }
      }
    }
    expect(moves).toBeGreaterThan(100)
    expect(withinFifth / moves).toBeGreaterThan(0.85)
  })

  it('is reproducible from a seed', () => {
    expect(build(99).melody).toEqual(build(99).melody)
  })
})
