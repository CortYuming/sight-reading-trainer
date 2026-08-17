# Melodic shapes

Notes from Jerry Bergonzi's *Improvising with Melodic Shapes 1*, transcribed
from the masterclass by David Prez. Read as material for the melody generator:
what the book calls a shape is a small cell of notes described only by how many
notes it has and which way each step goes, and that is something the generator
can be taught.

The book is not a reading method — it teaches improvising. Taking it on makes
the exercises look like jazz lines rather than like a rhythm drill with pitches
on top, which is a gain in what the reading transfers to and a loss in how
unpredictable the page is.

## The source

61 scanned pages, which turn out to be the same 21 pages in three keys: concert
on 1-21, B♭ on 22-41, E♭ on 42-61. Guitar reads concert, so only the first 21
are of any use.

There is no text layer — the file is 284 images and no fonts — so nothing can
be lifted out of it mechanically. The pitches below were read by detecting note
heads against the staff lines; the accidentals and the rhythms were read by eye
and are the part to distrust.

## The catalogue

| Shape | Variants | Pages | Tune |
|---|---|---|---|
| Two note | up, down | 2-3 | It Could Happen to You |
| Three note | up-up, up-down, down-down, down-up | 4-7 | It Could Happen to You |
| Four note | Ex 1, 3, 5, 6, 7, 9 | 8-13 | Giant Steps |
| Five note | Ex 1; all-up; up-down-down-down | 14-19 | Giant Steps, Stablemates |
| Eight note | "Little Jazz Lines" | 20 | — |

The direction names are the whole of the classification. A three note shape is
three notes and two moves, so there are four of them; the book works through
all four in order.

## What was transcribed

Every staff of pages 4-13 — all four three note directions and all six four
note ones, which is what the app is built on. One staff each of the other
categories, enough to see what they are and not enough to build them.

### Eight note — page 20

The clearest of them, and the one that gives the principle away. No key
signature, four groups of eight:

```
A4  C5  E5  G5  D5  C5  F5  E5
D4  F4  A4  C5  G4  F4  B4  A4
G4  B4  D5  F5  C5  B4  E5  D5
C5  E5  G5  B5  F5  E5  A5  G5
```

Every group is the same shape counted in scale degrees from its own first note:

```
1  3  5  7  4  3  6  5
```

and the groups start a fourth apart — A, D, G, C. So an eight note shape is a
degree pattern, sequenced round the cycle. Accidentals accumulate group by
group, which fits each group sitting in its own key, but they were not read
closely enough to state.

### Three note, up-up — page 4, E♭

| Bar | Chord | Notes | What it is |
|---|---|---|---|
| 1 | E♭maj7 | B♭4 E♭5 G5 | E♭ triad, second inversion |
| 2 | Gm7♭5 | D♭5 G5 B♭5 | G diminished triad, second inversion |
| 2 | C7♭9 | E♭5 A♭5 C6 | A♭ triad, second inversion — the coming Fm7 |
| 3 | Fm7 | A♭4 C5 F5 | F minor triad, first inversion |
| 4 | Am7♭5 D7♭9 | A♮4 D5 E♭5 | not a triad: the root and ♭9 of D7♭9 |

Three of the four bars are a plain triad in an inversion — which was read, on
this staff alone, as up-up being the chord itself rather than a walk up the
scale. The rest of the page says otherwise. Later staves run C5 E♭5 G5 and G4
B♭4 D5, triads again, but also C5 F5 G5 (a fourth then a second) and long
stretches of plain scale: B♭3 E♭4 F4 G4 A♭4 B♭4 C5 D5 E♭5, three notes at a
time with each cell starting where the last ended.

So up-up is three notes rising and nothing more. Thirds, seconds and fourths
are all in it.

### Three note, the other three directions — pages 5-7, E♭

**Up-down (page 5).** A neighbour figure: leave a note and come straight back
to it.

