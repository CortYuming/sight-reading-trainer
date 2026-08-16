import type { ChordSymbol } from './chord'
import type { MelodyEvent } from './melody'
import type { KeyDef } from './pitch'
import type { Level } from './rhythm'
import type { Progression } from './progression'
import type { SpelledPitch } from './spelling'
import { buildProgression, findProgression } from './progression'
import { createRng } from './random'
import { findKey } from './pitch'
import { generateBarRhythms } from './rhythm'
import { generateBass } from './bass'
import { generateMelody } from './melody'
import { chordScaleSpelling, spellSequence } from './spelling'

export interface SpelledMelodyEvent extends MelodyEvent {
  /** null for a rest. */
  spelled: SpelledPitch | null
}

export interface ExerciseBar {
  chord: ChordSymbol
  /** Four quarter notes. */
  bass: SpelledPitch[]
  melody: SpelledMelodyEvent[]
}

export interface Exercise {
  key: KeyDef
  progression: Progression
  level: Level
  seed: number
  bars: ExerciseBar[]
}

export interface ExerciseOptions {
  keyName: string
  progressionId: string
  level: Level
  seed: number
}

export function generateExercise(options: ExerciseOptions): Exercise {
  const key = findKey(options.keyName)
  const progression = findProgression(options.progressionId)
  const rng = createRng(options.seed)

  const chords = buildProgression(progression, key.root, key.prefer)
  const rhythms = generateBarRhythms(options.level, chords.length, rng)
  const bass = generateBass(chords, rng)
  const melody = generateMelody(rhythms, chords, rng)

  let lastBass: number | null = null
  let lastMelody: number | null = null

  const bars = chords.map((chord, i): ExerciseBar => {
    const scaleMap = chordScaleSpelling(chord, chords[(i + 1) % chords.length], key.prefer)

    const spelledBass = spellSequence(bass[i], scaleMap, key.prefer, lastBass)
    lastBass = bass[i][bass[i].length - 1]

    const spelledMelody = spellSequence(
      melody[i].map((event) => event.midi),
      scaleMap,
      key.prefer,
      lastMelody,
    )
    const sounded = melody[i].filter((event) => event.midi !== null)
    if (sounded.length > 0) lastMelody = sounded[sounded.length - 1].midi

    return {
      chord,
      bass: spelledBass.filter((pitch): pitch is SpelledPitch => pitch !== null),
      melody: melody[i].map((event, j) => ({ ...event, spelled: spelledMelody[j] })),
    }
  })

  return { key, progression, level: options.level, seed: options.seed, bars }
}
