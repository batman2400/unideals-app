/**
 * Decides which network calls a foreground transition may cancel.
 *
 * A request that is already open when the app goes to the background can sit
 * on a socket the OS has killed and never settle. A request that starts as
 * part of coming back — the password-reset link is delivered in that window —
 * must be left alone, or the resume itself fails with "connection dropped".
 */
export type StaleTrackedRequest = {
  stale: boolean;
};

export type ResumeDecision<T> =
  | { kind: "ignore" }
  | { kind: "background" }
  | { kind: "active" }
  | { kind: "resume"; abort: T[]; token: number };

export class RequestResume<T extends StaleTrackedRequest> {
  private readonly requests = new Set<T>();
  private hasBeenActive = false;
  private backgrounded = false;
  private generation = 0;
  private ready: Promise<void> = Promise.resolve();
  private resolveReady: (() => void) | null = null;

  add(request: T): void {
    this.requests.add(request);
  }

  remove(request: T): void {
    this.requests.delete(request);
  }

  /** Already resolved until the app has actually gone to the background. */
  wait(): Promise<void> {
    return this.ready;
  }

  abortAll(): T[] {
    const pending = [...this.requests];
    this.requests.clear();
    return pending;
  }

  onAppState(state: string): ResumeDecision<T> {
    if (state === "background") {
      // Launch can report `background` before the first `active`. That is not
      // a resume, and treating it as one cancels the link that launched us.
      if (!this.hasBeenActive) return { kind: "ignore" };

      this.backgrounded = true;
      this.generation += 1;
      for (const request of this.requests) request.stale = true;
      if (!this.resolveReady) {
        this.ready = new Promise((resolve) => {
          this.resolveReady = resolve;
        });
      }
      return { kind: "background" };
    }

    if (state !== "active") return { kind: "ignore" };

    this.hasBeenActive = true;
    if (!this.backgrounded) return { kind: "active" };

    this.backgrounded = false;
    const abort: T[] = [];
    for (const request of this.requests) {
      if (!request.stale) continue;
      abort.push(request);
      this.requests.delete(request);
    }
    return { kind: "resume", abort, token: this.generation };
  }

  /**
   * Releases waiters after the dead socket has been dropped.
   * Returns false when a newer background made this resume obsolete.
   */
  settled(token: number): boolean {
    if (token !== this.generation || this.backgrounded) return false;
    const resolve = this.resolveReady;
    this.resolveReady = null;
    resolve?.();
    return true;
  }
}
