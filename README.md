# Sight Reading Trainer

Jazz sight-reading practice for guitar. Two columns of notation share the same
beats: the left one walks in plain quarter notes, the right one splits those
same beats into the rhythms you have to read.

Every exercise is generated, so the page never runs out of new material.

## Status

Generation, notation and playback all work. Not published yet — the GitHub
repository does not exist, so nothing has been pushed.

1. ~~**Phase 1** — exercise generator (chords, walking bass, rhythm, melody)~~
2. ~~**Phase 2** — notation on two staves (VexFlow)~~
3. ~~**Phase 3** — playback with swing feel (Tone.js)~~
4. **Phase 4** — settings, responsive layout, GitHub Pages

## Remaining work

- Tighten the layout on a narrow phone. The two columns hold together down to
  about 320px, but nothing has been checked on a real handset.
- Listen for whether the tail of a note is clipped at a barline when the bar
  repeats. Reported as "not always smooth" and fixed by seeking instead of
  rebuilding; worth a second listen before calling it done.
- `gh repo create` and a GitHub Pages deploy. The workflow file still has to be
  copied over from chord-vamp, with `node-version: 22` to match the volta pin.
- The bundle is 1.2MB (516kB gzipped), almost all of it the Bravura music font.
  Self-hosting the woff2 through `vexflow/core` would cut it, at the cost of a
  second request.

## Notation

Both columns use a treble clef with an 8vb mark, the standard for guitar.
Clef and key signature are drawn on the first row only: every row is one bar,
and repeating the header on each of them would eat most of the width on a
phone. There is no time signature — every exercise is in 4/4.

## Playing along

- **Space** starts and stops. A count-in of one bar precedes the first note.
- **Left** and **right** step through the bars, **up** loops the current bar on
  its own. The same controls sit in the toolbar for touch, and clicking a row
  jumps to that bar.
- Moves land on the next barline rather than the instant they are pressed, so
  the bar being read is never cut in half. The queued bar is marked with a
  dashed line in the margin.
- Swing has four depths. Measurements of jazz drummers put the ratio near 3.5:1
  at slow tempos and close to 1:1 above 250bpm, so the default is the deep end
  to match the slow default tempo.
- Key, form, level, tempo, swing and the three switches are kept in the browser
  and restored on the next visit. The exercise is not: coming back gives a new
  one to read.

## How an exercise is built

- A progression (ii-V-I, turnaround, jazz blues, minor ii-V-i, Autumn Leaves A)
  is transposed into one of five keys: F, Bb, Eb, C, G.
- The **bass** walks in quarter notes: the root on beat 1, chord tones on beats
  2-3, and a chromatic or dominant approach into the next bar on beat 4.
  Range: written E3-E4, i.e. strings 6-4.
- The **melody** takes the rhythm for each beat from a pool that grows with the
  difficulty level, then borrows pitches from the chord and its scale — chord
  tones on the beat, stepwise motion in between. Range: written G4-B5, i.e.
  strings 3-1.
- Levels: 1 quarters and eighths, 2 adds rests and ties, 3 adds sixteenths,
  4 adds triplets. Level 1 repeats one rhythm across all four beats of a bar,
  so the reading is all in the pitches.

All pitches are **written** pitches. Guitar notation sounds one octave lower
than written.

Exercises are generated from a seed, so the same seed always yields the same
exercise.

## Development

Node is pinned to 22 with [volta](https://volta.sh/).

```
npm install
npm run dev
npm test
npm run build
npm run lint
```
