import { useEffect, useMemo, useRef } from 'react'
import type { Exercise } from '../music/exercise'
import { bassSpecs, melodySpecs } from '../notation/spec'
import { useElementWidth } from '../hooks/useElementWidth'
import { Measure } from './Measure'

/** The bass column only ever holds four quarter notes, so it can be narrow. */
const BASS_SHARE = 1 / 3
const COLUMN_GAP = 16
const MIN_BASS_WIDTH = 96
const MIN_MELODY_WIDTH = 150

/** Which note is sounding right now, if any. */
export interface ActiveNote {
  barIndex: number
  index: number
}

interface ScoreProps {
  exercise: Exercise
  currentBar: number
  /** Changes just before the loop wraps, as the cue to go back to the top. */
  wrapCue: number
  /** Bar the music will switch to at the next barline, if one is queued. */
  pendingBar: number | null
  activeBass: ActiveNote | null
  activeMelody: ActiveNote | null
  /** Write the letter names beside the noteheads on both staves. */
  showNoteNames: boolean
  onSelectBar: (bar: number) => void
}

export function Score({
  exercise,
  currentBar,
  wrapCue,
  pendingBar,
  activeBass,
  activeMelody,
  showNoteNames,
  onSelectBar,
}: ScoreProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const rows = useRef<Array<HTMLDivElement | null>>([])

  const bars = useMemo(
    () =>
      exercise.bars.map((bar) => ({
        chord: bar.chord.label,
        bass: bassSpecs(bar),
        melody: melodySpecs(bar),
      })),
    [exercise],
  )

  // Keep the bar being played in view, so nobody has to chase it by scrolling.
  // Stepping to a neighbour glides; a jump across the score does not, because a
  // smooth scroll of that length is still travelling when the bar has started.
  const shown = useRef(currentBar)
  useEffect(() => {
    const far = Math.abs(currentBar - shown.current) > 1
    shown.current = currentBar
    rows.current[currentBar]?.scrollIntoView({
      block: 'center',
      behavior: far ? 'auto' : 'smooth',
    })
  }, [currentBar])

  // A beat before the music wraps, so the top of the score is there to be read
  // rather than arriving with the note.
  useEffect(() => {
    if (wrapCue === 0) return
    shown.current = 0
    rows.current[0]?.scrollIntoView({ block: 'center', behavior: 'auto' })
  }, [wrapCue])

  const available = Math.max(width - COLUMN_GAP, MIN_BASS_WIDTH + MIN_MELODY_WIDTH)
  const bassWidth = Math.max(MIN_BASS_WIDTH, Math.floor(available * BASS_SHARE))
  const melodyWidth = Math.max(MIN_MELODY_WIDTH, available - bassWidth)

  return (
    <div className="score" ref={ref}>
      {bars.map((bar, i) => (
        <div
          className={`row${i === currentBar ? ' current' : ''}${
            i === pendingBar && i !== currentBar ? ' pending' : ''
          }`}
          key={i}
          ref={(element) => {
            rows.current[i] = element
          }}
          onClick={() => onSelectBar(i)}
        >
          <div className="column">
            <div className="row-label">{i + 1}</div>
            {width > 0 && (
              <Measure
                notes={bar.bass}
                keySignature={exercise.key.name}
                showHeader={i === 0}
                showNoteNames={showNoteNames}
                width={bassWidth}
                activeIndex={activeBass?.barIndex === i ? activeBass.index : null}
                repeatBegin={i === 0}
                repeatEnd={i === bars.length - 1}
              />
            )}
          </div>
          <div className="column melody">
            <div className="row-label chord">{bar.chord}</div>
            {width > 0 && (
              <Measure
                notes={bar.melody}
                keySignature={exercise.key.name}
                showHeader={i === 0}
                showNoteNames={showNoteNames}
                width={melodyWidth}
                activeIndex={activeMelody?.barIndex === i ? activeMelody.index : null}
                repeatBegin={i === 0}
                repeatEnd={i === bars.length - 1}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
