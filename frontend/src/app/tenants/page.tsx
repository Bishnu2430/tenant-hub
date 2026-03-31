"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { apiPost } from "@/lib/api";
import type { TenantOut } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TenantCreate = {
  name: string;
  slug: string;
  industry: "school" | "hospital" | "hrms" | "ecommerce";
};

export default function TenantsPage() {
  const router = useRouter();
  const {
    state,
    fetchTenants,
    switchTenant,
    loading,
    error,
    clearError,
    logout,
  } = useAuth();
  const [tenants, setTenants] = useState<TenantOut[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<TenantCreate>({
    name: "",
    slug: "",
    industry: "school",
  });
  const [createError, setCreateError] = useState<string | null>(null);

  const sortedTenants = useMemo(() => {
    return (tenants ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [tenants]);

  useEffect(() => {
    const run = async () => {
      if (!state.accountToken) {
        router.replace("/login");
        return;
      }
      try {
        const t = await fetchTenants();
        setTenants(t);
        if (t.length === 1 && !state.tenantToken) {
          await switchTenant(t[0]!.id);
          router.replace("/app");
        }
      } catch {
        // error is surfaced by hook
      }
    };
    void run();
  }, [
    fetchTenants,
    router,
    state.accountToken,
    state.tenantToken,
    switchTenant,
  ]);

  return (
    <div className="min-h-full flex-1 bg-zinc-50 px-4 py-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">
              Choose a tenant
            </h1>
            <p className="text-sm text-zinc-600">
              Your tenant context decides what data you can access.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => void logout()}
            disabled={loading}
          >
            Logout
          </Button>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium text-zinc-700">Your tenants</h2>
          </CardHeader>
          <CardContent>
            {sortedTenants === null || tenants === null ? (
              <div className="text-sm text-zinc-600">Loading tenants…</div>
            ) : tenants.length === 0 ? (
              <div className="text-sm text-zinc-600">
                No tenants yet. Create your first tenant below.
              </div>
            ) : (
              <div className="grid gap-2">
                {sortedTenants.map((t) => (
                  <button
                    key={t.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left hover:bg-zinc-50"
                    onClick={async () => {
                      clearError();
                      await switchTenant(t.id);
                      router.replace("/app");
                    }}
                  >
                    <div>
                      <div className="font-medium text-zinc-900">{t.name}</div>
                      <div className="text-xs text-zinc-500">{t.slug}</div>
                    </div>
                    <div className="text-xs text-zinc-600">Continue</div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-700">
                Create tenant
              </h2>
              <Button
                variant="secondary"
                onClick={() => setCreating((v) => !v)}
              >
                {creating ? "Hide" : "New tenant"}
              </Button>
            </div>
          </CardHeader>
          {creating ? (
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setCreateError(null);
                  if (!state.accountToken) return;

                  try {
                    const created = await apiPost<TenantOut>(
                      "/api/v1/tenants",
                      {
                        name: createForm.name.trim(),
                        slug: createForm.slug.trim(),
                        industry: createForm.industry,
                      },
                      { token: state.accountToken },
                    );
                    // Refresh tenant list and auto-switch into the new tenant.
                    const t = await fetchTenants();
                    setTenants(t);
                    await switchTenant(created.id);
                    router.replace("/app");
                  } catch (err: unknown) {
                    const maybe = err as { detail?: unknown };
                    setCreateError(
                      typeof maybe?.detail === "string"
                        ? maybe.detail
                        : "Failed to create tenant",
                    );
                  }
                }}
              >
                <div className="space-y-1">
                  <Label htmlFor="tname">
                    Tenant name
                    <span className="text-zinc-400 font-normal">
                      {" "}
                      — The official name of your organization
                    </span>
                  </Label>
                  <Input
                    id="tname"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, name: e.target.value }))
                    }
                    placeholder="e.g., Acme School, City Hospital"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="tslug">
                    Slug
                    <span className="text-zinc-400 font-normal">
                      {" "}
                      — Unique identifier used in URLs (lowercase, hyphens only)
                    </span>
                  </Label>
                  <Input
                    id="tslug"
                    value={createForm.slug}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, slug: e.target.value }))
                    }
                    placeholder="e.g., acme-school, city-hospital"
                    required
                  />
                  <p className="text-xs text-emerald-700 mt-1">
                    ✓ Must be unique and cannot be changed later. Use lowercase
                    letters, numbers, and hyphens.
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="industry">
                    Industry
                    <span className="text-zinc-400 font-normal">
                      {" "}
                      — Type of organization (affects features)
                    </span>
                  </Label>
                  <select
                    id="industry"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    value={createForm.industry}
                    onChange={(e) =>
                      setCreateForm((s) => ({
                        ...s,
                        industry: e.target.value as TenantCreate["industry"],
                      }))
                    }
                  >
                    <option value="school">
                      🏫 School — Educational institutions
                    </option>
                    <option value="hospital">
                      🏥 Hospital — Healthcare facilities
                    </option>
                    <option value="hrms">
                      👥 HRMS — Human Resource Management
                    </option>
                    <option value="ecommerce">
                      🛍️ E-Commerce — Online retail
                    </option>
                  </select>
                  <p className="text-xs text-zinc-600 mt-1">
                    This determines available modules and default roles for your
                    organization.
                  </p>
                </div>

                {createError ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    {createError}
                  </div>
                ) : null}

                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    Create & continue
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCreating(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          ) : null}
        </Card>

        <div className="text-xs text-zinc-500">
          Tip: If you have multiple tenants, switching changes your access
          scope.
        </div>
      </div>
    </div>
  );
}
