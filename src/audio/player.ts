import * as Tone from 'tone'
import type { Exercise } from '../music/exercise'
import { BEATS_PER_BAR } from '../music/rhythm'
import type { Part, ScheduledCue, ScheduledNote } from './schedule'
import { scheduleExercise } from './schedule'
import type { DrumHit } from './drums'
import { scheduleDrums } from './drums'
import { BASS_ENVELOPE, MELODY_ENVELOPE, fitEnvelope } from './envelope'

export interface PlayerOptions {
  bpm: number
  /** Where the off-beat eighth lands: 0.5 straight, 2/3 fully swung. */
  swing: number
  countIn: boolean
  muteBass: boolean
  muteMelody: boolean
  muteDrums: boolean
  /** Bar to start from. */
  startBar: number
  /** Bar to loop on its own, or null to loop the whole exercise. */
  loopBar: number | null
  /**
   * Fires as the music reaches each event of a part: a note as it sounds, a
   * rest as it begins. What is being read moves on either way.
   */
  onEvent: (part: Part, barIndex: number, index: number) => void
  /** Fires as each bar begins, for following the music on screen. */
  onBar: (barIndex: number) => void
  /**
   * Fires shortly before the loop wraps back to the top, so the page can go
   * there ahead of the sound. Arriving at the same moment as the first note
   * leaves no time to read it.
   */
  onWrapSoon: () => void
  /** Fires when playback ends, with the bar it was on so Play can resume there. */
  onStop: (barIndex: number) => void
}

const COUNT_IN_BEATS = 4

/**
 * How far before the wrap the page is sent back to the top. One beat: enough to
 * find the first bar before it sounds, and the beat it costs is one a reader is
 * already past.
 */
const WRAP_LEAD_BEATS = 1

/**
 * The kit. It is there to be felt rather than listened to, so both voices sit
 * well under the melody: the ride is a short, dry ping instead of a wash, and
 * the hi-hat foot is barely more than a tick.
 */
const RIDE_PITCH = 300
const RIDE_LEVEL = 0.5
const RIDE_ACCENT_LEVEL = 0.8
const HIHAT_LEVEL = 0.5

interface NoteEvent {
  time: string
  note: ScheduledNote
}

interface ClickEvent {
  time: string
  downbeat: boolean
}

interface DrumEvent {
  time: string
  hit: DrumHit
}

interface CueEvent {
  time: string
  cue: ScheduledCue
}

interface BarEvent {
  time: string
  barIndex: number
}

/**
 * Every voice built for one run of the player. `nodes` holds all of them and
 * the filters behind them, so tearing down is one loop rather than a line per
 * voice that has to be remembered when a new one is added.
 */
interface Kit {
  bass: Tone.Synth
  melody: Tone.Synth
  ride: Tone.MetalSynth
  hihat: Tone.NoiseSynth
  click: Tone.NoiseSynth
  nodes: Tone.ToneAudioNode[]
}

/** Tone takes tick counts written with an "i" suffix, and those follow tempo. */
function atBeat(beats: number): string {
  return `${Math.round(beats * Tone.getTransport().PPQ)}i`
}

export class Player {
  private parts: Tone.Part[] = []
  private kit: Kit | null = null
  private options: PlayerOptions | null = null
  private playing = false
  /** Beats of count-in in front of the music, needed to find bar boundaries. */
  private offsetBeats = 0
  private totalBeats = 0
  private queuedId: number | null = null

  get isPlaying(): boolean {
    return this.playing
  }

  /**
   * The two figures every seek and every bar count is worked out from. Ticks
   * per quarter note is a transport setting, so neither can be a constant.
   */
  private get ticksPerBar(): number {
    return BEATS_PER_BAR * Tone.getTransport().PPQ
  }

  /** Where the music starts, past any count-in in front of it. */
  private get offsetTicks(): number {
    return this.offsetBeats * Tone.getTransport().PPQ
  }

