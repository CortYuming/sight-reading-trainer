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

/** Bass notes are walked, not held: a touch short of the next beat. */
const BASS_DURATION = 0.9

/** A sliver of silence between notes so repeated pitches are re-articulated. */
const ARTICULATION = 0.92

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

function beatsAt(ticks: number, ratio: number): number {
  return swingTicks(ticks, ratio) / TICKS_PER_BEAT
}

/**
 * Turn an exercise into a flat list of notes to play.
 *
 * Tied notes become a single longer note: a tie means "hold", not "play again".
 */
export function scheduleExercise(exercise: Exercise, swing: number): Schedule {
  const notes: ScheduledNote[] = []

  exercise.bars.forEach((bar, barIndex) => {
    const barStart = barIndex * TICKS_PER_BAR

    bar.bass.forEach((pitch, beat) => {
      notes.push({
        time: (barStart + beat * TICKS_PER_BEAT) / TICKS_PER_BEAT,
        duration: BASS_DURATION,
        midi: pitch.midi + SOUNDING_OFFSET,
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

      const start = beatsAt(barStart + event.start, swing)
      const end = beatsAt(barStart + events[last].start + events[last].ticks, swing)
      notes.push({
        time: start,
        duration: Math.max((end - start) * ARTICULATION, 0.05),
        midi: event.spelled.midi + SOUNDING_OFFSET,
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
