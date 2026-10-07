/** Tiny change bus: every write in queries.ts calls notifyDbChanged() so mounted screens re-query. */
const listeners = new Set<() => void>();

export function subscribeDbChanges(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyDbChanged() {
  listeners.forEach((listener) => listener());
}
