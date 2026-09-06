# Backlog

What to build next, written down before the work starts so the intent survives
between sessions. Each entry says what is wanted, what the app already does,
and what has not been decided yet.

## A lead-in bar before the exercise starts

Add one bar — four beats — of music in front of the first bar, the way a tune
is normally given a lead-in before the head comes in.

What exists today: a count-in (`countIn` in `src/settings.ts`, applied as
`COUNT_IN_BEATS` of offset in `src/audio/player.ts`). It is a count, not a bar
of the piece: it buys the reader time but plays nothing to come in against.

Open questions:

- What sounds during the lead-in — the rhythm section (bass and drums) playing
  the bar before the top, or a fixed figure that is the same every time?
- Does the lead-in appear on the staff, or is it heard only? If it is drawn,
  bar numbering and the highlight indices both shift by one.
- Does it replace the existing count-in, or sit after it as a separate option?

## Random continuous mode

Keep going instead of looping: rather than repeating the same set of bars, add
new bars as the reader gets to the end, so the page never comes back to
something already read.

What exists today: an exercise is a fixed set of bars generated up front from a
seed (`generateExercise` in `src/music/exercise.ts`), and the player loops
either one bar or the whole lot (`loopBar` in `src/audio/player.ts`).

Open questions:

- How far ahead the reader can see. Bars have to be generated and drawn before
  they are due, and the score currently draws a whole exercise at once.
- What the chords do. The progression has a length and a cadence, so continuing
  means either running the progression round again or generating past it.
- Whether the scheduled parts can be extended while the transport is running,
  or whether each new chunk needs its own `Tone.Part` appended.
- Where the mode lives in the UI, and whether bar repeat still applies inside it.
