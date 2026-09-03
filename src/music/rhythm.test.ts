import { describe, expect, it } from 'vitest'
import type { Level } from './rhythm'
import {
  BEATS_PER_BAR,
  BEAT_PATTERNS,
  LEVELS,
  TICKS_PER_BAR,
  TICKS_PER_BEAT,
  generateBarRhythm,
  generateBarRhythms,
  hasTies,
  isMixed,
  partnersFor,
  patternBeats,
  patternsFor,
  templateTicks,
  totalTicks,
} from './rhythm'
import { createRng } from './random'

const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7 + 1)

/**
 * The bar as a string of shapes, so a whole bar can be compared in one go. The
 * tuplet count is part of it: three eighths under a bracket and three plain
 * ones are different bars, and without it they read the same.
 */
const barShape = (events: ReturnType<typeof generateBarRhythm>): string =>
  events.map((e) => `${e.dur}:${e.dots}:${e.rest}:${e.tuplet?.numNotes ?? 0}`).join('+')

/** The shapes of one pool pattern, in the same notation as `barShape`. */
const cellShapes = (pattern: (typeof BEAT_PATTERNS)[number]): string[] =>
  pattern.notes.map(
    (n) => `${n.dur}:${n.dots ?? 0}:${n.rest ?? false}:${pattern.tuplet?.[0] ?? 0}`,
  )

/**
 * Whether the bar can be read as pool shapes laid end to end. A two-beat shape
 * that ran off the end of the bar would leave a tail that matches nothing.
 */
const tilesWith = (
  events: ReturnType<typeof generateBarRhythm>,
  pool: (typeof BEAT_PATTERNS)[number][],
): boolean => {
  const shapes = events.map((e) => `${e.dur}:${e.dots}:${e.rest}:${e.tuplet?.numNotes ?? 0}`)
  const fits = (at: number): boolean =>
    at === shapes.length ||
    pool.some((pattern) => {
      const cell = cellShapes(pattern)
      return cell.every((s, i) => shapes[at + i] === s) && fits(at + cell.length)
    })
  return fits(0)
}

/** The same string, built from a pool pattern repeated until the bar is full. */
const repeatedShape = (pattern: (typeof BEAT_PATTERNS)[number]): string => {
  const cell = cellShapes(pattern).join('+')
  return Array.from({ length: BEATS_PER_BAR / patternBeats(pattern) }, () => cell).join('+')
}

/**
 * Every bar a basic level can build from one of its own shapes: the shape
 * repeated where the level fills a bar alone, and otherwise the two-beat cell
 * played twice, either way round, once per borrowed shape.
 */
const basicBars = (level: Level, pattern: (typeof BEAT_PATTERNS)[number]): string[] => {
  const partners = partnersFor(level)
  if (partners.length === 0) return [repeatedShape(pattern)]
  const own = cellShapes(pattern).join('+')
  return partners.flatMap((partner) => {
    const borrowed = cellShapes(partner).join('+')
    return [`${own}+${borrowed}+${own}+${borrowed}`, `${borrowed}+${own}+${borrowed}+${own}`]
  })
}

describe('templateTicks', () => {
  it('measures plain durations', () => {
    expect(templateTicks({ dur: 'q' })).toBe(12)
    expect(templateTicks({ dur: '8' })).toBe(6)
    expect(templateTicks({ dur: '16' })).toBe(3)
  })

  it('adds half the value per dot', () => {
    expect(templateTicks({ dur: '8', dots: 1 })).toBe(9)
    expect(templateTicks({ dur: 'q', dots: 1 })).toBe(18)
  })

  it('keeps tuplets on integer ticks', () => {
    expect(templateTicks({ dur: '8' }, [3, 2])).toBe(4)
    expect(templateTicks({ dur: '16' }, [6, 4])).toBe(2)
    expect(templateTicks({ dur: 'q' }, [3, 2])).toBe(8)
  })
})

