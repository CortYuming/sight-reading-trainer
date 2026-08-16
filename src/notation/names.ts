const ACCIDENTAL_SIGNS: Record<string, string> = { '#': '♯', b: '♭' }

/**
 * The name a reader would say for a VexFlow key: "bb/3" is a B flat.
 *
 * The octave is dropped. On the fretboard it is the letter that has to be
 * found, and the staff has already said which octave it is in.
 */
export function noteName(vexKey: string): string {
  const [pitch] = vexKey.split('/')
  const letter = pitch.slice(0, 1).toUpperCase()
  const accidental = [...pitch.slice(1)].map((sign) => ACCIDENTAL_SIGNS[sign] ?? sign).join('')
  return `${letter}${accidental}`
}
