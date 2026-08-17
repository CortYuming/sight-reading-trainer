import type { Exercise } from '../music/exercise'
import { SOUNDING_OFFSET } from '../music/pitch'
import { TICKS_PER_BAR, TICKS_PER_BEAT } from '../music/rhythm'

export type Part = 'bass' | 'melody'

export interface ScheduledNote {
  /** Position from the start of the exercise, in quarter-note beats. */
  time: number
  /** Sounding length, in beats. */
  duration: number
  /** Sounding pitch: guitar notation sounds an octave below what is written. */
  midi: number
  /** How hard to play it, 0 to 1. */
  velocity: number
  part: Part
  barIndex: number
  /** Index within the bar: the beat for bass, the event for melody. */
  index: number
}

export interface Schedule {
  notes: ScheduledNote[]
  /** Length of the exercise in beats. */
  beats: number
}

/** Straight eighths. */
export const STRAIGHT = 0.5

/** Where the off-beat lands in a swung beat: two thirds of the way through. */
export const FULL_SWING = 2 / 3

/**
 * How far into the beat the off-beat eighth falls.
 *
 * Measurements of jazz drummers (Friberg & Sundström) put the ratio near 3.5:1
 * at slow tempos and close to 1:1 above 250bpm, with the notated 2:1 triplet
 * feel sitting somewhere in the middle. Reading practice wants that middle:
 * the triplet feel is what the notation implies, and it is unambiguous.
 */
export const SWING_SETTINGS = [
  { id: 'straight', label: 'Straight', ratio: STRAIGHT },
  { id: 'light', label: 'Light', ratio: 0.6 },
  { id: 'medium', label: 'Medium', ratio: FULL_SWING },
  { id: 'deep', label: 'Deep', ratio: 0.75 },
] as const

export type SwingId = (typeof SWING_SETTINGS)[number]['id']

export function swingRatio(id: SwingId): number {
  return SWING_SETTINGS.find((s) => s.id === id)?.ratio ?? FULL_SWING
}

/** Bass notes are walked, not held: a touch short of the next beat. */
const BASS_DURATION = 0.9

/** The three weights: an accented note, an ordinary one, one played under. */
const ACCENT = 1
const PLAIN = 0.78
const SOFT = 0.55

/**
 * How hard a melody note is played.
 *
 * Jazz eighths lean on the off-beat rather than the downbeat — weighting the
 * beat instead makes a line march. And only the eighths are weighted at all: a
 * sextuplet or a run of sixteenths has nothing metric to lean on, so it comes
 * out even and takes its shape from the contour of the line, which is what a
 * player does with it. The bass walks at one weight throughout.
 */
function melodyVelocity(startTicks: number, ticks: number, swung: Set<number>): number {
  if (swung.has(startTicks)) return ACCENT
  const half = TICKS_PER_BEAT / 2
  if (ticks === half && startTicks % TICKS_PER_BEAT === 0) return SOFT
  return PLAIN
}

/**
 * Delay the off-beat eighth by the swing ratio. Everything else — sixteenths,
 * triplets, the beats themselves — stays where it is written, which is what a
 * player actually does with a swung line.
 */
export function swingTicks(ticks: number, ratio: number): number {
  const beat = Math.floor(ticks / TICKS_PER_BEAT)
  const within = ticks - beat * TICKS_PER_BEAT
  if (within !== TICKS_PER_BEAT / 2) return ticks
  return beat * TICKS_PER_BEAT + ratio * TICKS_PER_BEAT
}

/**
 * Which half-beats actually carry an off-beat eighth.
 *
 * Only those move. A beat filled with sixteenths has a note sitting on the
 * half-beat too, and swinging that one would shove it into the sixteenth that
 * follows — four even notes would come out as three.
 */
function swungTicks(exercise: Exercise): Set<number> {
  const half = TICKS_PER_BEAT / 2
  const positions = new Set<number>()
  exercise.bars.forEach((bar, barIndex) => {
    const barStart = barIndex * TICKS_PER_BAR
    for (const event of bar.melody) {
      if (event.tuplet) continue
      if (event.ticks !== half) continue
      if (event.start % TICKS_PER_BEAT !== half) continue
      positions.add(barStart + event.start)
    }
  })
  return positions
}

function beatsAt(ticks: number, ratio: number, swung: Set<number>): number {
  return (swung.has(ticks) ? swingTicks(ticks, ratio) : ticks) / TICKS_PER_BEAT
}

/**
 * Turn an exercise into a flat list of notes to play.
 *
 * Tied notes become a single longer note: a tie means "hold", not "play again".
 */
export function scheduleExercise(exercise: Exercise, swing: number): Schedule {
  const notes: ScheduledNote[] = []
  const swung = swungTicks(exercise)

  exercise.bars.forEach((bar, barIndex) => {
    const barStart = barIndex * TICKS_PER_BAR

    bar.bass.forEach((pitch, beat) => {
      notes.push({
        time: (barStart + beat * TICKS_PER_BEAT) / TICKS_PER_BEAT,
        duration: BASS_DURATION,
        midi: pitch.midi + SOUNDING_OFFSET,
        velocity: ACCENT,
        part: 'bass',
        barIndex,
        index: beat,
      })
    })

    const events = bar.melody
    let i = 0
    while (i < events.length) {
      const event = events[i]
      if (event.rest || event.spelled === null) {
        i++
        continue
      }

      let last = i
      while (events[last].tie && last + 1 < events.length) last++

      const start = beatsAt(barStart + event.start, swing, swung)
      const end = beatsAt(barStart + events[last].start + events[last].ticks, swing, swung)
      notes.push({
        time: start,
        // Right up to the next note, with no gap left in front of it. A gap
        // made every note a separate blip and a run a row of them. The cost is
        // that two of the same pitch in a row are now told apart by the
        // envelope retriggering rather than by silence between them.
        duration: Math.max(end - start, 0.05),
        midi: event.spelled.midi + SOUNDING_OFFSET,
        velocity: melodyVelocity(barStart + event.start, event.ticks, swung),
        part: 'melody',
        barIndex,
        index: i,
      })
      i = last + 1
    }
  })

  notes.sort((a, b) => a.time - b.time)
  return { notes, beats: exercise.bars.length * 4 }
}
