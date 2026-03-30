"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import type {
  LoginResponse,
  SwitchContextResponse,
  TenantOut,
  UserOut,
} from "@/lib/types";

type AuthState = {
  accountToken: string | null;
  tenantToken: string | null;
  tenantId: string | null;
  tenant: TenantOut | null;
  roleName: string | null;
  user: UserOut | null;
};

type AuthContextValue = {
  state: AuthState;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  fetchTenants: () => Promise<TenantOut[]>;
  switchTenant: (tenantId: string) => Promise<void>;
  clearError: () => void;
};

const STORAGE_KEY = "mt.auth.v1";

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStored(): AuthState {
  if (typeof window === "undefined") {
    return {
      accountToken: null,
      tenantToken: null,
      tenantId: null,
      tenant: null,
      roleName: null,
      user: null,
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) throw new Error("missing");
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    return {
      accountToken: parsed.accountToken ?? null,
      tenantToken: parsed.tenantToken ?? null,
      tenantId: parsed.tenantId ?? null,
      tenant: parsed.tenant ?? null,
      roleName: parsed.roleName ?? null,
      user: parsed.user ?? null,
    };
  } catch {
    return {
      accountToken: null,
      tenantToken: null,
      tenantId: null,
      tenant: null,
      roleName: null,
      user: null,
    };
  }
}

function persistStored(state: AuthState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function apiErrorToString(err: unknown): string {
  const e = err as Partial<ApiError>;
  if (typeof e?.status === "number" && typeof e?.detail === "string") {
    return `${e.status}: ${e.detail}`;
  }
  return "Unexpected error";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => loadStored());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    persistStored(state);
  }, [state]);

  // If we have a token, refresh user info on mount.
  useEffect(() => {
    const run = async () => {
      if (!state.accountToken) return;
      try {
        const me = await apiGet<UserOut>("/api/v1/auth/me", {
          token: state.accountToken,
        });
        setState((s) => ({ ...s, user: me }));

        if (state.tenantToken && state.tenantId) {
          try {
            const tenant = await apiGet<TenantOut>(
              `/api/v1/tenants/${state.tenantId}`,
              { token: state.tenantToken },
            );
            setState((s) => ({ ...s, tenant }));
          } catch {
            // Tenant token probably expired/revoked.
            setState((s) => ({
              ...s,
              tenantToken: null,
              tenantId: null,
              tenant: null,
              roleName: null,
            }));
          }
        }
      } catch {
        // Token probably expired/revoked.
        setState({
          accountToken: null,
          tenantToken: null,
          tenantId: null,
          tenant: null,
          roleName: null,
          user: null,
        });
      }
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      state,
      loading,
      error,
      clearError: () => setError(null),

      login: async (email: string, password: string) => {
        setLoading(true);
        setError(null);
        try {
          const res = await apiPost<LoginResponse>("/api/v1/auth/login", {
            email,
            password,
          });
          const token = res.access_token;
          const me = await apiGet<UserOut>("/api/v1/auth/me", { token });
          setState({
            accountToken: token,
            tenantToken: null,
            tenantId: null,
            tenant: null,
            roleName: null,
            user: me,
          });
        } catch (err) {
          setError(apiErrorToString(err));
          throw err;
        } finally {
          setLoading(false);
        }
      },

      register: async (email: string, password: string, fullName?: string) => {
        setLoading(true);
        setError(null);
        try {
          await apiPost<UserOut>("/api/v1/auth/register", {
            email,
            password,
            full_name: fullName,
          });
        } catch (err) {
          setError(apiErrorToString(err));
          throw err;
        } finally {
          setLoading(false);
        }
      },

      logout: async () => {
        setLoading(true);
        setError(null);
        try {
          if (state.accountToken) {
            await apiPost<{ message: string }>(
              "/api/v1/auth/logout",
              {},
              { token: state.accountToken },
            );
          }
        } catch {
          // ignore logout errors
        } finally {
          setState({
            accountToken: null,
            tenantToken: null,
            tenantId: null,
            tenant: null,
            roleName: null,
            user: null,
          });
          setLoading(false);
        }
      },

      fetchTenants: async () => {
        if (!state.accountToken) throw new Error("Not logged in");
        return apiGet<TenantOut[]>("/api/v1/tenants", {
          token: state.accountToken,
        });
      },

      switchTenant: async (tenantId: string) => {
        if (!state.accountToken) throw new Error("Not logged in");
        setLoading(true);
        setError(null);
        try {
          const res = await apiPost<SwitchContextResponse>(
            "/api/v1/auth/switch-context",
            { tenant_id: tenantId },
            { token: state.accountToken },
          );

          const tenant = await apiGet<TenantOut>(
            `/api/v1/tenants/${res.tenant_id}`,
            { token: res.access_token },
          );

          setState((s) => ({
            ...s,
            tenantToken: res.access_token,
            tenantId: res.tenant_id,
            tenant,
            roleName: res.role ?? s.roleName,
          }));
        } catch (err) {
          setError(apiErrorToString(err));
          throw err;
        } finally {
          setLoading(false);
        }
      },
    };
  }, [state, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
