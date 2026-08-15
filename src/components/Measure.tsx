import { useEffect, useRef } from 'react'
import type { NoteSpec } from '../notation/spec'
import { MEASURE_HEIGHT, drawMeasure } from '../notation/draw'

interface MeasureProps {
  notes: NoteSpec[]
  keySignature: string
  showHeader: boolean
  width: number
}

export function Measure({ notes, keySignature, showHeader, width }: MeasureProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || width <= 0) return
    drawMeasure(element, { notes, keySignature, showHeader, width })
  }, [notes, keySignature, showHeader, width])

  return <div className="measure" ref={ref} style={{ height: MEASURE_HEIGHT }} />
}
