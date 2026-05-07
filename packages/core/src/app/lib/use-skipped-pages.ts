import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_PREFIX = 'open-slide:skipped:';

function storageKey(slideId: string): string {
  return `${STORAGE_PREFIX}${slideId}`;
}

function loadSet(slideId: string): Set<number> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey(slideId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    const out = new Set<number>();
    for (const v of parsed) if (Number.isInteger(v) && v >= 0) out.add(v as number);
    return out;
  } catch {
    return new Set();
  }
}

function persistSet(slideId: string, set: Set<number>): void {
  if (typeof window === 'undefined') return;
  try {
    if (set.size === 0) window.localStorage.removeItem(storageKey(slideId));
    else
      window.localStorage.setItem(
        storageKey(slideId),
        JSON.stringify([...set].sort((a, b) => a - b)),
      );
  } catch {
    // localStorage may be disabled — silently no-op rather than crashing the editor.
  }
}

export type UseSkippedPagesResult = {
  skipped: Set<number>;
  isSkipped: (index: number) => boolean;
  toggle: (index: number) => void;
  remapAfterReorder: (order: number[]) => void;
  remapAfterDelete: (deletedIndex: number) => void;
  remapAfterDuplicate: (insertedAfterIndex: number) => void;
};

export function useSkippedPages(slideId: string, pageCount: number): UseSkippedPagesResult {
  const [skipped, setSkipped] = useState<Set<number>>(() => loadSet(slideId));
  const slideIdRef = useRef(slideId);

  useEffect(() => {
    if (slideIdRef.current !== slideId) {
      slideIdRef.current = slideId;
      setSkipped(loadSet(slideId));
    }
  }, [slideId]);

  // Drop indices that have fallen off the end (e.g. after an external trim).
  useEffect(() => {
    setSkipped((prev) => {
      let changed = false;
      const next = new Set<number>();
      for (const i of prev) {
        if (i < pageCount) next.add(i);
        else changed = true;
      }
      if (!changed) return prev;
      persistSet(slideId, next);
      return next;
    });
  }, [pageCount, slideId]);

  const toggle = useCallback(
    (index: number) => {
      setSkipped((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        persistSet(slideId, next);
        return next;
      });
    },
    [slideId],
  );

  const remapAfterReorder = useCallback(
    (order: number[]) => {
      setSkipped((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set<number>();
        for (let newIdx = 0; newIdx < order.length; newIdx++) {
          if (prev.has(order[newIdx])) next.add(newIdx);
        }
        persistSet(slideId, next);
        return next;
      });
    },
    [slideId],
  );

  const remapAfterDelete = useCallback(
    (deletedIndex: number) => {
      setSkipped((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set<number>();
        for (const i of prev) {
          if (i === deletedIndex) continue;
          next.add(i > deletedIndex ? i - 1 : i);
        }
        persistSet(slideId, next);
        return next;
      });
    },
    [slideId],
  );

  const remapAfterDuplicate = useCallback(
    (insertedAfterIndex: number) => {
      setSkipped((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set<number>();
        for (const i of prev) {
          next.add(i > insertedAfterIndex ? i + 1 : i);
        }
        persistSet(slideId, next);
        return next;
      });
    },
    [slideId],
  );

  const isSkipped = useCallback((index: number) => skipped.has(index), [skipped]);

  return { skipped, isSkipped, toggle, remapAfterReorder, remapAfterDelete, remapAfterDuplicate };
}
