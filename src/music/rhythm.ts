import type { Rng } from './random'

/**
 * Rhythm is measured in ticks. 12 ticks per quarter note divides evenly by
 * both 4 (sixteenths) and 3 (triplets), so every duration stays an integer.
 */
export const TICKS_PER_BEAT = 12

/** Every exercise is in 4/4, and this is the one place that says so. */
export const BEATS_PER_BAR = 4

export const TICKS_PER_BAR = TICKS_PER_BEAT * BEATS_PER_BAR

/**
 * Levels 1-6 are the basics: each brings a handful of new shapes, one rhythm
 * per bar, repeated across the beats. Levels 7-10 mix everything learned, with
 * the beats drawn one at a time, and the last of them adds ties. From 11 the
 * rhythm stops climbing — it stays at what 10 draws — and the melodic shapes
 * take over as what gets harder.
 */
export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15

export const LEVELS: readonly Level[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]

/** Where the basics end and everything comes back mixed. */
export const BASIC_LEVELS = 6

/** Where the rhythm stops climbing and the pitches take over. */
export const RHYTHM_LEVELS = 10

/** Beats drawn one at a time instead of one shape repeated through the bar. */
export const isMixed = (level: Level): boolean => level > BASIC_LEVELS

/** Ties come last: they only make sense once the beats vary. */
export const hasTies = (level: Level): boolean => level >= 10

/** The pitches are drawn as melodic shapes rather than one note at a time. */
export const hasShape = (level: Level): boolean => level > RHYTHM_LEVELS

/** VexFlow duration code. */
export type Duration = 'q' | '8' | '16'

/** [numNotes, notesOccupied], e.g. [3, 2] for a triplet, [6, 4] for a sextuplet. */
export type TupletRatio = readonly [number, number]

export interface NoteTemplate {
  dur: Duration
  dots?: number
  rest?: boolean
}

export interface EventTuplet {
  /** Index of the tuplet group inside the bar. */
  group: number
  numNotes: number
  notesOccupied: number
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
  /** Set when this note belongs to a tuplet. */
  tuplet?: EventTuplet
}

const BASE_TICKS: Record<Duration, number> = { q: 12, '8': 6, '16': 3 }

export function templateTicks(t: NoteTemplate, tuplet?: TupletRatio): number {
  const base = BASE_TICKS[t.dur]
  const dots = t.dots ?? 0
  // Each dot adds half of the previous value: 8d = 6 + 3 = 9 ticks.
  let total = base
  let add = base
  for (let i = 0; i < dots; i++) {
    add /= 2
    total += add
  }
  if (!tuplet) return total
  const [numNotes, notesOccupied] = tuplet
  return (total * notesOccupied) / numNotes
}

export interface BeatPattern {
  id: string
  level: Level
  /** Set when the beat is a tuplet. */
  tuplet?: TupletRatio
  notes: NoteTemplate[]
}

const TRIPLET: TupletRatio = [3, 2]
const SEXTUPLET: TupletRatio = [6, 4]

/**
 * Every pattern fills exactly one beat. Listed hardest-last: the eleven
 * rest-free shapes are ordered by difficulty and dealt out to the odd levels,
 * four, four and three, and each even level answers the ones below it with the
 * same shapes carrying a rest.
 *
 * A plain quarter is not among them. Repeated across the bar it would spell
 * the same four beats the bass already walks, which is nothing to read.
 */
