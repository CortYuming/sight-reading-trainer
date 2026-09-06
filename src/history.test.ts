// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { HistoryEntry } from './history'
import {
  HISTORY_LIMIT,
  entryLabel,
  loadHistory,
  readHistory,
  remember,
  saveHistory,
} from './history'

const entry = (seed: number, over: Partial<HistoryEntry> = {}): HistoryEntry => ({
  keyName: 'Bb',
  progressionId: 'blues',
  level: 2,
  seed,
  // Built from local parts, so the label reads the same in any timezone.
  at: new Date(2026, 7, 16, 10, 12, 34).getTime(),
  ...over,
})

describe('remember', () => {
  it('puts the newest first', () => {
    const history = remember(remember([], entry(1)), entry(2))
    expect(history.map((e) => e.seed)).toEqual([2, 1])
  })

  it('keeps only the most recent few', () => {
    let history: HistoryEntry[] = []
    for (let seed = 1; seed <= HISTORY_LIMIT + 3; seed++) history = remember(history, entry(seed))
    expect(history).toHaveLength(HISTORY_LIMIT)
    expect(history[0].seed).toBe(HISTORY_LIMIT + 3)
  })

  it('moves an exercise up instead of listing it twice', () => {
    let history: HistoryEntry[] = []
    for (const seed of [1, 2, 3]) history = remember(history, entry(seed))
    history = remember(history, entry(1))
    expect(history.map((e) => e.seed)).toEqual([1, 3, 2])
  })

  it('leaves the list alone when nothing changed', () => {
    const history = remember([], entry(1))
    expect(remember(history, entry(1))).toBe(history)
  })

  it('tells apart two exercises that differ only in key', () => {
    const history = remember(remember([], entry(1)), entry(1, { keyName: 'F' }))
    expect(history).toHaveLength(2)
  })
})

describe('entryLabel', () => {
  it('reads as a zero-padded date and time, down to the second', () => {
    expect(entryLabel(entry(1))).toBe('08/16 10:12:34')
    expect(entryLabel(entry(1, { at: new Date(2026, 0, 3, 9, 5, 7).getTime() }))).toBe(
      '01/03 09:05:07',
    )
  })
})

describe('readHistory', () => {
  it('starts empty on anything that is not a list', () => {
    expect(readHistory(null)).toEqual([])
    expect(readHistory({ seed: 1 })).toEqual([])
  })

  it('drops an entry it could not generate again, and keeps the rest', () => {
    const stored = [
      entry(1),
      { ...entry(2), keyName: 'Gb' },
      { ...entry(3), progressionId: 'rhythm-changes' },
      { ...entry(4), level: 99 },
      { ...entry(5), seed: 'random' },
      // Written before the list carried times, so it can no longer be labelled.
      { keyName: 'Bb', progressionId: 'blues', level: 2, seed: 7 },
      entry(6),
    ]
    expect(readHistory(stored).map((e) => e.seed)).toEqual([1, 6])
  })

  it('keeps an entry read in the random key, which the seed generates again', () => {
    expect(readHistory([{ ...entry(8), keyName: 'random' }]).map((e) => e.seed)).toEqual([8])
  })

  it('never returns more than it stores', () => {
    const stored = Array.from({ length: 20 }, (_, i) => entry(i))
    expect(readHistory(stored)).toHaveLength(HISTORY_LIMIT)
  })
})

describe('loadHistory', () => {
  beforeEach(() => localStorage.clear())

  it('is empty on a first visit', () => {
    expect(loadHistory()).toEqual([])
  })

  it('reads back what was saved', () => {
    const history = [entry(1), entry(2, { level: 7 })]
    saveHistory(history)
    expect(loadHistory()).toEqual(history)
  })

  it('survives a corrupt entry', () => {
    localStorage.setItem('sight-reading-trainer:history', 'not json')
    expect(loadHistory()).toEqual([])
  })
})
