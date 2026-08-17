import type { ChordSymbol } from './chord'
import type { Level } from './rhythm'
import { scalePitchClasses } from './chord'
import { MELODY_RANGE, pitchClass, pitchesWithClass } from './pitch'

/**
 * A melodic shape, after Jerry Bergonzi: a small cell of notes given as scale
 * degrees counted from the chord's root, in the order they are played.
 *
 * Nothing says which way a step goes — the degrees do. 1-3-5 climbs, 5-3-1
 * falls, and the eight note line 1-3-5-7-4-3-6-5 turns downward at the 4
 * without being told to. See docs/melodic-shapes.md for where these come from.
 */
export interface Shape {
  id: string
  degrees: number[]
  /**
   * How far the degrees move each time the shape comes round again. Without it
   * a repeated shape would circle the same few notes: page 20 of the book
   * sequences its eight note line up a fourth every time, and the three note
   * shapes are practised from each degree of the scale in turn.
   */
  sequence: number
}

/**
 * The three note shapes, a group to a direction, transcribed from every staff
 * of pages 4-7.
 *
 * A direction is several shapes rather than one, because what the book fixes
 * is which way a step goes and not how far. An up-up is a triad in one bar and
 * a scale run in the next; a down-up drops a third and comes back a fourth,
 * fifth or second. Reading page 4 alone suggested the shapes were triads and
 * nothing else, and what was built on that was wrong in three of the four
 * directions.
 *
 * Each repetition moves on by a degree, which is how the shapes are drilled —
 * the same figure from every note of the scale. Where a shape ends one degree
 * above where it began, it moves on by two instead, or the next cell would
 * start on the note the last one finished.
 */
const UP_UP: readonly Shape[] = [
  { id: 'up-up', degrees: [1, 2, 3], sequence: 1 },
  { id: 'up-up', degrees: [1, 3, 5], sequence: 1 },
  { id: 'up-up', degrees: [1, 4, 5], sequence: 1 },
]
const UP_DOWN: readonly Shape[] = [
  { id: 'up-down', degrees: [1, 2, 1], sequence: 1 },
  { id: 'up-down', degrees: [1, 3, 1], sequence: 1 },
  // Up, then past where it started rather than back to it.
  { id: 'up-down', degrees: [3, 4, 1], sequence: 1 },
]
const DOWN_DOWN: readonly Shape[] = [
  { id: 'down-down', degrees: [3, 2, 1], sequence: 1 },
  { id: 'down-down', degrees: [5, 3, 1], sequence: 1 },
]
const DOWN_UP: readonly Shape[] = [
  { id: 'down-up', degrees: [2, 1, 3], sequence: 2 },
  { id: 'down-up', degrees: [3, 1, 4], sequence: 2 },
  { id: 'down-up', degrees: [3, 1, 5], sequence: 1 },
]

/**
 * One direction per level, then the four of them together — which is how the
 * book teaches them, an exercise per direction, and how this app already works:
 * a level brings only its own shapes, and mixing is what the level above is
 * for.
 */
const SHAPES_BY_LEVEL: Partial<Record<Level, readonly Shape[]>> = {
  11: UP_UP,
  12: UP_DOWN,
  13: DOWN_DOWN,
  14: DOWN_UP,
  15: [...UP_UP, ...UP_DOWN, ...DOWN_DOWN, ...DOWN_UP],
}

/** The shapes a level draws from, or null if it draws pitches one at a time. */
export function shapesFor(level: Level): readonly Shape[] | null {
  return SHAPES_BY_LEVEL[level] ?? null
}

/**
 * What a shape level is, for the level menu. The rhythm levels are numbers
 * because a number is all they are, but a shape level is a named figure to
 * practise, and the name is what tells the reader what to expect.
 */
export function shapeSummary(level: Level): string {
  const shapes = shapesFor(level)
  if (!shapes) return ''
  const lengths = new Set(shapes.map((s) => s.degrees.length))
  const size = lengths.size === 1 ? `${shapes[0].degrees.length} note` : 'mixed'
  // A direction holds several shapes; the menu wants the direction, once.
  return `${size}: ${[...new Set(shapes.map((s) => s.id))].join(', ')}`
}

