import { describe, expect, it } from 'vitest'
import { MELODY_ENVELOPE, fitEnvelope } from './envelope'

/** Six to the beat at 60bpm, less the articulation gap. */
const SEXTUPLET = 0.153

describe('fitEnvelope', () => {
  it('leaves a long note alone', () => {
    expect(fitEnvelope(MELODY_ENVELOPE, 2)).toEqual(MELODY_ENVELOPE)
  })

  it('barely touches a quarter note at a slow tempo', () => {
    const fitted = fitEnvelope(MELODY_ENVELOPE, 0.92)
    expect(fitted.decay).toBe(MELODY_ENVELOPE.decay)
    expect(MELODY_ENVELOPE.release - fitted.release).toBeLessThan(0.03)
  })

  it('cuts the decay and release down for a sextuplet', () => {
    const fitted = fitEnvelope(MELODY_ENVELOPE, SEXTUPLET)
    // Both stages have to fit inside the note rather than run past it — the
    // release cannot end before the next note starts, but it can be most of
    // the way down by then, which is what stops a run smearing.
    expect(fitted.decay).toBeLessThan(SEXTUPLET)
    expect(fitted.release).toBeLessThan(SEXTUPLET / 3)
  })

  it('keeps the attack and the sustain level as they were', () => {
    const fitted = fitEnvelope(MELODY_ENVELOPE, 0.05)
    expect(fitted.attack).toBe(MELODY_ENVELOPE.attack)
    expect(fitted.sustain).toBe(MELODY_ENVELOPE.sustain)
  })

  it('never shortens a stage into a click', () => {
    const fitted = fitEnvelope(MELODY_ENVELOPE, 0.001)
    expect(fitted.decay).toBeGreaterThanOrEqual(0.015)
    expect(fitted.release).toBeGreaterThanOrEqual(0.015)
  })

  it('shortens by degrees rather than all at once', () => {
    const slower = fitEnvelope(MELODY_ENVELOPE, 0.3)
    const faster = fitEnvelope(MELODY_ENVELOPE, SEXTUPLET)
    expect(faster.release).toBeLessThan(slower.release)
  })
})
