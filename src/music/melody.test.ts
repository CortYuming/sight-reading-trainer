import { describe, expect, it } from 'vitest'
import type { BarEvent, Level } from './rhythm'
import type { MelodyEvent } from './melody'
import { generateMelody } from './melody'
import { generateBarRhythms, TICKS_PER_BEAT, repeatPeriod } from './rhythm'
import { buildProgression, PROGRESSIONS } from './progression'
import { chordTonePitchClasses, scalePitchClasses } from './chord'
import { KEYS, MELODY_RANGE, pitchClass } from './pitch'
import { createRng } from './random'

const SEEDS = Array.from({ length: 20 }, (_, i) => i * 11 + 5)

function build(level: Level, seed: number, progressionIndex = 0, keyIndex = 0) {
  const key = KEYS[keyIndex]
  const chords = buildProgression(PROGRESSIONS[progressionIndex], key.root, key.prefer)
  const rng = createRng(seed)
  const rhythms = generateBarRhythms(level, chords.length, rng)
  return { chords, rhythms, melody: generateMelody(rhythms, chords, level, rng) }
}

/** The sounding pitches of one go round a repeating figure. */
const round = (bar: MelodyEvent[], period: number, index: number): number[] =>
  bar
    .filter((e) => e.midi !== null && e.start >= index * period && e.start < (index + 1) * period)
    .map((e) => e.midi as number)

/** Which way a line moves at each step: the shape of it, without the pitches. */
const contour = (line: number[]): string =>
  line
    .slice(1)
    .map((midi, i) => Math.sign(midi - line[i]))
    .join(',')

