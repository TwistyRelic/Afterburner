# Afterburner

A pacer that listens to you breathe.

You read one short sentence out loud while you run. Afterburner times how long
the speech runs before you have to breathe, turns that single measured interval
into a zone from 1 to 5, and repaces a ghost runner around it.

## The talk test

Judging effort by how easily you can speak is the talk test, a long-standing
field method in exercise physiology. Afterburner times it and nothing else.

It is **not** a lactate test, it is **not** a VO2 max test, it reports no
accuracy figure, and it **diagnoses nothing**. No number appears on screen that
was not measured on this phone — before a location fix arrives, pace is a dash
rather than an estimate.

## Routes

| Route       | What it is                                                   |
| ----------- | ------------------------------------------------------------ |
| `/`         | The live run view: zone, measured pace, gap to the ghost     |
| `/breath`   | The breath test: read the sentence, see the zone it lands in |
| `/phase`    | The adaptive ghost and its target zone                       |
| `/sessions` | Every reading stored on this phone                           |
| `/account`  | Local-only account                                           |
| `/settings` | Target zone, spoken zone, the sentence, the bands            |
| `/home`     | Public home with feature cards                               |
| `/features` | Public features page                                         |
| `/pricing`  | Public pricing page                                          |
| `/login`    | Public log in, stored in this browser                        |

## How a reading is taken

1. The microphone is sampled and the clock starts on the first voiced frame.
2. It stops when the voice drops out for 320 ms — the breath.
3. The measured seconds map onto five bands (`src/talktest.js`).
4. The ghost holds the pace that band arithmetic puts in your target zone
   (`src/pacing.js`), scaled off the pace the phone measured.

With no microphone, you hold the button while speaking and release at the
breath. Same interval, timed by hand.

## Storage

Readings, the local account, and settings live in `localStorage`. There is no
backend, nothing is uploaded, and "Forget every reading" clears it.

## Running it

```bash
nvm use 22
npm install
npm run dev
npm run lint
npm run build
```

Built mobile-first: the whole app is usable at 390 px portrait.
