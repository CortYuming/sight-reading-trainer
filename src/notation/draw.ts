import {
  Accidental,
  Beam,
  Dot,
  Formatter,
  Fraction,
  Renderer,
  Stave,
  StaveNote,
  StaveTie,
  Tuplet,
  Voice,
  // Bravura-only entry: the default entry also bundles Gonville and Petaluma,
  // which this app never switches to.
} from 'vexflow/bravura'
import type { NoteSpec } from './spec'

/** Room above the staff for high notes, their stems and tuplet brackets. */
export const STAVE_TOP = 42

/** Enough room below the staff for the three ledger lines of a low E. */
export const MEASURE_HEIGHT = 140

export interface MeasureOptions {
  notes: NoteSpec[]
  /** Key signature name, e.g. "Bb". */
  keySignature: string
  width: number
  /**
   * Clef, key and time signature are drawn on the first row only. Repeating
   * them on every row would eat most of the width on a phone.
   */
  showHeader: boolean
}

/**
 * Draw one bar of 4/4 into `container`, replacing whatever was there before.
 */
export function drawMeasure(container: HTMLElement, options: MeasureOptions): void {
  container.replaceChildren()

  const renderer = new Renderer(container as HTMLDivElement, Renderer.Backends.SVG)
  renderer.resize(options.width, MEASURE_HEIGHT)
  const context = renderer.getContext()

  const stave = new Stave(0, STAVE_TOP, options.width - 2)
  if (options.showHeader) {
    stave.addClef('treble', 'default', '8vb')
    stave.addKeySignature(options.keySignature)
    stave.addTimeSignature('4/4')
  }
  stave.setContext(context).draw()

  const notes = options.notes.map(toStaveNote)

  // Tuplets have to exist before the voice counts ticks: they are what turns
  // three eighth notes into one beat.
  const tuplets = buildTuplets(options.notes, notes)

  const voice = new Voice({ numBeats: 4, beatValue: 4 })
  voice.addTickables(notes)

  Accidental.applyAccidentals([voice], options.keySignature)
  const beams = Beam.generateBeams(notes, {
    groups: [new Fraction(1, 4)],
    beamRests: false,
  })

  new Formatter().joinVoices([voice]).formatToStave([voice], stave)
  voice.draw(context, stave)

  for (const beam of beams) beam.setContext(context).draw()
  for (const tuplet of tuplets) tuplet.setContext(context).draw()
  for (const tie of buildTies(options.notes, notes)) tie.setContext(context).draw()
}

function toStaveNote(spec: NoteSpec): StaveNote {
  // `dots` is what lengthens the note; Dot.buildAndAttach only draws the dot.
  const note = new StaveNote({
    keys: [spec.key],
    duration: spec.duration,
    dots: spec.dots,
    ...(spec.rest ? { type: 'r' } : {}),
    clef: 'treble',
  })
  for (let i = 0; i < spec.dots; i++) Dot.buildAndAttach([note], { all: true })
  return note
}

function buildTuplets(specs: NoteSpec[], notes: StaveNote[]): Tuplet[] {
  const groups = new Map<number, StaveNote[]>()
  specs.forEach((spec, i) => {
    if (spec.triplet === undefined) return
    const group = groups.get(spec.triplet) ?? []
    group.push(notes[i])
    groups.set(spec.triplet, group)
  })
  return [...groups.values()].map((group) => new Tuplet(group))
}

function buildTies(specs: NoteSpec[], notes: StaveNote[]): StaveTie[] {
  const ties: StaveTie[] = []
  specs.forEach((spec, i) => {
    if (!spec.tieToNext || i + 1 >= notes.length) return
    ties.push(
      new StaveTie({
        firstNote: notes[i],
        lastNote: notes[i + 1],
        firstIndexes: [0],
        lastIndexes: [0],
      }),
    )
  })
  return ties
}
