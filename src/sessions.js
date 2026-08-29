// `splits` is what the coach rules read: seconds per km from the gaps between
// spoken markers, cadence from the accelerometer, effort as reported out loud.
// The reply on each card is derived from these numbers, never written by hand.
export const sessions = [
  {
    name: "Adithya",
    time: "06:12 · 8.4 km",
    number: "172 bpm",
    note: '"Legs heavy from yesterday, held pace anyway."',
    gap: {
      said: "held 4:30 pace",
      measured: "4:47 from km 5",
      delta: "17 s/km slower",
    },
    splits: [
      { km: 1, pace: 270, cadence: 176, effort: 4 },
      { km: 2, pace: 269, cadence: 176, effort: 4 },
      { km: 3, pace: 271, cadence: 175, effort: 4 },
      { km: 4, pace: 273, cadence: 175, effort: 4 },
      { km: 5, pace: 287, cadence: 172, effort: 4 },
      { km: 6, pace: 290, cadence: 171, effort: 4 },
      { km: 7, pace: 292, cadence: 170, effort: 5 },
      { km: 8, pace: 294, cadence: 169, effort: 5 },
    ],
    markers: "CK, CRP",
  },
  {
    name: "Mira",
    time: "18:40 · 5 × 800 m",
    number: "3:02 avg",
    note: '"Last rep felt easiest, breathing stayed low."',
    gap: {
      said: "last rep easiest",
      measured: "cadence 172 → 165 spm",
      delta: "7 spm drop on rep 5",
    },
    splits: [
      { km: 1, pace: 180, cadence: 172, effort: 6 },
      { km: 2, pace: 181, cadence: 171, effort: 6 },
      { km: 3, pace: 179, cadence: 170, effort: 6 },
      { km: 4, pace: 183, cadence: 168, effort: 6 },
      { km: 5, pace: 186, cadence: 165, effort: 6 },
    ],
    markers: "ferritin",
  },
  {
    name: "Tom",
    time: "07:05 · 12 km easy",
    number: "64 min",
    note: '"Right calf tight from km 6, no sharp pain."',
    gap: {
      said: "easy run, no drop-off",
      measured: "cadence 178 → 164 spm after km 6",
      delta: "14 spm drop, 1 km slipped",
    },
    splits: [
      { km: 1, pace: 312, cadence: 178, effort: 3 },
      { km: 2, pace: 310, cadence: 178, effort: 3 },
      { km: 3, pace: 313, cadence: 177, effort: 3 },
      { km: 4, pace: 314, cadence: 177, effort: 3 },
      { km: 5, pace: 316, cadence: 176, effort: 3 },
      { km: 6, pace: 338, cadence: 164, effort: 3 },
      { km: 7, pace: 341, cadence: 163, effort: 3 },
      { km: 8, pace: 340, cadence: 163, effort: 3 },
    ],
    markers: "CK, CRP, ferritin",
  },
];
