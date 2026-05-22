import type { BulkResult } from "../types";

/**
 * After a bulk operation, decide which ids should remain selected.
 * Rule (from the UX spec):
 *  - All succeeded -> clear everything that participated in the batch.
 *  - Partial failure -> keep ONLY the failed ids checked.
 *  - Ids that were selected but did not participate in this batch are
 *    preserved as-is.
 */
export function reconcileSelectionAfterBulk(
  prevSelected: ReadonlySet<string>,
  result: BulkResult,
): Set<string> {
  const inBatch = new Set<string>();
  for (const s of result.success) inBatch.add(s.id);
  for (const f of result.failed) inBatch.add(f.id);

  const next = new Set<string>();
  for (const id of prevSelected) {
    if (!inBatch.has(id)) next.add(id);
  }
  for (const f of result.failed) {
    next.add(f.id);
  }
  return next;
}
