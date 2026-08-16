/**
 * Catalogue of every one-beat pattern under consideration. Each row is that
 * pattern repeated four times — exactly what a bar would show under the
 * repeat scheme. Pitch is fixed so only the rhythm is on trial.
 *
 * Served at /patterns.html by the dev server. Not part of the app.
 */
import { IMPLEMENTED, PLAIN, WITH_RESTS, appendRow } from './dev/beat-patterns'
import type { Pattern } from './dev/beat-patterns'

const root = document.getElementById('root')!
root.style.cssText = 'font-family: system-ui, sans-serif; margin: 24px; background: #fff'

const GROUPS: [string, Pattern[]][] = [
  ['休符なし（簡単な順）', PLAIN],
  ['休符あり（簡単な順）', WITH_RESTS],
]

for (const [title, patterns] of GROUPS) {
  const heading = document.createElement('h2')
  heading.textContent = `${title} — ${patterns.length}種類`
  heading.style.cssText = 'font-size: 18px; margin: 32px 0 8px'
  root.append(heading)

  patterns.forEach((pattern, i) => {
    const suffix = IMPLEMENTED.has(pattern.id) ? '' : '（未実装）'
    appendRow(root, `${i + 1}. ${pattern.id} — ${pattern.note}${suffix}`, pattern)
  })
}
