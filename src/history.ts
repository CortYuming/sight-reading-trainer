import type { ExerciseOptions } from './music/exercise'
import type { Level } from './music/rhythm'
import { LEVELS } from './music/rhythm'
import { KEYS } from './music/pitch'
import { PROGRESSIONS } from './music/progression'

const STORAGE_KEY = 'sight-reading-trainer:history'

/** How many exercises are kept. The one on screen holds the first place. */
export const HISTORY_LIMIT = 5

/**
 * An exercise is nothing more than what it was generated from, so going back
 * to one is a matter of remembering four fields rather than a page of music.
 * The fifth, `at`, is only there to label it in the list.
 */
export interface HistoryEntry extends ExerciseOptions {
  /** When the exercise was last read, as a timestamp. */
  at: number
}

/**
 * Identifies an entry in the list and as the value of an option. The time is
 * left out: it is what the entry is labelled with, not what it is.
 */
export function entryId(entry: HistoryEntry): string {
  return `${entry.keyName}|${entry.progressionId}|${entry.level}|${entry.seed}`
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * e.g. "08/16 10:12:34". Down to the second, because two exercises read a
 * minute apart are otherwise labelled the same.
 */
export function entryLabel(entry: HistoryEntry): string {
  const at = new Date(entry.at)
  const date = `${pad(at.getMonth() + 1)}/${pad(at.getDate())}`
  const time = `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`
  return `${date} ${time}`
}

/**
 * Put an exercise at the front of the list, moving it there rather than adding
 * a second copy if it is already in.
 *
 * Going back to an old exercise counts as using it, which matters at the far
 * end: the next new exercise should push out something untouched, not the one
 * just picked out of the list to practise.
 */
export function remember(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const id = entryId(entry)
  if (history.length > 0 && entryId(history[0]) === id) return history
  return [entry, ...history.filter((other) => entryId(other) !== id)].slice(0, HISTORY_LIMIT)
}

/**
 * Unlike the settings, an entry missing a field is thrown away rather than
 * patched up: an exercise that cannot be generated again is no use in a list
 * whose whole purpose is generating it again.
 */
function readEntry(stored: unknown): HistoryEntry | null {
  if (stored === null || typeof stored !== 'object') return null
  const { keyName, progressionId, level, seed, at } = stored as Record<string, unknown>
  if (!KEYS.some((k) => k.name === keyName)) return null
  if (!PROGRESSIONS.some((p) => p.id === progressionId)) return null
  if (!LEVELS.includes(level as Level)) return null
  if (typeof seed !== 'number' || !Number.isInteger(seed)) return null
  if (typeof at !== 'number' || !Number.isFinite(at)) return null
  return {
    keyName: keyName as string,
    progressionId: progressionId as string,
    level: level as Level,
    seed,
    at,
  }
}

export function readHistory(stored: unknown): HistoryEntry[] {
  if (!Array.isArray(stored)) return []
  const entries: HistoryEntry[] = []
  for (const raw of stored) {
    const entry = readEntry(raw)
    if (entry !== null) entries.push(entry)
  }
  return entries.slice(0, HISTORY_LIMIT)
}

/** Storage can be unavailable or full, and neither is worth a broken page. */
export function loadHistory(): HistoryEntry[] {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    if (text === null) return []
    return readHistory(JSON.parse(text))
  } catch {
    return []
  }
}

export function saveHistory(history: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch {
    // Private-mode Safari and a full quota both land here. Nothing to do.
  }
}
