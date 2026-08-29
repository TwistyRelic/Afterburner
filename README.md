# Afterburner

Speak while you train. Get a protocol before you sit down.

Built at RUN/HACK London — voice on the track, Devin on the repo.

## Pages

- `/` — landing: title, what it does, waitlist
- `/login` — log in or continue as visitor (client-side only, no backend)
- `/sessions` — log a note and read the session cards

## What it is

Session notes, coach replies, markers:

- session notes spoken while running
- a short coach reply
- suggested Healf markers: CK, CRP, ferritin
- waitlist

You talk through the session as it happens — pace, effort, how the legs feel. By
the time you stop moving, the page holds the notes, a short coach reply, and the
markers worth testing (CK for muscle damage, CRP for inflammation, ferritin for
iron), plus a waitlist form for anyone who wants in.

## How we build

- Poke → Devin: someone on the run dictates the next change.
- Devin → PR: Devin does the work and opens a pull request here.
- Only while someone is running: no new prompts if the whole team has been
  stationary for more than 15 seconds.

## Stack

React + Vite with React Router, three.js for the animated backdrop, GSAP for the
hero entrance, and Framer Motion for card and button interactions.

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
