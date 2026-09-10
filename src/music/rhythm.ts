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
 * Levels 1-6 are the basics: each brings a handful of new shapes, laid down as
 * a bar that repeats itself — one shape through the whole bar at levels 1 and
 * 2, and from level 3 a two-beat cell of the new shape beside an earlier one,
 * since those pools are too thin to fill a page on their own. Levels 7-10 mix
 * everything learned, with the beats drawn one at a time, and the last of them
 * adds ties. From 11 the rhythm steps back to plain divisions and a good deal
 * of silence, and the melodic shapes take over as what gets harder.
 */
// prettier-ignore
export type Level =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15
  | 16 | 17 | 18 | 19 | 20 | 21 | 22

export const LEVELS: readonly Level[] = Array.from(
  { length: 22 },
  (_, i) => (i + 1) as Level,
)

/** Where the basics end and everything comes back mixed. */
export const BASIC_LEVELS = 6

/** Where the rhythm steps back and the pitches take over. */
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

/**
 * How many beats a shape fills — read off its notes rather than declared
 * beside them, so the two can never disagree. One for most, two for a shape
 * that straddles a pair of beats.
 */
export const patternBeats = (pattern: Pick<BeatPattern, 'notes' | 'tuplet'>): number =>
  pattern.notes.reduce((ticks, note) => ticks + templateTicks(note, pattern.tuplet), 0) /
  TICKS_PER_BEAT

const TRIPLET: TupletRatio = [3, 2]
const SEXTUPLET: TupletRatio = [6, 4]

/**
 * Every pattern fills a whole number of beats — one, or two where the shape
 * straddles a pair of them. Listed hardest-last: the thirteen rest-free shapes
 * are ordered by difficulty and dealt out to the odd levels, six, four and
 * three, and each even level answers the ones below it with the same shapes
 * carrying a rest.
 *
 * A plain quarter is not among them on its own. Repeated across the bar it
 * would spell the same four beats the bass already walks, which is nothing to
 * read. Inside a two-beat shape it has eighths beside it to be read against,
 * which is a different thing to look at.
 */
