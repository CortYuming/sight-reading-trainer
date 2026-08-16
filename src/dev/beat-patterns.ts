/**
 * Shared material for the two scratch pages: the catalogue of one-beat
 * patterns, and the proposed level ladder. Neither is part of the app.
 */
import { BEAT_PATTERNS } from '../music/rhythm'
import {
  Beam,
  Dot,
  Formatter,
  Fraction,
  Renderer,
  Stave,
  StaveNote,
  StaveTie,
  Stem,
  Tuplet,
  Voice,
} from 'vexflow/bravura'

export interface Template {
  dur: string
  dots?: number
  rest?: boolean
  /** Tied to the note that follows. */
  tie?: boolean
}

export interface Pattern {
  id: string
  note: string
  /** One beat. Repeated four times to make the bar. */
  notes: Template[]
  /** [numNotes, notesOccupied] when the beat is a tuplet. */
  tuplet?: [number, number]
}

const T3: [number, number] = [3, 2]
const T6: [number, number] = [6, 4]

/** Rest-free, easiest first. */
export const PLAIN: Pattern[] = [
  { id: 'q', note: '4分音符', notes: [{ dur: 'q' }] },
  { id: '8-8', note: '8分×2', notes: [{ dur: '8' }, { dur: '8' }] },
  {
    id: 'triplet',
    note: '8分3連',
    notes: [{ dur: '8' }, { dur: '8' }, { dur: '8' }],
    tuplet: T3,
  },
  {
    id: '16x4',
    note: '16分×4',
    notes: [{ dur: '16' }, { dur: '16' }, { dur: '16' }, { dur: '16' }],
  },
  {
    id: '8d-16',
    note: '付点8分 → 16分',
    notes: [{ dur: '8', dots: 1 }, { dur: '16' }],
  },
  {
    id: '16-8d',
    note: '逆付点（16分 → 付点8分）',
    notes: [{ dur: '16' }, { dur: '8', dots: 1 }],
  },
  {
    id: '8-16-16',
    note: '8分 → 16分×2',
    notes: [{ dur: '8' }, { dur: '16' }, { dur: '16' }],
  },
  {
    id: '16-16-8',
    note: '16分×2 → 8分',
    notes: [{ dur: '16' }, { dur: '16' }, { dur: '8' }],
  },
  {
    id: '16-8-16',
    note: '16分 → 8分 → 16分',
    notes: [{ dur: '16' }, { dur: '8' }, { dur: '16' }],
  },
  {
    id: 'triplet-q8',
    note: '3連の前2つをつなぐ（4分3連 → 8分3連）',
    notes: [{ dur: 'q' }, { dur: '8' }],
    tuplet: T3,
  },
  {
    id: 'triplet-8q',
    note: '3連の後ろ2つをつなぐ（8分3連 → 4分3連）',
    notes: [{ dur: '8' }, { dur: 'q' }],
    tuplet: T3,
  },
  {
    id: 'sextuplet',
    note: '6連符',
    notes: [
      { dur: '16' },
      { dur: '16' },
      { dur: '16' },
      { dur: '16' },
      { dur: '16' },
      { dur: '16' },
    ],
    tuplet: T6,
  },
]

/** With rests, easiest first. */
export const WITH_RESTS: Pattern[] = [
  { id: 'rq', note: '4分休符', notes: [{ dur: 'q', rest: true }] },
  {
    id: '8-r8',
    note: '8分 → 8分休符',
    notes: [{ dur: '8' }, { dur: '8', rest: true }],
  },
  {
    id: 'r8-8',
    note: '8分休符 → 8分',
    notes: [{ dur: '8', rest: true }, { dur: '8' }],
  },
  {
    id: 'triplet-r-first',
    note: '3連の1つ目が休符',
    notes: [{ dur: '8', rest: true }, { dur: '8' }, { dur: '8' }],
    tuplet: T3,
  },
  {
    id: 'triplet-r-mid',
    note: '3連の真ん中が休符',
    notes: [{ dur: '8' }, { dur: '8', rest: true }, { dur: '8' }],
    tuplet: T3,
  },
  {
    id: 'triplet-r-last',
    note: '3連の3つ目が休符',
    notes: [{ dur: '8' }, { dur: '8' }, { dur: '8', rest: true }],
    tuplet: T3,
  },
  {
    id: 'r16-16x3',
    note: '16分休符 → 16分×3',
    notes: [{ dur: '16', rest: true }, { dur: '16' }, { dur: '16' }, { dur: '16' }],
  },
  {
    id: '16-16-r16-16',
    note: '16分×2 → 16分休符 → 16分',
    notes: [{ dur: '16' }, { dur: '16' }, { dur: '16', rest: true }, { dur: '16' }],
  },
  {
    id: '8d-r16',
    note: '付点8分 → 16分休符',
    notes: [{ dur: '8', dots: 1 }, { dur: '16', rest: true }],
  },
  {
    id: 'r16-8d',
    note: '16分休符 → 付点8分',
    notes: [{ dur: '16', rest: true }, { dur: '8', dots: 1 }],
  },
  {
    id: 'r8-16-16',
    note: '8分休符 → 16分×2',
    notes: [{ dur: '8', rest: true }, { dur: '16' }, { dur: '16' }],
  },
  {
    id: '16-16-r8',
    note: '16分×2 → 8分休符',
    notes: [{ dur: '16' }, { dur: '16' }, { dur: '8', rest: true }],
  },
  {
    id: '16-r8-16',
    note: '16分 → 8分休符 → 16分',
    notes: [{ dur: '16' }, { dur: '8', rest: true }, { dur: '16' }],
  },
  {
    id: 'triplet-q8-r',
    note: '4分3連 → 8分3連休符',
    notes: [{ dur: 'q' }, { dur: '8', rest: true }],
    tuplet: T3,
  },
  {
    id: 'triplet-r8-q',
    note: '8分3連休符 → 4分3連',
    notes: [{ dur: '8', rest: true }, { dur: 'q' }],
    tuplet: T3,
  },
  {
    id: 'sextuplet-r',
    note: '6連の1つ目が休符',
    notes: [
      { dur: '16', rest: true },
      { dur: '16' },
      { dur: '16' },
      { dur: '16' },
      { dur: '16' },
      { dur: '16' },
    ],
    tuplet: T6,
  },
]

