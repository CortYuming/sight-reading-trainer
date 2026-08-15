import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

/**
 * Track an element's width so the staves can be drawn at an exact pixel size.
 * VexFlow needs a number, not a CSS rule.
 */
export function useElementWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    setWidth(element.getBoundingClientRect().width)
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}
