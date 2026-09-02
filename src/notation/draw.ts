import {
  Accidental,
  BarlineType,
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
import type { RenderContext } from 'vexflow/bravura'
import type { NoteSpec } from './spec'
import { noteName } from './names'

/**
 * Where the stave is asked to start. VexFlow adds its own space above the
 * first line, so the staff itself lands about 40px below this.
 */
export const STAVE_TOP = 4

/** Enough room below the staff for the three ledger lines of a low E. */
export const MEASURE_HEIGHT = 132

export interface MeasureOptions {
  notes: NoteSpec[]
  /** Key signature name, e.g. "Bb". */
  keySignature: string
  width: number
  /**
   * Clef and key signature are drawn on the first row only. Repeating them on
   * every row would eat most of the width on a phone.
   */
  showHeader: boolean
  /** Write each note's letter name beside its head, as a reading aid. */
  showNoteNames: boolean
  /**
   * Repeat barlines. Playback runs round and round, so the first bar opens the
   * repeat and the last one closes it, the way the loop would be written out.
   */
  repeatBegin?: boolean
  repeatEnd?: boolean
}

/** Vertical extent of everything drawn, used to check nothing is clipped. */
export interface MeasureBounds {
  top: number
  bottom: number
}

/**
 * Draw one bar of 4/4 into `container`, replacing whatever was there before.
 */
export function drawMeasure(container: HTMLElement, options: MeasureOptions): MeasureBounds {
  container.replaceChildren()

  const renderer = new Renderer(container as HTMLDivElement, Renderer.Backends.SVG)
  renderer.resize(options.width, MEASURE_HEIGHT)
  const context = renderer.getContext()

  const stave = new Stave(0, STAVE_TOP, options.width - 2)
  if (options.repeatBegin) stave.setBegBarType(BarlineType.REPEAT_BEGIN)
  if (options.repeatEnd) stave.setEndBarType(BarlineType.REPEAT_END)
  if (options.showHeader) {
    stave.addClef('treble', 'default', '8vb')
    stave.addKeySignature(options.keySignature)
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

  // Tuplet brackets go under the staff, not over it. Above is where VexFlow
  // puts them, and on this staff that means off the top of the SVG: the air up
  // there is four staff lines deep, a high note with its stem spends most of
  // it, and the chord name and its numeral have taken the rest. The bracket was
  // being clipped away, so the reader never learned the beat was a triplet.
  // Under the staff nothing else is drawn.
  //
  // This has to come after the beams: generateBeams sets the bracket above or
  // below from the stem of the group's first note, and a group that opens on a
  // rest gets the resting default of up, whatever the notes after it do.
  for (const tuplet of tuplets) tuplet.setTupletLocation(Tuplet.LOCATION_BOTTOM)

  new Formatter().joinVoices([voice]).formatToStave([voice], stave)
  voice.draw(context, stave)

  for (const beam of beams) beam.setContext(context).draw()
  for (const tuplet of tuplets) tuplet.setContext(context).draw()
  for (const tie of buildTies(options.notes, notes)) tie.setContext(context).draw()

  // After everything else: the dots have to be on the page before the names
  // can be placed clear of them.
  const names = options.showNoteNames
    ? drawNoteNames(context, options.notes, notes, options.width)
    : null

  const bounds = measureBounds(stave, notes)
  if (names === null) return bounds
  return { top: Math.min(bounds.top, names.top), bottom: Math.max(bounds.bottom, names.bottom) }
}

const NAME_FONT = 'system-ui, sans-serif'
/** Heavier than the body text, so the letters do not look faint beside a head. */
const NAME_WEIGHT = 500
/** The size to use when there is room, and the smallest still worth reading. */
const NAME_SIZE_MAX = 11
const NAME_SIZE_MIN = 8
/** Air between the notehead and the letter. */
const NAME_GAP = 4
/** Roughly how wide one bold character is, as a share of the font size. */
const NAME_CHAR_RATIO = 0.66
/** Where the baseline sits below the middle of the head, ditto. */
const NAME_BASELINE_RATIO = 0.35

/**
 * Write each note's letter beside its head. Beside rather than above, because
 * the letters then sit at the heights their notes do and a run of sixteenths
 * stays legible instead of collapsing into one crowded line of text.
 */
function drawNoteNames(
  context: RenderContext,
  specs: NoteSpec[],
  notes: StaveNote[],
  width: number,
): MeasureBounds {
  const size = nameSize(notes)
  const charWidth = size * NAME_CHAR_RATIO
  const bounds = { top: Infinity, bottom: -Infinity }

  context.save()
  context.openGroup('note-name')
  context.setFont(NAME_FONT, size, NAME_WEIGHT)

  specs.forEach((spec, i) => {
    // A rest has no pitch, and a note tied into is the one before it held on —
    // whether that note is in this bar or the one before.
    if (spec.rest || spec.tieFromPrevious || specs[i - 1]?.tieToNext) return
    const note = notes[i]
    const label = noteName(spec.key)
    // The SVG clips at its own edge, so the last name of a bar has to be
    // pulled back inside even if that crowds the note it belongs to.
    const x = Math.min(rightEdgeOf(note) + NAME_GAP, width - label.length * charWidth)
    const baseline = note.getYs()[0] + size * NAME_BASELINE_RATIO
    context.fillText(label, x, baseline)
    // A flat sign reaches higher than a capital; the size itself is close
    // enough to that ascent to check the letters are not clipped.
    bounds.top = Math.min(bounds.top, baseline - size)
    bounds.bottom = Math.max(bounds.bottom, baseline)
  })

  context.closeGroup()
  context.restore()
  // A bar of nothing but rests draws no names; the infinities then fall out of
  // the Math.min/max the caller merges with.
  return bounds
}

/**
 * Big by default, and only shrunk where the notes are packed too closely to
 * take it — a bar of sextuplets on a phone. Sizing the whole bar to its
 * tightest pair keeps the letters within it even, which reads better than
 * letters that change size halfway across.
 */
function nameSize(notes: StaveNote[]): number {
  let closest = Infinity
  for (let i = 1; i < notes.length; i++) {
    closest = Math.min(closest, notes[i].getAbsoluteX() - notes[i - 1].getAbsoluteX())
  }
  if (!Number.isFinite(closest)) return NAME_SIZE_MAX
  // Two characters and the gap have to fit in the space one note is given.
  const fitted = (closest - NAME_GAP) / (2 * NAME_CHAR_RATIO)
  return Math.min(NAME_SIZE_MAX, Math.max(NAME_SIZE_MIN, Math.floor(fitted)))
}

/** Where a notehead ends, past any augmentation dots hanging off its right. */
function rightEdgeOf(note: StaveNote): number {
  let x = note.getNoteHeadEndX()
  for (const dot of Dot.getDots(note)) {
    const end = dot.getX() + dot.getWidth()
    if (Number.isFinite(end)) x = Math.max(x, end)
  }
  return x
}

/**
 * How far the drawing actually reaches. Low notes hang below the staff on
 * ledger lines and can run off the bottom of the SVG, which is easy to miss
 * without measuring.
 */
function measureBounds(stave: Stave, notes: StaveNote[]): MeasureBounds {
  let top = stave.getYForLine(0)
  let bottom = stave.getYForLine(4)
  for (const note of notes) {
    const box = note.getBoundingBox()
    top = Math.min(top, box.getY())
    bottom = Math.max(bottom, box.getY() + box.getH())
  }
  return { top, bottom }
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
  // The ratio has to be passed: VexFlow would otherwise read it off the group
  // size, which is wrong for a sextuplet and for a triplet written as two
  // notes.
  const groups = new Map<number, { notes: StaveNote[]; numNotes: number; notesOccupied: number }>()
  specs.forEach((spec, i) => {
    if (!spec.tuplet) return
    const { group, numNotes, notesOccupied } = spec.tuplet
    const found = groups.get(group) ?? { notes: [], numNotes, notesOccupied }
    found.notes.push(notes[i])
    groups.set(group, found)
  })
  return [...groups.values()].map(
    (group) =>
      new Tuplet(group.notes, {
        numNotes: group.numNotes,
        notesOccupied: group.notesOccupied,
      }),
  )
}

/**
 * Every tie on this stave, including the halves of the ones that cross a
 * barline.
 *
 * A tie out of the last note has no note on its right, and a tie into the
 * first has none on its left. Given one end, VexFlow draws the half of the
 * curve it can, running off the end of the stave — which is exactly how a tie
 * across a barline is written, and here across a row as well, since every row
 * is one bar.
 */
function buildTies(specs: NoteSpec[], notes: StaveNote[]): StaveTie[] {
  const ties: StaveTie[] = []
  specs.forEach((spec, i) => {
    if (spec.tieFromPrevious) {
      ties.push(new StaveTie({ lastNote: notes[i], lastIndexes: [0] }))
    }
    if (!spec.tieToNext) return
    ties.push(
      i + 1 < notes.length
        ? new StaveTie({
            firstNote: notes[i],
            lastNote: notes[i + 1],
            firstIndexes: [0],
            lastIndexes: [0],
          })
        : new StaveTie({ firstNote: notes[i], firstIndexes: [0] }),
    )
  })
  return ties
}
