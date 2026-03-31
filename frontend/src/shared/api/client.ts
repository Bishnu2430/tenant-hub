import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { ApiError } from "@/shared/types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8080";

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

// Token injection — reads from localStorage so we don't import the store (avoids circular deps)
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const raw = localStorage.getItem("saas-auth");
  if (raw) {
    try {
      const state = JSON.parse(raw)?.state;
      // tenant-scoped endpoints use tenant token; account-level use account token
      const isTenantScoped =
        config.url?.includes("/tenants/") ||
        config.url?.includes("/roles") ||
        config.url?.includes("/permissions") ||
        config.url?.includes("/modules") ||
        config.url?.includes("/audit");
      const token = isTenantScoped
        ? state?.tenantToken ?? state?.accountToken
        : state?.accountToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore parse errors
    }
  }
  return config;
});

// Global error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const status = error.response?.status;

    if (status === 401) {
      // clear tokens, redirect to login
      localStorage.removeItem("saas-auth");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const detail = error.response?.data?.detail || error.response?.data?.message;

    if (status === 401) return "Invalid credentials. Please try again.";
    if (status === 403) return "You don't have permission for this action.";
    if (status === 404) return "Resource not found.";
    if (status === 409) return detail || "A conflict occurred. The resource may already exist.";
    if (status === 422) return detail || "Validation error. Check your input.";
    if (status === 429) return "Too many requests. Please wait and try again.";
    if (detail) return String(detail);
    return "An unexpected server error occurred.";
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}
