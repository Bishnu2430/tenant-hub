"use client";

import { useEffect, useState } from "react";
import { apiGet, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AuditLogOut } from "@/lib/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

function apiErrorToString(err: unknown): string {
  const e = err as Partial<ApiError>;
  if (typeof e?.status === "number" && typeof e?.detail === "string") {
    return `${e.status}: ${e.detail}`;
  }
  return "Unexpected error";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getActionColor(action: string): string {
  if (action.includes("create"))
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (action.includes("delete"))
    return "bg-rose-50 text-rose-700 border-rose-200";
  if (action.includes("update"))
    return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-zinc-50 text-zinc-700 border-zinc-200";
}

export default function AuditPage() {
  const { state } = useAuth();
  const tenantId = state.tenantId;
  const token = state.tenantToken;

  const [logs, setLogs] = useState<AuditLogOut[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!tenantId || !token) return;
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<AuditLogOut[]>(
          `/api/v1/audit-logs?tenant_id=${tenantId}&limit=100`,
          { token },
        );
        setLogs(data ?? []);
      } catch (err) {
        setError(apiErrorToString(err));
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [tenantId, token]);

  if (!tenantId || !token) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-zinc-900">Audit Logs</h1>
        <p className="text-sm text-zinc-600">Select a tenant first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Audit Logs</h1>
        <p className="text-sm text-zinc-600">
          Track all system activities and changes within your tenant.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium text-zinc-700">
            Activity History
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {(logs ?? []).length} event{(logs ?? []).length !== 1 ? "s" : ""}{" "}
            recorded
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-zinc-600">Loading audit logs…</div>
          ) : (logs ?? []).length === 0 ? (
            <div className="text-sm text-zinc-600">No audit logs found.</div>
          ) : (
            <div className="space-y-3">
              {(logs ?? []).map((log) => {
                const details =
                  typeof log.details === "string"
                    ? JSON.parse(log.details)
                    : log.details;
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded border ${getActionColor(log.action)}`}
                        >
                          {log.action}
                        </span>
                        {log.resource && (
                          <span className="font-mono text-xs text-zinc-600">
                            {log.resource}
                          </span>
                        )}
                      </div>
                      {details && Object.keys(details).length > 0 && (
                        <div className="mt-2 text-xs text-zinc-600">
                          <div className="font-medium text-zinc-900">
                            Details:
                          </div>
                          <div className="mt-1 space-y-1">
                            {Object.entries(details).map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <span className="font-medium">{key}:</span>
                                <span className="text-zinc-700">
                                  {typeof value === "object"
                                    ? JSON.stringify(value)
                                    : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="mt-2 text-xs text-zinc-500">
                        {formatDate(log.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
