import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/shared/lib/auth-store";
import { tenantsApi } from "@/features/tenants/api";
import { rolesApi } from "@/features/roles/api";
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
import { Plus, Users, ShieldCheck, UserPlus2 } from "lucide-react";

const addMemberSchema = z.object({
  user_email: z.string().trim().email("Valid email required"),
  role_name: z.string().trim().min(1, "Role is required"),
});

type AddMemberForm = z.infer<typeof addMemberSchema>;

export default function MembersPage() {
  const tenantId = useAuthStore((s) => s.selectedTenantId)!;
  const roleName = useAuthStore((s) => s.roleName);
  const canManage = roleName === "Admin" || roleName === "admin";
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const membersQuery = useQuery({
    queryKey: ["members", tenantId],
    queryFn: () => tenantsApi.getMembers(tenantId),
  });

  const rolesQuery = useQuery({
    queryKey: ["roles", tenantId],
    queryFn: () => rolesApi.list(tenantId),
  });

  const addMutation = useMutation({
    mutationFn: (data: { user_email: string; role_name: string }) =>
      tenantsApi.addMember(tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", tenantId] });
      setDialogOpen(false);
      reset();
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddMemberForm>({ resolver: zodResolver(addMemberSchema) });

  if (membersQuery.isLoading) return <PageSpinner />;
  if (membersQuery.isError)
    return (
      <ErrorDisplay
        message={getErrorMessage(membersQuery.error)}
        onRetry={() => membersQuery.refetch()}
      />
    );

  const members = membersQuery.data ?? [];
  const admins = members.filter(
    (m) => (m.role_name || "").toLowerCase() === "admin",
  ).length;
  const managers = members.filter(
    (m) => (m.role_name || "").toLowerCase() === "manager",
  ).length;

  return (
    <div>
      <PageHeader
        title="Members"
        description="Manage team members and their roles."
        actions={
          canManage ? (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus size={16} /> Add Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Member</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={handleSubmit((d) =>
                    addMutation.mutate({
                      user_email: d.user_email,
                      role_name: d.role_name,
                    }),
                  )}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="user_email">Email</Label>
                    <Input
                      id="user_email"
                      type="email"
                      {...register("user_email")}
                    />
                    {errors.user_email && (
                      <p className="text-xs text-destructive">
                        {errors.user_email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="role_name">Role</Label>
                    <select
                      id="role_name"
                      {...register("role_name")}
                      disabled={rolesQuery.isLoading || rolesQuery.isError}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select role…</option>
                      {rolesQuery.data?.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    {errors.role_name && (
                      <p className="text-xs text-destructive">
                        {errors.role_name.message}
                      </p>
                    )}
                    {rolesQuery.isLoading && (
                      <p className="text-xs text-muted-foreground">
                        Loading roles...
                      </p>
                    )}
                    {rolesQuery.isError && (
                      <p className="text-xs text-destructive">
                        Unable to load roles. Retry this page.
                      </p>
                    )}
                  </div>
                  {addMutation.isError && (
                    <p className="text-sm text-destructive">
                      {getErrorMessage(addMutation.error)}
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
                    <Button
                      type="submit"
                      disabled={
                        addMutation.isPending ||
                        rolesQuery.isLoading ||
                        !!rolesQuery.isError
                      }
                    >
                      {addMutation.isPending && (
                        <Spinner
                          size={14}
                          className="text-primary-foreground"
                        />
                      )}
                      Add
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Users size={14} /> Total members
          </p>
          <p className="text-2xl font-bold">{members.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={14} /> Admins
          </p>
          <p className="text-2xl font-bold">{admins}</p>
        </div>
        <div className="rounded-lg border bg-gradient-to-r from-cyan-500/10 to-sky-500/10 p-4">
          <p className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            <UserPlus2 size={14} /> Managers
          </p>
          <p className="text-2xl font-bold">{managers}</p>
        </div>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={<Users size={48} />}
          title="No members yet"
          description="Add team members to collaborate."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody>
              {membersQuery.data?.map((member, i) => (
                <tr
                  key={member.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors animate-fade-in"
                  style={{
                    animationDelay: `${i * 40}ms`,
                    animationFillMode: "both",
                  }}
                >
                  <td className="px-4 py-3">
                    {member.user_email || member.user_id}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{member.role_name || "—"}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant="success">{member.status || "active"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {member.joined_at
                      ? new Date(member.joined_at).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
