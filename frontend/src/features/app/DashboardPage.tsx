import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/lib/auth-store";
import { tenantsApi } from "@/features/tenants/api";
import { auditApi } from "@/features/audit/api";
import { PageHeader, Skeleton, ErrorDisplay, Badge } from "@/shared/ui";
import { getErrorMessage } from "@/shared/api/client";
import { Users, Boxes, Activity, Clock } from "lucide-react";

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
  ];

  return (
    <div>
      <PageHeader
        title={`Welcome to ${tenantName || "your organization"}`}
        description="Here's an overview of your organization."
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="rounded-lg border bg-card p-5 animate-fade-in"
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
          <p className="text-sm text-muted-foreground py-4">No recent activity.</p>
        ) : (
          <div className="space-y-2">
            {auditQuery.data?.map((log, i) => (
              <div
                key={log.id}
                className="flex items-center gap-3 rounded-md border bg-card p-3 text-sm animate-fade-in"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
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