const HOME = Math.round((MELODY_RANGE.min + MELODY_RANGE.max) / 2)

/**
 * Sound a shape over one chord.
 *
 * The shape is measured out first as intervals from its own first note, and
 * only then placed. That order matters: the guitar's melody range is an octave
 * and a half, and a cell laid down note by note runs off the top and has to
 * come back an octave lower part-way through, which reads as a leap that is not
 * in the music. Placed whole, the figure either fits somewhere or does not.
 *
 * Of the places it fits, it takes the one nearest to where the line already is,
 * so a shape is entered from whichever of its notes is closest — that is what
 * turns 1-3-5 into a triad in inversion, and what runs one cell into the next.
 */
export function realiseShape(
  shape: Shape,
  chord: ChordSymbol,
  nextChord: ChordSymbol | undefined,
  previous: number | null,
  offset = 0,
): number[] {
  const laid = layout(shape, chord, nextChord, offset)
  const places = placesFor(laid)
  const candidates = places.length > 0 ? places : pitchesWithClass(laid.pc, MELODY_RANGE)
  const target = previous ?? HOME
  const first = candidates.reduce(
    (best, c) => (Math.abs(c - target) < Math.abs(best - target) ? c : best),
    candidates[0],
  )
  const pitches = laid.spans.map((span) => first + span)
  return pitches.every(inRange) ? pitches : pitches.map(fold)
}

/**
 * Whether the shape has anywhere in the range to sit at this offset.
 *
 * Some do not. The range is an octave and a half, so a figure that climbs a
 * fifth from a degree that only appears once near the top has nowhere to go —
 * F5 is the only F, and a third above the third above it is off the end. The
 * caller's job is to move on to the next offset rather than let the figure be
 * placed anyway and folded into a shape it is not.
 */
export function shapeFits(
  shape: Shape,
  chord: ChordSymbol,
  nextChord: ChordSymbol | undefined,
  offset = 0,
): boolean {
  return placesFor(layout(shape, chord, nextChord, offset)).length > 0
}

interface Layout {
  /** Pitch class of the shape's first note. */
  pc: number
  /** Semitones of each note from the first. */
  spans: number[]
}

function layout(
  shape: Shape,
  chord: ChordSymbol,
  nextChord: ChordSymbol | undefined,
  offset: number,
): Layout {
  const scale = scalePitchClasses(chord, nextChord)
  const classOf = (degree: number): number => {
    const index = degree - 1 + offset
    return scale[((index % scale.length) + scale.length) % scale.length]
  }

  const spans = [0]
  for (let i = 1; i < shape.degrees.length; i++) {
    const direction = Math.sign(shape.degrees[i] - shape.degrees[i - 1])
    const from = classOf(shape.degrees[i - 1])
    const to = classOf(shape.degrees[i])
    spans.push(spans[i - 1] + gap(from, to, direction))
  }
  return { pc: classOf(shape.degrees[0]), spans }
}

/** Every first note that leaves the whole shape inside the range. */
function placesFor({ pc, spans }: Layout): number[] {
  return pitchesWithClass(pc, {
    min: MELODY_RANGE.min - Math.min(...spans),
    max: MELODY_RANGE.max - Math.max(...spans),
  })
}

/** Semitones from one pitch class to the next going the given way. */
function gap(from: number, to: number, direction: number): number {
  if (direction === 0) return 0
  const distance = direction > 0 ? pitchClass(to - from) : pitchClass(from - to)
  // Same class, so the shape asked for the octave rather than for no move.
  return direction * (distance === 0 ? 12 : distance)
}

const inRange = (midi: number): boolean =>
  midi >= MELODY_RANGE.min && midi <= MELODY_RANGE.max

function fold(midi: number): number {
  let m = midi
  while (m > MELODY_RANGE.max) m -= 12
  while (m < MELODY_RANGE.min) m += 12
  return m
}
