import { useMemo, useState } from 'react'
import type { Level } from './music/rhythm'
import type { MelodyEvent } from './music/melody'
import type { Accidental } from './music/pitch'
import { generateExercise } from './music/exercise'
import { PROGRESSIONS } from './music/progression'
import { KEYS, noteName } from './music/pitch'
import './App.css'

const LEVELS: Level[] = [1, 2, 3, 4]

const randomSeed = () => Math.floor(Math.random() * 1_000_000)

/**
 * Phase 1 shell: the generator is real, the notation is not.
 * Staves arrive in phase 2 — until then the exercise is dumped as text so the
 * musical output can be checked by eye.
 */
export default function App() {
  const [keyName, setKeyName] = useState('Bb')
  const [progressionId, setProgressionId] = useState('ii-v-i')
  const [level, setLevel] = useState<Level>(2)
  const [seed, setSeed] = useState(randomSeed)

  const exercise = useMemo(
    () => generateExercise({ keyName, progressionId, level, seed }),
    [keyName, progressionId, level, seed],
  )

  const prefer = exercise.key.prefer

  return (
    <main className="app">
      <h1>Sight Reading Trainer</h1>

      <div className="controls">
        <label>
          Key
          <select value={keyName} onChange={(e) => setKeyName(e.target.value)}>
            {KEYS.map((k) => (
              <option key={k.name} value={k.name}>
                {k.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Progression
          <select value={progressionId} onChange={(e) => setProgressionId(e.target.value)}>
            {PROGRESSIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Level
          <select value={level} onChange={(e) => setLevel(Number(e.target.value) as Level)}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <button type="button" onClick={() => setSeed(randomSeed())}>
          New exercise
        </button>

        <span className="seed">seed {exercise.seed}</span>
      </div>

      <table className="dump">
        <thead>
          <tr>
            <th>#</th>
            <th>Chord</th>
            <th>Bass (strings 6-4)</th>
            <th>Melody (strings 3-1)</th>
          </tr>
        </thead>
        <tbody>
          {exercise.bars.map((bar, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{bar.chord.label}</td>
              <td className="mono">{bar.bass.map((midi) => noteName(midi, prefer)).join(' ')}</td>
              <td className="mono">
                {bar.melody.map((event) => describeEvent(event, prefer)).join(' ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="note">
        Written pitch — guitar notation sounds one octave lower. Melody is shown as
        duration:pitch, where <code>r</code> is a rest, <code>~</code> a tie and <code>t</code> a
        triplet.
      </p>
    </main>
  )
}

/** e.g. "8:Db5~", "16r", "8t:F5" */
function describeEvent(event: MelodyEvent, prefer: Accidental): string {
  const duration = event.dur + '.'.repeat(event.dots) + (event.triplet !== undefined ? 't' : '')
  if (event.rest) return `${duration}r`
  const pitch = event.midi === null ? '?' : noteName(event.midi, prefer)
  return `${duration}:${pitch}${event.tie ? '~' : ''}`
}
