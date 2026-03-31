import { apiClient } from "@/shared/api/client";
import type { AuditLog } from "@/shared/types";

export const auditApi = {
  list: (params: { tenant_id: string; user_id?: string; limit?: number }) =>
    apiClient
      .get<AuditLog[]>("/audit-logs", { params })
      .then((r) => r.data),
};
