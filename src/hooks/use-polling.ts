"use client";

import { useEffect, useRef, useCallback } from "react";

interface UsePollingOptions {
  /**
   * Callback function to execute on each poll tick.
   * Async functions are awaited to prevent overlapping executions.
   */
  callback: () => Promise<void> | void;
  /**
   * Interval in milliseconds when the window/tab is active.
   * Default: 10000ms (10 seconds)
   */
  intervalMs?: number;
  /**
   * Whether polling is enabled.
   */
  enabled?: boolean;
  /**
   * Whether to reduce or pause polling when the browser tab is hidden/inactive.
   * Default: true
   */
  pauseWhenHidden?: boolean;
  /**
   * Interval in milliseconds when the browser tab is hidden (if not fully paused).
   * Default: 60000ms (60 seconds)
   */
  hiddenIntervalMs?: number;
}

/**
 * Custom hook to safely poll data at configurable intervals without overlapping requests.
 * Automatically adapts to document visibility (pausing or throttling when tab is backgrounded).
 */
export function usePolling({
  callback,
  intervalMs = 10000,
  enabled = true,
  pauseWhenHidden = true,
  hiddenIntervalMs = 60000,
}: UsePollingOptions) {
  const savedCallback = useRef(callback);
  const isExecutingRef = useRef(false);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const tick = useCallback(async () => {
    if (isExecutingRef.current) return;

    try {
      isExecutingRef.current = true;
      await savedCallback.current();
    } catch (err) {
      console.error("Error during polling tick:", err);
    } finally {
      isExecutingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      return;
    }

    let isMounted = true;

    const scheduleNext = () => {
      if (!isMounted) return;

      const isHidden = typeof document !== "undefined" && document.hidden;
      let delay = intervalMs;

      if (isHidden) {
        if (pauseWhenHidden) {
          // Do not schedule while hidden; visibilitychange event will wake it up
          return;
        }
        delay = hiddenIntervalMs;
      }

      timeoutIdRef.current = setTimeout(async () => {
        if (!isMounted) return;
        await tick();
        scheduleNext();
      }, delay);
    };

    // Execute immediately on mount or enable
    tick().then(() => {
      if (isMounted) scheduleNext();
    });

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (pauseWhenHidden && timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
        }
      } else {
        // Tab became visible again: execute immediately and resume regular schedule
        if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
        tick().then(() => {
          if (isMounted) scheduleNext();
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
    };
  }, [enabled, intervalMs, pauseWhenHidden, hiddenIntervalMs, tick]);
}