/** Which candidates actually made it into the generator. */
export const IMPLEMENTED = new Set(BEAT_PATTERNS.map((p) => p.id))

const byId = (list: Pattern[], ids: string[]): Pattern[] =>
  ids.map((id) => {
    const found = list.find((p) => p.id === id)
    if (!found) throw new Error(`unknown pattern: ${id}`)
    return found
  })

export interface LevelStep {
  level: number
  kind: '休符なし' | '休符あり'
  added: Pattern[]
}

/**
 * The ladder as implemented: the rest-free shapes split four to an odd level,
 * each answered by its rest version on the even level above.
 */
export const LEVEL_PLAN: LevelStep[] = [
  {
    level: 1,
    kind: '休符なし',
    added: byId(PLAIN, ['8-8', '16x4', '8d-16', '16-8d']),
  },
  {
    level: 2,
    kind: '休符あり',
    added: byId(WITH_RESTS, ['8-r8', 'r8-8', 'r16-16x3', '16-16-r16-16', '8d-r16', 'r16-8d']),
  },
  {
    level: 3,
    kind: '休符なし',
    added: byId(PLAIN, ['8-16-16', '16-16-8', '16-8-16', 'triplet']),
  },
  {
    level: 4,
    kind: '休符あり',
    added: byId(WITH_RESTS, [
      'r8-16-16',
      '16-16-r8',
      '16-r8-16',
      'triplet-r-first',
      'triplet-r-mid',
      'triplet-r-last',
    ]),
  },
  {
    level: 5,
    kind: '休符なし',
    added: byId(PLAIN, ['triplet-q8', 'triplet-8q', 'sextuplet']),
  },
  {
    level: 6,
    kind: '休符あり',
    added: byId(WITH_RESTS, ['triplet-q8-r', 'triplet-r8-q', 'sextuplet-r']),
  },
]

// A rhythm-only staff: one pitch, stems up, so beams and tuplet brackets all
// sit above and nothing collides with the notes.
const KEY = 'b/4'
const WIDTH = 320
const HEIGHT = 120

/** Draw the pattern repeated across all four beats — one level 1 bar. */
export function drawPattern(container: HTMLElement, pattern: Pattern) {
  const renderer = new Renderer(container as HTMLDivElement, Renderer.Backends.SVG)
  renderer.resize(WIDTH, HEIGHT)
  const context = renderer.getContext()

  const stave = new Stave(0, 4, WIDTH - 2)
  stave.setContext(context).draw()

  const notes: StaveNote[] = []
  const tuplets: Tuplet[] = []
  const ties: StaveTie[] = []

  for (let beat = 0; beat < 4; beat++) {
    const beatNotes = pattern.notes.map((template) => {
      const note = new StaveNote({
        keys: [KEY],
        duration: template.dur,
        dots: template.dots ?? 0,
        ...(template.rest ? { type: 'r' } : {}),
        clef: 'treble',
        stemDirection: Stem.UP,
      })
      for (let i = 0; i < (template.dots ?? 0); i++) Dot.buildAndAttach([note], { all: true })
      return note
    })

    pattern.notes.forEach((template, i) => {
      if (!template.tie || i + 1 >= beatNotes.length) return
      ties.push(
        new StaveTie({
          firstNote: beatNotes[i],
          lastNote: beatNotes[i + 1],
          firstIndexes: [0],
          lastIndexes: [0],
        }),
      )
    })

    if (pattern.tuplet) {
      const [numNotes, notesOccupied] = pattern.tuplet
      tuplets.push(
        new Tuplet(beatNotes, { numNotes, notesOccupied, location: Tuplet.LOCATION_TOP }),
      )
    }
    notes.push(...beatNotes)
  }

  const voice = new Voice({ numBeats: 4, beatValue: 4 })
  voice.addTickables(notes)

  const beams = Beam.generateBeams(notes, { groups: [new Fraction(1, 4)], beamRests: false })

  new Formatter().joinVoices([voice]).formatToStave([voice], stave)
  voice.draw(context, stave)
  for (const beam of beams) beam.setContext(context).draw()
  for (const tuplet of tuplets) tuplet.setContext(context).draw()
  for (const tie of ties) tie.setContext(context).draw()
}

/** A labelled row: the caption, then the bar. */
export function appendRow(root: HTMLElement, caption: string, pattern: Pattern) {
  const row = document.createElement('section')
  row.style.cssText = 'margin: 0 0 4px'

  const label = document.createElement('div')
  label.textContent = caption
  label.style.cssText = `font-size: 13px; color: ${IMPLEMENTED.has(pattern.id) ? '#444' : '#b06000'}`
  row.append(label)

  const staff = document.createElement('div')
  row.append(staff)
  root.append(row)

  try {
    drawPattern(staff, pattern)
  } catch (error) {
    staff.textContent = `描画できず: ${String(error)}`
    staff.style.cssText = 'color: #b00; font-size: 13px'
  }
}
