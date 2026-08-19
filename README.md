# Sight Reading Trainer

Jazz sight-reading practice for guitar. Two columns of notation share the same
beats: the left one walks in plain quarter notes, the right one splits those
same beats into the rhythms you have to read.

Every exercise is generated, so the page never runs out of new material.

## Status

Generation, notation and playback all work, and the page is live at
[cortyuming.github.io/sight-reading-trainer](https://cortyuming.github.io/sight-reading-trainer/).

1. ~~**Phase 1** — exercise generator (chords, walking bass, rhythm, melody)~~
2. ~~**Phase 2** — notation on two staves (VexFlow)~~
3. ~~**Phase 3** — playback with swing feel (Tone.js)~~
4. **Phase 4** — settings, responsive layout, GitHub Pages. Published; the
   layout is still to be checked on a real phone.
5. **Phase 5** — melodic shapes. Three and four note done, levels 11-22; five
   and eight note still to read out of the book. See
   [docs/melodic-shapes.md](docs/melodic-shapes.md).

## Remaining work

- **Five note shapes**, pages 14-19 of the book, as levels 23 and up. One staff
  has been read (all-up over Stablemates, 2-3-5-7-9 over Em7) and the rest have
  not. Reading one staff has been wrong twice now, so read every one.
- **Eight note shapes**, page 20, the Little Jazz Lines. The degrees are
  settled — 1-3-5-7-4-3-6-5, confirmed against four groups — so no more
  transcribing is needed, but a decision is: eight notes do not fit a beat. On
  page 20 they sit as sixteenths across two, and a bar of the shape pool may
  not have room to finish one, let alone sequence it. Work out how the cell
  meets the rhythm before writing it.
- Tighten the layout on a narrow phone. The two columns hold together down to
  about 320px, but nothing has been checked on a real handset. There is
  somewhere to open it on one now, which also means the shape levels can
  finally be played with a guitar in hand.
- Listen for whether the tail of a note is clipped at a barline when the bar
  repeats. Reported as "not always smooth" and fixed by seeking instead of
  rebuilding; worth a second listen before calling it done.
- Check that a shape level's name is not cut off in the level menu. The widest
  is `19 — down-down-down` against a 12rem cap in `.field.level select`.

The bundle is 1.2MB, 503kB gzipped, and 288kB of that is the Bravura music
font, embedded as base64. Serving the woff2 as its own file instead was
measured at 287kB: gzip recovers the whole of the base64 overhead, so there is
nothing there to win and it is not worth the second request.

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
  at slow tempos and close to 1:1 above 250bpm; the default sits in the middle,
  at the 2:1 triplet feel the notation implies.
- **Drums** play the jazz ride pattern — a stroke on every beat and a swung
  eighth after two and four — with the hi-hat foot closing on two and four. The
  swung strokes take the same ratio the melody does, so the kit is what the
  swing setting sounds like rather than a fixed feel behind it.
- The melody is played legato, with the weight on the off-beat eighths rather
  than on the beat — which is how a jazz line is articulated, and the beat is
  already being marked by the bass and the ride. Runs of sixteenths and
  sextuplets are played even: they take their shape from the contour of the
  line, not from the beat. Each note's envelope is cut down to fit its own
  length, or a run smears into one sound.
- The event being read is coloured — a note while it sounds, a rest while it is
  counted — so the mark moves through the bar whether or not there is anything
  to hear. Where it stands still, a note is being held over a tie.
- **Note names** writes each note's letter beside its head, in the spelling the
  staff uses. Off by default — reading the pitch is the exercise, so the letters
  are there to fall back on. They shrink where a bar is too packed to take them.
- Key, form, level, tempo, swing and the five switches are kept in the browser
  and restored on the next visit. The exercise is not: coming back gives a new
  one to read. Changing the level draws a new one as well, since a new level is
  a new thing to practise. Changing key or form does not, so the same line can
  be read again somewhere else on the neck.
- **History** lists the last five exercises, newest first, and going back to one
  moves it to the top — so the next new exercise pushes out something untouched
  rather than the one just picked out to practise. Only what an exercise is
  generated from is stored, which is enough to draw it again exactly.

## How an exercise is built

- A progression (ii-V-I, turnaround, jazz blues, minor ii-V-i, Autumn Leaves A)
  is transposed into one of five keys: F, Bb, Eb, C, G.
- The **bass** walks in quarter notes: the root on beat 1, chord tones on beats
  2-3, and a chromatic or dominant approach into the next bar on beat 4.
  Range: written E3-E4, i.e. strings 6-4.
- The **melody** draws one beat-long rhythm per bar and repeats it across all
  four beats, then borrows pitches from the chord and its scale — chord tones
  on the beat, stepwise motion in between. Range: written G4-B5, i.e. strings
  3-1. A bar therefore carries a single rhythm, and the reading is in the
  pitches.
- Levels climb in pairs. An odd level opens a set of rest-free shapes and the
  even level above answers them with the same shapes carrying a rest, so a
  rhythm is always met plain before it is met broken up:

  | Level | Added |
  |---|---|
  | 1 | two eighths, four sixteenths, dotted eighth + sixteenth, its reverse |
  | 2 | the level 1 shapes with a rest |
  | 3 | sixteenths beside an eighth, three ways, then the eighth triplet |
  | 4 | the level 3 shapes with a rest |
  | 5 | the triplet written as two notes, both ways, and the sextuplet |
  | 6 | the level 5 shapes with a rest |

  A level brings only its own shapes. Carrying the earlier ones along would
  just repeat the levels below, and going back a level is the way to practise
  those. Pool sizes: 4, 6, 4, 6, 3, 3.

  A plain quarter is not in the pool: repeated across a bar it would spell the
  four beats the bass already walks, which is nothing to read.
- Through the basics the bars climb: the first two thirds of a page walk up the
  pool from its easiest shape to its hardest, and the last third is drawn at
  random from everything met.
- Levels 7-10 mix what the basics taught, with the four beats drawn one at a
  time instead of repeating, so a bar can change shape from beat to beat:

  | Level | Pool |
  |---|---|
  | 7 | every rest-free shape |
  | 8 | every shape with a rest |
  | 9 | all of them |
  | 10 | all of them, and ties across the beat |

  From 10 a tie can also cross a **barline**, which is the anticipation a jazz
  line lives on: the coming chord is sounded an eighth before it is due. The
  note held over is a chord tone of the bar being arrived at, not of the one
  being left — holding the old chord over would land a dissonance on the
  downbeat. About one bar in six carries one. Since every row is one bar, the
  tie is drawn as two halves, one running off the end of a row and one arriving
  at the start of the next.

- From level 11 the rhythm steps back — plain divisions of a beat, and a good
  deal of silence, so that a bar runs to five or six notes rather than twelve
  and the eye can see where one figure ends — and the
  pitches take over. The melody is built from **melodic shapes** after Jerry
  Bergonzi: one small cell of scale degrees per bar, repeated across the beats
  and moved on a degree each time, so a bar reads as a sequence rather than as
  one note after another. A level brings one direction, and the level after the
  set has them all:

  | Level | Shapes |
  |---|---|
  | 11-14 | three note: up-up, up-down, down-down, down-up |
  | 15 | three note, the four together |
  | 16-21 | four note: up-up-up, up-up-down, up-down-up, down-down-down, down-up-up, down-up-down |
  | 22 | four note, the six together |

  A direction is a family rather than a single figure, since the book fixes
  which way each step goes and not how far — an up-up is a triad in one bar and
  a scale run in the next. The level menu names them, because a number alone
  would not say which is which. See
  [docs/melodic-shapes.md](docs/melodic-shapes.md).

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
