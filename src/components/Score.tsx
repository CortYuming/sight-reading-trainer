import { useMemo } from 'react'
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
  activeBass: ActiveNote | null
  activeMelody: ActiveNote | null
}

export function Score({ exercise, activeBass, activeMelody }: ScoreProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>()

  const rows = useMemo(
    () =>
      exercise.bars.map((bar) => ({
        chord: bar.chord.label,
        bass: bassSpecs(bar),
        melody: melodySpecs(bar),
      })),
    [exercise],
  )

  const available = Math.max(width - COLUMN_GAP, MIN_BASS_WIDTH + MIN_MELODY_WIDTH)
  const bassWidth = Math.max(MIN_BASS_WIDTH, Math.floor(available * BASS_SHARE))
  const melodyWidth = Math.max(MIN_MELODY_WIDTH, available - bassWidth)

  return (
    <div className="score" ref={ref}>
      {rows.map((row, i) => (
        <div className="row" key={i}>
          <div className="column">
            <div className="row-label">{i + 1}</div>
            {width > 0 && (
              <Measure
                notes={row.bass}
                keySignature={exercise.key.name}
                showHeader={i === 0}
                width={bassWidth}
                activeIndex={activeBass?.barIndex === i ? activeBass.index : null}
              />
            )}
          </div>
          <div className="column melody">
            <div className="row-label chord">{row.chord}</div>
            {width > 0 && (
              <Measure
                notes={row.melody}
                keySignature={exercise.key.name}
                showHeader={i === 0}
                width={melodyWidth}
                activeIndex={activeMelody?.barIndex === i ? activeMelody.index : null}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