describe('BEAT_PATTERNS', () => {
  it('fills whole beats, in a count that divides the bar', () => {
    for (const pattern of BEAT_PATTERNS) {
      const beats = patternBeats(pattern)
      const whole = Number.isInteger(beats) && beats > 0 && BEATS_PER_BAR % beats === 0
      expect(`${pattern.id}: ${beats} beats, usable ${whole}`).toBe(
        `${pattern.id}: ${beats} beats, usable true`,
      )
    }
  })

  it('has patterns in every pool', () => {
    for (const level of LEVELS.filter((l) => !isMixed(l))) {
      expect(BEAT_PATTERNS.some((p) => p.level === level)).toBe(true)
    }
  })

  it('never rests through a whole shape, which would leave the bar silent', () => {
    for (const pattern of BEAT_PATTERNS) {
      expect(`${pattern.id}`).toBe(pattern.notes.every((n) => n.rest) ? '' : pattern.id)
    }
  })

  it('opens rest-free shapes on odd levels and their rest versions above', () => {
    for (const pattern of BEAT_PATTERNS) {
      const hasRest = pattern.notes.some((n) => n.rest)
      expect(`${pattern.id}: ${hasRest}`).toBe(`${pattern.id}: ${pattern.level % 2 === 0}`)
    }
  })

  it('gives every id once', () => {
    const ids = new Set(BEAT_PATTERNS.map((p) => p.id))
    expect(ids.size).toBe(BEAT_PATTERNS.length)
  })
})

describe('patternsFor', () => {
  it('holds every rest back until an even basic level', () => {
    for (const level of LEVELS.filter((l) => !isMixed(l))) {
      const rested = patternsFor(level).filter((p) => p.notes.some((n) => n.rest))
      expect(`level ${level}: ${rested.length > 0}`).toBe(`level ${level}: ${level % 2 === 0}`)
    }
  })

  it('opens the whole inventory over the mixed levels', () => {
    expect(patternsFor(7).some((p) => p.notes.some((n) => n.rest))).toBe(false)
    expect(patternsFor(8).every((p) => p.notes.some((n) => n.rest))).toBe(true)
    expect(patternsFor(7).length + patternsFor(8).length).toBe(BEAT_PATTERNS.length)
    expect(patternsFor(9)).toHaveLength(BEAT_PATTERNS.length)
    expect(patternsFor(10)).toHaveLength(BEAT_PATTERNS.length)
  })

  it('brings only what the level itself adds', () => {
    expect(patternsFor(1)).toHaveLength(6)
    expect(patternsFor(2)).toHaveLength(8)
    expect(patternsFor(3)).toHaveLength(4)
    expect(patternsFor(4)).toHaveLength(6)
    expect(patternsFor(5)).toHaveLength(3)
    expect(patternsFor(6)).toHaveLength(3)
  })

  it('opens level 1 with eighths against a quarter, both ways round', () => {
    expect(patternsFor(1).slice(0, 2).map((p) => p.id)).toEqual(['8-8-q', 'q-8-8'])
    expect(patternsFor(2).slice(0, 2).map((p) => p.id)).toEqual(['8-8-rq', 'rq-8-8'])
    for (const id of ['8-8-q', 'q-8-8', '8-8-rq', 'rq-8-8']) {
      const pattern = BEAT_PATTERNS.find((p) => p.id === id)!
      expect(`${id}: ${patternBeats(pattern)}`).toBe(`${id}: 2`)
    }
  })

  it('keeps the two-beat shapes out of the shape levels, which draw a beat at a time', () => {
    for (const level of LEVELS.filter((l) => l > 10)) {
      expect(patternsFor(level).every((p) => patternBeats(p) === 1)).toBe(true)
    }
  })

  it('never repeats a shape from another basic level', () => {
    const seen = new Set<string>()
    for (const level of LEVELS.filter((l) => !isMixed(l))) {
      for (const pattern of patternsFor(level)) {
        expect(seen.has(pattern.id)).toBe(false)
        seen.add(pattern.id)
      }
    }
    expect(seen.size).toBe(BEAT_PATTERNS.length)
  })
})

