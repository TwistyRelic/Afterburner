# Afterburner

Afterburner catches you lying about your run.

Built at RUN/HACK London — voice on the track, Devin on the repo.

## Pages

- `/` — the live view: the 3D run built from the spoken kilometre markers, one
  evidence line, one mic. No navigation, no marketing copy.
- `/sessions` — log a note and read the session cards

## What it is

You talk through the session as it happens — pace, effort, how the legs feel.
The live view shows one segment per kilometre: height is seconds per kilometre,
colour is the effort you reported. When the blocks grow while the colour stays
cool, you said easy and ran slow — that gap is the product.

Cadence comes from the phone itself: DeviceMotion at 50 Hz, low-passed, vertical
peaks counted over a rolling 10-second window, reported as steps per minute and
stored at each kilometre mark. When a kilometre slips more than 8 s/km *and* the
cadence falls more than 6 spm while the runner still reports it flat, that is
form collapse rather than ordinary fatigue, and it is flagged differently.

The session log holds the notes, what the phone measured, and a short coach
reply computed from the splits. A separate markers panel explains what CK, CRP
and ferritin indicate in endurance training as general information — it is not
medical advice, is not personalised, and does not tell anyone to get tested.

## What it does not claim

Afterburner measures what you said against what you did. It does not detect
overtraining, does not predict injury, reports no accuracy percentage, and puts
no number on screen that was not computed from captured data. Nothing here is a
claim to be first or only — we have measured this run, and that is the claim.

## How we build

- Poke → Devin: someone on the run dictates the next change.
- Devin → PR: Devin does the work and opens a pull request here.
- Only while someone is running: no new prompts if the whole team has been
  stationary for more than 15 seconds.

## Stack

React + Vite with React Router, three.js for the run itself, and Framer Motion
for card interactions.

```
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run lint
```

Needs Node 20.19+ (see `.nvmrc`).

## Setup

- Public repo.
- The Devin GitHub app is installed, so Devin can push branches and open PRs.
- Merge PRs between laps — review on the move, keep `main` shippable.

## Rule

No new Devin prompts if the whole team has been stationary for more than 15 seconds.

## If it breaks

Every capability degrades to a smaller, true claim rather than to a blank
screen.

| What fails | What still happens |
| --- | --- |
| WebGL will not start | The run draws as bars from the same splits; judge mode and the verdict are unaffected |
| No speech recognition | The typed fallback opens by itself, in judge mode too |
| No DeviceMotion cadence | The detector reads pace alone and reports the slip without claiming form collapse |

Under time pressure, revert to the last green commit rather than fixing
forward: `main` stays shippable, so a red build is one revert away from a
working demo.
