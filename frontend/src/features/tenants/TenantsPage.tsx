import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { tenantsApi } from "@/features/tenants/api";
import { authApi } from "@/features/auth/api";
import { useAuthStore } from "@/shared/lib/auth-store";
import { getErrorMessage } from "@/shared/api/client";
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
import {
  PageSpinner,
  EmptyState,
  ErrorDisplay,
  Spinner,
  Badge,
} from "@/shared/ui";
import {
  Plus,
  ArrowRight,
  Building2,
  LogOut,
  BarChart3,
  Globe2,
  Sparkles,
} from "lucide-react";

const INDUSTRY_OPTIONS = [
  { value: "school", label: "School" },
  { value: "hospital", label: "Hospital" },
  { value: "hrms", label: "HRMS" },
  { value: "ecommerce", label: "E-Commerce" },
] as const;

const createTenantSchema = z.object({
  name: z.string().trim().min(1, "Required").max(100),
  slug: z
    .string()
    .trim()
    .min(1, "Required")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, dashes only"),
  industry: z.enum(["school", "hospital", "hrms", "ecommerce"], {
    required_error: "Industry is required",
  }),
  country: z.string().trim().max(100).optional(),
  currency: z.string().trim().max(10).optional(),
  timezone: z.string().trim().max(100).optional(),
  language: z.string().trim().max(10).optional(),
});

type CreateTenantForm = z.infer<typeof createTenantSchema>;

export default function TenantsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setTenantAuth, setCurrentTenant, logout } = useAuthStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const tenantsQuery = useQuery({
    queryKey: ["tenants"],
    queryFn: tenantsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: tenantsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      setDialogOpen(false);
      reset();
    },
  });

  const switchMutation = useMutation({
    mutationFn: authApi.switchContext,
    onSuccess: (data, variables) => {
      setTenantAuth(data.access_token, data.tenant_id, data.role);
      const tenant = tenantsQuery.data?.find(
        (t) => t.id === variables.tenant_id,
      );
      if (tenant) setCurrentTenant(tenant);
      navigate("/app/dashboard");
    },
    onSettled: () => setSwitchingId(null),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<CreateTenantForm>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      industry: "school",
      country: "India",
      currency: "INR",
      timezone: "Asia/Kolkata",
      language: "en",
    },
  });

  const tenantCount = tenantsQuery.data?.length ?? 0;
  const industryCount = new Set(
    (tenantsQuery.data ?? []).map((t) => t.industry).filter(Boolean),
  ).size;

  const nameValue = watch("name");

  const handleSwitch = (tenantId: string) => {
    setSwitchingId(tenantId);
    switchMutation.mutate({ tenant_id: tenantId });
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (tenantsQuery.isLoading) return <PageSpinner />;
  if (tenantsQuery.isError)
    return (
      <ErrorDisplay
        message={getErrorMessage(tenantsQuery.error)}
        onRetry={() => tenantsQuery.refetch()}
      />
    );

  return (
    <div className="min-h-screen gradient-surface">
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <h1 className="text-xl font-bold tracking-tight">
            Your Organizations
          </h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Select an organization to continue, or create a new one.
          </p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus size={16} />
                New
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Organization</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={handleSubmit((d) =>
                  createMutation.mutate({
                    name: d.name,
                    slug: d.slug,
                    industry: d.industry,
                    country: d.country,
                    currency: d.currency,
                    timezone: d.timezone,
                    language: d.language,
                  }),
                )}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      {...register("name")}
                      onChange={(e) => {
                        const value = e.target.value;
                        const autoSlug = value
                          .toLowerCase()
                          .trim()
                          .replace(/[^a-z0-9\s-]/g, "")
                          .replace(/\s+/g, "-")
                          .replace(/-+/g, "-");
                        setValue("name", value, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                        if (autoSlug) {
                          setValue("slug", autoSlug, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }
                      }}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      placeholder="my-org"
                      {...register("slug")}
                    />
                    {errors.slug && (
                      <p className="text-xs text-destructive">
                        {errors.slug.message}
                      </p>
                    )}
                    {nameValue && (
                      <p className="text-xs text-muted-foreground">
                        Used in URLs and tenant switch context.
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="industry">Industry *</Label>
                    <select
                      id="industry"
                      {...register("industry")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {INDUSTRY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.industry && (
                      <p className="text-xs text-destructive">
                        {errors.industry.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" {...register("country")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      placeholder="USD"
                      {...register("currency")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      placeholder="UTC"
                      {...register("timezone")}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="language">Language</Label>
                    <Input
                      id="language"
                      placeholder="en"
                      {...register("language")}
                    />
                  </div>
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
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-4">
            <p className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <BarChart3 size={14} /> Organizations
            </p>
            <p className="text-2xl font-bold">{tenantCount}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Globe2 size={14} /> Industries
            </p>
            <p className="text-2xl font-bold">{industryCount}</p>
          </div>
          <div className="rounded-lg border bg-gradient-to-r from-sky-500/10 to-emerald-500/10 p-4">
            <p className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles size={14} /> Quick tip
            </p>
            <p className="text-sm">
              Create with defaults, then customize roles/modules in-app.
            </p>
          </div>
        </div>

        {tenantsQuery.data?.length === 0 ? (
          <EmptyState
            icon={<Building2 size={48} />}
            title="No organizations yet"
            description="Create your first organization to get started."
          />
        ) : (
          <div className="grid gap-3">
            {tenantsQuery.data?.map((tenant, i) => (
              <div
                key={tenant.id}
                className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-shadow hover:shadow-md animate-fade-in"
                style={{
                  animationDelay: `${i * 50}ms`,
                  animationFillMode: "both",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary text-sm font-bold text-primary-foreground">
                    {tenant.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tenant.slug}
                    </p>
                  </div>
                  {tenant.industry && (
                    <Badge variant="outline">{tenant.industry}</Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleSwitch(tenant.id)}
                  disabled={switchingId === tenant.id}
                  aria-label={`Switch to ${tenant.name}`}
                >
                  {switchingId === tenant.id ? (
                    <Spinner size={14} />
                  ) : (
                    <>
                      Enter
                      <ArrowRight size={14} />
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {switchMutation.isError && (
          <div className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {getErrorMessage(switchMutation.error)}
          </div>
        )}
      </main>
    </div>
  );
}
