// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { applyTheme, isTheme, loadTheme, saveTheme } from './theme'

function fakeStorage(initial?: string) {
  let value = initial
  return {
    getItem: () => value ?? null,
    setItem: (_key: string, next: string) => {
      value = next
    },
    read: () => value,
  }
}

describe('isTheme', () => {
  it('accepts the three themes and nothing else', () => {
    expect(isTheme('system')).toBe(true)
    expect(isTheme('light')).toBe(true)
    expect(isTheme('dark')).toBe(true)
    expect(isTheme('sepia')).toBe(false)
    expect(isTheme(null)).toBe(false)
  })
})

describe('loadTheme', () => {
  it('reads a stored theme', () => {
    expect(loadTheme(fakeStorage('dark'))).toBe('dark')
  })

  it('falls back to system for missing or bad values', () => {
    expect(loadTheme(fakeStorage())).toBe('system')
    expect(loadTheme(fakeStorage('sepia'))).toBe('system')
  })

  it('survives storage that throws', () => {
    expect(
      loadTheme({
        getItem: () => {
          throw new Error('denied')
        },
      }),
    ).toBe('system')
  })
})

describe('saveTheme', () => {
  it('writes the theme', () => {
    const storage = fakeStorage()
    saveTheme(storage, 'light')
    expect(storage.read()).toBe('light')
  })

  it('survives storage that throws', () => {
    expect(() =>
      saveTheme(
        {
          setItem: () => {
            throw new Error('quota')
          },
        },
        'dark',
      ),
    ).not.toThrow()
  })
})

describe('applyTheme', () => {
  it('pins a theme with an attribute and leaves system to the media query', () => {
    const root = document.createElement('html')
    applyTheme(root, 'dark')
    expect(root.getAttribute('data-theme')).toBe('dark')
    applyTheme(root, 'light')
    expect(root.getAttribute('data-theme')).toBe('light')
    applyTheme(root, 'system')
    expect(root.hasAttribute('data-theme')).toBe(false)
  })
})
