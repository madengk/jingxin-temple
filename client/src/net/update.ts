/**
 * Build-version comparison, reconnect backoff, and the "temple was updated" banner.
 * Pure helpers are unit-tested in test/update-test.ts.
 */

export function clientBuildVersion(): string {
  if (typeof document === "undefined") return "";
  return document.documentElement.dataset.version || "";
}

/** Show the refresh banner when the running server is a different (newer) build. */
export function shouldOfferUpdate(clientVersion: string, serverVersion: string): boolean {
  const c = (clientVersion || "").trim();
  const s = (serverVersion || "").trim();
  return c.length > 0 && s.length > 0 && c !== s;
}

/** Exponential backoff in ms: 1s, 2s, 4s, 8s, … capped at 15s. attempt is 0-based. */
export function reconnectDelayMs(attempt: number): number {
  const n = Math.max(0, Math.floor(attempt));
  return Math.min(15_000, 1000 * 2 ** n);
}

export const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function showUpdateBanner(): void {
  const el = document.getElementById("update-banner");
  if (el) el.hidden = false;
}

export function hideUpdateBanner(): void {
  const el = document.getElementById("update-banner");
  if (el) el.hidden = true;
}

export function bindUpdateBanner(reload: () => void = () => location.reload()): void {
  const el = document.getElementById("update-banner");
  if (!el) return;
  const flag = el as HTMLElement & { _jxBound?: boolean };
  if (flag._jxBound) return;
  flag._jxBound = true;
  const go = () => reload();
  el.addEventListener("click", go);
  el.addEventListener("keydown", (e) => {
    const ev = e as KeyboardEvent;
    if (ev.key === "Enter" || ev.key === " ") {
      ev.preventDefault();
      go();
    }
  });
}
