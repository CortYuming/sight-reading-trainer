/**
 * The proposed level ladder, drawn out. Each level shows the patterns it adds,
 * as bars under the repeat scheme, with the running total beside the heading.
 *
 * Served at /levels.html by the dev server. Not part of the app.
 */
import { IMPLEMENTED, LEVEL_PLAN, appendRow } from './dev/beat-patterns'

const root = document.getElementById('root')!
root.style.cssText = 'font-family: system-ui, sans-serif; margin: 24px; background: #fff'

const intro = document.createElement('p')
intro.textContent =
  'レベル1・2は繰り返し方式：1小節につき形を1回引き、小節が埋まるまで繰り返す' +
  '（1拍の形なら4回、2拍の形なら2回）。' +
  'レベル3以降はプールが薄いので、その形が1拍おきに入り、残りの拍は' +
  'レベル1（休符なしの回）またはレベル2（休符ありの回）の1拍の形が埋める。' +
  'つまり2拍のまとまりを2回繰り返した小節になる。' +
  '以下は各レベルで「増える形」だけを並べたもの（下は増える形の繰り返しで描いている）。'
intro.style.cssText = 'font-size: 13px; color: #444; max-width: 640px; line-height: 1.7'
root.append(intro)

let total = 0

for (const step of LEVEL_PLAN) {
  total += step.added.length

  const heading = document.createElement('h2')
  heading.textContent = `レベル${step.level}（${step.kind}）— ${step.added.length}種類ふえて 累積${total}種類`
  heading.style.cssText = 'font-size: 18px; margin: 36px 0 8px'
  root.append(heading)

  step.added.forEach((pattern, i) => {
    const suffix = IMPLEMENTED.has(pattern.id) ? '' : '（未実装）'
    appendRow(root, `${i + 1}. ${pattern.note}${suffix}`, pattern)
  })
}