export const BEAT_PATTERNS: BeatPattern[] = [
  // Level 1 — the plain divisions of a beat, and the dotted pair.
  { id: '8-8', level: 1, notes: [{ dur: '8' }, { dur: '8' }] },
  {
    id: '16x4',
    level: 1,
    notes: [{ dur: '16' }, { dur: '16' }, { dur: '16' }, { dur: '16' }],
  },
  { id: '8d-16', level: 1, notes: [{ dur: '8', dots: 1 }, { dur: '16' }] },
  { id: '16-8d', level: 1, notes: [{ dur: '16' }, { dur: '8', dots: 1 }] },

  // Level 2 — the level 1 shapes with a rest in them.
  { id: '8-r8', level: 2, notes: [{ dur: '8' }, { dur: '8', rest: true }] },
  { id: 'r8-8', level: 2, notes: [{ dur: '8', rest: true }, { dur: '8' }] },
  {
    id: 'r16-16x3',
    level: 2,
    notes: [{ dur: '16', rest: true }, { dur: '16' }, { dur: '16' }, { dur: '16' }],
  },
  {
    id: '16-16-r16-16',
    level: 2,
    notes: [{ dur: '16' }, { dur: '16' }, { dur: '16', rest: true }, { dur: '16' }],
  },
  { id: '8d-r16', level: 2, notes: [{ dur: '8', dots: 1 }, { dur: '16', rest: true }] },
  { id: 'r16-8d', level: 2, notes: [{ dur: '16', rest: true }, { dur: '8', dots: 1 }] },

  // Level 3 — sixteenths beside an eighth, then the triplet.
  { id: '8-16-16', level: 3, notes: [{ dur: '8' }, { dur: '16' }, { dur: '16' }] },
  { id: '16-16-8', level: 3, notes: [{ dur: '16' }, { dur: '16' }, { dur: '8' }] },
  { id: '16-8-16', level: 3, notes: [{ dur: '16' }, { dur: '8' }, { dur: '16' }] },
  {
    id: 'triplet',
    level: 3,
    tuplet: TRIPLET,
    notes: [{ dur: '8' }, { dur: '8' }, { dur: '8' }],
  },

  // Level 4 — the level 3 shapes with a rest in them.
  { id: 'r8-16-16', level: 4, notes: [{ dur: '8', rest: true }, { dur: '16' }, { dur: '16' }] },
  { id: '16-16-r8', level: 4, notes: [{ dur: '16' }, { dur: '16' }, { dur: '8', rest: true }] },
  { id: '16-r8-16', level: 4, notes: [{ dur: '16' }, { dur: '8', rest: true }, { dur: '16' }] },
  {
    id: 'triplet-r-first',
    level: 4,
    tuplet: TRIPLET,
    notes: [{ dur: '8', rest: true }, { dur: '8' }, { dur: '8' }],
  },
  {
    id: 'triplet-r-mid',
    level: 4,
    tuplet: TRIPLET,
    notes: [{ dur: '8' }, { dur: '8', rest: true }, { dur: '8' }],
  },
  {
    id: 'triplet-r-last',
    level: 4,
    tuplet: TRIPLET,
    notes: [{ dur: '8' }, { dur: '8' }, { dur: '8', rest: true }],
  },

  // Level 5 — the triplet written as two notes, and the sextuplet.
  { id: 'triplet-q8', level: 5, tuplet: TRIPLET, notes: [{ dur: 'q' }, { dur: '8' }] },
  { id: 'triplet-8q', level: 5, tuplet: TRIPLET, notes: [{ dur: '8' }, { dur: 'q' }] },
  {
    id: 'sextuplet',
    level: 5,
    tuplet: SEXTUPLET,
    notes: [
      { dur: '16' },
      { dur: '16' },
      { dur: '16' },
      { dur: '16' },
      { dur: '16' },
      { dur: '16' },
    ],
  },

  // Level 6 — the level 5 shapes with a rest in them.
  {
    id: 'triplet-q8-r',
    level: 6,
    tuplet: TRIPLET,
    notes: [{ dur: 'q' }, { dur: '8', rest: true }],
  },
  {
    id: 'triplet-r8-q',
    level: 6,
    tuplet: TRIPLET,
    notes: [{ dur: '8', rest: true }, { dur: 'q' }],
  },
  {
    id: 'sextuplet-r',
    level: 6,
    tuplet: SEXTUPLET,
    notes: [
      { dur: '16', rest: true },
      { dur: '16' },
      { dur: '16' },
      { dur: '16' },
      { dur: '16' },
      { dur: '16' },
    ],
  },
]