describe('generateBarRhythm', () => {
  it('always fills the bar', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const events = generateBarRhythm(level, createRng(seed))
        expect(totalTicks(events)).toBe(TICKS_PER_BAR)
      }
    }
  })

  it('lays events end to end from the start of the bar', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const events = generateBarRhythm(level, createRng(seed))
        let cursor = 0
        for (const event of events) {
          expect(event.start).toBe(cursor)
          cursor += event.ticks
        }
      }
    }
  })

  it('builds a bar that repeats itself through the basics', () => {
    for (const level of LEVELS.filter((l) => !isMixed(l))) {
      const expected = new Set(patternsFor(level).flatMap((p) => basicBars(level, p)))
      for (const seed of SEEDS) {
        const bar = barShape(generateBarRhythm(level, createRng(seed)))
        expect(`level ${level}: ${expected.has(bar)}`).toBe(`level ${level}: true`)
      }
    }
  })

  it('pairs a thin pool with a shape borrowed from the level it answers', () => {
    for (const level of [3, 4, 5, 6] as Level[]) {
      const partners = partnersFor(level)
      expect(`level ${level}: ${partners.length > 0}`).toBe(`level ${level}: true`)
      // Borrowed from the lowest basic level of the same parity, so a level
      // free of rests stays free of them and one about rests stays about them.
      expect(`level ${level}: from ${[...new Set(partners.map((p) => p.level))]}`).toBe(
        `level ${level}: from ${level % 2 === 1 ? 1 : 2}`,
      )
      for (const partner of partners) {
        // One beat, since it takes every other beat of the bar.
        expect(`${partner.id}: ${patternBeats(partner)} beat`).toBe(`${partner.id}: 1 beat`)
      }
      // Which is the point of it: a page draws far more bars than the pool has
      // shapes in it. Level 3 was four bars before, and is thirty-two now.
      const drawn = new Set(SEEDS.map((seed) => barShape(generateBarRhythm(level, createRng(seed)))))
      expect(`level ${level}: ${drawn.size > patternsFor(level).length}`).toBe(
        `level ${level}: true`,
      )
    }
  })

  it('leaves the floor of each parity, and the mixed levels, borrowing nothing', () => {
    // Levels 1 and 2 answer to no one and fill a bar on their own; from 7 the
    // beats are drawn one at a time and there is nothing to pair.
    for (const level of LEVELS.filter((l) => l <= 2 || isMixed(l))) {
      expect(`level ${level}: ${partnersFor(level).length} borrowed`).toBe(
        `level ${level}: 0 borrowed`,
      )
    }
  })

  it('sounds the level\'s own shape in half of every bar', () => {
    for (const level of [3, 4, 5, 6] as Level[]) {
      for (const seed of SEEDS) {
        const bar = barShape(generateBarRhythm(level, createRng(seed)))
        const own = patternsFor(level).filter((p) => basicBars(level, p).includes(bar))
        expect(`level ${level} seed ${seed}: ${own.length}`).toBe(`level ${level} seed ${seed}: 1`)
      }
    }
  })

  it('never cuts a two-beat shape in half at the end of the bar', () => {
    for (const level of [7, 8, 9, 10] as Level[]) {
      const pool = patternsFor(level)
      for (const seed of SEEDS) {
        const events = generateBarRhythm(level, createRng(seed))
        expect(`level ${level} seed ${seed}: ${tilesWith(events, pool)}`).toBe(
          `level ${level} seed ${seed}: true`,
        )
      }
    }
  })

  it('draws two-beat shapes in the mixed levels too', () => {
    // A plain quarter that is not part of a tuplet can only have come from one.
    const seen = SEEDS.some((seed) =>
      generateBarRhythm(7, createRng(seed)).some(
        (e) => e.dur === 'q' && !e.rest && e.tuplet === undefined,
      ),
    )
    expect(seen).toBe(true)
  })

  it('mixes the beats from level 7 up', () => {
    const mixed = SEEDS.some((seed) => {
      const events = generateBarRhythm(7, createRng(seed))
      const perBeat = events.length / 4
      return !Number.isInteger(perBeat) || events[0].dur !== events[perBeat]?.dur
    })
    expect(mixed).toBe(true)
  })

  it('ties only on the last level, and only off the beat', () => {
    for (const level of LEVELS.filter((l) => !hasTies(l))) {
      for (const seed of SEEDS) {
        expect(generateBarRhythm(level, createRng(seed)).some((e) => e.tie)).toBe(false)
      }
    }
    let tiesSeen = 0
    for (const seed of SEEDS) {
      const events = generateBarRhythm(10, createRng(seed))
      events.forEach((event, i) => {
        if (!event.tie) return
        tiesSeen++
        expect(events[i + 1]).toBeDefined()
        expect(event.rest).toBe(false)
        expect(events[i + 1].rest).toBe(false)
        expect(event.tuplet).toBeUndefined()
        expect(events[i + 1].tuplet).toBeUndefined()
        expect(event.ticks).toBeLessThan(TICKS_PER_BEAT)
        expect((event.start + event.ticks) % TICKS_PER_BEAT).toBe(0)
      })
    }
    expect(tiesSeen).toBeGreaterThan(0)
  })

  it('keeps rests off the odd basic levels entirely', () => {
    for (const level of [1, 3, 5, 7] as Level[]) {
      for (const seed of SEEDS) {
        expect(generateBarRhythm(level, createRng(seed)).some((e) => e.rest)).toBe(false)
      }
    }
    for (const level of [2, 4, 6, 8] as Level[]) {
      const rested = SEEDS.some((seed) =>
        generateBarRhythm(level, createRng(seed)).some((e) => e.rest),
      )
      expect(rested).toBe(true)
    }
  })

  it('keeps the triplet out of levels 1 and 2', () => {
    for (const level of [1, 2] as Level[]) {
      for (const seed of SEEDS) {
        const events = generateBarRhythm(level, createRng(seed))
        expect(events.some((e) => e.tuplet !== undefined)).toBe(false)
      }
    }
  })

  it('keeps sextuplets out of levels below 5', () => {
    for (const level of [1, 2, 3, 4] as Level[]) {
      for (const seed of SEEDS) {
        const events = generateBarRhythm(level, createRng(seed))
        expect(events.some((e) => e.tuplet?.numNotes === 6)).toBe(false)
      }
    }
  })

  it('gives every tuplet group its ratio, and a beat of the bar to itself', () => {
    // How many beats of a bar are grouped depends on what the level draws and
    // what it borrows; what holds either way is that a group is one beat.
    let seen = 0
    for (const level of [5, 6, 9, 10] as Level[]) {
      for (const seed of SEEDS) {
        const events = generateBarRhythm(level, createRng(seed))
        const groups = new Map<number, ReturnType<typeof generateBarRhythm>>()
        for (const event of events) {
          if (!event.tuplet) continue
          groups.set(event.tuplet.group, [...(groups.get(event.tuplet.group) ?? []), event])
        }
        for (const [group, members] of groups) {
          seen++
          const ticks = members.reduce((sum, e) => sum + e.ticks, 0)
          const ratios = new Set(members.map((e) => e.tuplet!.numNotes))
          expect(`group ${group}: ${ticks} ticks, ratios ${[...ratios]}`).toBe(
            `group ${group}: ${TICKS_PER_BEAT} ticks, ratios ${members[0].tuplet!.numNotes}`,
          )
          expect([3, 6]).toContain(members[0].tuplet!.numNotes)
          expect(members[0].start).toBe(group * TICKS_PER_BEAT)
        }
      }
    }
    expect(seen).toBeGreaterThan(0)
  })

  it('climbs through the pool before it starts repeating itself', () => {
    for (const level of [1, 3, 5] as Level[]) {
      const pool = patternsFor(level)
      const bars = generateBarRhythms(level, 12, createRng(11))
      expect(bars).toHaveLength(12)
      // The first two thirds walk the pool from its easiest shape to its
      // hardest, never stepping back.
      const climbing = bars.slice(0, 8).map(barShape)
      const order = new Map<string, number>()
      pool.forEach((pattern, i) => {
        for (const bar of basicBars(level, pattern)) order.set(bar, i)
      })
      const seen = climbing.map((s) => order.get(s) ?? -1)
      expect(seen.some((i) => i < 0)).toBe(false)
      for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1])
      expect(seen[0]).toBe(0)
    }
  })

  it('leaves the mixed levels random from the first bar', () => {
    const bars = generateBarRhythms(7, 12, createRng(3))
    expect(bars).toHaveLength(12)
    expect(bars.some((events) => events.length !== bars[0].length)).toBe(true)
  })

  it('is reproducible from a seed', () => {
    const a = generateBarRhythm(6, createRng(42))
    const b = generateBarRhythm(6, createRng(42))
    expect(a).toEqual(b)
  })
})
