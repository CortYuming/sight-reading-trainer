import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Level } from './music/rhythm'
import { LEVELS, isMixed } from './music/rhythm'
import type { SwingId } from './audio/schedule'
import { generateExercise } from './music/exercise'
import { PROGRESSIONS } from './music/progression'
import { KEYS } from './music/pitch'
import { SWING_SETTINGS, swingRatio } from './audio/schedule'
import { Player } from './audio/player'
import { Score } from './components/Score'
import { TEMPO_MAX, TEMPO_MIN, loadSettings, saveSettings } from './settings'
import type { Settings } from './settings'
import './App.css'

const randomSeed = () => Math.floor(Math.random() * 1_000_000)

export default function App() {
  const savedRef = useRef<Settings | null>(null)
  savedRef.current ??= loadSettings()
  const saved = savedRef.current

  const [keyName, setKeyName] = useState(saved.keyName)
  const [progressionId, setProgressionId] = useState(saved.progressionId)
  const [level, setLevel] = useState<Level>(saved.level)
  const [seed, setSeed] = useState(randomSeed)

  const [bpm, setBpm] = useState(saved.bpm)
  const [swing, setSwing] = useState<SwingId>(saved.swing)
  const [countIn, setCountIn] = useState(saved.countIn)
  const [playBass, setPlayBass] = useState(saved.playBass)
  const [playMelody, setPlayMelody] = useState(saved.playMelody)
  const [showNoteNames, setShowNoteNames] = useState(saved.showNoteNames)

  const [playing, setPlaying] = useState(false)
  const [currentBar, setCurrentBar] = useState(0)
  const [barRepeat, setBarRepeat] = useState(false)
  // What the next barline will switch to, while the current bar finishes.
  const [pending, setPending] = useState<PendingMove | null>(null)
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
        onStop: (barIndex) => {
          setPlaying(false)
          setCurrentBar(barIndex)
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
    setPending(null)
    clearHighlight()
  }, [player, clearHighlight])

  /** Moves land on the next barline, so the bar being read is never cut off. */
  const queueMove = useCallback(
    (bar: number, repeat: boolean) => {
      setBarRepeat(repeat)
      if (!player.isPlaying) {
        setCurrentBar(bar)
        setPending(null)
        return
      }
      setPending({ bar, repeat })
      player.queueAtBarEnd(() => {
        setPending(null)
        player.moveTo(bar, repeat ? bar : null)
      })
    },
    [player],
  )

  // While playing, a move seeks the running transport; stopped, it only marks
  // where Play will start from.
  const goToBar = useCallback(
    (bar: number) => {
      const from = pending?.bar ?? currentBar
      const target = Math.max(0, Math.min(bar, barCount - 1))
      if (target === from && pending === null) return
      queueMove(target, pending?.repeat ?? barRepeat)
    },
    [barCount, queueMove, pending, currentBar, barRepeat],
  )

  /** Step from whatever is queued, so repeated presses keep moving. */
  const stepBar = useCallback(
    (delta: number) => goToBar((pending?.bar ?? currentBar) + delta),
    [goToBar, pending, currentBar],
  )

  const toggleBarRepeat = useCallback(() => {
    const repeating = pending?.repeat ?? barRepeat
    queueMove(pending?.bar ?? currentBar, !repeating)
  }, [queueMove, pending, barRepeat, currentBar])

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
          stepBar(-1)
          break
        case 'ArrowRight':
          event.preventDefault()
          stepBar(1)
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
  }, [stepBar, toggleBarRepeat, toggle])

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
    setPending(null)
  }, [exercise])

  useEffect(() => () => player.stop(), [player])

  useEffect(() => {
    saveSettings({
      keyName,
      progressionId,
      level,
      bpm,
      swing,
      countIn,
      playBass,
      playMelody,
      showNoteNames,
    })
  }, [keyName, progressionId, level, bpm, swing, countIn, playBass, playMelody, showNoteNames])

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
              min={TEMPO_MIN}
              max={TEMPO_MAX}
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
              onClick={() => stepBar(-1)}
            >
              &#8249;
            </button>
            <button
              type="button"
              className={`btn icon${barRepeat ? ' on' : ''}${
                pending?.repeat === true && !barRepeat ? ' pending' : ''
              }`}
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
              onClick={() => stepBar(1)}
            >
              &#8250;
            </button>
            <span className="readout wide">
              Bar {currentBar + 1}/{barCount}
              {pending !== null && pending.bar !== currentBar ? ` \u2192 ${pending.bar + 1}` : ''}
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
              <optgroup label="Basics">
                {LEVELS.filter((l) => !isMixed(l)).map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Advanced">
                {LEVELS.filter(isMixed).map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </optgroup>
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
          <Chip label="Note names" checked={showNoteNames} onChange={setShowNoteNames} />

          <button type="button" className="btn" onClick={() => setSeed(randomSeed())}>
            &#8635; New
          </button>
        </div>
      </header>

      <main className="app">
        <Score
          exercise={exercise}
          currentBar={currentBar}
          pendingBar={pending?.bar ?? null}
          activeBass={activeBass}
          activeMelody={activeMelody}
          showNoteNames={showNoteNames}
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

interface PendingMove {
  bar: number
  repeat: boolean
}

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