const hasRest = (pattern: BeatPattern): boolean => pattern.notes.some((n) => n.rest)

/**
 * A basic level brings only its own shapes: carrying the earlier ones along
 * would just repeat the levels below, and going back a level is the way to
 * practise those. The mixed levels then open up everything at once — first
 * the rest-free half, then the rest-carrying half, then the lot.
 */
export function patternsFor(level: Level): BeatPattern[] {
  if (!isMixed(level)) return BEAT_PATTERNS.filter((p) => p.level === level)
  if (level === 7) return BEAT_PATTERNS.filter((p) => !hasRest(p))
  if (level === 8) return BEAT_PATTERNS.filter(hasRest)
  return BEAT_PATTERNS
}

const TIE_CHANCE = 0.3

/**
 * Build one bar of 4/4 rhythm.
 *
 * Through the basics one pattern is drawn and repeated across all four beats:
 * the reader meets a single rhythm per bar and can put their attention on the
 * pitches. Every pattern is equally likely, so the pool size is the number of
 * bars that can come out.
 *
 * From level 7 the beats are drawn one at a time, beat 1 always sounding so
 * the bar has an audible downbeat, and ties across beat boundaries add the
 * off-beat push that makes a line swing.
 */
export function generateBarRhythm(level: Level, rng: Rng): BarEvent[] {
  const pool = patternsFor(level)
  const beats: BeatPattern[] = []
  if (isMixed(level)) {
    for (let beat = 0; beat < 4; beat++) {
      let pattern = rng.pick(pool)
      for (let retry = 0; beat === 0 && pattern.notes[0].rest && retry < 4; retry++) {
        pattern = rng.pick(pool)
      }
      beats.push(pattern)
    }
  } else {
    const pattern = rng.pick(pool)
    for (let beat = 0; beat < 4; beat++) beats.push(pattern)
  }
  return buildBar(beats, hasTies(level) ? rng : undefined)
}

/**
 * The rhythm for a whole exercise.
 *
 * Through the basics the bars climb: the first two thirds of the page walk up
 * the pool from its easiest shape to its hardest, so the reading gets harder
 * as it goes, and the last third is drawn at random from everything met. The
 * mixed levels are random throughout — that is what makes them the hard read.
 */
export function generateBarRhythms(level: Level, barCount: number, rng: Rng): BarEvent[][] {
  if (isMixed(level)) {
    return Array.from({ length: barCount }, () => generateBarRhythm(level, rng))
  }

  const pool = patternsFor(level)
  const climbing = Math.ceil((barCount * 2) / 3)
  return Array.from({ length: barCount }, (_, bar) => {
    const pattern =
      bar < climbing ? pool[Math.floor((bar * pool.length) / climbing)] : rng.pick(pool)
    return buildBar(Array.from({ length: 4 }, () => pattern))
  })
}

function buildBar(beats: BeatPattern[], tieRng?: Rng): BarEvent[] {
  const events: BarEvent[] = []
  let start = 0
  beats.forEach((pattern, beat) => {
    for (const note of pattern.notes) {
      const ticks = templateTicks(note, pattern.tuplet)
      events.push({
        dur: note.dur,
        dots: note.dots ?? 0,
        ticks,
        rest: note.rest ?? false,
        start,
        tie: false,
        ...(pattern.tuplet
          ? {
              tuplet: {
                group: beat,
                numNotes: pattern.tuplet[0],
                notesOccupied: pattern.tuplet[1],
              },
            }
          : {}),
      })
      start += ticks
    }
  })

  if (tieRng) applyTies(events, tieRng)
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
    if (current.tuplet !== undefined || next.tuplet !== undefined) continue
    if (current.ticks >= TICKS_PER_BEAT) continue
    if (!rng.chance(TIE_CHANCE)) continue
    current.tie = true
  }
}

export function totalTicks(events: BarEvent[]): number {
  return events.reduce((sum, e) => sum + e.ticks, 0)
}
