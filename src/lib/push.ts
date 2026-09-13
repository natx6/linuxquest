/** Push notifications stub — streak reminders (register later, no backend for MVP). */
export async function registerPush(): Promise<void> {
  if (!('Notification' in window)) return;
  // Intentionally no-op for MVP: request permission only when stats page opts in later.
}

export function scheduleStreakReminder(): void {
  // Stub: local-only reminder hook. Wire to service worker push when backend exists.
}
