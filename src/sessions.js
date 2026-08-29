// The session log ships with the one session that was actually recorded.
//
// This file used to hold three named runners with quotes attributed to them
// and a list of suggested blood markers under each card. None of those people
// exist, and recommending a test is a medical claim this product does not get
// to make. Both are gone. What is left is the real session, built from run.js
// at load, so the numbers on the card cannot drift from the numbers on the run
// view.

import { run } from "./run.js";
import { spanLabel, summarise } from "./summary.js";

const sample = summarise(run.splits);
const worst = sample.collapse || sample.flags[0] || null;

export const sessions = [
  {
    id: "track-session",
    name: "Session on the track",
    time: run.distance + " · " + run.markers + " markers spoken",
    number: sample.count + " flagged",
    // The one line actually said out loud on the kilometre that came apart.
    note: '"' + run.said + '"',
    gap: worst
      ? {
          said: "called it " + worst.effort + " out of ten at km " + worst.km,
          measured:
            worst.paceSlip +
            " seconds a kilometre slower, cadence down " +
            worst.cadenceDrop +
            " spm",
          delta:
            spanLabel(sample.behind) + " behind the ghost of km 1 by the finish",
        }
      : null,
    splits: run.splits,
  },
];
