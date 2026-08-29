export const WAITLIST_KEY = "afterburner.waitlist";

// The list is the only store there is — no backend — so reads have to survive a
// wiped, quota-blocked or malformed localStorage without taking the page down.
export function readWaitlist(storage) {
  try {
    const raw = storage?.getItem(WAITLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((entry) => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

export function writeWaitlist(storage, emails) {
  try {
    storage?.setItem(WAITLIST_KEY, JSON.stringify(emails));
    return true;
  } catch {
    return false;
  }
}

export function normalise(email) {
  return email.trim().toLowerCase();
}

export function isEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Adding is idempotent on the address, so a double tap cannot inflate the count.
export function addEmail(emails, email) {
  const next = normalise(email);
  if (!isEmail(next)) return { emails, added: false, reason: "invalid" };
  if (emails.includes(next))
    return { emails, added: false, reason: "duplicate" };
  return { emails: [...emails, next], added: true, reason: "added" };
}

export function countLine(count) {
  return count === 1 ? "1 person wants this" : `${count} people want this`;
}
