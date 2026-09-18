import type { Level } from './music/rhythm'
import type { SwingId } from './audio/schedule'
import { SWING_SETTINGS } from './audio/schedule'
import { KEYS, RANDOM_KEY } from './music/pitch'
import { PROGRESSIONS } from './music/progression'

const STORAGE_KEY = 'sight-reading-trainer:settings'

export const TEMPO_MIN = 40
export const TEMPO_MAX = 240

/**
 * Where a visit starts when the URL says nothing. The level and the tempo live
 * in the address bar rather than in storage (see `src/url.ts`), so these are
 * what a bare link opens on.
 */
export const DEFAULT_LEVEL: Level = 2
export const DEFAULT_TEMPO = 60

/**
 * What the page remembers between visits. Three things are deliberately left
 * out: the seed, because coming back should give a fresh exercise rather than
 * the one already read, and the level and the tempo, because those are carried
 * by the URL instead.
 */
export interface Settings {
  keyName: string
  progressionId: string
  swing: SwingId
  countIn: boolean
  playBass: boolean
  playMelody: boolean
  playDrums: boolean
  showNoteNames: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  keyName: 'Bb',
  progressionId: 'blues',
  // Medium by default: the 2:1 triplet feel the notation itself implies, which
  // is the least ambiguous thing to read against.
  swing: 'medium',
  countIn: true,
  playBass: true,
  playMelody: true,
  playDrums: true,
  // Off by default: reading the pitch off the staff is the exercise, so the
  // letters are there to fall back on rather than to read instead.
  showNoteNames: false,
}

function oneOf<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function boolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

/** A tempo the app will accept: a whole number inside the slider's range. */
export const clampTempo = (value: number): number =>
  Math.min(TEMPO_MAX, Math.max(TEMPO_MIN, Math.round(value)))

/**
 * Reads whatever was stored field by field. Anything missing or no longer
 * offered — a key that was dropped, a form that was renamed — falls back on
 * its own, so one stale field cannot throw the rest of the settings away.
 */
export function readSettings(stored: unknown): Settings {
  if (stored === null || typeof stored !== 'object') return DEFAULT_SETTINGS
  const raw = stored as Record<string, unknown>
  return {
    keyName: oneOf(
      raw.keyName,
      [RANDOM_KEY, ...KEYS.map((k) => k.name)],
      DEFAULT_SETTINGS.keyName,
    ),
    progressionId: oneOf(
      raw.progressionId,
      PROGRESSIONS.map((p) => p.id),
      DEFAULT_SETTINGS.progressionId,
    ),
    swing: oneOf(
      raw.swing,
      SWING_SETTINGS.map((s) => s.id),
      DEFAULT_SETTINGS.swing,
    ),
    countIn: boolean(raw.countIn, DEFAULT_SETTINGS.countIn),
    playBass: boolean(raw.playBass, DEFAULT_SETTINGS.playBass),
    playMelody: boolean(raw.playMelody, DEFAULT_SETTINGS.playMelody),
    playDrums: boolean(raw.playDrums, DEFAULT_SETTINGS.playDrums),
    showNoteNames: boolean(raw.showNoteNames, DEFAULT_SETTINGS.showNoteNames),
  }
}

/** Storage can be unavailable or full, and neither is worth a broken page. */
export function loadSettings(): Settings {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    if (text === null) return DEFAULT_SETTINGS
    return readSettings(JSON.parse(text))
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Private-mode Safari and a full quota both land here. Nothing to do.
  }
}
