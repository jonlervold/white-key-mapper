# Scala White-Key Mapper

A small web app that remaps a [Scala](http://www.huygens-fokker.org/scala/) `.scl` tuning file onto a piano's white keys: each white key advances one degree of the source scale, and every black key duplicates the white key before it. Drop in a `.scl` file to preview the resulting MIDI-note mapping and download the generated `.scl`.

## Running it

```bash
npm install
npm run dev
```

Then open the printed local URL in your browser.

## How the remapping works

Starting from a chosen "1/1" key, each key is classified as white or black using the normal piano layout (C, D, E, F, G, A, B are white; the rest are black):

1. Every white key is assigned the next **degree** of the source scale, counting up from 1/1. Once the last degree is reached, the scale's **period** (the last, top pitch) is added and degree-counting wraps back to 1, so the pattern repeats up the keyboard one source-period per full cycle of white keys.
2. Every black key **duplicates the pitch of the white key immediately below it**, so there are no "new" pitches on black keys.

Because white keys repeat every 7 semitones' worth of white keys but the source scale repeats every `n` degrees, a full cycle back to matching alignment takes `lcm(n, 7)` white keys — that's how many chromatic keys the downloaded `.scl` file actually needs to define before it can just repeat at its own (usually multi-octave) period.

Other commands:

- `npm run build` – build the static site to `dist/`
- `npm run preview` – preview the production build
- `npm test` – run the unit tests
