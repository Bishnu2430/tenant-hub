import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/lib/auth-store";
import { auditApi } from "@/features/audit/api";
import { getErrorMessage } from "@/shared/api/client";
import {
  PageHeader,
  PageSpinner,
  ErrorDisplay,
  EmptyState,
  Badge,
} from "@/shared/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FileText, Search } from "lucide-react";
import type { AuditLog } from "@/shared/types";

export default function AuditPage() {
  const tenantId = useAuthStore((s) => s.selectedTenantId)!;
  const [userFilter, setUserFilter] = useState("");
  const [limit, setLimit] = useState(50);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const auditQuery = useQuery({
    queryKey: [
      "audit",
      tenantId,
      { user_id: userFilter || undefined, limit },
    ],
    queryFn: () =>
      auditApi.list({
        tenant_id: tenantId,
        user_id: userFilter || undefined,
        limit,
      }),
  });

  if (auditQuery.isLoading) return <PageSpinner />;
  if (auditQuery.isError)
    return (
      <ErrorDisplay
        message={getErrorMessage(auditQuery.error)}
        onRetry={() => auditQuery.refetch()}
      />
    );

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Review activity and changes across your organization."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="user_filter" className="text-xs">
            Filter by User ID
          </Label>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="user_filter"
              placeholder="User ID…"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="limit" className="text-xs">
            Limit
          </Label>
          <select
            id="limit"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
      </div>

      {auditQuery.data?.length === 0 ? (
        <EmptyState
          icon={<FileText size={48} />}
          title="No audit logs"
          description="Activity will appear here as events occur."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Timestamp</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">
                  User
                </th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">
                  Resource
                </th>
                <th className="px-4 py-3 text-left font-medium w-20">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {auditQuery.data?.map((log, i) => (
                <tr
                  key={log.id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors animate-fade-in"
                  style={{
                    animationDelay: `${i * 20}ms`,
                    animationFillMode: "both",
                  }}
                >
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{log.action}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                    {log.user_email || log.user_id || "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {log.resource || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {log.details && Object.keys(log.details).length > 0 ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedLog(log)}
                      >
                        View
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {auditQuery.data && auditQuery.data.length >= limit && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLimit((l) => Math.min(l + 50, 200))}
          >
            Load more
          </Button>
        </div>
      )}

      <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Event Details</SheetTitle>
          </SheetHeader>
          {selectedLog && (
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Action</p>
                <p className="text-sm font-medium">{selectedLog.action}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="text-sm">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payload</p>
                <pre className="mt-1 max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs font-mono">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
