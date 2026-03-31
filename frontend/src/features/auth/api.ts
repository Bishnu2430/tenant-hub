import { apiClient } from "@/shared/api/client";
import type { User, LoginResponse } from "@/shared/types";

export const authApi = {
  register: (data: { email: string; password: string; full_name?: string }) =>
    apiClient.post<User>("/auth/register", data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<LoginResponse>("/auth/login", data).then((r) => r.data),

  me: () => apiClient.get<User>("/auth/me").then((r) => r.data),

  switchContext: (data: { tenant_id: string }) =>
    apiClient
      .post<{ access_token: string; tenant_id: string; role: string; token_type: string }>(
        "/auth/switch-context",
        data
      )
      .then((r) => r.data),

  logout: () => apiClient.post("/auth/logout").then((r) => r.data),

  changePassword: (data: { current_password: string; new_password: string }) =>
    apiClient.post("/auth/change-password", data).then((r) => r.data),
};
