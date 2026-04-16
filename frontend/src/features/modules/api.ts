import { apiClient } from "@/shared/api/client";
import type { ERPDashboardSummary, ERPRecord, Module } from "@/shared/types";

export const modulesApi = {
  listAll: () => apiClient.get<Module[]>("/modules").then((r) => r.data),

  create: (data: { name: string; description?: string }) =>
    apiClient.post<Module>("/modules", data).then((r) => r.data),

  getDashboardSummary: (tenantId: string) =>
    apiClient
      .get<ERPDashboardSummary>(`/tenants/${tenantId}/erp/dashboard`)
      .then((r) => r.data),

  listRecords: (
    tenantId: string,
    moduleName: string,
    entityName?: string,
    limit = 50,
  ) =>
    apiClient
      .get<ERPRecord[]>(`/tenants/${tenantId}/erp/${moduleName}/records`, {
        params: { entity_name: entityName, limit },
      })
      .then((r) => r.data),

  createRecord: (
    tenantId: string,
    moduleName: string,
    data: {
      entity_name: string;
      title: string;
      status?: string;
      priority?: string;
      amount_cents?: number;
      due_at?: string;
      payload?: Record<string, unknown>;
      linked_record_id?: string | null;
    },
  ) =>
    apiClient
      .post<ERPRecord>(`/tenants/${tenantId}/erp/${moduleName}/records`, data)
      .then((r) => r.data),

  updateRecord: (
    tenantId: string,
    recordId: string,
    data: {
      title?: string;
      status?: string;
      priority?: string;
      amount_cents?: number;
      due_at?: string;
      payload?: Record<string, unknown>;
      assigned_to_user_id?: string | null;
      blocked_reason?: string | null;
    },
  ) =>
    apiClient
      .patch<ERPRecord>(`/tenants/${tenantId}/erp/records/${recordId}`, data)
      .then((r) => r.data),

  transitionRecord: (
    tenantId: string,
    recordId: string,
    data: { to_status: string; note?: string },
  ) =>
    apiClient
      .post<ERPRecord>(
        `/tenants/${tenantId}/erp/records/${recordId}/transition`,
        data,
      )
      .then((r) => r.data),
};
