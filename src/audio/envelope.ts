/** The four stages of an amplitude envelope, in seconds (sustain is a level). */
export interface EnvelopeShape {
  attack: number
  decay: number
  sustain: number
  release: number
}

/**
 * The voices as they are tuned for a note of ordinary length — a walking
 * quarter note, and a melody note of about the same.
 */
export const BASS_ENVELOPE: EnvelopeShape = {
  attack: 0.005,
  decay: 0.25,
  sustain: 0.2,
  release: 0.3,
}

/**
 * Held rather than plucked. A note that drops to a quarter of its level as soon
 * as it starts is a blip, and a run of them is a row of blips; keeping the
 * level up for the length of the note is what makes a run sound like a line.
 */
export const MELODY_ENVELOPE: EnvelopeShape = {
  attack: 0.012,
  decay: 0.3,
  sustain: 0.85,
  release: 0.18,
}

/** How much of a note the decay may take, and how much of it the release may. */
const DECAY_SHARE = 0.5
const RELEASE_SHARE = 0.25

/** Below this a stage stops being a fade and starts being a click. */
const MIN_STAGE = 0.015

/**
 * Cut the envelope down to fit a short note.
 *
 * The tuning above suits a quarter note; a sextuplet at a slow tempo is a sixth
 * of one. Left alone, the decay is still running and the release still fading
 * when the next note arrives — and the synth is monophonic, so the next note
 * simply takes the voice. A run comes out as one smear instead of six notes.
 *
 * Long notes come back unchanged: the shares only bite once a note is shorter
 * than the envelope was drawn for.
 */
export function fitEnvelope(base: EnvelopeShape, seconds: number): EnvelopeShape {
  return {
    ...base,
    decay: fit(base.decay, seconds * DECAY_SHARE),
    release: fit(base.release, seconds * RELEASE_SHARE),
  }
}

function fit(natural: number, room: number): number {
  return Math.max(MIN_STAGE, Math.min(natural, room))
}
