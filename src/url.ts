import type { Level } from './music/rhythm'
import { LEVELS } from './music/rhythm'
import { DEFAULT_LEVEL, DEFAULT_TEMPO, clampTempo } from './settings'

/**
 * The two things the address bar carries, so a link opens on the same exercise
 * settings rather than on whatever the browser last remembered. They are kept
 * out of storage on purpose: holding the same value in two places means a link
 * opened once would quietly become the default for every later visit.
 */
export const LEVEL_PARAM = 'lv'
export const TEMPO_PARAM = 'bpm'

export interface UrlState {
  level: Level
  bpm: number
}

const isLevel = (value: number): value is Level => LEVELS.includes(value as Level)

/** Anything that is not a level on offer falls back rather than throwing the page. */
function level(value: string | null): Level {
  if (value === null) return DEFAULT_LEVEL
  const parsed = Number(value)
  return isLevel(parsed) ? parsed : DEFAULT_LEVEL
}

function tempo(value: string | null): number {
  if (value === null) return DEFAULT_TEMPO
  const parsed = Number(value)
  if (value.trim() === '' || !Number.isFinite(parsed)) return DEFAULT_TEMPO
  return clampTempo(parsed)
}

/** Reads a query string — `?lv=5&bpm=90` — into the state it stands for. */
export function readUrlState(search: string): UrlState {
  const params = new URLSearchParams(search)
  return { level: level(params.get(LEVEL_PARAM)), bpm: tempo(params.get(TEMPO_PARAM)) }
}

/**
 * The query the address bar should be showing. Whatever else is in it is left
 * as it stands, so a parameter this app knows nothing about survives a change
 * of level.
 */
export function withUrlState(search: string, state: UrlState): string {
  const params = new URLSearchParams(search)
  params.set(LEVEL_PARAM, String(state.level))
  params.set(TEMPO_PARAM, String(state.bpm))
  return `?${params.toString()}`
}

export function loadUrlState(): UrlState {
  return readUrlState(window.location.search)
}

/**
 * Writes the state back without adding a history entry: stepping through
 * levels is not something the Back button should have to walk out of.
 */
export function saveUrlState(state: UrlState): void {
  const search = withUrlState(window.location.search, state)
  if (search === window.location.search) return
  const { pathname, hash } = window.location
  window.history.replaceState(window.history.state, '', `${pathname}${search}${hash}`)
}
