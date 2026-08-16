/** Audit Ledger style: queue reordering is deterministic local state only; it never reads, moves, or mutates source files. */
export type QueueEntry = { id: string };

export function moveQueueItem<T extends QueueEntry>(items: readonly T[], sourceId: string, nextIndex: number): T[] {
  const currentIndex = items.findIndex((item) => item.id === sourceId);
  const boundedIndex = Math.max(0, Math.min(items.length - 1, nextIndex));
  if (currentIndex < 0 || currentIndex === boundedIndex) return [...items];
  const next = [...items];
  const [moved] = next.splice(currentIndex, 1);
  next.splice(boundedIndex, 0, moved);
  return next;
}

export function moveQueueItemBefore<T extends QueueEntry>(items: readonly T[], sourceId: string, targetId: string): T[] {
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return [...items];
  return moveQueueItem(items, sourceId, sourceIndex < targetIndex ? targetIndex - 1 : targetIndex);
}

export function createZipOutputPlan<T extends QueueEntry>(items: readonly T[], isEligible: (item: T) => boolean, extensionFor: (item: T) => "jpg" | "png" | "webp") {
  const outputPlan = new Map<string, string>();
  items.filter(isEligible).forEach((item, index) => {
    const ordinal = `image-${String(index + 1).padStart(2, "0")}`;
    outputPlan.set(item.id, `${ordinal}-clean.${extensionFor(item)}`);
  });
  return outputPlan;
}
