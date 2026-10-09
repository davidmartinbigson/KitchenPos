/** A restaurant counts as "Online" while heartbeats arrive within this window. */
export const ONLINE_WINDOW_MS = 1000 * 60 * 5;

export function isOnline(lastSeenAt: Date | string | null | undefined) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS;
}
