import type { ChordSymbol } from './chord'
import type { MelodyEvent } from './melody'
import type { KeyDef } from './pitch'
import type { Level } from './rhythm'
import type { Progression } from './progression'
import { buildProgression, findProgression } from './progression'
import { createRng } from './random'
import { findKey } from './pitch'
import { generateBarRhythm } from './rhythm'
import { generateBass } from './bass'
import { generateMelody } from './melody'

export interface ExerciseBar {
  chord: ChordSymbol
  /** Four quarter notes, as written MIDI pitches. */
  bass: number[]
  melody: MelodyEvent[]
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
  const rhythms = chords.map(() => generateBarRhythm(options.level, rng))
  const bass = generateBass(chords, rng)
  const melody = generateMelody(rhythms, chords, rng)

  return {
    key,
    progression,
    level: options.level,
    seed: options.seed,
    bars: chords.map((chord, i) => ({ chord, bass: bass[i], melody: melody[i] })),
  }
}
