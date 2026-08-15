import type { Rng } from './random'

/**
 * Rhythm is measured in ticks. 12 ticks per quarter note divides evenly by
 * both 4 (sixteenths) and 3 (triplets), so every duration stays an integer.
 */
export const TICKS_PER_BEAT = 12
export const TICKS_PER_BAR = TICKS_PER_BEAT * 4

export type Level = 1 | 2 | 3 | 4

/** VexFlow duration code. */
export type Duration = 'q' | '8' | '16'

export interface NoteTemplate {
  dur: Duration
  dots?: number
  rest?: boolean
  triplet?: boolean
}

export interface BarEvent {
  dur: Duration
  dots: number
  /** Length in ticks. */
  ticks: number
  rest: boolean
  /** Offset from the start of the bar, in ticks. */
  start: number
  /** Tied to the event that follows (same pitch, no re-attack). */
  tie: boolean
  /** Index of the triplet group inside the bar, when this note belongs to one. */
  triplet?: number
}

const BASE_TICKS: Record<Duration, number> = { q: 12, '8': 6, '16': 3 }

export function templateTicks(t: NoteTemplate): number {
  if (t.triplet) return (BASE_TICKS[t.dur] * 2) / 3
  const base = BASE_TICKS[t.dur]
  const dots = t.dots ?? 0
  // Each dot adds half of the previous value: 8d = 6 + 3 = 9 ticks.
  let total = base
  let add = base
  for (let i = 0; i < dots; i++) {
    add /= 2
    total += add
  }
  return total
}

interface BeatPattern {
  id: string
  level: Level
  weight: number
  notes: NoteTemplate[]
}

/** Every pattern fills exactly one beat. */
export const BEAT_PATTERNS: BeatPattern[] = [
  { id: 'q', level: 1, weight: 3, notes: [{ dur: 'q' }] },
  { id: '8-8', level: 1, weight: 3, notes: [{ dur: '8' }, { dur: '8' }] },

  { id: 'r8-8', level: 2, weight: 1.5, notes: [{ dur: '8', rest: true }, { dur: '8' }] },
  { id: '8-r8', level: 2, weight: 1.5, notes: [{ dur: '8' }, { dur: '8', rest: true }] },
  { id: 'rq', level: 2, weight: 0.8, notes: [{ dur: 'q', rest: true }] },

  {
    id: '16x4',
    level: 3,
    weight: 1,
    notes: [{ dur: '16' }, { dur: '16' }, { dur: '16' }, { dur: '16' }],
  },
  { id: '8d-16', level: 3, weight: 1.2, notes: [{ dur: '8', dots: 1 }, { dur: '16' }] },
  { id: '8-16-16', level: 3, weight: 1, notes: [{ dur: '8' }, { dur: '16' }, { dur: '16' }] },
  { id: '16-16-8', level: 3, weight: 1, notes: [{ dur: '16' }, { dur: '16' }, { dur: '8' }] },
  { id: '16-8-16', level: 3, weight: 0.8, notes: [{ dur: '16' }, { dur: '8' }, { dur: '16' }] },

  {
    id: 'triplet',
    level: 4,
    weight: 2,
    notes: [
      { dur: '8', triplet: true },
      { dur: '8', triplet: true },
      { dur: '8', triplet: true },
    ],
  },
]

const TIE_CHANCE = 0.3

function patternsFor(level: Level): BeatPattern[] {
  return BEAT_PATTERNS.filter((p) => p.level <= level)
}

/**
 * Build one bar of 4/4 rhythm.
 *
 * Beat 1 always carries a note so the bar has an audible downbeat, and ties
 * across beat boundaries add the off-beat push that makes a line swing.
 *
 * Level 1 draws one pattern and repeats it across all four beats: the reader
 * meets a single rhythm per bar and can put their attention on the pitches.
 */
export function generateBarRhythm(level: Level, rng: Rng): BarEvent[] {
  const pool = patternsFor(level)
  const weights = pool.map((p) => p.weight)

  const beats: BeatPattern[] = []
  if (level === 1) {
    const pattern = rng.weighted(pool, weights)
    for (let beat = 0; beat < 4; beat++) beats.push(pattern)
  } else {
    for (let beat = 0; beat < 4; beat++) {
      let pattern = rng.weighted(pool, weights)
      for (let retry = 0; beat === 0 && pattern.notes[0].rest && retry < 4; retry++) {
        pattern = rng.weighted(pool, weights)
      }
      beats.push(pattern)
    }
  }

  const events: BarEvent[] = []
  let start = 0
  let tripletGroup = 0
  for (const pattern of beats) {
    const isTriplet = pattern.notes.some((n) => n.triplet)
    if (isTriplet) tripletGroup++
    for (const note of pattern.notes) {
      const ticks = templateTicks(note)
      events.push({
        dur: note.dur,
        dots: note.dots ?? 0,
        ticks,
        rest: note.rest ?? false,
        start,
        tie: false,
        ...(note.triplet ? { triplet: tripletGroup } : {}),
      })
      start += ticks
    }
  }

  if (level >= 2) applyTies(events, rng)
  return events
}

/**
 * Tie an off-beat note into the next beat. Only notes that start off the beat
 * are eligible — tying a note that starts on the beat would just spell a
 * longer note, not a syncopation.
 */
function applyTies(events: BarEvent[], rng: Rng): void {
  for (let i = 0; i < events.length - 1; i++) {
    const current = events[i]
    const next = events[i + 1]
    const boundary = current.start + current.ticks
    if (boundary % TICKS_PER_BEAT !== 0) continue
    if (current.rest || next.rest) continue
    if (current.triplet !== undefined || next.triplet !== undefined) continue
    if (current.ticks >= TICKS_PER_BEAT) continue
    if (!rng.chance(TIE_CHANCE)) continue
    current.tie = true
  }
}

export function totalTicks(events: BarEvent[]): number {
  return events.reduce((sum, e) => sum + e.ticks, 0)
}
