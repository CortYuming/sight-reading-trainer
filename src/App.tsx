import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Level } from './music/rhythm'
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
  const [currentBar, setCurrentBar] = useState(0)
  const [barRepeat, setBarRepeat] = useState(false)
  const [activeBass, setActiveBass] = useState<ActiveNoteState>(null)
  const [activeMelody, setActiveMelody] = useState<ActiveNoteState>(null)

  const exercise = useMemo(
    () => generateExercise({ keyName, progressionId, level, seed }),
    [keyName, progressionId, level, seed],
  )
  const barCount = exercise.bars.length

  const playerRef = useRef<Player | null>(null)
  if (playerRef.current === null) playerRef.current = new Player()
  const player = playerRef.current

  const clearHighlight = useCallback(() => {
    setActiveBass(null)
    setActiveMelody(null)
  }, [])

  // Only an explicit Play counts in. Stepping between bars or turning on the
  // bar repeat should carry straight on from where the reader is looking.
  const play = useCallback(
    async (startBar: number, loopBar: number | null, withCountIn = false) => {
      await player.start(exercise, {
        bpm,
        swing: swingRatio(swing),
        countIn: withCountIn,
        muteBass: !playBass,
        muteMelody: !playMelody,
        startBar,
        loopBar,
        onNote: (part, barIndex, index) => {
          const note = { barIndex, index }
          if (part === 'bass') setActiveBass(note)
          else setActiveMelody(note)
        },
        onBar: setCurrentBar,
        onStop: () => {
          setPlaying(false)
          clearHighlight()
        },
      })
      setPlaying(true)
    },
    [player, exercise, bpm, swing, playBass, playMelody, clearHighlight],
  )

  const stop = useCallback(() => {
    player.stop()
    setPlaying(false)
    clearHighlight()
  }, [player, clearHighlight])

  // Navigation restarts playback at the new bar. A rebuild is cheap, and it
  // keeps one code path for "where does the music start and what loops".
  const goToBar = useCallback(
    (bar: number) => {
      const target = Math.max(0, Math.min(bar, barCount - 1))
      setCurrentBar(target)
      if (player.isPlaying) void play(target, barRepeat ? target : null)
    },
    [barCount, player, play, barRepeat],
  )

  const toggleBarRepeat = useCallback(() => {
    const next = !barRepeat
    setBarRepeat(next)
    if (player.isPlaying) void play(currentBar, next ? currentBar : null)
  }, [barRepeat, player, play, currentBar])

  const toggle = useCallback(() => {
    if (playing) stop()
    else void play(currentBar, barRepeat ? currentBar : null, countIn)
  }, [playing, stop, play, currentBar, barRepeat, countIn])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) return

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          goToBar(currentBar - 1)
          break
        case 'ArrowRight':
          event.preventDefault()
          goToBar(currentBar + 1)
          break
        case 'ArrowUp':
          event.preventDefault()
          toggleBarRepeat()
          break
        case ' ':
          event.preventDefault()
          toggle()
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [currentBar, goToBar, toggleBarRepeat, toggle])

  // Tempo and mutes take effect without interrupting playback.
  useEffect(() => player.setBpm(bpm), [player, bpm])
  useEffect(() => player.setMutes(!playBass, !playMelody), [player, playBass, playMelody])

  // These change how the whole thing is scheduled, so they need a restart.
  useEffect(() => {
    if (!player.isPlaying) return
    void play(currentBar, barRepeat ? currentBar : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swing, exercise])

  useEffect(() => {
    setCurrentBar(0)
  }, [exercise])

  useEffect(() => () => player.stop(), [player])

  return (
    <div className="page">
      <header className="toolbar">
        <div className="toolbar-row">
          <button type="button" className="btn primary" onClick={toggle}>
            {playing ? '■ Stop' : '▶ Play'}
          </button>

          <div className="field tempo">
            <span className="field-label">Tempo</span>
            <input
              type="range"
              min={40}
              max={240}
              value={bpm}
              aria-label="Tempo"
              onChange={(e) => setBpm(Number(e.target.value))}
            />
            <span className="readout">{bpm}</span>
          </div>

          <div className="bar-nav">
            <button
              type="button"
              className="btn icon"
              aria-label="Previous bar"
              onClick={() => goToBar(currentBar - 1)}
            >
              &#8249;
            </button>
            <button
              type="button"
              className={`btn icon${barRepeat ? ' on' : ''}`}
              aria-pressed={barRepeat}
              aria-label="Repeat this bar"
              onClick={toggleBarRepeat}
            >
              &#8635;
            </button>
            <button
              type="button"
              className="btn icon"
              aria-label="Next bar"
              onClick={() => goToBar(currentBar + 1)}
            >
              &#8250;
            </button>
            <span className="readout">
              Bar {currentBar + 1}/{barCount}
            </span>
          </div>
        </div>

        <div className="toolbar-row">
          <label className="field">
            <span className="field-label">Key</span>
            <select value={keyName} onChange={(e) => setKeyName(e.target.value)}>
              {KEYS.map((k) => (
                <option key={k.name} value={k.name}>
                  {k.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Form</span>
            <select value={progressionId} onChange={(e) => setProgressionId(e.target.value)}>
              {PROGRESSIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Level</span>
            <select value={level} onChange={(e) => setLevel(Number(e.target.value) as Level)}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Swing</span>
            <select value={swing} onChange={(e) => setSwing(e.target.value as SwingId)}>
              {SWING_SETTINGS.map((setting) => (
                <option key={setting.id} value={setting.id}>
                  {setting.label}
                </option>
              ))}
            </select>
          </label>

          <Chip label="Count-in" checked={countIn} onChange={setCountIn} />
          <Chip label="Bass" checked={playBass} onChange={setPlayBass} />
          <Chip label="Melody" checked={playMelody} onChange={setPlayMelody} />

          <button type="button" className="btn" onClick={() => setSeed(randomSeed())}>
            &#8635; New
          </button>
        </div>
      </header>

      <main className="app">
        <Score
          exercise={exercise}
          currentBar={currentBar}
          activeBass={activeBass}
          activeMelody={activeMelody}
          onSelectBar={goToBar}
        />

        <p className="note">
          Left: the beat, in quarter notes. Right: the same beats, split. Both staves are guitar
          notation, sounding one octave lower than written.
        </p>
        <p className="note keys">
          <kbd>&#8592;</kbd> previous bar &middot; <kbd>&#8594;</kbd> next bar &middot;{' '}
          <kbd>&#8593;</kbd> repeat this bar &middot; <kbd>space</kbd> play/stop
        </p>
      </main>
    </div>
  )
}

type ActiveNoteState = { barIndex: number; index: number } | null

interface ChipProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function Chip({ label, checked, onChange }: ChipProps) {
  return (
    <label className={`chip${checked ? ' on' : ''}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}
