export type Theme = 'system' | 'light' | 'dark'

export const THEMES: Theme[] = ['system', 'light', 'dark']

const STORAGE_KEY = 'srt.theme'

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as string[]).includes(value)
}

export function loadTheme(storage: Pick<Storage, 'getItem'>): Theme {
  try {
    const stored = storage.getItem(STORAGE_KEY)
    return isTheme(stored) ? stored : 'system'
  } catch {
    // Private browsing modes can make storage throw rather than return null.
    return 'system'
  }
}

export function saveTheme(storage: Pick<Storage, 'setItem'>, theme: Theme): void {
  try {
    storage.setItem(STORAGE_KEY, theme)
  } catch {
    // A theme that fails to persist is not worth breaking the page over.
  }
}

/**
 * 'system' leaves the attribute off so the CSS media query decides; the other
 * two pin the palette regardless of the operating system setting.
 */
export function applyTheme(root: HTMLElement, theme: Theme): void {
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}
