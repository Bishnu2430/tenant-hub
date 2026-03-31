import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Tenant } from "@/shared/types";

const STORE_VERSION = 1;

interface AuthState {
  _version: number;
  accountToken: string | null;
  tenantToken: string | null;
  currentUser: User | null;
  selectedTenantId: string | null;
  currentTenant: Tenant | null;
  roleName: string | null;

  setAccountAuth: (token: string, user: User) => void;
  setTenantAuth: (token: string, tenantId: string, role: string) => void;
  setCurrentTenant: (tenant: Tenant) => void;
  setCurrentUser: (user: User) => void;
  clearTenantAuth: () => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  hasTenantContext: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      _version: STORE_VERSION,
      accountToken: null,
      tenantToken: null,
      currentUser: null,
      selectedTenantId: null,
      currentTenant: null,
      roleName: null,

      setAccountAuth: (token, user) =>
        set({ accountToken: token, currentUser: user }),

      setTenantAuth: (token, tenantId, role) =>
        set({ tenantToken: token, selectedTenantId: tenantId, roleName: role }),

      setCurrentTenant: (tenant) => set({ currentTenant: tenant }),

      setCurrentUser: (user) => set({ currentUser: user }),

      clearTenantAuth: () =>
        set({
          tenantToken: null,
          selectedTenantId: null,
          currentTenant: null,
          roleName: null,
        }),

      logout: () =>
        set({
          accountToken: null,
          tenantToken: null,
          currentUser: null,
          selectedTenantId: null,
          currentTenant: null,
          roleName: null,
        }),

      isAuthenticated: () => !!get().accountToken,
      hasTenantContext: () => !!get().tenantToken,
    }),
    {
      name: "saas-auth",
      version: STORE_VERSION,
      migrate: (persistedState: unknown, version: number) => {
        if (version < STORE_VERSION) {
          // Clear state on version mismatch for clean migration
          return {
            _version: STORE_VERSION,
            accountToken: null,
            tenantToken: null,
            currentUser: null,
            selectedTenantId: null,
            currentTenant: null,
            roleName: null,
          };
        }
        return persistedState as AuthState;
      },
    }
  )
);
