import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/lib/auth-store";
import { modulesApi } from "@/features/modules/api";
import { tenantsApi } from "@/features/tenants/api";
import { getErrorMessage } from "@/shared/api/client";
import {
  PageHeader,
  PageSpinner,
  ErrorDisplay,
  EmptyState,
  Badge,
  Spinner,
} from "@/shared/ui";
import { Button } from "@/components/ui/button";
import { Boxes, Check } from "lucide-react";

export default function ModulesPage() {
  const tenantId = useAuthStore((s) => s.selectedTenantId)!;
  const roleName = useAuthStore((s) => s.roleName);
  const canManage = roleName === "Admin" || roleName === "admin";
  const queryClient = useQueryClient();

  const allModulesQuery = useQuery({
    queryKey: ["modules-all"],
    queryFn: modulesApi.listAll,
  });

  const tenantModulesQuery = useQuery({
    queryKey: ["tenant-modules", tenantId],
    queryFn: () => tenantsApi.getModules(tenantId),
  });

  const enableMutation = useMutation({
    mutationFn: (moduleId: string) =>
      tenantsApi.enableModule(tenantId, { module_id: moduleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-modules", tenantId] });
    },
  });

  if (allModulesQuery.isLoading || tenantModulesQuery.isLoading)
    return <PageSpinner />;
  if (allModulesQuery.isError)
    return (
      <ErrorDisplay
        message={getErrorMessage(allModulesQuery.error)}
        onRetry={() => allModulesQuery.refetch()}
      />
    );

  const enabledIds = new Set(
    (Array.isArray(tenantModulesQuery.data)
      ? tenantModulesQuery.data
      : []
    ).map((m: { module_id?: string; id?: string }) => m.module_id || m.id)
  );

  return (
    <div>
      <PageHeader
        title="Modules"
        description={
          canManage
            ? "Enable or disable modules for your organization."
            : "View available modules. Contact an admin to enable modules."
        }
      />

      {allModulesQuery.data?.length === 0 ? (
        <EmptyState
          icon={<Boxes size={48} />}
          title="No modules available"
          description="Modules will appear here once configured."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allModulesQuery.data?.map((mod, i) => {
            const enabled = enabledIds.has(mod.id);
            return (
              <div
                key={mod.id}
                className="rounded-lg border bg-card p-5 animate-fade-in"
                style={{
                  animationDelay: `${i * 60}ms`,
                  animationFillMode: "both",
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <Boxes size={20} className="text-accent" />
                  </div>
                  {enabled && <Badge variant="success">Enabled</Badge>}
                </div>
                <h3 className="font-medium">{mod.name}</h3>
                {mod.description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mod.description}
                  </p>
                )}
                {canManage && !enabled && (
                  <Button
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => enableMutation.mutate(mod.id)}
                    disabled={enableMutation.isPending}
                  >
                    {enableMutation.isPending ? (
                      <Spinner size={14} className="text-primary-foreground" />
                    ) : (
                      <Check size={14} />
                    )}
                    Enable
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
