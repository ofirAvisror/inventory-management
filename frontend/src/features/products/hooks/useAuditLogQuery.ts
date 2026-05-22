import { useQuery } from "@tanstack/react-query";
import { getAuditLog, productKeys } from "../api";
import type { AuditLogEntry } from "../types";

export function useAuditLogQuery(id: string | null, enabled: boolean) {
  return useQuery<AuditLogEntry[]>({
    queryKey: id ? productKeys.audit(id) : ["products", "audit", "none"],
    // `enabled` blocks automatic fetches when `id` is null, but a manual
    // refetch() call would still invoke queryFn. Guard defensively rather
    // than casting null to string and sending /products/null/audit-log.
    queryFn: () => {
      if (!id) {
        return Promise.reject(
          new Error("Cannot fetch audit log without a product id"),
        );
      }
      return getAuditLog(id);
    },
    enabled: enabled && Boolean(id),
    staleTime: 0,
  });
}
