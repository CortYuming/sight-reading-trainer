import { describe, expect, it } from 'vitest'
import { FULL_SWING, STRAIGHT } from './schedule'
import { scheduleDrums } from './drums'

const times = (hits: ReturnType<typeof scheduleDrums>, voice: 'ride' | 'hihat') =>
  hits.filter((hit) => hit.voice === voice).map((hit) => hit.time)

describe('scheduleDrums', () => {
  it('rides on every beat and after two and four', () => {
    expect(times(scheduleDrums(1, FULL_SWING), 'ride')).toEqual([
      0,
      1,
      1 + FULL_SWING,
      2,
      3,
      3 + FULL_SWING,
    ])
  })

  it('closes the hi-hat on two and four', () => {
    expect(times(scheduleDrums(2, FULL_SWING), 'hihat')).toEqual([1, 3, 5, 7])
  })

  it('places the swung strokes at the ratio it is given', () => {
    expect(times(scheduleDrums(1, STRAIGHT), 'ride')).toContain(1.5)
    expect(times(scheduleDrums(1, STRAIGHT), 'ride')).not.toContain(1 + FULL_SWING)
  })

  it('accents two and four, and nothing else', () => {
    const accents = scheduleDrums(1, FULL_SWING).filter((hit) => hit.accent)
    expect(accents).toEqual([
      { time: 1, voice: 'ride', accent: true },
      { time: 3, voice: 'ride', accent: true },
    ])
  })

  it('comes out in time order, bar after bar', () => {
    const hits = scheduleDrums(4, FULL_SWING)
    expect(hits).toEqual([...hits].sort((a, b) => a.time - b.time))
    expect(hits.at(-1)?.time).toBeLessThan(4 * 4)
  })
})
