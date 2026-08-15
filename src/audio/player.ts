import * as Tone from 'tone'
import type { Exercise } from '../music/exercise'
import type { Part, ScheduledNote } from './schedule'
import { scheduleExercise } from './schedule'

export interface PlayerOptions {
  bpm: number
  /** Where the off-beat eighth lands: 0.5 straight, 2/3 fully swung. */
  swing: number
  countIn: boolean
  muteBass: boolean
  muteMelody: boolean
  /** Bar to start from. */
  startBar: number
  /** Bar to loop on its own, or null to loop the whole exercise. */
  loopBar: number | null
  onNote: (part: Part, barIndex: number, index: number) => void
  /** Fires as each bar begins, for following the music on screen. */
  onBar: (barIndex: number) => void
  onStop: () => void
}

const COUNT_IN_BEATS = 4

interface NoteEvent {
  time: string
  note: ScheduledNote
}

interface ClickEvent {
  time: string
  downbeat: boolean
}

interface BarEvent {
  time: string
  barIndex: number
}

const BEATS_PER_BAR = 4

/** Tone takes tick counts written with an "i" suffix, and those follow tempo. */
function atBeat(beats: number): string {
  return `${Math.round(beats * Tone.getTransport().PPQ)}i`
}

export class Player {
  private parts: Tone.Part[] = []
  private bass: Tone.Synth | null = null
  private melody: Tone.Synth | null = null
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

    this.buildInstruments()

    const { notes, beats } = scheduleExercise(exercise, options.swing)

    const loopStartBeat = options.loopBar === null ? 0 : options.loopBar * BEATS_PER_BAR
    const loopEndBeat = options.loopBar === null ? beats : loopStartBeat + BEATS_PER_BAR
    const startBeat = Math.min(
      Math.max(options.startBar * BEATS_PER_BAR, loopStartBeat),
      loopEndBeat - BEATS_PER_BAR,
    )

    // The count-in only makes sense when the music starts at the top of the
    // loop; jumping into the middle of a bar sequence just resumes.
    const useCountIn = options.countIn && startBeat === loopStartBeat
    const offset = useCountIn ? COUNT_IN_BEATS : 0

    const musicEvents: NoteEvent[] = notes.map((note) => ({
      time: atBeat(note.time + offset),
      note,
    }))
    const music = new Tone.Part<NoteEvent>((time, event) => this.playNote(time, event.note), musicEvents)
    music.start(0)
    this.parts.push(music)

    const barEvents: BarEvent[] = exercise.bars.map((_, barIndex) => ({
      time: atBeat(offset + barIndex * BEATS_PER_BAR),
      barIndex,
    }))
    const bars = new Tone.Part<BarEvent>((time, event) => {
      Tone.getDraw().schedule(() => this.options?.onBar(event.barIndex), time)
    }, barEvents)
    bars.start(0)
    this.parts.push(bars)

    const clickEvents: ClickEvent[] = []
    for (let beat = 0; beat < offset; beat++) {
      clickEvents.push({ time: atBeat(beat), downbeat: beat === 0 })
    }
    if (clickEvents.length > 0) {
      const clicks = new Tone.Part<ClickEvent>(
        (time, event) => this.playClick(time, event),
        clickEvents,
      )
      clicks.start(0)
      this.parts.push(clicks)
    }

    transport.loop = true
    transport.loopStart = atBeat(offset + loopStartBeat)
    transport.loopEnd = atBeat(offset + loopEndBeat)

    transport.position = useCountIn ? 0 : atBeat(offset + startBeat)
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
    this.click?.triggerAttackRelease('32n', time, event.downbeat ? 1 : 0.5)
  }

  private buildInstruments(): void {
    // Plain synths on purpose: the pitch and the rhythm have to be obvious,
    // and richer voices made both harder to follow.
    this.bass = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.25, sustain: 0.2, release: 0.3 },
      volume: -4,
    }).toDestination()
    this.melody = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.004, decay: 0.2, sustain: 0.25, release: 0.25 },
      volume: -8,
    }).toDestination()

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
