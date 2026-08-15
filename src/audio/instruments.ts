import * as Tone from 'tone'

/**
 * Every voice here is synthesised. A convincing acoustic piano needs recorded
 * samples — several megabytes of them — which is a bigger commitment than a
 * practice page should make without being asked.
 */
export type Instrument = Tone.Synth | Tone.MonoSynth | Tone.FMSynth | Tone.PluckSynth

export type BassVoice = 'synth' | 'upright' | 'epiano' | 'organ'
export type MelodyVoice = 'synth' | 'epiano' | 'vibes' | 'organ' | 'pluck'

export const BASS_VOICES: Array<{ id: BassVoice; label: string }> = [
  { id: 'synth', label: 'Synth' },
  { id: 'upright', label: 'Upright' },
  { id: 'epiano', label: 'E. piano' },
  { id: 'organ', label: 'Organ' },
]

export const MELODY_VOICES: Array<{ id: MelodyVoice; label: string }> = [
  { id: 'synth', label: 'Synth' },
  { id: 'epiano', label: 'E. piano' },
  { id: 'vibes', label: 'Vibraphone' },
  { id: 'organ', label: 'Organ' },
  { id: 'pluck', label: 'Plucked' },
]

export function createBass(voice: BassVoice): Instrument {
  switch (voice) {
    case 'upright':
      return new Tone.MonoSynth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.2 },
        filterEnvelope: {
          attack: 0.005,
          decay: 0.15,
          sustain: 0,
          release: 0.2,
          baseFrequency: 100,
          octaves: 2.5,
        },
        volume: -2,
      }).toDestination()

    case 'epiano':
      return new Tone.FMSynth({
        harmonicity: 2,
        modulationIndex: 6,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.004, decay: 0.7, sustain: 0.08, release: 0.4 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.002, decay: 0.25, sustain: 0, release: 0.2 },
        volume: -5,
      }).toDestination()

    case 'organ':
      return new Tone.Synth({
        oscillator: { type: 'sine2' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.9, release: 0.12 },
        volume: -8,
      }).toDestination()

    default:
      return new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.005, decay: 0.25, sustain: 0.2, release: 0.3 },
        volume: -4,
      }).toDestination()
  }
}

export function createMelody(voice: MelodyVoice): Instrument {
  switch (voice) {
    case 'epiano':
      return new Tone.FMSynth({
        harmonicity: 3,
        modulationIndex: 9,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.003, decay: 1.2, sustain: 0.04, release: 0.5 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.002, decay: 0.3, sustain: 0, release: 0.2 },
        volume: -9,
      }).toDestination()

    case 'vibes':
      return new Tone.FMSynth({
        harmonicity: 3.01,
        modulationIndex: 5,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.002, decay: 1.6, sustain: 0, release: 0.8 },
        modulation: { type: 'sine' },
        modulationEnvelope: { attack: 0.002, decay: 0.6, sustain: 0, release: 0.4 },
        volume: -8,
      }).toDestination()

    case 'organ':
      return new Tone.Synth({
        oscillator: { type: 'sine4' },
        envelope: { attack: 0.02, decay: 0.05, sustain: 0.95, release: 0.1 },
        volume: -14,
      }).toDestination()

    case 'pluck':
      return new Tone.PluckSynth({
        attackNoise: 1,
        dampening: 3200,
        resonance: 0.92,
        volume: -4,
      }).toDestination()

    default:
      return new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.004, decay: 0.2, sustain: 0.25, release: 0.25 },
        volume: -8,
      }).toDestination()
  }
}
