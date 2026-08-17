import { BEATS_PER_BAR } from '../music/rhythm'

export type DrumVoice = 'ride' | 'hihat'

export interface DrumHit {
  /** Position from the start of the exercise, in quarter-note beats. */
  time: number
  voice: DrumVoice
  /** The strokes a drummer leans on, played a little harder. */
  accent: boolean
}

/** Two and four: the beats the ride leans on and the hi-hat foot closes. */
const BACKBEATS = [1, 3]

/**
 * The jazz ride pattern — "ding, ding-da, ding, ding-da": a stroke on every
 * beat, and a swung eighth after two and four. The hi-hat foot closes on those
 * same two beats underneath it.
 *
 * The swung strokes take the same ratio the melody does, so the kit is what the
 * swing setting sounds like rather than a fixed feel sitting behind it.
 */
export function scheduleDrums(barCount: number, swing: number): DrumHit[] {
  const hits: DrumHit[] = []

  for (let bar = 0; bar < barCount; bar++) {
    const start = bar * BEATS_PER_BAR
    for (let beat = 0; beat < BEATS_PER_BAR; beat++) {
      const backbeat = BACKBEATS.includes(beat)
      hits.push({ time: start + beat, voice: 'ride', accent: backbeat })
      if (!backbeat) continue
      // After two and four only. A stroke after every beat is a shuffle, which
      // is a different feel altogether.
      hits.push({ time: start + beat + swing, voice: 'ride', accent: false })
      hits.push({ time: start + beat, voice: 'hihat', accent: false })
    }
  }

  return hits.sort((a, b) => a.time - b.time)
}