describe('generateMelody', () => {
  it('gives every sounding event a pitch and every rest none', () => {
    for (const seed of SEEDS) {
      const { melody } = build(4, seed)
      for (const bar of melody) {
        for (const event of bar) {
          if (event.rest) expect(event.midi).toBeNull()
          else expect(event.midi).not.toBeNull()
        }
      }
    }
  })

  it('stays inside the guitar melody range', () => {
    for (const level of [1, 2, 3, 4] as Level[]) {
      for (const seed of SEEDS) {
        const { melody } = build(level, seed)
        for (const event of melody.flat()) {
          if (event.midi === null) continue
          expect(event.midi).toBeGreaterThanOrEqual(MELODY_RANGE.min)
          expect(event.midi).toBeLessThanOrEqual(MELODY_RANGE.max)
        }
      }
    }
  })

  // The generator no longer writes ties, but the melody still honours them,
  // so the rhythm is handed in by hand here.
  it('holds the same pitch across a tie', () => {
    const key = KEYS[0]
    const chords = buildProgression(PROGRESSIONS[0], key.root, key.prefer)
    const tied: BarEvent[] = [
      { dur: '8', dots: 0, ticks: 6, rest: false, start: 0, tie: false },
      { dur: '8', dots: 0, ticks: 6, rest: false, start: 6, tie: true },
      { dur: '8', dots: 0, ticks: 6, rest: false, start: 12, tie: false },
      { dur: '8', dots: 0, ticks: 6, rest: false, start: 18, tie: false },
      { dur: 'q', dots: 0, ticks: 12, rest: false, start: 24, tie: false },
      { dur: 'q', dots: 0, ticks: 12, rest: false, start: 36, tie: false },
    ]
    const rhythms = chords.map(() => tied.map((event) => ({ ...event })))
    const melody = generateMelody(rhythms, chords, 10, createRng(7))
    let tiesSeen = 0
    for (const bar of melody) {
      bar.forEach((event, i) => {
        if (!event.tie) return
        tiesSeen++
        expect(bar[i + 1].midi).toBe(event.midi)
      })
    }
    expect(tiesSeen).toBe(chords.length)
  })

  it('lands on chord tones most of the time on the beat', () => {
    let onBeat = 0
    let chordTones = 0
    for (const seed of SEEDS) {
      for (let p = 0; p < PROGRESSIONS.length; p++) {
        const { chords, melody } = build(3, seed, p)
        melody.forEach((bar, barIndex) => {
          const tones = chordTonePitchClasses(chords[barIndex])
          for (const event of bar) {
            if (event.midi === null) continue
            if (event.start % TICKS_PER_BEAT !== 0) continue
            onBeat++
            if (tones.includes(pitchClass(event.midi))) chordTones++
          }
        })
      }
    }
    expect(onBeat).toBeGreaterThan(100)
    expect(chordTones / onBeat).toBeGreaterThan(0.6)
  })

  it('moves by step or third, and rarely leaps', () => {
    let moves = 0
    let steps = 0
    let stepsOrThirds = 0
    let wideLeaps = 0
    for (const seed of SEEDS) {
      const { melody } = build(3, seed)
      const line = melody
        .flat()
        .map((e) => e.midi)
        .filter((midi): midi is number => midi !== null)
      for (let i = 1; i < line.length; i++) {
        const distance = Math.abs(line[i] - line[i - 1])
        if (distance === 0) continue
        moves++
        if (distance <= 2) steps++
        if (distance <= 4) stepsOrThirds++
        if (distance > 7) wideLeaps++
      }
    }
    expect(moves).toBeGreaterThan(100)
    expect(steps / moves).toBeGreaterThan(0.35)
    expect(stepsOrThirds / moves).toBeGreaterThan(0.7)
    expect(wideLeaps / moves).toBeLessThan(0.05)
  })

  // A bar that repeats a rhythm now repeats a figure with it: the pitches of
  // the first go round are moved a scale degree for each one after, so the bar
  // reads as one figure sequenced rather than as two halves of the same rhythm
  // saying unrelated things. Moving along the scale keeps the shape of the
  // figure, so the run of directions comes back the same — bar the odd one
  // folded back at the end of the range, or bent by a chromatic passing note.
  it('sequences the figure where the rhythm repeats one', () => {
    let matched = 0
    let compared = 0
    for (const level of [1, 3, 4, 6] as Level[]) {
      for (const seed of SEEDS) {
        const { rhythms, melody } = build(level, seed)
        melody.forEach((bar, barIndex) => {
          const period = repeatPeriod(rhythms[barIndex])
          expect(period).not.toBeNull()
          if (period === null) return
          const first = round(bar, period, 0)
          if (first.length < 2) return
          for (let i = 1; i * period < TICKS_PER_BEAT * 4; i++) {
            const next = round(bar, period, i)
            if (next.length !== first.length) continue
            compared++
            if (contour(next) === contour(first)) matched++
            // Sequenced, not repeated in place: a figure said twice on the same
            // pitches would circle a handful of notes and be nothing to read.
            expect(next).not.toEqual(first)
          }
        })
      }
    }
    expect(compared).toBeGreaterThan(200)
    expect(matched / compared).toBeGreaterThan(0.7)
  })

  // Every bar is aimed at the next one: the chord tone it opens on is chosen by
  // the bar before it, the way the walking bass picks its beat 4 from the root
  // that follows.
  it('opens every bar on a chord tone of that bar', () => {
    for (const level of [3, 4, 7, 9] as Level[]) {
      for (const seed of SEEDS) {
        const { chords, melody } = build(level, seed)
        melody.forEach((bar, barIndex) => {
          if (barIndex === 0) return
          const first = bar.find((e) => e.midi !== null)
          if (!first || first.midi === null) return
          expect(chordTonePitchClasses(chords[barIndex])).toContain(pitchClass(first.midi))
        })
      }
    }
  })

  // Where no figure is being sequenced there is a note free to approach with,
  // and the bar leaves on a semitone neighbour of where the next one comes in.
  // Overwriting the last note of a sequenced figure would break it just as it
  // landed, so those bars are aimed rather than rewritten.
  it('approaches the next bar by a semitone where no figure is running', () => {
    let approaches = 0
    for (const level of [7, 8, 9] as Level[]) {
      for (const seed of SEEDS) {
        const { rhythms, melody } = build(level, seed)
        melody.forEach((bar, barIndex) => {
          if (barIndex === melody.length - 1) return
          if (repeatPeriod(rhythms[barIndex]) !== null) return
          const sounding = bar.filter((e) => e.midi !== null && !e.tie)
          const last = sounding[sounding.length - 1]
          const opening = melody[barIndex + 1].find((e) => e.midi !== null)
          if (sounding.length < 2 || !last || !opening) return
          if (last.midi === null || opening.midi === null) return
          approaches++
          expect(Math.abs(last.midi - opening.midi)).toBe(1)
        })
      }
    }
    expect(approaches).toBeGreaterThan(100)
  })

  // A chromatic passing note is what a jazz line is full of and what a reader
  // has to work for, so through the basics it stays rare and stays off the
  // beat. Every accidental there is one of these: nothing else leaves the scale.
  it('leaves the scale rarely, and never on the beat, through the basics', () => {
    let outside = 0
    let sounded = 0
    for (const level of [3, 4, 6] as Level[]) {
      for (const seed of SEEDS) {
        const { chords, melody } = build(level, seed)
        melody.forEach((bar, barIndex) => {
          const scale = scalePitchClasses(chords[barIndex], chords[(barIndex + 1) % chords.length])
          for (const event of bar) {
            if (event.midi === null) continue
            sounded++
            if (scale.includes(pitchClass(event.midi))) continue
            outside++
            expect(event.start % TICKS_PER_BEAT).not.toBe(0)
          }
        })
      }
    }
    expect(sounded).toBeGreaterThan(1000)
    expect(outside).toBeGreaterThan(0)
    expect(outside / sounded).toBeLessThan(0.03)
  })

  it('is reproducible from a seed', () => {
    expect(build(4, 99).melody).toEqual(build(4, 99).melody)
  })

  // A tie across a barline is an anticipation: the coming chord is sounded an
  // eighth before it is due. Holding the current chord's note over instead
  // would land a dissonance on the downbeat as often as not.
  it('anticipates the next chord where a tie crosses a barline', () => {
    let crossings = 0
    for (const level of [10, 11] as Level[]) {
      for (const seed of SEEDS) {
        const { chords, melody } = build(level, seed)
        melody.forEach((bar, i) => {
          const last = bar[bar.length - 1]
          if (!last.tie || last.midi === null) return
          crossings++
          expect(chordTonePitchClasses(chords[i + 1])).toContain(pitchClass(last.midi))
          expect(melody[i + 1][0].midi).toBe(last.midi)
        })
      }
    }
    expect(crossings).toBeGreaterThan(10)
  })
})
