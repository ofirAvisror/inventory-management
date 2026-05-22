import { useQuery } from "@tanstack/react-query";
import { getAuditLog, productKeys } from "../api";
import type { AuditLogEntry } from "../types";

export function useAuditLogQuery(id: string | null, enabled: boolean) {
  return useQuery<AuditLogEntry[]>({
    queryKey: id ? productKeys.audit(id) : ["products", "audit", "none"],
    queryFn: () => getAuditLog(id as string),
    enabled: enabled && Boolean(id),
    staleTime: 0,
  });
}
