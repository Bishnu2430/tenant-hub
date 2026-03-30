"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { MembershipOut, RoleOut } from "@/lib/types";
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

export default function MembersPage() {
  const { state } = useAuth();
  const tenantId = state.tenantId;
  const token = state.tenantToken;

  const [members, setMembers] = useState<MembershipOut[] | null>(null);
  const [roles, setRoles] = useState<RoleOut[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const sortedMembers = useMemo(() => {
    return (members ?? []).slice().sort((a, b) => {
      const aKey = (a.user_email ?? a.user_id).toLowerCase();
      const bKey = (b.user_email ?? b.user_id).toLowerCase();
      return aKey.localeCompare(bKey);
    });
  }, [members]);

  useEffect(() => {
    const run = async () => {
      if (!tenantId || !token) return;
      setLoading(true);
      setError(null);
      try {
        const [m, r] = await Promise.all([
          apiGet<MembershipOut[]>(`/api/v1/tenants/${tenantId}/members`, {
            token,
          }),
          apiGet<RoleOut[]>("/api/v1/roles", { token }),
        ]);
        setMembers(m);
        const sortedRoles = r
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name));
        setRoles(sortedRoles);

        if (!roleId) {
          const preferred = sortedRoles.find((x) => x.name === "Member");
          setRoleId(preferred?.id ?? sortedRoles[0]?.id ?? "");
        }
      } catch (err) {
        setError(apiErrorToString(err));
      } finally {
        setLoading(false);
      }
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, token]);

  if (!tenantId || !token) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-zinc-900">Members</h1>
        <p className="text-sm text-zinc-600">Select a tenant first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Members</h1>
        <p className="text-sm text-zinc-600">
          Add existing users to this tenant by email.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium text-zinc-700">Add member</h2>
            <Button
              variant="secondary"
              onClick={() => {
                setError(null);
                setEmail("");
              }}
              disabled={submitting}
            >
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              const trimmed = email.trim();
              if (!trimmed) return;
              if (!roleId) {
                setError("Choose a role");
                return;
              }

              setSubmitting(true);
              try {
                await apiPost<MembershipOut>(
                  `/api/v1/tenants/${tenantId}/members`,
                  { user_email: trimmed, role_id: roleId },
                  { token },
                );
                const m = await apiGet<MembershipOut[]>(
                  `/api/v1/tenants/${tenantId}/members`,
                  { token },
                );
                setMembers(m);
                setEmail("");
              } catch (err) {
                setError(apiErrorToString(err));
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="email">User email</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  autoComplete="email"
                  required
                />
                <p className="text-xs text-zinc-500">
                  The user must already be registered.
                </p>
              </div>

              <div className="space-y-1">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  required
                >
                  {(roles ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding…" : "Add member"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setError(null)}
                disabled={submitting}
              >
                Dismiss error
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium text-zinc-700">
              Current members
            </h2>
            <Button
              variant="secondary"
              onClick={async () => {
                setError(null);
                setLoading(true);
                try {
                  const m = await apiGet<MembershipOut[]>(
                    `/api/v1/tenants/${tenantId}/members`,
                    { token },
                  );
                  setMembers(m);
                } catch (err) {
                  setError(apiErrorToString(err));
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {members === null ? (
            <div className="text-sm text-zinc-600">Loading…</div>
          ) : members.length === 0 ? (
            <div className="text-sm text-zinc-600">No members yet.</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              <div className="grid grid-cols-12 gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-medium text-zinc-600">
                <div className="col-span-6">User</div>
                <div className="col-span-3">Role</div>
                <div className="col-span-3">Joined</div>
              </div>
              {sortedMembers.map((m) => (
                <div
                  key={m.id}
                  className="grid grid-cols-12 gap-2 px-4 py-3 text-sm text-zinc-900"
                >
                  <div className="col-span-6">
                    <div className="font-medium">
                      {m.user_full_name ?? m.user_email ?? "Unknown"}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {m.user_email ?? `#${m.user_id}`}
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div className="font-medium">{m.role_name ?? "—"}</div>
                  </div>
                  <div className="col-span-3 text-zinc-600">
                    {new Date(m.joined_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
