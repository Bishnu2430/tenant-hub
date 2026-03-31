import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/shared/lib/auth-store";
import { rolesApi, permissionsApi } from "@/features/roles/api";
import { getErrorMessage } from "@/shared/api/client";
import {
  PageHeader,
  PageSpinner,
  ErrorDisplay,
  EmptyState,
  Spinner,
  Badge,
} from "@/shared/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Shield, ChevronDown, ChevronRight } from "lucide-react";

const createRoleSchema = z.object({
  name: z.string().trim().min(1, "Required").max(50),
  description: z.string().trim().max(200).optional(),
});

type CreateRoleForm = z.infer<typeof createRoleSchema>;

export default function RolesPage() {
  const tenantId = useAuthStore((s) => s.selectedTenantId)!;
  const roleName = useAuthStore((s) => s.roleName);
  const canManage = roleName === "Admin" || roleName === "admin";
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  const rolesQuery = useQuery({
    queryKey: ["roles", tenantId],
    queryFn: () => rolesApi.list(tenantId),
  });

  const permissionsQuery = useQuery({
    queryKey: ["permissions"],
    queryFn: permissionsApi.list,
  });

  const rolePermsQuery = useQuery({
    queryKey: ["role-permissions", expandedRole],
    queryFn: () => rolesApi.getPermissions(expandedRole!),
    enabled: !!expandedRole,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      rolesApi.create({ ...data, tenant_id: tenantId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles", tenantId] });
      setDialogOpen(false);
      reset();
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({
      roleId,
      permissionId,
    }: {
      roleId: string;
      permissionId: string;
    }) => rolesApi.assignPermission(roleId, { permission_id: permissionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["role-permissions", expandedRole],
      });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateRoleForm>({ resolver: zodResolver(createRoleSchema) });

  if (rolesQuery.isLoading) return <PageSpinner />;
  if (rolesQuery.isError)
    return (
      <ErrorDisplay
        message={getErrorMessage(rolesQuery.error)}
        onRetry={() => rolesQuery.refetch()}
      />
    );

  const assignedPermIds = new Set(
    rolePermsQuery.data?.map((p) => p.id) ?? []
  );

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="Manage roles and their associated permissions."
        actions={
          canManage ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus size={16} /> New Role
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Role</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={handleSubmit((d) =>
                    createMutation.mutate({ name: d.name!, description: d.description })
                  )}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="role_name">Name</Label>
                    <Input id="role_name" {...register("name")} />
                    {errors.name && (
                      <p className="text-xs text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="role_desc">Description</Label>
                    <Input id="role_desc" {...register("description")} />
                  </div>
                  {createMutation.isError && (
                    <p className="text-sm text-destructive">
                      {getErrorMessage(createMutation.error)}
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending && (
                        <Spinner size={14} className="text-primary-foreground" />
                      )}
                      Create
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      {rolesQuery.data?.length === 0 ? (
        <EmptyState
          icon={<Shield size={48} />}
          title="No roles yet"
          description="Create roles to manage permissions."
        />
      ) : (
        <div className="space-y-3">
          {rolesQuery.data?.map((role) => (
            <div
              key={role.id}
              className="rounded-lg border bg-card overflow-hidden"
            >
              <button
                className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                onClick={() =>
                  setExpandedRole(expandedRole === role.id ? null : role.id)
                }
              >
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-primary" />
                  <div>
                    <p className="font-medium">{role.name}</p>
                    {role.description && (
                      <p className="text-xs text-muted-foreground">
                        {role.description}
                      </p>
                    )}
                  </div>
                </div>
                {expandedRole === role.id ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>

              {expandedRole === role.id && (
                <div className="border-t p-4 animate-fade-in">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Permissions
                  </p>
                  {rolePermsQuery.isLoading ? (
                    <Spinner size={16} />
                  ) : (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {rolePermsQuery.data?.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          No permissions assigned.
                        </p>
                      )}
                      {rolePermsQuery.data?.map((p) => (
                        <Badge key={p.id} variant="success">
                          {p.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {canManage && permissionsQuery.data && (
                    <>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Add permission
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {permissionsQuery.data
                          .filter((p) => !assignedPermIds.has(p.id))
                          .map((p) => (
                            <Button
                              key={p.id}
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                assignMutation.mutate({
                                  roleId: role.id,
                                  permissionId: p.id,
                                })
                              }
                              disabled={assignMutation.isPending}
                            >
                              + {p.name}
                            </Button>
                          ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
