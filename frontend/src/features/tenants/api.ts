import { apiClient } from "@/shared/api/client";
import type { Tenant, TenantMember } from "@/shared/types";

export const tenantsApi = {
  list: () => apiClient.get<Tenant[]>("/tenants").then((r) => r.data),

  create: (data: {
    name: string;
    slug: string;
    industry: "school" | "hospital" | "hrms" | "ecommerce" | "finance";
    country?: string;
    currency?: string;
    timezone?: string;
    language?: string;
  }) => apiClient.post<Tenant>("/tenants", data).then((r) => r.data),

  get: (tenantId: string) =>
    apiClient.get<Tenant>(`/tenants/${tenantId}`).then((r) => r.data),

  getMembers: (tenantId: string) =>
    apiClient
      .get<TenantMember[]>(`/tenants/${tenantId}/members`)
      .then((r) => r.data),

  addMember: (
    tenantId: string,
    data: {
      user_id?: string;
      user_email?: string;
      role_id?: string;
      role_name?: string;
    },
  ) =>
    apiClient
      .post<TenantMember>(`/tenants/${tenantId}/members`, data)
      .then((r) => r.data),

  getModules: (tenantId: string) =>
    apiClient.get(`/tenants/${tenantId}/modules`).then((r) => r.data),

  enableModule: (tenantId: string, data: { module_id: string }) =>
    apiClient.post(`/tenants/${tenantId}/modules`, data).then((r) => r.data),

  getSubscriptions: (tenantId: string) =>
    apiClient.get(`/tenants/${tenantId}/subscriptions`).then((r) => r.data),

  getFeatures: (tenantId: string) =>
    apiClient.get(`/tenants/${tenantId}/features`).then((r) => r.data),
};
