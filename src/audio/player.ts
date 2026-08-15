import * as Tone from 'tone'
import type { Exercise } from '../music/exercise'
import type { Part, ScheduledNote } from './schedule'
import type { BassVoice, Instrument, MelodyVoice } from './instruments'
import { createBass, createMelody } from './instruments'
import { scheduleExercise } from './schedule'

export interface PlayerOptions {
  bpm: number
  /** Where the off-beat eighth lands: 0.5 straight, 2/3 fully swung. */
  swing: number
  countIn: boolean
  metronome: boolean
  muteBass: boolean
  muteMelody: boolean
  bassVoice: BassVoice
  melodyVoice: MelodyVoice
  onNote: (part: Part, barIndex: number, index: number) => void
  onStop: () => void
}

const COUNT_IN_BEATS = 4

interface NoteEvent {
  time: string
  note: ScheduledNote
}

interface ClickEvent {
  time: string
  /** Count-in clicks always sound; the rest follow the metronome setting. */
  countIn: boolean
  downbeat: boolean
}

/** Tone takes tick counts written with an "i" suffix, and those follow tempo. */
function atBeat(beats: number): string {
  return `${Math.round(beats * Tone.getTransport().PPQ)}i`
}

export class Player {
  private parts: Tone.Part[] = []
  private bass: Instrument | null = null
  private melody: Instrument | null = null
  private click: Tone.NoiseSynth | null = null
  private clickFilter: Tone.Filter | null = null
  private options: PlayerOptions | null = null
  private playing = false

  get isPlaying(): boolean {
    return this.playing
  }

  async start(exercise: Exercise, options: PlayerOptions): Promise<void> {
    await Tone.start()
    this.teardown()
    this.options = options

    const transport = Tone.getTransport()
    transport.bpm.value = options.bpm
    // Swing is baked into the schedule, so the transport must not add its own.
    transport.swing = 0

    this.buildInstruments(options.bassVoice, options.melodyVoice)

    const { notes, beats } = scheduleExercise(exercise, options.swing)
    const offset = options.countIn ? COUNT_IN_BEATS : 0

    const musicEvents: NoteEvent[] = notes.map((note) => ({
      time: atBeat(note.time + offset),
      note,
    }))
    const music = new Tone.Part<NoteEvent>((time, event) => this.playNote(time, event.note), musicEvents)
    music.start(0)
    this.parts.push(music)

    const clickEvents: ClickEvent[] = []
    for (let beat = 0; beat < offset; beat++) {
      clickEvents.push({ time: atBeat(beat), countIn: true, downbeat: beat === 0 })
    }
    for (let beat = 0; beat < beats; beat++) {
      clickEvents.push({ time: atBeat(offset + beat), countIn: false, downbeat: beat % 4 === 0 })
    }
    const clicks = new Tone.Part<ClickEvent>((time, event) => this.playClick(time, event), clickEvents)
    clicks.start(0)
    this.parts.push(clicks)

    transport.loop = true
    transport.loopStart = atBeat(offset)
    transport.loopEnd = atBeat(offset + beats)

    transport.position = 0
    transport.start()
    this.playing = true
  }

  stop(): void {
    const wasPlaying = this.playing
    this.teardown()
    if (wasPlaying) this.options?.onStop()
  }

  setBpm(bpm: number): void {
    if (this.options) this.options.bpm = bpm
    Tone.getTransport().bpm.value = bpm
  }

  setMetronome(on: boolean): void {
    if (this.options) this.options.metronome = on
  }

  setMutes(muteBass: boolean, muteMelody: boolean): void {
    if (!this.options) return
    this.options.muteBass = muteBass
    this.options.muteMelody = muteMelody
  }

  private playNote(time: number, note: ScheduledNote): void {
    const options = this.options
    if (!options) return
    if (note.part === 'bass' ? options.muteBass : options.muteMelody) return

    const instrument = note.part === 'bass' ? this.bass : this.melody
    const frequency = Tone.Frequency(note.midi, 'midi').toFrequency()
    instrument?.triggerAttackRelease(frequency, atBeat(note.duration), time)

    Tone.getDraw().schedule(() => {
      options.onNote(note.part, note.barIndex, note.index)
    }, time)
  }

  private playClick(time: number, event: ClickEvent): void {
    if (!event.countIn && !this.options?.metronome) return
    this.click?.triggerAttackRelease('32n', time, event.downbeat ? 1 : 0.5)
  }

  private buildInstruments(bassVoice: BassVoice, melodyVoice: MelodyVoice): void {
    this.bass = createBass(bassVoice)
    this.melody = createMelody(melodyVoice)

    this.clickFilter = new Tone.Filter({ frequency: 4000, type: 'highpass' }).toDestination()
    this.click = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 },
      volume: -10,
    }).connect(this.clickFilter)
  }

  private teardown(): void {
    const transport = Tone.getTransport()
    transport.stop()
    transport.cancel()
    transport.loop = false
    transport.position = 0

    for (const part of this.parts) part.dispose()
    this.parts = []

    this.bass?.dispose()
    this.bass = null
    this.melody?.dispose()
    this.melody = null
    this.click?.dispose()
    this.click = null
    this.clickFilter?.dispose()
    this.clickFilter = null

    this.playing = false
  }
}
