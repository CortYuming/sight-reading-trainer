import { describe, expect, it } from 'vitest'
import type { Level } from './rhythm'
import {
  BEAT_PATTERNS,
  TICKS_PER_BAR,
  TICKS_PER_BEAT,
  generateBarRhythm,
  templateTicks,
  totalTicks,
} from './rhythm'
import { createRng } from './random'

const LEVELS: Level[] = [1, 2, 3, 4]
const SEEDS = Array.from({ length: 60 }, (_, i) => i * 7 + 1)

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

  it('keeps triplets on integer ticks', () => {
    expect(templateTicks({ dur: '8', triplet: true })).toBe(4)
  })
})

describe('BEAT_PATTERNS', () => {
  it('every pattern fills exactly one beat', () => {
    for (const pattern of BEAT_PATTERNS) {
      const sum = pattern.notes.reduce((total, note) => total + templateTicks(note), 0)
      expect(`${pattern.id}: ${sum}`).toBe(`${pattern.id}: ${TICKS_PER_BEAT}`)
    }
  })

  it('has patterns at every level', () => {
    for (const level of LEVELS) {
      expect(BEAT_PATTERNS.some((p) => p.level === level)).toBe(true)
    }
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
    for (const seed of SEEDS) {
      const events = generateBarRhythm(4, createRng(seed))
      let cursor = 0
      for (const event of events) {
        expect(event.start).toBe(cursor)
        cursor += event.ticks
      }
    }
  })

  it('starts the bar with a sounding note', () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS) {
        const events = generateBarRhythm(level, createRng(seed))
        expect(events[0].rest).toBe(false)
      }
    }
  })

  it('level 1 stays on quarters and eighths, with no rests or ties', () => {
    for (const seed of SEEDS) {
      const events = generateBarRhythm(1, createRng(seed))
      for (const event of events) {
        expect(['q', '8']).toContain(event.dur)
        expect(event.rest).toBe(false)
        expect(event.tie).toBe(false)
        expect(event.triplet).toBeUndefined()
      }
    }
  })

  it('keeps sixteenths out of levels 1 and 2', () => {
    for (const level of [1, 2] as Level[]) {
      for (const seed of SEEDS) {
        const events = generateBarRhythm(level, createRng(seed))
        expect(events.some((e) => e.dur === '16')).toBe(false)
      }
    }
  })

  it('keeps triplets out of levels below 4', () => {
    for (const level of [1, 2, 3] as Level[]) {
      for (const seed of SEEDS) {
        const events = generateBarRhythm(level, createRng(seed))
        expect(events.some((e) => e.triplet !== undefined)).toBe(false)
      }
    }
  })

  it('groups triplets in threes', () => {
    const groups = new Map<number, number>()
    for (const seed of SEEDS) {
      for (const event of generateBarRhythm(4, createRng(seed))) {
        if (event.triplet === undefined) continue
        const key = seed * 100 + event.triplet
        groups.set(key, (groups.get(key) ?? 0) + 1)
      }
    }
    expect(groups.size).toBeGreaterThan(0)
    for (const count of groups.values()) expect(count).toBe(3)
  })

  it('only ties off-beat notes into a following note', () => {
    for (const seed of SEEDS) {
      const events = generateBarRhythm(4, createRng(seed))
      events.forEach((event, i) => {
        if (!event.tie) return
        const next = events[i + 1]
        expect(next).toBeDefined()
        expect(event.rest).toBe(false)
        expect(next.rest).toBe(false)
        expect(event.triplet).toBeUndefined()
        expect(next.triplet).toBeUndefined()
        expect(event.ticks).toBeLessThan(TICKS_PER_BEAT)
        expect((event.start + event.ticks) % TICKS_PER_BEAT).toBe(0)
      })
    }
  })

  it('does produce ties at level 2 and above', () => {
    const tied = SEEDS.some((seed) => generateBarRhythm(2, createRng(seed)).some((e) => e.tie))
    expect(tied).toBe(true)
  })

  it('is reproducible from a seed', () => {
    const a = generateBarRhythm(4, createRng(42))
    const b = generateBarRhythm(4, createRng(42))
    expect(a).toEqual(b)
  })
})
