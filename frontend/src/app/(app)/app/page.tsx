"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";

export default function DashboardPage() {
  const { state } = useAuth();

  const tenantLabel = state.tenant
    ? `${state.tenant.name} (@${state.tenant.slug})`
    : (state.tenantId ?? "—");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-sm text-zinc-600">
          Quick view of your current tenant context.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium text-zinc-700">Session</h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">User</span>
              <span className="font-medium text-zinc-900">
                {state.user?.email ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">Tenant</span>
              <span className="font-medium text-zinc-900">{tenantLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">Role</span>
              <span className="font-medium text-zinc-900">
                {state.roleName ?? "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium text-zinc-700">Next</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-600">
            Use the left navigation to manage members, roles, modules, and audit
            logs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