```
E♭5 F5 E♭5 | E♭5 F5 E♭5 | E♭5 D5 E♭5  D5 C5 D5  C5 B♭4 C5 | A♭4 B♭4 A♭4  F4 A♭4 F4
```

**Down-down (page 6).** A run down the scale, three notes at a time, the run
itself walking down.

```
A♭5 G5 F5  G5 F5 E♭5 | F5 E♭5 D5  E♭5 D5 C5  D5 C5 B♭4  C5 B♭4 G4 | C5 B♭4 G4 …
```

**Down-up (page 7).** Down, then back up past where it started. Mostly a third
down and a fourth back, sometimes a fifth: E♭5 C5 F5, A♭4 F4 B♭4, C5 A♭4 E♭5.

```
E♭5 D5 F5 | D5 B♭4 E♭5 | B♭4 G4 C5  C5 B♭4 E♭5 | C5 A♭4 E♭5  C5 A♭4 E♭5
```

**Up-down again.** Page 5's later staves do not always come back to the note
they left; often they carry on past it, and the figure sequences down in
thirds: C5 D5 B♭4, B♭4 C5 G4, G4 B♭4 F4.

Which settles what a shape is, and it is not what page 4 alone suggested. **The
book fixes the direction of each step, not its size.** An up-up is a triad on
page 4 and a down-down is a scale run on page 6; both are the same lesson, read
in thirds one time and in seconds the next. Shapes built on page 4 alone came
out wrong in three of the four directions.

### Four note — pages 8-13, Giant Steps

The book numbers these rather than naming them — Ex 1, 3, 5, 6, 7, 9 — and the
numbering is the directions. Every staff of all six pages:

| Ex | Page | Direction | Shapes read |
|---|---|---|---|
| 1 | 8 | up-up-up | 1-2-3-4, 1-3-5-7, 1-2-3-5, 1-2-4-6 |
| 3 | 9 | up-up-down | 1-2-3-1, 1-3-5-3, 1-3-4-3 |
| 5 | 10 | up-down-up | 1-2-1-4, 1-3-1-5 |
| 6 | 11 | down-down-down | 5-4-2-1, 6-5-3-1, 4-3-2-1 |
| 7 | 12 | down-up-up | 3-1-3-5 |
| 9 | 13 | down-up-down | 3-1-4-3, 2-1-3-2 |

Six of the eight ways four notes can be strung together. Down-down-up and
up-down-down are the two left out, and Ex 2, 4 and 8 are missing with them.

Giant Steps modulates every two bars and the page carries no key signature, so
these staves are half accidentals — and none of them were read. A degree is a
position on the staff: F♯4 B4 C♯5 D♯5 over Bmaj7 is 5-1-2-3 whichever way the
sharps fall, because B major spells its own fifth without being asked.

### Five note, all up — page 15, Stablemates

```
F♯4 G4 B4 D5 F♯5 | F♯4 G4 B4 D5 F♯5 | C5 D5 F5 A5 | G4 A4 B4 C5 D5
```

Over Em7 the cell is 2-3-5-7-9 — the chord with its extensions, all of it
rising.

### Two note — pages 2 and 3, E♭

Up (page 2): B♭4 → C5 over E♭maj7, then F4 → F♯4 over D7♭9. Down (page 3):
G5 → E♭5 and A♭5 → E♭5 over E♭maj7.

Two notes carry no shape of their own, so the pages are mostly space: the
exercise is placing one interval per chord and hearing where it lands.

## What this gives the generator

`src/music/melody.ts` currently picks each pitch on its own — a chord tone on
the beat three times in four, a weighted preference for stepwise motion
otherwise. That produces a line with no contour, because nothing in it spans
more than one note.

A shape is exactly the missing unit. Written the way the book classifies them,
a shape is a length and a list of directions, and the generator would:

- draw a shape, and lay it over the beats the rhythm has already produced;
- realise each step against the bar's chord — the page 4 evidence says the
  steps of an up-up are chord tones, i.e. a triad inversion, not scale steps;
