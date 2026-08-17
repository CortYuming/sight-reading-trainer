/**
 * Candidate melody voices, one after another on the same fast passage — the
 * sextuplets and sixteenths that come out as a row of blips rather than a line.
 * Press a row to hear it, and the winner goes into the app.
 *
 * The notes are scheduled through the transport exactly the way the app does
 * it, so what is heard here is what the app would sound like.
 *
 * Served at /voices.html by the dev server. Not part of the app.
 */
import * as Tone from 'tone'
import type { EnvelopeShape } from './audio/envelope'
import { fitEnvelope } from './audio/envelope'

type MelodySynth = Tone.Synth | Tone.FMSynth

interface Candidate {
  name: string
  note: string
  /** The envelope the voice is built with, before it is cut to fit a note. */
  base: EnvelopeShape
  make: (envelope: EnvelopeShape) => MelodySynth
  /** Notes butt up against each other instead of leaving the usual gap. */
  legato: boolean
  accents: Accent
}

/**
 * Where the weight goes.
 *
 * `downbeat` leans on the note that starts each beat, which is what keeps a
 * reader's place — and what makes a line sound like a march. `upbeat` leans on
 * the off-beat eighth instead, which is how jazz eighth-note lines are actually
 * articulated. Neither touches a run: sextuplets and sixteenths are played even
 * and take their shape from the contour of the line rather than from the beat.
 */
type Accent = 'none' | 'downbeat' | 'upbeat'

/**
 * The two voices, spelled out here rather than imported. The app has since
 * taken up candidate 6, and a page whose baseline moves with it would stop
 * being a comparison.
 */
const PLUCKED: EnvelopeShape = { attack: 0.004, decay: 0.2, sustain: 0.25, release: 0.25 }
const HELD: EnvelopeShape = { attack: 0.012, decay: 0.3, sustain: 0.85, release: 0.18 }

/** What the melody used to leave in front of the next note. */
const OLD_GAP = 0.92

/** The three weights: the accented note, an ordinary one, and one played under. */
const ACCENT = 1
const PLAIN = 0.78
const SOFT = 0.55

const triangle =
  (volume: number) =>
  (envelope: EnvelopeShape): MelodySynth =>
    new Tone.Synth({ oscillator: { type: 'triangle' }, envelope, volume }).toDestination()

const reed = (envelope: EnvelopeShape): MelodySynth =>
  new Tone.FMSynth({
    harmonicity: 2,
    modulationIndex: 4,
    oscillator: { type: 'sine' },
    envelope,
    modulation: { type: 'square' },
    modulationEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.2 },
    volume: -12,
  }).toDestination()

const CANDIDATES: Candidate[] = [
  {
    name: '1. As it is today',
    note: 'Plucked triangle, sustain 0.25, a gap between the notes.',
    base: PLUCKED,
    make: triangle(-8),
    legato: false,
    accents: 'none',
  },
  {
    name: '2. Held, not plucked',
    note: 'Sustain up to 0.85, so a note stays up instead of dying at its onset.',
    base: HELD,
    make: triangle(-10),
    legato: false,
    accents: 'none',
  },
  {
    name: '3. Held and joined',
    note: 'The same, with the gap closed so a run comes out as one line.',
    base: HELD,
    make: triangle(-10),
    legato: true,
    accents: 'none',
  },
  {
    name: '4. As today, with downbeat accents',
    note: "Today's voice, leaning on the note that starts each beat.",
    base: PLUCKED,
    make: triangle(-8),
    legato: false,
    accents: 'downbeat',
  },
  {
    name: '5. Held, joined, downbeats accented',
    note: 'All three together. Keeps the place, but marches rather than swings.',
    base: HELD,
    make: triangle(-10),
    legato: true,
    accents: 'downbeat',
  },
  {
    name: '6. Held, joined, upbeats accented',
    note: 'The same but weighted the way jazz eighths actually are — off the beat.',
    base: HELD,
    make: triangle(-10),
    legato: true,
    accents: 'upbeat',
  },
  {
    name: '7. A reedier tone',
    note: 'Held, joined, upbeats accented, on an FM voice with more in the tone.',
    base: HELD,
    make: reed,
    legato: true,
    accents: 'upbeat',
  },
]

interface PassageNote {
  midi: number
  /** Beats from the start of the passage. */
  start: number
  /** Length in beats. */
  length: number
  /** The second eighth of a swung pair: the note jazz leans on. */
  off?: boolean
}

/** A run of even notes filling one beat. A null is a rest: nothing is played. */
function run(start: number, midis: (number | null)[]): PassageNote[] {
  const length = 1 / midis.length
  return midis.flatMap((midi, i) =>
    midi === null ? [] : [{ midi, start: start + i * length, length }],
  )
}

/** Where the off-beat eighth lands in a swung beat. */
const SWING = 2 / 3

/** Swung eighths, two to a beat: long-short, the off-beat marked as such. */
function eighths(start: number, midis: (number | null)[]): PassageNote[] {
  return midis.flatMap((midi, i) => {
    if (midi === null) return []
    const beat = start + Math.floor(i / 2)
    return i % 2 === 0
      ? [{ midi, start: beat, length: SWING }]
      : [{ midi, start: beat + SWING, length: 1 - SWING, off: true }]
  })
}

