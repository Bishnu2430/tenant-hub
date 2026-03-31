"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { apiGet, ApiError } from "@/lib/api";
import type { MembershipOut, ModuleOut, AuditLogOut } from "@/lib/types";

function StatCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: string;
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-zinc-900">{value}</div>
      <div className="text-sm text-zinc-600">{label}</div>
      {subtext && <div className="text-xs text-zinc-500 mt-1">{subtext}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { state } = useAuth();
  const tenantId = state.tenantId;
  const token = state.tenantToken;

  const [members, setMembers] = useState<MembershipOut[] | null>(null);
  const [modules, setModules] = useState<ModuleOut[] | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogOut[] | null>(null);
  const [loading, setLoading] = useState(false);

  const tenantLabel = state.tenant
    ? `${state.tenant.name} (@${state.tenant.slug})`
    : (state.tenantId ?? "—");

  useEffect(() => {
    const run = async () => {
      if (!tenantId || !token) return;
      setLoading(true);
      try {
        const [m, mod, audit] = await Promise.all([
          apiGet<MembershipOut[]>(`/api/v1/tenants/${tenantId}/members`, {
            token,
          }).catch(() => []),
          apiGet<ModuleOut[]>(`/api/v1/tenants/${tenantId}/modules`, {
            token,
          }).catch(() => []),
          apiGet<AuditLogOut[]>(
            `/api/v1/audit-logs?tenant_id=${tenantId}&limit=5`,
            { token },
          ).catch(() => []),
        ]);
        setMembers(m || []);
        setModules(mod || []);
        setAuditLogs(audit || []);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [tenantId, token]);

  const activeMembersCount = (members ?? []).filter((m) => m.is_active).length;
  const enabledModulesCount = (modules ?? []).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-zinc-600 mt-1">
          Welcome back! Here's an overview of your tenant.
        </p>
      </div>

      {/* Tenant Info Card */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
        <CardContent className="pt-6">
          <div>
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              Current Tenant
            </div>
            <div className="text-2xl font-bold text-zinc-900 mt-2">
              {tenantLabel}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <div className="text-xs text-zinc-500">Role</div>
                <div className="font-semibold text-zinc-900 mt-1">
                  {state.roleName ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">User</div>
                <div className="font-semibold text-zinc-900 mt-1 truncate">
                  {state.user?.email ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Industry</div>
                <div className="font-semibold text-zinc-900 mt-1 capitalize">
                  {state.tenant?.industry ?? "—"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="👥"
          label="Active Members"
          value={activeMembersCount}
          subtext={`of ${(members ?? []).length} total`}
        />
        <StatCard
          icon="📦"
          label="Enabled Modules"
          value={enabledModulesCount}
          subtext="features available"
        />
        <StatCard
          icon="📋"
          label="Recent Activity"
          value={(auditLogs ?? []).length}
          subtext="last 5 events"
        />
        <StatCard
          icon="✨"
          label="Status"
          value="Online"
          subtext="system operational"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-medium text-zinc-700">
                  Recent Activity
                </h2>
                <Link href="/app/audit">
                  <Button variant="ghost" size="sm">
                    View all →
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-zinc-600">Loading…</div>
              ) : (auditLogs ?? []).length === 0 ? (
                <div className="text-sm text-zinc-600">
                  No activity recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {(auditLogs ?? []).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 pb-3 border-b border-zinc-100 last:border-0"
                    >
                      <div className="mt-1">
                        {log.action.includes("create") && (
                          <span className="text-emerald-700">✨</span>
                        )}
                        {log.action.includes("delete") && (
                          <span className="text-rose-700">🗑️</span>
                        )}
                        {log.action.includes("update") && (
                          <span className="text-blue-700">✏️</span>
                        )}
                        {!log.action.match(/create|delete|update/) && (
                          <span className="text-zinc-400">•</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-900">
                          {log.action}
                        </div>
                        {log.resource && (
                          <div className="text-xs text-zinc-500 truncate">
                            {log.resource}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400 shrink-0 text-right">
                        {new Date(log.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium text-zinc-700">Quick Actions</h2>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/app/members">
              <Button variant="outline" className="w-full justify-start">
                👥 Add Member
              </Button>
            </Link>
            <Link href="/app/roles">
              <Button variant="outline" className="w-full justify-start">
                🎯 Manage Roles
              </Button>
            </Link>
            <Link href="/app/modules">
              <Button variant="outline" className="w-full justify-start">
                📦 Enable Modules
              </Button>
            </Link>
            <Link href="/tenants">
              <Button variant="outline" className="w-full justify-start">
                🔄 Switch Tenant
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Enabled Modules Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium text-zinc-700">
              Enabled Modules
            </h2>
            <Link href="/app/modules">
              <Button variant="ghost" size="sm">
                Manage →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-zinc-600">Loading…</div>
          ) : (modules ?? []).length === 0 ? (
            <div className="text-sm text-zinc-600">No modules enabled yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(modules ?? []).map((mod) => (
                <div
                  key={mod.id}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"
                >
                  <div className="font-medium text-zinc-900">{mod.name}</div>
                  {mod.description && (
                    <p className="text-xs text-zinc-600 mt-1">
                      {mod.description}
                    </p>
                  )}
                  <div className="inline-block px-2 py-1 mt-2 text-xs font-medium text-emerald-700 bg-emerald-100 rounded">
                    Active
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Helper Section */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div>
            <div className="text-sm font-semibold text-blue-900">
              💡 Getting Started
            </div>
            <ul className="mt-3 space-y-2 text-sm text-blue-800">
              <li>1. Add team members from the Members section</li>
              <li>2. Create and manage roles to control permissions</li>
              <li>
                3. Enable modules to activate features for your organization
              </li>
              <li>4. Check audit logs to track all system activities</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