export const BEAT_PATTERNS: BeatPattern[] = [
  // Level 1 — eighths against a quarter, the plain divisions of a beat, and
  // the dotted pair.
  { id: '8-8-q', level: 1, notes: [{ dur: '8' }, { dur: '8' }, { dur: 'q' }] },
  { id: 'q-8-8', level: 1, notes: [{ dur: 'q' }, { dur: '8' }, { dur: '8' }] },
  { id: '8-8', level: 1, notes: [{ dur: '8' }, { dur: '8' }] },
  {
    id: '16x4',
    level: 1,
    notes: [{ dur: '16' }, { dur: '16' }, { dur: '16' }, { dur: '16' }],
  },
  { id: '8d-16', level: 1, notes: [{ dur: '8', dots: 1 }, { dur: '16' }] },
  { id: '16-8d', level: 1, notes: [{ dur: '16' }, { dur: '8', dots: 1 }] },

  // Level 2 — the level 1 shapes with a rest in them.
  {
    id: '8-8-rq',
    level: 2,
    notes: [{ dur: '8' }, { dur: '8' }, { dur: 'q', rest: true }],
  },
  {
    id: 'rq-8-8',
    level: 2,
    notes: [{ dur: 'q', rest: true }, { dur: '8' }, { dur: '8' }],
  },
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

/**
 * A beat of silence. No rhythm level draws one — a bar of them would be a bar
 * of nothing to read — but the shape levels need the room. In the book a bar
 * carries a cell or two and rests through the remainder, and that space is
 * what lets the eye see where one figure ends and the next begins.
 */
const REST_BEAT: BeatPattern = { id: 'rq', level: 1, notes: [{ dur: 'q', rest: true }] }

/**
 * How many of the beats in the shape pool are silent. Six against ten sounding
 * patterns puts a bar at about five notes, which is where the transcriptions
 * sit: every staff of pages 4-13 averages 4.3 notes to the bar.
 */
const SILENT_BEATS = 6

/**
 * What the shape levels draw a beat from: the plainest divisions, their
 * rest-carrying answers, and a good deal of silence. Held at what level 10
 * draws, a bar came out at twelve or fourteen notes and the cells ran together
 * into a scale — the room between them is what shows where a figure ends.
 */
const SHAPE_PATTERNS: BeatPattern[] = [
  ...Array.from({ length: SILENT_BEATS }, () => REST_BEAT),
  // One beat at a time: a two-beat shape would cross the boundary the melodic
  // cell is placed against.
  ...BEAT_PATTERNS.filter((p) => p.level <= 2 && patternBeats(p) === 1),
]

const hasRest = (pattern: BeatPattern): boolean => pattern.notes.some((n) => n.rest)

const isSilent = (pattern: BeatPattern): boolean => pattern.notes.every((n) => n.rest)

/**
 * Whether to draw again. Beat 1 always sounds, so the bar has a downbeat to
 * come in on, and no more than half a bar is silence — three silent beats out
 * of the shape pool would leave a bar with one note in it, which is not a bar
 * anyone is reading.
 */
function unwanted(pattern: BeatPattern, beat: number, chosen: BeatPattern[]): boolean {
  if (beat === 0) return pattern.notes[0].rest ?? false
  return isSilent(pattern) && chosen.filter(isSilent).length >= 2
}

/**
 * A basic level brings only its own shapes: carrying the earlier ones along
 * would just repeat the levels below, and going back a level is the way to
 * practise those. The mixed levels then open up everything at once — first
 * the rest-free half, then the rest-carrying half, then the lot.
 */
export function patternsFor(level: Level): BeatPattern[] {
  if (hasShape(level)) return SHAPE_PATTERNS
  if (!isMixed(level)) return BEAT_PATTERNS.filter((p) => p.level === level)
  if (level === 7) return BEAT_PATTERNS.filter((p) => !hasRest(p))
  if (level === 8) return BEAT_PATTERNS.filter(hasRest)
  return BEAT_PATTERNS
}

/**
 * Where a level borrows the shape it pairs its own with: the lowest basic
 * level of its own parity.
 *
 * A rest-free level borrows from level 1 and a rest-carrying one from level 2,
 * so an odd level stays free of rests and an even level stays about them. That
 * leaves levels 1 and 2 with nothing to borrow — being the lowest of their own
 * parity, they answer to no one — and they fill a bar on their own, which
 * their pools of six and eight are deep enough to do. The mixed levels draw
 * their beats one at a time and never borrow.
 */
const partnerLevel = (level: Level): Level | undefined => {
  if (isMixed(level)) return undefined
  const lowest: Level = level % 2 === 1 ? 1 : 2
  return level === lowest ? undefined : lowest
}

/**
 * The shapes a level pairs its own with — one beat each, since they take every
 * other beat of the bar. Empty for a level that fills a bar on its own.
 */
export function partnersFor(level: Level): BeatPattern[] {
  const from = partnerLevel(level)
  if (from === undefined) return []
  return BEAT_PATTERNS.filter((p) => p.level === from && patternBeats(p) === 1)
}

/** One shape, laid down as many times as it takes to fill the bar. */
const repeatToBar = (pattern: BeatPattern): BeatPattern[] =>
  Array.from({ length: BEATS_PER_BAR / patternBeats(pattern) }, () => pattern)

/** How often the borrowed shape opens the bar rather than answering. */
const PARTNER_FIRST_CHANCE = 0.5

/**
 * One bar of a basic level, built to repeat itself.
 *
 * Levels 1 and 2 lay their shape down until the bar is full: six and eight
 * shapes deep is a page that does not say the same thing twice. From level 3
 * the pool is thin — four shapes, three at levels 5 and 6 — and one shape four
 * times over means a page with four bars in it, which is a page the reader has
 * off by heart on the second pass. So the new shape takes every other beat and
 * one borrowed from the level it answers takes the rest: the bar is a two-beat
 * cell played twice, the new shape still sounds in half of every bar, and the
 * bars level 3 can draw go from four to thirty-two.
 *
 * A two-beat shape fills the bar itself either way. It already changes within
 * the bar, which is the whole of what borrowing buys, and it goes down twice
 * rather than four times, so there is no every-other-beat to give away.
 */
function basicShapes(level: Level, pattern: BeatPattern, rng: Rng): BeatPattern[] {
  const partners = partnersFor(level)
  if (partners.length === 0 || patternBeats(pattern) !== 1) return repeatToBar(pattern)
  const partner = rng.pick(partners)
  const cell = rng.chance(PARTNER_FIRST_CHANCE) ? [partner, pattern] : [pattern, partner]
  return [...cell, ...cell]
}

const TIE_CHANCE = 0.3

/**
 * Build one bar of 4/4 rhythm.
 *
 * Through the basics one shape is drawn and the bar is built to repeat itself,
 * so the reader meets a figure rather than four unrelated beats and can put
 * their attention on the pitches: the shape four times over at levels 1 and 2,
 * and from level 3 a two-beat cell — the new shape beside one borrowed from
 * the level below — played twice. Every shape is equally likely.
 *
 * From level 7 the shapes are drawn one at a time, beat 1 always sounding so
 * the bar has an audible downbeat, and ties across beat boundaries add the
 * off-beat push that makes a line swing. A two-beat shape is only offered
 * where two beats are left for it to sit in.
 */
export function generateBarRhythm(level: Level, rng: Rng): BarEvent[] {
  const pool = patternsFor(level)
  const shapes: BeatPattern[] = []
  if (isMixed(level)) {
    let filled = 0
    while (filled < BEATS_PER_BAR) {
      const fitting = pool.filter((p) => patternBeats(p) <= BEATS_PER_BAR - filled)
      let pattern = rng.pick(fitting)
      for (let retry = 0; retry < 4 && unwanted(pattern, filled, shapes); retry++) {
        pattern = rng.pick(fitting)
      }
      shapes.push(pattern)
      filled += patternBeats(pattern)
    }
  } else {
    shapes.push(...basicShapes(level, rng.pick(pool), rng))
  }
  return buildBar(shapes, hasTies(level) ? rng : undefined)
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
  const bars = isMixed(level)
    ? Array.from({ length: barCount }, () => generateBarRhythm(level, rng))
    : climbingBars(level, barCount, rng)
  if (hasTies(level)) applyBarTies(bars, rng)
  return bars
}

function climbingBars(level: Level, barCount: number, rng: Rng): BarEvent[][] {
  const pool = patternsFor(level)
  const climbing = Math.ceil((barCount * 2) / 3)
  return Array.from({ length: barCount }, (_, bar) => {
    const pattern =
      bar < climbing ? pool[Math.floor((bar * pool.length) / climbing)] : rng.pick(pool)
    return buildBar(basicShapes(level, pattern, rng))
  })
}

/** How often a bar that ends off the beat is tied into the one after it. */
const BAR_TIE_CHANCE = 0.35

/**
 * Tie the last note of a bar into the first of the next.
 *
 * This is the anticipation a jazz line lives on: the next bar arrives an
 * eighth early, over the last of the bar before it. The rule is the one the
 * ties inside a bar follow — only a note that starts off the beat qualifies,
 * since tying one that starts on the beat spells a longer note rather than a
 * syncopation. The last bar is left alone; there is nothing after it.
 */
function applyBarTies(bars: BarEvent[][], rng: Rng): void {
  for (let i = 0; i < bars.length - 1; i++) {
    const events = bars[i]
    const last = events[events.length - 1]
    const next = bars[i + 1][0]
    if (last.rest || next.rest) continue
    if (last.tuplet !== undefined || next.tuplet !== undefined) continue
    if (last.ticks >= TICKS_PER_BEAT) continue
    if (last.start % TICKS_PER_BEAT === 0) continue
    if (!rng.chance(BAR_TIE_CHANCE)) continue
    last.tie = true
  }
}

function buildBar(shapes: BeatPattern[], tieRng?: Rng): BarEvent[] {
  const events: BarEvent[] = []
  let start = 0
  let beat = 0
  for (const pattern of shapes) {
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
    beat += patternBeats(pattern)
  }

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

/**
 * The length of the figure a bar repeats, in ticks, or null where it repeats
 * nothing.
 *
 * Through the basics a bar is built to say the same thing more than once: one
 * shape laid down until the bar is full at levels 1 and 2, and a two-beat cell
 * played twice from level 3. Reading that length back off the bar is what lets
 * the pitches repeat with it. The mixed levels draw their beats one at a time,
 * so they mostly repeat nothing and come back null.
 */
export function repeatPeriod(events: BarEvent[]): number | null {
  for (const period of [TICKS_PER_BEAT, TICKS_PER_BEAT * 2]) {
    const first = signature(events, 0, period)
    if (first === '') continue
    let repeats = true
    for (let start = period; start < TICKS_PER_BAR; start += period) {
      if (signature(events, start, period) !== first) {
        repeats = false
        break
      }
    }
    if (repeats) return period
  }
  return null
}

/** One slice of a bar written out, so two slices can be compared in one go. */
function signature(events: BarEvent[], from: number, length: number): string {
  return events
    .filter((e) => e.start >= from && e.start < from + length)
    .map((e) => `${e.start - from}:${e.ticks}:${e.rest ? 'r' : 'n'}${e.tie ? 't' : ''}`)
    .join('|')
}

export function totalTicks(events: BarEvent[]): number {
  return events.reduce((sum, e) => sum + e.ticks, 0)
}
