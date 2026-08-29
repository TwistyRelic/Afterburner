export const STATIONARY_METERS = 5;
export const STATIONARY_SECONDS = 15;

const EARTH_RADIUS_M = 6371000;
const radians = (degrees) => (degrees * Math.PI) / 180;

export function distanceMeters(a, b) {
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Holds the fixes from the last STATIONARY_SECONDS and reports how far the
// runner got from the oldest of them. Under STATIONARY_METERS for the whole
// window and they are standing still, whatever they claim.
export function createMovementGate(options = {}) {
  const radius = options.meters ?? STATIONARY_METERS;
  const windowMs = (options.seconds ?? STATIONARY_SECONDS) * 1000;
  let trail = [];

  return {
    push(fix) {
      if (
        !Number.isFinite(fix?.latitude) ||
        !Number.isFinite(fix?.longitude) ||
        !Number.isFinite(fix?.timestamp)
      ) {
        return this.state(fix?.timestamp ?? 0);
      }

      trail.push(fix);
      // Keep one fix older than the window so the window is provably covered.
      const cutoff = fix.timestamp - windowMs;
      const firstInside = trail.findIndex((item) => item.timestamp >= cutoff);
      if (firstInside > 0) trail = trail.slice(firstInside - 1);

      return this.state(fix.timestamp);
    },

    state(now) {
      if (trail.length < 2) {
        return { stationary: false, moved: 0, stillSeconds: 0 };
      }

      const anchor = trail[0];
      const moved = Math.max(
        ...trail.map((item) => distanceMeters(anchor, item)),
      );
      const span = now - anchor.timestamp;

      return {
        stationary: moved < radius && span >= windowMs,
        moved,
        stillSeconds: moved < radius ? span / 1000 : 0,
      };
    },

    reset() {
      trail = [];
    },
  };
}
