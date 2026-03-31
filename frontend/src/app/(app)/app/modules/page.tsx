"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ModuleOut } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function apiErrorToString(err: unknown): string {
  const e = err as Partial<ApiError>;
  if (typeof e?.status === "number" && typeof e?.detail === "string") {
    return `${e.status}: ${e.detail}`;
  }
  return "Unexpected error";
}

export default function ModulesPage() {
  const { state } = useAuth();
  const tenantId = state.tenantId;
  const token = state.tenantToken;

  const [allModules, setAllModules] = useState<ModuleOut[] | null>(null);
  const [tenantModules, setTenantModules] = useState<ModuleOut[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedAvailable = useMemo(() => {
    const enabled = new Set((tenantModules ?? []).map((m) => m.id));
    return (allModules ?? [])
      .filter((m) => !enabled.has(m.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allModules, tenantModules]);

  const sortedEnabled = useMemo(() => {
    return (tenantModules ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tenantModules]);

  useEffect(() => {
    const run = async () => {
      if (!tenantId || !token) return;
      setLoading(true);
      setError(null);
      try {
        const [all, tenant] = await Promise.all([
          apiGet<ModuleOut[]>("/api/v1/modules", { token }),
          apiGet<ModuleOut[]>(`/api/v1/tenants/${tenantId}/modules`, { token }),
        ]);
        setAllModules(all);
        setTenantModules(tenant ?? []);
      } catch (err) {
        setError(apiErrorToString(err));
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [tenantId, token]);

  if (!tenantId || !token) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-zinc-900">Modules</h1>
        <p className="text-sm text-zinc-600">Select a tenant first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Modules</h1>
        <p className="text-sm text-zinc-600">
          Enable and manage feature modules for this tenant.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Enabled Modules */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium text-zinc-700">
              Enabled Modules
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {sortedEnabled.length} module
              {sortedEnabled.length !== 1 ? "s" : ""} active
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-zinc-600">Loading…</div>
            ) : sortedEnabled.length === 0 ? (
              <div className="text-sm text-zinc-600">
                No modules enabled yet.
              </div>
            ) : (
              <div className="space-y-2">
                {sortedEnabled.map((mod) => (
                  <div
                    key={mod.id}
                    className="flex items-start justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3"
                  >
                    <div>
                      <div className="font-medium text-zinc-900">
                        {mod.name}
                      </div>
                      {mod.description && (
                        <p className="text-xs text-zinc-600 mt-1">
                          {mod.description}
                        </p>
                      )}
                    </div>
                    <span className="inline-block px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 rounded">
                      Active
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Modules */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium text-zinc-700">
              Available Modules
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {sortedAvailable.length} module
              {sortedAvailable.length !== 1 ? "s" : ""} available
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-zinc-600">Loading…</div>
            ) : sortedAvailable.length === 0 ? (
              <div className="text-sm text-zinc-600">
                All modules are already enabled.
              </div>
            ) : (
              <div className="space-y-2">
                {sortedAvailable.map((mod) => (
                  <div
                    key={mod.id}
                    className="flex items-start justify-between rounded-lg border border-zinc-200 bg-white p-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-zinc-900">
                        {mod.name}
                      </div>
                      {mod.description && (
                        <p className="text-xs text-zinc-600 mt-1">
                          {mod.description}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="ml-2 shrink-0"
                      onClick={async () => {
                        setError(null);
                        try {
                          await apiPost(
                            `/api/v1/tenants/${tenantId}/modules`,
                            { module_id: mod.id },
                            { token },
                          );
                          // Refresh
                          const tenant = await apiGet<ModuleOut[]>(
                            `/api/v1/tenants/${tenantId}/modules`,
                            { token },
                          );
                          setTenantModules(tenant ?? []);
                        } catch (err) {
                          setError(apiErrorToString(err));
                        }
                      }}
                    >
                      Enable
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
