import { apiClient } from "@/shared/api/client";
import type { Role, Permission } from "@/shared/types";

export const rolesApi = {
  list: (tenantId: string) =>
    apiClient.get<Role[]>("/roles", { params: { tenant_id: tenantId } }).then((r) => r.data),

  create: (data: { name: string; tenant_id: string; description?: string }) =>
    apiClient.post<Role>("/roles", data).then((r) => r.data),

  getPermissions: (roleId: string) =>
    apiClient.get<Permission[]>(`/roles/${roleId}/permissions`).then((r) => r.data),

  assignPermission: (roleId: string, data: { permission_id: string }) =>
    apiClient.post(`/roles/${roleId}/permissions`, data).then((r) => r.data),
};

export const permissionsApi = {
  list: () =>
    apiClient.get<Permission[]>("/permissions").then((r) => r.data),

  create: (data: { name: string; description?: string }) =>
    apiClient.post<Permission>("/permissions", data).then((r) => r.data),
};