  async start(exercise: Exercise, options: PlayerOptions): Promise<void> {
    await Tone.start()
    this.teardown()
    this.options = options

    const transport = Tone.getTransport()
    transport.bpm.value = options.bpm
    // Swing is baked into the schedule, so the transport must not add its own.
    transport.swing = 0

    this.kit = this.buildInstruments()

    const { notes, cues, beats } = scheduleExercise(exercise, options.swing)

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
    this.offsetBeats = offset
    this.totalBeats = beats

    const musicEvents: NoteEvent[] = notes.map((note) => ({
      time: atBeat(note.time + offset),
      note,
    }))
    const music = new Tone.Part<NoteEvent>((time, event) => this.playNote(time, event.note), musicEvents)
    music.start(0)
    this.parts.push(music)

    // The rests, which move the highlight and nothing else. They are their own
    // part rather than silent notes in the music, so that nothing about the
    // sound has to make room for something that does not sound.
    const cueEvents: CueEvent[] = cues.map((cue) => ({
      time: atBeat(cue.time + offset),
      cue,
    }))
    const highlights = new Tone.Part<CueEvent>(
      (time, event) => this.showCue(time, event.cue),
      cueEvents,
    )
    highlights.start(0)
    this.parts.push(highlights)

    const drumEvents: DrumEvent[] = scheduleDrums(exercise.bars.length, options.swing).map(
      (hit) => ({ time: atBeat(hit.time + offset), hit }),
    )
    const drums = new Tone.Part<DrumEvent>(
      (time, event) => this.playDrum(time, event.hit),
      drumEvents,
    )
    drums.start(0)
    this.parts.push(drums)

    const barEvents: BarEvent[] = exercise.bars.map((_, barIndex) => ({
      time: atBeat(offset + barIndex * BEATS_PER_BAR),
      barIndex,
    }))
    const bars = new Tone.Part<BarEvent>((time, event) => {
      Tone.getDraw().schedule(() => this.options?.onBar(event.barIndex), time)
    }, barEvents)
    bars.start(0)
    this.parts.push(bars)

    if (beats > WRAP_LEAD_BEATS) {
      const wrap = new Tone.Part<{ time: string }>((time) => {
        // The cue sits in the last bar, which is also where a repeat of that
        // bar goes round — and a bar repeating on itself is already on screen.
        // Only the whole-exercise loop is going anywhere.
        if (this.options === null || this.options.loopBar !== null) return
        Tone.getDraw().schedule(() => this.options?.onWrapSoon(), time)
      }, [{ time: atBeat(offset + beats - WRAP_LEAD_BEATS) }])
      wrap.start(0)
      this.parts.push(wrap)
    }

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
    this.cancelQueued()
    const wasPlaying = this.playing
    // Read the bar off the transport before tearing it down. Following the
    // bars on screen goes through Draw, which lags and can be skipped, and
    // Play would then start over from wherever the screen had got to.
    const bar = wasPlaying ? this.currentBar() : 0
    this.teardown()
    if (wasPlaying) this.options?.onStop(bar)
  }

  /** The bar the transport is in now, counted past any count-in. */
  private currentBar(): number {
    const played = Tone.getTransport().ticks - this.offsetTicks
    if (played <= 0) return 0
    const bars = Math.floor(played / this.ticksPerBar)
    return Math.min(bars, Math.floor(this.totalBeats / BEATS_PER_BAR) - 1)
  }

  /**
   * Run `callback` when the bar now playing finishes.
   *
   * Changing what plays the instant a button is pressed cuts the bar in half;
   * a reader wants the phrase to land first. The transport fires ahead of time
   * so the audio stays smooth, which is why the callback goes through Draw —
   * that is what runs at the moment the listener actually hears the barline.
   */
  queueAtBarEnd(callback: () => void): void {
    if (!this.playing) {
      callback()
      return
    }
    const transport = Tone.getTransport()
    this.cancelQueued()
    // One tick early on purpose: while a single bar is looping, the barline is
    // the loop point, and the transport jumps back before ever reaching it.
    const boundary = Math.max(0, this.nextBarBoundaryTicks() - 1)
    this.queuedId = transport.scheduleOnce((time) => {
      this.queuedId = null
      Tone.getDraw().schedule(callback, time)
    }, `${boundary}i`)
  }

  /**
   * Jump to a bar and set what loops, without rebuilding anything.
   *
   * Seeking the transport makes Tone reschedule the parts around the new
   * position, so the music keeps running: tearing the player down and building
   * it again left an audible hole at every move.
   */
  moveTo(startBar: number, loopBar: number | null): void {
    if (!this.playing) return
    const transport = Tone.getTransport()
    const { ticksPerBar, offsetTicks } = this

    const loopStart = offsetTicks + (loopBar === null ? 0 : loopBar * ticksPerBar)
    const loopEnd =
      loopBar === null
        ? offsetTicks + this.totalBeats * transport.PPQ
        : loopStart + ticksPerBar

    transport.loopStart = `${loopStart}i`
    transport.loopEnd = `${loopEnd}i`
    transport.ticks = offsetTicks + startBar * ticksPerBar

    if (this.options) {
      this.options.startBar = startBar
      this.options.loopBar = loopBar
    }
  }

  cancelQueued(): void {
    if (this.queuedId === null) return
    Tone.getTransport().clear(this.queuedId)
    this.queuedId = null
  }

