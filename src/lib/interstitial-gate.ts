/**
 * Decides whether an interstitial runs before an action, and guarantees the action always runs
 * exactly once: straight away when ad-free, capped, not loaded or on any failure; otherwise after
 * the ad closes. Pure (no ads SDK), so it is unit tested.
 */

export type ShowCallbacks = { onOpened: () => void; onClosed: () => void; onError: (e?: unknown) => void };

export type InterstitialSource = {
  isLoaded: () => boolean;
  /** Show the loaded ad and report its lifecycle through the callbacks. May throw. */
  show: (callbacks: ShowCallbacks) => void;
};

export type GateOptions = {
  minIntervalMs: number;
  openTimeoutMs: number;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

export type GateOutcome = 'shown' | 'ad-free' | 'capped' | 'not-loaded' | 'busy' | 'failed' | 'timeout';

export function createInterstitialGate(options: GateOptions) {
  const now = options.now ?? Date.now;
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  let lastShownAt: number | null = null;
  let busy = false;

  const capped = () => lastShownAt !== null && now() - lastShownAt < options.minIntervalMs;

  /**
   * Run `action`, maybe after an interstitial. Resolves with what happened once the action ran.
   * While an ad is on screen further calls are ignored ('busy'), so a double tap can't run twice.
   */
  function run(action: () => void, ctx: { adFree: boolean; source: InterstitialSource | null }): Promise<GateOutcome> {
    if (busy) return Promise.resolve('busy');
    const skip = (outcome: GateOutcome) => {
      action();
      return Promise.resolve(outcome);
    };
    if (ctx.adFree) return skip('ad-free');
    if (capped()) return skip('capped');
    const source = ctx.source;
    if (!source) return skip('not-loaded');
    let loaded = false;
    try {
      loaded = source.isLoaded();
    } catch {
      loaded = false;
    }
    if (!loaded) return skip('not-loaded');

    busy = true;
    return new Promise<GateOutcome>((resolve) => {
      let done = false;
      let opened = false;
      const finish = (outcome: GateOutcome) => {
        if (done) return;
        done = true;
        busy = false;
        clearTimer(timer);
        action();
        resolve(outcome);
      };
      const timer = setTimer(() => {
        if (!opened) finish('timeout');
      }, options.openTimeoutMs);
      try {
        source.show({
          onOpened: () => {
            if (done) return;
            opened = true;
            lastShownAt = now();
            clearTimer(timer);
          },
          onClosed: () => finish('shown'),
          onError: () => finish('failed'),
        });
      } catch {
        finish('failed');
      }
    });
  }

  return {
    run,
    isCapped: capped,
    get lastShownAt() {
      return lastShownAt;
    },
  };
}

export type InterstitialGate = ReturnType<typeof createInterstitialGate>;
