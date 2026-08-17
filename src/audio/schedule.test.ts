import { describe, expect, it } from 'vitest'
import { LEVELS, TICKS_PER_BEAT } from '../music/rhythm'
import { generateExercise } from '../music/exercise'
import { KEYS } from '../music/pitch'
import { PROGRESSIONS } from '../music/progression'
import { SOUNDING_OFFSET } from '../music/pitch'
import { FULL_SWING, STRAIGHT, scheduleExercise, swingTicks } from './schedule'


describe('sixteenths under swing', () => {
  it('keeps four sixteenths evenly spaced', () => {
    // Level 1 is the only pool with a bar of plain sixteenths, and swinging
    // the note on the half-beat would drop it onto the one after it.
    const exercise = generateExercise({
      keyName: 'Bb',
      progressionId: 'blues',
      level: 1,
      seed: 11,
    })
    const bar = exercise.bars.findIndex((b) => b.melody.length === 16)
    expect(bar).toBeGreaterThanOrEqual(0)
    const times = scheduleExercise(exercise, 0.75)
      .notes.filter((n) => n.part === 'melody' && n.barIndex === bar)
      .map((n) => n.time)
    expect(times).toHaveLength(16)
    for (let i = 1; i < times.length; i++) {
      expect(times[i] - times[i - 1]).toBeCloseTo(0.25)
    }
  })
})

describe('a run of sixteenths', () => {
  const exercise = generateExercise({
    keyName: 'Bb',
    progressionId: 'blues',
    level: 1,
    seed: 11,
  })
  const bar = exercise.bars.findIndex((b) => b.melody.length === 16)
  const run = scheduleExercise(exercise, FULL_SWING).notes.filter(
    (n) => n.part === 'melody' && n.barIndex === bar,
  )

  it('joins the notes up with nothing between them', () => {
    expect(run).toHaveLength(16)
    for (let i = 1; i < run.length; i++) {
      expect(run[i - 1].time + run[i - 1].duration).toBeCloseTo(run[i].time)
    }
  })

  it('plays them all at one weight', () => {
    expect(new Set(run.map((n) => n.velocity)).size).toBe(1)
  })
})

describe('swingTicks', () => {
  it('leaves everything alone when straight', () => {
    for (const ticks of [0, 3, 6, 9, 12, 18]) {
      expect(swingTicks(ticks, STRAIGHT)).toBe(ticks)
    }
  })

  it('delays the off-beat eighth and nothing else', () => {
    expect(swingTicks(6, FULL_SWING)).toBeCloseTo(8)
    expect(swingTicks(18, FULL_SWING)).toBeCloseTo(20)
    expect(swingTicks(0, FULL_SWING)).toBe(0)
    expect(swingTicks(12, FULL_SWING)).toBe(12)
    expect(swingTicks(3, FULL_SWING)).toBe(3)
    expect(swingTicks(9, FULL_SWING)).toBe(9)
    // Triplet eighths are already where a swung line puts them.
    expect(swingTicks(4, FULL_SWING)).toBe(4)
    expect(swingTicks(8, FULL_SWING)).toBe(8)
  })
})

describe('scheduleExercise', () => {
  const exercise = generateExercise({
    keyName: 'Bb',
    progressionId: 'ii-v-i',
    level: 3,
    seed: 21,
  })

  it('measures the exercise in beats', () => {
    expect(scheduleExercise(exercise, STRAIGHT).beats).toBe(exercise.bars.length * 4)
  })

  it('walks the bass on every beat', () => {
    const bass = scheduleExercise(exercise, STRAIGHT).notes.filter((n) => n.part === 'bass')
    expect(bass).toHaveLength(exercise.bars.length * 4)
    bass.forEach((note, i) => expect(note.time).toBe(i))
  })

  it('sounds an octave below the written pitch', () => {
    const schedule = scheduleExercise(exercise, STRAIGHT)
    const first = schedule.notes.find((n) => n.part === 'bass')
    expect(first?.midi).toBe(exercise.bars[0].bass[0].midi + SOUNDING_OFFSET)
    expect(SOUNDING_OFFSET).toBe(-12)
  })

  it('walks the bass at one weight', () => {
    const bass = scheduleExercise(exercise, FULL_SWING).notes.filter((n) => n.part === 'bass')
    expect(new Set(bass.map((n) => n.velocity))).toEqual(new Set([1]))
  })

  it('leans on the off-beat eighth, not on its partner on the beat', () => {
    const half = TICKS_PER_BEAT / 2
    const melody = scheduleExercise(exercise, FULL_SWING).notes.filter((n) => n.part === 'melody')
    const at = (barIndex: number, index: number) =>
      melody.find((n) => n.barIndex === barIndex && n.index === index)

    // Off-beat eighths have to be picked out of the exercise rather than off
    // the clock: the last note of a triplet lands at the same moment without
    // being the note a swung line leans on.
    let checked = 0
    exercise.bars.forEach((bar, barIndex) => {
      bar.melody.forEach((event, index) => {
        if (event.tuplet || event.rest) return
        if (event.ticks !== half || event.start % TICKS_PER_BEAT !== half) return
        const note = at(barIndex, index)
        // A note tied into from the one before is never attacked on its own.
        if (note === undefined) return

        checked++
        expect(note.velocity).toBe(1)
        const opener = bar.melody.findIndex(
          (e) => e.start === event.start - half && e.ticks === half && !e.rest,
        )
        if (opener !== -1) {
          const partner = at(barIndex, opener)
          if (partner) expect(partner.velocity).toBeLessThan(note.velocity)
        }
      })
    })
    expect(checked).toBeGreaterThan(0)
  })

  it('plays a tied pair as one held note', () => {
    for (const key of KEYS) {
      for (let seed = 1; seed <= 20; seed++) {
        const tied = generateExercise({
          keyName: key.name,
          progressionId: 'blues',
          level: 3,
          seed,
        })
        const schedule = scheduleExercise(tied, STRAIGHT)
        tied.bars.forEach((bar, barIndex) => {
          bar.melody.forEach((event, index) => {
            if (!event.tie) return
            // The second half of the tie must not be attacked on its own.
            const attacks = schedule.notes.filter(
              (n) => n.part === 'melody' && n.barIndex === barIndex && n.index === index + 1,
            )
            expect(attacks).toHaveLength(0)
          })
        })
      }
    }
  })

  it('never overlaps two notes of the same part', () => {
    for (const level of LEVELS) {
      for (const progression of PROGRESSIONS) {
        const ex = generateExercise({
          keyName: 'F',
          progressionId: progression.id,
          level,
          seed: 404,
        })
        for (const swing of [STRAIGHT, FULL_SWING]) {
          const { notes } = scheduleExercise(ex, swing)
          for (const part of ['bass', 'melody'] as const) {
            const line = notes.filter((n) => n.part === part)
            for (let i = 1; i < line.length; i++) {
              const previousEnd = line[i - 1].time + line[i - 1].duration
              expect(previousEnd).toBeLessThanOrEqual(line[i].time + 1e-9)
            }
          }
        }
      }
    }
  })

  it('keeps every note inside the exercise', () => {
    const { notes, beats } = scheduleExercise(exercise, FULL_SWING)
    for (const note of notes) {
      expect(note.time).toBeGreaterThanOrEqual(0)
      expect(note.time + note.duration).toBeLessThanOrEqual(beats + 1e-9)
    }
  })

  it('is ordered by time', () => {
    const { notes } = scheduleExercise(exercise, FULL_SWING)
    for (let i = 1; i < notes.length; i++) {
      expect(notes[i].time).toBeGreaterThanOrEqual(notes[i - 1].time)
    }
  })
})
