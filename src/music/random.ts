/**
 * Seeded random generator (mulberry32).
 *
 * Exercises are generated from a seed so that a given exercise can be
 * reproduced exactly — both for tests and, later, for sharing a URL.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number
  /** Integer in [0, n). */
  int(n: number): number
  /** True with probability p. */
  chance(p: number): boolean
  /** Uniformly pick one item. */
  pick<T>(items: readonly T[]): T
  /** Pick one item, where weights[i] is the relative weight of items[i]. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (n: number): number => Math.floor(next() * n)

  return {
    next,
    int,
    chance: (p) => next() < p,
    pick: (items) => items[int(items.length)],
    weighted: (items, weights) => {
      const total = weights.reduce((a, b) => a + b, 0)
      let r = next() * total
      for (let i = 0; i < items.length; i++) {
        r -= weights[i]
        if (r < 0) return items[i]
      }
      return items[items.length - 1]
    },
  }
}
