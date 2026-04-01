import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/shared/lib/auth-store";
import { tenantsApi } from "@/features/tenants/api";
import { auditApi } from "@/features/audit/api";
import { PageHeader, Skeleton, ErrorDisplay, Badge } from "@/shared/ui";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/shared/api/client";
import {
  Users,
  Boxes,
  Activity,
  Clock,
  Zap,
  UserPlus,
  Shield,
  WandSparkles,
} from "lucide-react";

export default function DashboardPage() {
  const tenantId = useAuthStore((s) => s.selectedTenantId)!;
  const tenantName = useAuthStore((s) => s.currentTenant?.name);

  const membersQuery = useQuery({
    queryKey: ["members", tenantId],
    queryFn: () => tenantsApi.getMembers(tenantId),
  });

  const modulesQuery = useQuery({
    queryKey: ["tenant-modules", tenantId],
    queryFn: () => tenantsApi.getModules(tenantId),
  });

  const featuresQuery = useQuery({
    queryKey: ["tenant-features", tenantId],
    queryFn: () => tenantsApi.getFeatures(tenantId),
  });

  const auditQuery = useQuery({
    queryKey: ["audit", tenantId, { limit: 5 }],
    queryFn: () => auditApi.list({ tenant_id: tenantId, limit: 5 }),
  });

  const stats = [
    {
      label: "Members",
      value: membersQuery.data?.length ?? "—",
      icon: Users,
      loading: membersQuery.isLoading,
    },
    {
      label: "Modules",
      value: Array.isArray(modulesQuery.data) ? modulesQuery.data.length : "—",
      icon: Boxes,
      loading: modulesQuery.isLoading,
    },
    {
      label: "Recent Events",
      value: auditQuery.data?.length ?? "—",
      icon: Activity,
      loading: auditQuery.isLoading,
    },
    {
      label: "Enabled Features",
      value: Array.isArray(featuresQuery.data)
        ? featuresQuery.data.filter(
            (f: { is_enabled?: boolean }) => f.is_enabled !== false,
          ).length
        : "—",
      icon: Zap,
      loading: featuresQuery.isLoading,
    },
  ];

  const roleCounts = (membersQuery.data ?? []).reduce<Record<string, number>>(
    (acc, member) => {
      const key = member.role_name || "Unassigned";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {},
  );
  const roleDistribution = Object.entries(roleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxRoleCount = roleDistribution[0]?.[1] || 1;

  const actionCounts = (auditQuery.data ?? []).reduce<Record<string, number>>(
    (acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    },
    {},
  );
  const activityBreakdown = Object.entries(actionCounts).sort(
    (a, b) => b[1] - a[1],
  );
  const maxActionCount = activityBreakdown[0]?.[1] || 1;

  return (
    <div>
      <PageHeader
        title={`Welcome to ${tenantName || "your organization"}`}
        description="Here's an overview of your organization."
      />

      <div className="mb-6 rounded-xl border bg-gradient-to-r from-sky-500/10 via-cyan-500/10 to-emerald-500/10 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Quick Actions
            </p>
            <p className="text-sm">Ship common setup tasks faster from here.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="gap-2">
              <Link to="/app/members">
                <UserPlus size={14} /> Add Member
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to="/app/modules">
                <WandSparkles size={14} /> Enable Module
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <Link to="/app/roles">
                <Shield size={14} /> Manage Roles
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="rounded-lg border bg-card p-5 shadow-sm animate-fade-in"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                {stat.loading ? (
                  <Skeleton className="h-6 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stat.value}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold">
            Member Role Distribution
          </h3>
          {membersQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : roleDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No members available yet.
            </p>
          ) : (
            <div className="space-y-3">
              {roleDistribution.map(([role, count]) => (
                <div key={role}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium">{role}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-500"
                      style={{
                        width: `${Math.max(8, (count / maxRoleCount) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold">Activity Breakdown</h3>
          {auditQuery.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : activityBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity data yet.
            </p>
          ) : (
            <div className="space-y-3">
              {activityBreakdown.map(([action, count]) => (
                <div key={action}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium">{action}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                      style={{
                        width: `${Math.max(8, (count / maxActionCount) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Clock size={16} className="text-muted-foreground" />
          Recent Activity
        </h3>
        {auditQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : auditQuery.isError ? (
          <ErrorDisplay
            message={getErrorMessage(auditQuery.error)}
            onRetry={() => auditQuery.refetch()}
          />
        ) : auditQuery.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No recent activity.
          </p>
        ) : (
          <div className="space-y-2">
            {auditQuery.data?.map((log, i) => (
              <div
                key={log.id}
                className="flex items-center gap-3 rounded-md border bg-card p-3 text-sm animate-fade-in"
                style={{
                  animationDelay: `${i * 60}ms`,
                  animationFillMode: "both",
                }}
              >
                <Badge variant="outline">{log.action}</Badge>
                <span className="flex-1 truncate text-muted-foreground">
                  {log.resource || "—"}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
