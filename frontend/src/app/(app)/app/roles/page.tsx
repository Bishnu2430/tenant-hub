"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { RoleOut, PermissionOut } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function apiErrorToString(err: unknown): string {
  const e = err as Partial<ApiError>;
  if (typeof e?.status === "number" && typeof e?.detail === "string") {
    return `${e.status}: ${e.detail}`;
  }
  return "Unexpected error";
}

export default function RolesPage() {
  const { state } = useAuth();
  const tenantId = state.tenantId;
  const token = state.tenantToken;

  const [roles, setRoles] = useState<RoleOut[] | null>(null);
  const [permissions, setPermissions] = useState<PermissionOut[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [roleName, setRoleName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const sortedRoles = useMemo(() => {
    return (roles ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [roles]);

  useEffect(() => {
    const run = async () => {
      if (!tenantId || !token) return;
      setLoading(true);
      setError(null);
      try {
        const [r, p] = await Promise.all([
          apiGet<RoleOut[]>("/api/v1/roles", { token }),
          apiGet<PermissionOut[]>("/api/v1/permissions", { token }),
        ]);
        setRoles(r);
        setPermissions(p ?? []);
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
        <h1 className="text-xl font-semibold text-zinc-900">Roles</h1>
        <p className="text-sm text-zinc-600">Select a tenant first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">
          Roles & Permissions
        </h1>
        <p className="text-sm text-zinc-600">
          Manage roles and assign permissions to control access and
          responsibilities.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-medium text-zinc-700">Roles</h2>
                <p className="text-xs text-zinc-500 mt-1">
                  {sortedRoles.length} role{sortedRoles.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="text-sm text-zinc-600">Loading roles…</div>
            ) : sortedRoles.length === 0 ? (
              <div className="text-sm text-zinc-600">No roles found.</div>
            ) : (
              <div className="space-y-2">
                {sortedRoles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 hover:bg-zinc-50"
                  >
                    <div>
                      <div className="font-medium text-zinc-900">
                        {role.name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        ID: {role.id.slice(0, 8)}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setExpandedRole(
                          expandedRole === role.id ? null : role.id,
                        )
                      }
                      className="text-xs text-emerald-700 hover:underline"
                    >
                      {expandedRole === role.id ? "Hide" : "View"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium text-zinc-700">
              Permissions Available
            </h2>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-zinc-600">Loading permissions…</div>
            ) : (permissions ?? []).length === 0 ? (
              <div className="text-sm text-zinc-600">
                No permissions available.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(permissions ?? []).map((perm) => (
                  <div
                    key={perm.id}
                    className="p-2 rounded border border-zinc-200 bg-zinc-50"
                  >
                    <div className="font-mono text-xs font-medium text-zinc-900">
                      {perm.name}
                    </div>
                    {perm.description && (
                      <div className="text-xs text-zinc-600 mt-1">
                        {perm.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium text-zinc-700">Create New Role</h2>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              if (!roleName.trim()) {
                setError("Role name required");
                return;
              }
              setSubmitting(true);
              try {
                await apiPost<RoleOut>(
                  "/api/v1/roles",
                  {
                    name: roleName.trim(),
                    tenant_id: tenantId,
                  },
                  { token },
                );
                setRoleName("");
                // Refresh roles
                const r = await apiGet<RoleOut[]>("/api/v1/roles", { token });
                setRoles(r);
              } catch (err) {
                setError(apiErrorToString(err));
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="rname">Role name</Label>
              <Input
                id="rname"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g., Supervisor, Manager"
                disabled={submitting}
              />
            </div>
            <Button disabled={submitting} className="w-full">
              {submitting ? "Creating…" : "Create Role"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
