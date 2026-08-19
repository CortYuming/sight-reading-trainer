import { useEffect, useRef } from 'react'
import type { NoteSpec } from '../notation/spec'
import { MEASURE_HEIGHT, drawMeasure } from '../notation/draw'

interface MeasureProps {
  notes: NoteSpec[]
  keySignature: string
  showHeader: boolean
  showNoteNames: boolean
  width: number
  /** Index of the note or rest to highlight while the music is on it, or null. */
  activeIndex: number | null
  /** Opening and closing repeat barlines, drawn on the first and last bar. */
  repeatBegin: boolean
  repeatEnd: boolean
}

const ACTIVE_CLASS = 'note-active'

export function Measure({
  notes,
  keySignature,
  showHeader,
  showNoteNames,
  width,
  activeIndex,
  repeatBegin,
  repeatEnd,
}: MeasureProps) {
  const ref = useRef<HTMLDivElement>(null)
  const groups = useRef<Element[]>([])
  // Read inside the drawing effect without making it redraw on every note.
  const active = useRef(activeIndex)
  active.current = activeIndex

  useEffect(() => {
    const element = ref.current
    if (!element || width <= 0) return

    drawMeasure(element, {
      notes,
      keySignature,
      showHeader,
      showNoteNames,
      width,
      repeatBegin,
      repeatEnd,
    })
    groups.current = Array.from(element.querySelectorAll('g.vf-stavenote'))
    highlight(groups.current, active.current)
  }, [notes, keySignature, showHeader, showNoteNames, width, repeatBegin, repeatEnd])

  useEffect(() => {
    highlight(groups.current, activeIndex)
  }, [activeIndex])

  return <div className="measure" ref={ref} style={{ height: MEASURE_HEIGHT }} />
}

function highlight(groups: Element[], activeIndex: number | null): void {
  groups.forEach((group, i) => group.classList.toggle(ACTIVE_CLASS, i === activeIndex))
}
