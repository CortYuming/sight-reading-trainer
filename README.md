# Sight Reading Trainer

Jazz sight-reading practice for guitar. Two columns of notation share the same
beats: the left one walks in plain quarter notes, the right one splits those
same beats into the rhythms you have to read.

Every exercise is generated, so the page never runs out of new material.

## Status

Phase 2 — the exercise is drawn as notation. Playback is not in yet.

Roadmap:

1. ~~**Phase 1** — exercise generator (chords, walking bass, rhythm, melody)~~
2. ~~**Phase 2** — notation on two staves (VexFlow)~~
3. **Phase 3** — playback with swing feel (Tone.js)
4. **Phase 4** — settings, responsive layout, GitHub Pages

## Notation

Both columns use a treble clef with an 8vb mark, the standard for guitar.
Clef, key signature and time signature are drawn on the first row only: every
row is one bar, and repeating the header on each of them would eat most of the
width on a phone.

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
  4 adds triplets.

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
