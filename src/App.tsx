import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Level } from './music/rhythm'
import type { ActiveNote } from './components/Score'
import type { SwingId } from './audio/schedule'
import { generateExercise } from './music/exercise'
import { PROGRESSIONS } from './music/progression'
import { KEYS } from './music/pitch'
import { SWING_SETTINGS, swingRatio } from './audio/schedule'
import { Player } from './audio/player'
import { Score } from './components/Score'
import './App.css'

const LEVELS: Level[] = [1, 2, 3, 4]

const randomSeed = () => Math.floor(Math.random() * 1_000_000)

export default function App() {
  const [keyName, setKeyName] = useState('Bb')
  const [progressionId, setProgressionId] = useState('blues')
  const [level, setLevel] = useState<Level>(2)
  const [seed, setSeed] = useState(randomSeed)

  const [bpm, setBpm] = useState(60)
  // Deep by default: at the slow tempo this page starts at, that is the ratio
  // jazz players actually land on.
  const [swing, setSwing] = useState<SwingId>('deep')
  const [countIn, setCountIn] = useState(true)
  const [playBass, setPlayBass] = useState(true)
  const [playMelody, setPlayMelody] = useState(true)

  const [playing, setPlaying] = useState(false)
  const [activeBass, setActiveBass] = useState<ActiveNote | null>(null)
  const [activeMelody, setActiveMelody] = useState<ActiveNote | null>(null)

  const exercise = useMemo(
    () => generateExercise({ keyName, progressionId, level, seed }),
    [keyName, progressionId, level, seed],
  )

  const playerRef = useRef<Player | null>(null)
  if (playerRef.current === null) playerRef.current = new Player()
  const player = playerRef.current

  const clearHighlight = useCallback(() => {
    setActiveBass(null)
    setActiveMelody(null)
  }, [])

  const play = useCallback(async () => {
    await player.start(exercise, {
      bpm,
      swing: swingRatio(swing),
      countIn,
      muteBass: !playBass,
      muteMelody: !playMelody,
      onNote: (part, barIndex, index) => {
        const note = { barIndex, index }
        if (part === 'bass') setActiveBass(note)
        else setActiveMelody(note)
      },
      onStop: () => {
        setPlaying(false)
        clearHighlight()
      },
    })
    setPlaying(true)
  }, [
    player,
    exercise,
    bpm,
    swing,
    countIn,
    playBass,
    playMelody,
    clearHighlight,
  ])

  const stop = useCallback(() => {
    player.stop()
    setPlaying(false)
    clearHighlight()
  }, [player, clearHighlight])

  // Tempo and mutes take effect without interrupting playback.
  useEffect(() => player.setBpm(bpm), [player, bpm])
  useEffect(() => player.setMutes(!playBass, !playMelody), [player, playBass, playMelody])

  // These change how the whole thing is scheduled, so they need a restart.
  useEffect(() => {
    if (!player.isPlaying) return
    void play()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swing, countIn, exercise])

  useEffect(() => () => player.stop(), [player])

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

      <div className="controls">
        <button type="button" className="play" onClick={() => (playing ? stop() : void play())}>
          {playing ? 'Stop' : 'Play'}
        </button>

        <label>
          Tempo
          <input
            type="range"
            min={40}
            max={240}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
          />
          <span className="bpm">{bpm}</span>
        </label>

        <label>
          Swing
          <select value={swing} onChange={(e) => setSwing(e.target.value as SwingId)}>
            {SWING_SETTINGS.map((setting) => (
              <option key={setting.id} value={setting.id}>
                {setting.label}
              </option>
            ))}
          </select>
        </label>

        <label className="check">
          <input type="checkbox" checked={countIn} onChange={(e) => setCountIn(e.target.checked)} />
          Count-in
        </label>


        <label className="check">
          <input
            type="checkbox"
            checked={playBass}
            onChange={(e) => setPlayBass(e.target.checked)}
          />
          Bass
        </label>

        <label className="check">
          <input
            type="checkbox"
            checked={playMelody}
            onChange={(e) => setPlayMelody(e.target.checked)}
          />
          Melody
        </label>
      </div>

      <Score exercise={exercise} activeBass={activeBass} activeMelody={activeMelody} />

      <p className="note">
        Left: the beat, in quarter notes. Right: the same beats, split. Both staves are guitar
        notation, sounding one octave lower than written.
      </p>
    </main>
  )
}
