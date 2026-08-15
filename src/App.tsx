import { useEffect, useMemo, useState } from 'react'
import type { Level } from './music/rhythm'
import type { Theme } from './theme'
import { generateExercise } from './music/exercise'
import { PROGRESSIONS } from './music/progression'
import { KEYS } from './music/pitch'
import { Score } from './components/Score'
import { THEMES, applyTheme, isTheme, loadTheme, saveTheme } from './theme'
import './App.css'

const LEVELS: Level[] = [1, 2, 3, 4]

const THEME_LABELS: Record<Theme, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
}

const randomSeed = () => Math.floor(Math.random() * 1_000_000)

export default function App() {
  const [keyName, setKeyName] = useState('Bb')
  const [progressionId, setProgressionId] = useState('blues')
  const [level, setLevel] = useState<Level>(2)
  const [seed, setSeed] = useState(randomSeed)
  const [theme, setTheme] = useState<Theme>(() => loadTheme(localStorage))

  useEffect(() => {
    applyTheme(document.documentElement, theme)
    saveTheme(localStorage, theme)
  }, [theme])

  const exercise = useMemo(
    () => generateExercise({ keyName, progressionId, level, seed }),
    [keyName, progressionId, level, seed],
  )

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

        <label>
          Theme
          <select
            value={theme}
            onChange={(e) => setTheme(isTheme(e.target.value) ? e.target.value : 'system')}
          >
            {THEMES.map((t) => (
              <option key={t} value={t}>
                {THEME_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        <button type="button" onClick={() => setSeed(randomSeed())}>
          New exercise
        </button>

        <span className="seed">seed {exercise.seed}</span>
      </div>

      <Score exercise={exercise} />

      <p className="note">
        Left: the beat, in quarter notes. Right: the same beats, split. Both staves are guitar
        notation, sounding one octave lower than written.
      </p>
    </main>
  )
}