  private nextBarBoundaryTicks(): number {
    const { ticksPerBar, offsetTicks } = this
    const ticks = Tone.getTransport().ticks
    if (ticks < offsetTicks) return offsetTicks
    const barsDone = Math.floor((ticks - offsetTicks) / ticksPerBar)
    return offsetTicks + (barsDone + 1) * ticksPerBar
  }

  setBpm(bpm: number): void {
    if (this.options) this.options.bpm = bpm
    Tone.getTransport().bpm.value = bpm
  }

  setMutes(muteBass: boolean, muteMelody: boolean, muteDrums: boolean): void {
    if (!this.options) return
    this.options.muteBass = muteBass
    this.options.muteMelody = muteMelody
    this.options.muteDrums = muteDrums
  }

  /** Which voice plays a line, how it is tuned, and whether it is muted. */
  private voiceFor(part: Part, options: PlayerOptions, kit: Kit) {
    return part === 'bass'
      ? { instrument: kit.bass, base: BASS_ENVELOPE, muted: options.muteBass }
      : { instrument: kit.melody, base: MELODY_ENVELOPE, muted: options.muteMelody }
  }

  private playNote(time: number, note: ScheduledNote): void {
    const options = this.options
    if (options === null || this.kit === null) return

    const { instrument, base, muted } = this.voiceFor(note.part, options, this.kit)
    if (muted) return

    // Re-cut the envelope for this note before it is triggered: the envelope
    // stages are plain values Tone reads as it schedules the ramps, so setting
    // them here is what this note gets and the next note can have its own.
    const seconds = (note.duration * 60) / Tone.getTransport().bpm.value
    const shape = fitEnvelope(base, seconds)
    instrument.envelope.decay = shape.decay
    instrument.envelope.release = shape.release

    const frequency = Tone.Frequency(note.midi, 'midi').toFrequency()
    instrument.triggerAttackRelease(frequency, atBeat(note.duration), time, note.velocity)

    Tone.getDraw().schedule(() => {
      options.onEvent(note.part, note.barIndex, note.index)
    }, time)
  }

  /**
   * Move the highlight onto a rest. A muted part is left alone, the same way a
   * muted note goes unhighlighted: what is switched off is not being read.
   */
  private showCue(time: number, cue: ScheduledCue): void {
    const options = this.options
    if (options === null || this.kit === null) return
    if (this.voiceFor(cue.part, options, this.kit).muted) return

    Tone.getDraw().schedule(() => {
      options.onEvent(cue.part, cue.barIndex, cue.index)
    }, time)
  }

  private playDrum(time: number, hit: DrumHit): void {
    const options = this.options
    if (options === null || options.muteDrums || this.kit === null) return

    if (hit.voice === 'hihat') {
      this.kit.hihat.triggerAttackRelease('64n', time, HIHAT_LEVEL)
      return
    }
    this.kit.ride.triggerAttackRelease(
      RIDE_PITCH,
      '16n',
      time,
      hit.accent ? RIDE_ACCENT_LEVEL : RIDE_LEVEL,
    )
  }

  private playClick(time: number, event: ClickEvent): void {
    this.kit?.click.triggerAttackRelease('32n', time, event.downbeat ? 1 : 0.5)
  }

  private buildInstruments(): Kit {
    // Plain synths on purpose: the pitch and the rhythm have to be obvious,
    // and richer voices made both harder to follow.
    const bass = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: BASS_ENVELOPE,
      volume: -4,
    }).toDestination()
    const melody = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: MELODY_ENVELOPE,
      volume: -10,
    }).toDestination()

    // A cymbal is a crowd of inharmonic partials, which is exactly what
    // MetalSynth makes. The short decay is deliberate: a ride left to ring
    // washes over the very eighth notes the reader is trying to hear.
    const ride = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.28, release: 0.05 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.2,
      volume: -30,
    }).toDestination()

    const hihatFilter = new Tone.Filter({ frequency: 8000, type: 'highpass' }).toDestination()
    const hihat = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.01 },
      volume: -22,
    }).connect(hihatFilter)

    const clickFilter = new Tone.Filter({ frequency: 4000, type: 'highpass' }).toDestination()
    const click = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 },
      volume: -10,
    }).connect(clickFilter)

    return {
      bass,
      melody,
      ride,
      hihat,
      click,
      nodes: [bass, melody, ride, hihat, click, hihatFilter, clickFilter],
    }
  }

  private teardown(): void {
    this.queuedId = null
    const transport = Tone.getTransport()
    transport.stop()
    transport.cancel()
    transport.loop = false
    transport.position = 0

    for (const part of this.parts) part.dispose()
    this.parts = []

    for (const node of this.kit?.nodes ?? []) node.dispose()
    this.kit = null

    this.playing = false
  }
}