/**
 * Two bars: sextuplets and sixteenths against plain quarter notes, so the fast
 * notes can be heard beside the slow ones they are supposed to belong with.
 *
 * A pitch repeats in each of the fast groups on purpose. Closing the gap
 * between notes is what makes a run sound like a line, and it is also what
 * could melt two of the same note into one — the gap is there for exactly that.
 * A passage without a repeat would hide the cost of every legato candidate.
 *
 * There are rests for the same reason. A voice that holds its level to the end
 * of a note has that much more to fade through afterwards, and a short rest is
 * where that tail either clears in time or does not.
 */
const PASSAGE: PassageNote[] = [
  ...run(0, [60, 62, 64, 64, 67, 69]),
  // An eighth note and an eighth rest: a held note straight into silence.
  { midi: 67, start: 1, length: 0.5 },
  ...run(2, [69, 67, null, 64, 62, 60]),
  { midi: 60, start: 3, length: 1 },
  ...run(4, [60, 62, 62, 65]),
  ...run(5, [67, null, 64, 62]),
  { midi: 64, start: 6, length: 1 },
  { midi: 60, start: 7, length: 1 },
  // A third bar of swung eighths: the only place an upbeat accent has anything
  // to land on, and the line jazz articulation was written for.
  ...eighths(8, [67, 69, 70, 72, 71, null, 67, 65]),
]

const PASSAGE_BEATS = 12

interface PartEvent {
  time: string
  note: PassageNote
}

let synth: MelodySynth | null = null
let part: Tone.Part | null = null
let playing: string | null = null

/**
 * How hard to play a note.
 *
 * The downbeat reading is metric and applies to everything, runs included:
 * marking every beat is the whole point of it. The jazz reading only weights
 * the eighths — a run has nothing metric to lean on, so its notes come out even.
 */
function velocityOf(note: PassageNote, accents: Accent): number {
  if (accents === 'none') return ACCENT
  if (accents === 'downbeat') return note.start % 1 === 0 ? ACCENT : SOFT
  if (note.off === true) return ACCENT
  return note.length === SWING ? SOFT : PLAIN
}

function atBeat(beats: number): string {
  return `${Math.round(beats * Tone.getTransport().PPQ)}i`
}

function stop(): void {
  const transport = Tone.getTransport()
  transport.stop()
  transport.cancel()
  transport.position = 0
  part?.dispose()
  part = null
  synth?.dispose()
  synth = null
  playing = null
  render()
}

async function play(candidate: Candidate, bpm: number): Promise<void> {
  await Tone.start()
  stop()

  const transport = Tone.getTransport()
  transport.bpm.value = bpm
  const voice = candidate.make(candidate.base)
  synth = voice
  playing = candidate.name

  part = new Tone.Part<PartEvent>((time, event) => {
    const spacing = (event.note.length * 60) / bpm
    const seconds = candidate.legato ? spacing : spacing * OLD_GAP
    // Cut the envelope for this note before triggering it, as the player does.
    const shape = fitEnvelope(candidate.base, seconds)
    voice.envelope.decay = shape.decay
    voice.envelope.release = shape.release
    voice.triggerAttackRelease(
      Tone.Frequency(event.note.midi, 'midi').toFrequency(),
      seconds,
      time,
      velocityOf(event.note, candidate.accents),
    )
  }, PASSAGE.map((note) => ({ time: atBeat(note.start), note })))
  part.start(0)

  transport.scheduleOnce((time) => {
    Tone.getDraw().schedule(stop, time)
  }, atBeat(PASSAGE_BEATS + 0.5))

  transport.position = 0
  transport.start()
  render()
}

const root = document.getElementById('root')!
root.style.cssText =
  'font-family: system-ui, sans-serif; margin: 24px; max-width: 34rem; color: #222'

let bpm = 60

function render(): void {
  root.replaceChildren()

  const heading = document.createElement('h1')
  heading.textContent = 'Melody voices'
  heading.style.cssText = 'font-size: 20px; margin: 0 0 4px'
  root.append(heading)

  const blurb = document.createElement('p')
  blurb.textContent =
    'The same three bars — sextuplets and sixteenths against quarter notes, then a bar of' +
    ' swung eighths, with a repeated pitch and a rest in each group — through each candidate.'
  blurb.style.cssText = 'font-size: 14px; color: #555; margin: 0 0 20px'
  root.append(blurb)

  const tempo = document.createElement('label')
  tempo.style.cssText = 'display: flex; gap: 8px; align-items: center; font-size: 14px'
  tempo.append('Tempo')
  const slider = document.createElement('input')
  slider.type = 'range'
  slider.min = '40'
  slider.max = '160'
  slider.value = String(bpm)
  slider.oninput = () => {
    bpm = Number(slider.value)
    readout.textContent = String(bpm)
  }
  const readout = document.createElement('span')
  readout.textContent = String(bpm)
  tempo.append(slider, readout)
  root.append(tempo)

  for (const candidate of CANDIDATES) {
    const row = document.createElement('div')
    row.style.cssText = 'margin: 20px 0'

    const button = document.createElement('button')
    button.textContent = playing === candidate.name ? '■ Stop' : `▶ ${candidate.name}`
    button.style.cssText =
      'font: inherit; font-size: 15px; padding: 8px 14px; cursor: pointer; border-radius: 6px;' +
      ` border: 1px solid #bbb; background: ${playing === candidate.name ? '#e8e8ff' : '#fff'}`
    button.onclick = () => {
      if (playing === candidate.name) stop()
      else void play(candidate, bpm)
    }

    const note = document.createElement('p')
    note.textContent = candidate.note
    note.style.cssText = 'font-size: 13px; color: #555; margin: 6px 0 0'

    row.append(button, note)
    root.append(row)
  }
}

render()
