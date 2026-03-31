import { apiClient } from "@/shared/api/client";
import type { Module } from "@/shared/types";

export const modulesApi = {
  listAll: () => apiClient.get<Module[]>("/modules").then((r) => r.data),

  create: (data: { name: string; description?: string }) =>
    apiClient.post<Module>("/modules", data).then((r) => r.data),
};
