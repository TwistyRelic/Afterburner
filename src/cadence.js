// Cadence from raw acceleration. The phone is in a hand or a pocket, so the
// signal is a noisy ~3 Hz bounce riding on gravity: low-pass it, count the
// vertical peaks in a rolling window, report steps per minute.
export const SAMPLE_HZ = 50;
export const WINDOW_SECONDS = 10;
export const LOWPASS_ALPHA = 0.3;
export const BASELINE_ALPHA = 0.02;
export const PEAK_THRESHOLD = 0.6;
export const MAX_SPM = 240;

const REFRACTORY_MS = 60000 / MAX_SPM;

export function createCadenceMeter(options = {}) {
  const hz = options.hz ?? SAMPLE_HZ;
  const windowMs = (options.windowSeconds ?? WINDOW_SECONDS) * 1000;
  const alpha = options.alpha ?? LOWPASS_ALPHA;
  const threshold = options.threshold ?? PEAK_THRESHOLD;

  const minSampleMs = 1000 / hz;
  const peaks = [];
  let smoothed = null;
  let baseline = null;
  let lastSampleAt = null;
  let above = false;
  let spm = 0;

  return {
    // `vertical` is acceleration along the axis gravity is on, in m/s².
    // Returns the current steps per minute, or 0 until the window fills.
    push(vertical, timestamp) {
      if (!Number.isFinite(vertical) || !Number.isFinite(timestamp)) return spm;
      // Ignore anything arriving faster than the sample rate: browsers fire
      // devicemotion at anything from 20 to 120 Hz.
      if (lastSampleAt !== null && timestamp - lastSampleAt < minSampleMs) {
        return spm;
      }
      lastSampleAt = timestamp;

      smoothed =
        smoothed === null ? vertical : smoothed + alpha * (vertical - smoothed);
      baseline =
        baseline === null
          ? smoothed
          : baseline + BASELINE_ALPHA * (smoothed - baseline);

      const lastPeakAt = peaks.length ? peaks[peaks.length - 1] : null;
      const armed =
        lastPeakAt === null || timestamp - lastPeakAt >= REFRACTORY_MS;

      if (!above && smoothed > baseline + threshold && armed) {
        peaks.push(timestamp);
        above = true;
      } else if (above && smoothed < baseline) {
        above = false;
      }

      while (peaks.length && timestamp - peaks[0] > windowMs) peaks.shift();

      const span = Math.min(timestamp - (peaks[0] ?? timestamp), windowMs);
      spm = span > 0 ? Math.round((peaks.length / span) * 60000) : 0;
      return spm;
    },

    get spm() {
      return spm;
    },

    reset() {
      peaks.length = 0;
      smoothed = null;
      baseline = null;
      lastSampleAt = null;
      above = false;
      spm = 0;
    },
  };
}
