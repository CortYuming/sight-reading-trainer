import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Level } from './music/rhythm'
import { LEVELS, hasShape, isMixed } from './music/rhythm'
import type { SwingId } from './audio/schedule'
import { generateExercise } from './music/exercise'
import { PROGRESSIONS } from './music/progression'
import { KEYS } from './music/pitch'
import { shapeSummary } from './music/shape'
import { SWING_SETTINGS, swingRatio } from './audio/schedule'
import { Player } from './audio/player'
import { Score } from './components/Score'
import { TEMPO_MAX, TEMPO_MIN, loadSettings, saveSettings } from './settings'
import type { Settings } from './settings'
import { entryId, entryLabel, loadHistory, remember, saveHistory } from './history'
import type { HistoryEntry } from './history'
import './App.css'

const randomSeed = () => Math.floor(Math.random() * 1_000_000)

/** What the player should loop: the one bar being repeated, or the lot. */
const loopFor = (bar: number, repeat: boolean): number | null => (repeat ? bar : null)

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
  const [playDrums, setPlayDrums] = useState(saved.playDrums)
  const [showNoteNames, setShowNoteNames] = useState(saved.showNoteNames)

  const [playing, setPlaying] = useState(false)
  const [currentBar, setCurrentBar] = useState(0)
  // Bumped just before the loop wraps, to send the score back to the top early.
  const [wrapCue, setWrapCue] = useState(0)
  const [barRepeat, setBarRepeat] = useState(false)
  // What the next barline will switch to, while the current bar finishes.
  const [pending, setPending] = useState<PendingMove | null>(null)
  const [activeBass, setActiveBass] = useState<ActiveNoteState>(null)
  const [activeMelody, setActiveMelody] = useState<ActiveNoteState>(null)

  // Stamped when the exercise changes, so the history is labelled with when it
  // was last read rather than when it was first drawn.
  const current = useMemo<HistoryEntry>(
    () => ({ keyName, progressionId, level, seed, at: Date.now() }),
    [keyName, progressionId, level, seed],
  )
  const exercise = useMemo(() => generateExercise(current), [current])
  const barCount = exercise.bars.length

  // `recent` rather than `history` is what the list shows, so the exercise on
  // screen is in it from the first render instead of arriving an effect later.
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory)
  const recent = useMemo(() => remember(history, current), [history, current])

  useEffect(() => {
    setHistory(recent)
    saveHistory(recent)
  }, [recent])

  const recall = useCallback(
    (id: string) => {
      const entry = recent.find((candidate) => entryId(candidate) === id)
      if (entry === undefined) return
      setKeyName(entry.keyName)
      setProgressionId(entry.progressionId)
      setLevel(entry.level)
      setSeed(entry.seed)
    },
    [recent],
  )

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
        muteDrums: !playDrums,
        startBar,
        loopBar,
        onNote: (part, barIndex, index) => {
          const note = { barIndex, index }
          if (part === 'bass') setActiveBass(note)
          else setActiveMelody(note)
        },
        onBar: setCurrentBar,
        onWrapSoon: () => setWrapCue((count) => count + 1),
        onStop: (barIndex) => {
          setPlaying(false)
          setCurrentBar(barIndex)
          clearHighlight()
        },
      })
      setPlaying(true)
    },
    [player, exercise, bpm, swing, playBass, playMelody, playDrums, clearHighlight],
  )

  const stop = useCallback(() => {
    player.stop()
    setPlaying(false)
    setPending(null)
    clearHighlight()
  }, [player, clearHighlight])

  // Where the music will be once anything queued has landed. Every move reads
  // from here rather than from what is sounding, so repeated presses keep
  // moving instead of all stepping off the same bar.
  const nextBar = pending?.bar ?? currentBar
  const nextRepeat = pending?.repeat ?? barRepeat

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
        player.moveTo(bar, loopFor(bar, repeat))
      })
    },
    [player],
  )

  // While playing, a move seeks the running transport; stopped, it only marks
  // where Play will start from.
  const goToBar = useCallback(
    (bar: number) => {
      const target = Math.max(0, Math.min(bar, barCount - 1))
      if (target === nextBar && pending === null) return
      queueMove(target, nextRepeat)
    },
    [barCount, queueMove, pending, nextBar, nextRepeat],
  )

  const stepBar = useCallback((delta: number) => goToBar(nextBar + delta), [goToBar, nextBar])

  const toggleBarRepeat = useCallback(
    () => queueMove(nextBar, !nextRepeat),
    [queueMove, nextBar, nextRepeat],
  )

  const toggle = useCallback(() => {
    if (playing) stop()
    else void play(currentBar, loopFor(currentBar, barRepeat), countIn)
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
  useEffect(
    () => player.setMutes(!playBass, !playMelody, !playDrums),
    [player, playBass, playMelody, playDrums],
  )

  // Swing changes how the whole thing is scheduled, so it needs a restart —
  // but the same music carries on from the same bar.
  useEffect(() => {
    if (!player.isPlaying) return
    void play(currentBar, loopFor(currentBar, barRepeat))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swing])

  // A new level, key, form or seed is different music. Playing straight on
  // through it gives nobody a chance to look at it, so stop and go back to the
  // top and let Play start it.
  useEffect(() => {
    stop()
    setCurrentBar(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      playDrums,
      showNoteNames,
    })
  }, [
    keyName,
    progressionId,
    level,
    bpm,
    swing,
    countIn,
    playBass,
    playMelody,
    playDrums,
    showNoteNames,
  ])

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

        {/* What is being read. Set at the start of a session, not while playing. */}
        <div className="toolbar-row grouped">
          <span className="group-label">Exercise</span>

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

          <label className="field level">
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
                {LEVELS.filter((l) => isMixed(l) && !hasShape(l)).map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Shapes">
                {LEVELS.filter(hasShape).map((l) => (
                  <option key={l} value={l}>
                    {l} — {shapeSummary(l)}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>

          <button type="button" className="btn" onClick={() => setSeed(randomSeed())}>
            &#8635; New
          </button>

          <label className="field history">
            <span className="field-label">History</span>
            <select value={entryId(current)} onChange={(e) => recall(e.target.value)}>
              {recent.map((entry) => (
                <option key={entryId(entry)} value={entryId(entry)}>
                  {entryLabel(entry)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* How it comes out — what is heard, and then what is drawn. */}
        <div className="toolbar-row grouped">
          <span className="group-label">Sound</span>

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
          <Chip label="Drums" checked={playDrums} onChange={setPlayDrums} />

          <span className="group-divider" aria-hidden="true" />
          <span className="group-label">View</span>
          <Chip label="Note names" checked={showNoteNames} onChange={setShowNoteNames} />
        </div>
      </header>

      <main className="app">
        <Score
          exercise={exercise}
          currentBar={currentBar}
          wrapCue={wrapCue}
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