- choose the next shape's first note from where the last one ended, which is
  what makes the page 8 cells run into each other.

Two axes then exist where there is one now: the rhythm levels 1-10 as they
stand, and shape length and direction as a second, independent setting.

## The design

A shape is a list of scale degrees, not a list of directions:

```ts
interface Shape {
  degrees: number[]   // 1-3-5-7-4-3-6-5, counted from the chord's root
  sequence: number    // degrees to move on by each time the shape comes round
}
```

Degrees hold everything the book has, including the eight note pattern, which
is fixed rather than merely directional. Nothing records which way a step
goes — the degrees do, since each note moves in the direction of the
difference. Directions can be derived from degrees for naming a shape; degrees
cannot be recovered from directions.

There is no field for whether a degree steps through the chord or the scale.
The degrees say it: 1-3-5 is a triad, 1-2-3-5 is not, and both are read off the
same scale.

Because the book fixes direction and not size, a direction is not one shape but
several — 1-2-3 and 1-3-5 are both up-up, and a level brings both. What a level
holds is a direction; what it draws from is that direction's shapes.

Not every shape fits everywhere. The melody range is an octave and a half, so a
figure climbing a fifth from a degree that appears only near the top has nowhere
to sit: F5 is the only F, and a third above the third above it is off the end.
The generator asks before it places, and moves on to the next offset when the
answer is no. Placing it anyway would fold one note down an octave and turn an
up-up into something that falls.

Placement follows what both the app and the book already do. The app's levels
1-6 draw one rhythm per bar and repeat it across the beats; page 20 repeats one
eight note figure over and over. So:

- one shape per bar, laid over the rhythm's slots and repeated until the bar
  runs out — the tail of a repetition may be cut off at the barline;
- each repetition moves on by `sequence` degrees, the whole bar going one way.
  Repeating in place would circle three notes, which is nothing to read; the
  book sequences too, up a fourth on page 20 and through every degree of the
  scale in the three note drills;
- the first note of a shape lands nearest to where the line already is, which
  puts the triads into inversion and runs the page 8 cells into each other;
- higher levels redraw the shape every beat instead of every bar, the same move
  the rhythm levels make at 7.

Because a bar carries one chord, a shape never straddles a chord change.

Shapes carry on the same staircase rather than standing beside it. A second
control would hand the reader a grid — level 7 against a four note shape — and
leave them to work out what the combination is for, which is the design's job.
So the levels run on from 10, the rhythm held at what level 10 already draws,
and only the pitches climb:

One direction to a level, then the four of them together. That is how the book
teaches them — an exercise per direction — and how this app already works: a
level brings only its own shapes, and mixing is the job of the level above.

| Level | Shapes |
|---|---|
| 11-14 | three note: up-up, up-down, down-down, down-up |
| 15 | three note, the four together |
| 16-21 | four note: up-up-up, up-up-down, up-down-up, down-down-down, down-up-up, down-up-down |
| 22 | four note, the six together |

Five and eight note shapes carry on from 23 on the same plan. They are not
built: their degrees wait on transcribing more of the book than the one staff
per category read so far.

A shape level's number does not say what it asks for, so the level menu names
its figures — `11 — 3 note: up-up` — where a rhythm level shows a digit and
nothing else.

Two note shapes are left out. One interval is nothing to read, the same reason
a plain quarter is kept out of the rhythm pool.

Levels 1-10 are untouched: `melody.ts` branches on whether the level names a
shape, so every existing test stays on the path it already runs.

## Reading them again

The pitches came out of a note-head detector: threshold the page, find the runs
of rows that are staff lines, then slide a box one staff space tall and a
little wider and keep where it comes out solid black. Stems are too thin for
the box, beams too flat, rests and clefs too ragged — only heads fill it. The
detected positions landed within 0.15 of a staff step throughout, so the
pitches are firm. Open heads (half and whole notes) are missed, and no
accidental is detected; both were filled in by eye.
