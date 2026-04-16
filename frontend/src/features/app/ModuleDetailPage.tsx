import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/lib/auth-store";
import { tenantsApi } from "@/features/tenants/api";
import { modulesApi } from "@/features/modules/api";
import { getErrorMessage } from "@/shared/api/client";
import {
  PageHeader,
  PageSpinner,
  ErrorDisplay,
  EmptyState,
  Badge,
} from "@/shared/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Building2,
  Activity,
  ClipboardList,
  Plus,
  Check,
  ListTodo,
} from "lucide-react";

const MODULE_BLUEPRINT: Record<
  string,
  { title: string; subtitle: string; entities: string[]; workflows: string[] }
> = {
  school: {
    title: "School ERP Workspace",
    subtitle:
      "Manage students, attendance, exams, class schedules, and fee invoices.",
    entities: [
      "student",
      "attendance",
      "exam",
      "class",
      "teacher",
      "timetable",
      "fee_invoice",
      "announcement",
    ],
    workflows: [
      "Daily attendance capture",
      "Exam publishing",
      "Fee invoice tracking",
    ],
  },
  hospital: {
    title: "Hospital ERP Workspace",
    subtitle:
      "Track patients, appointments, prescriptions, lab orders, and billing.",
    entities: [
      "patient",
      "doctor",
      "department",
      "appointment",
      "prescription",
      "lab_order",
      "billing_invoice",
    ],
    workflows: [
      "OPD intake",
      "Clinical prescription cycle",
      "Lab and billing reconciliation",
    ],
  },
  hrms: {
    title: "HRMS ERP Workspace",
    subtitle: "Run employee operations including leaves, payroll, and reviews.",
    entities: [
      "employee",
      "department",
      "team",
      "leave_request",
      "payroll_run",
      "timesheet",
      "performance_review",
    ],
    workflows: ["Hiring and onboarding", "Leave approval", "Payroll closure"],
  },
  ecommerce: {
    title: "Commerce ERP Workspace",
    subtitle: "Run catalog, orders, shipments, returns, and stock movements.",
    entities: [
      "customer",
      "product",
      "warehouse",
      "sales_order",
      "shipment",
      "return_request",
      "inventory_move",
    ],
    workflows: ["Order to ship", "Returns loop", "Inventory replenishment"],
  },
  finance: {
    title: "Finance ERP Workspace",
    subtitle:
      "Control invoices, payments, expenses, budget controls, and ledger entries.",
    entities: [
      "customer",
      "vendor",
      "account",
      "invoice",
      "payment",
      "expense",
      "budget",
      "ledger_entry",
    ],
    workflows: [
      "Accounts receivable",
      "Expense approvals",
      "Budget variance monitoring",
    ],
  },
};

const MODULE_LINKED_RECORD_TARGETS: Record<
  string,
  Record<
    string,
    {
      label: string;
      entities: string[];
      helper: string;
    }
  >
> = {
  school: {
    attendance: {
      label: "Student",
      entities: ["student"],
      helper: "Attendance is tied to a student record.",
    },
    fee_invoice: {
      label: "Student",
      entities: ["student"],
      helper: "Fee invoices should reference the enrolled student.",
    },
    exam: {
      label: "Class",
      entities: ["class"],
      helper: "Exams are anchored to the class being assessed.",
    },
    timetable: {
      label: "Class or Teacher",
      entities: ["class", "teacher"],
      helper: "Choose the class or teacher responsible for this timetable.",
    },
  },
  hospital: {
    appointment: {
      label: "Patient",
      entities: ["patient"],
      helper: "Appointments should always belong to a patient.",
    },
    prescription: {
      label: "Patient",
      entities: ["patient"],
      helper: "Prescriptions are linked to the patient chart.",
    },
    lab_order: {
      label: "Patient",
      entities: ["patient"],
      helper: "Lab orders should reference the patient record.",
    },
    billing_invoice: {
      label: "Patient",
      entities: ["patient"],
      helper: "Billing should be tied back to the patient visit.",
    },
  },
  hrms: {
    leave_request: {
      label: "Employee",
      entities: ["employee"],
      helper: "Leave requests need an employee owner.",
    },
    payroll_run: {
      label: "Employee",
      entities: ["employee"],
      helper: "Payroll runs should be anchored to an employee batch.",
    },
    timesheet: {
      label: "Employee",
      entities: ["employee"],
      helper: "Timesheets belong to the employee who submitted them.",
    },
    performance_review: {
      label: "Employee",
      entities: ["employee"],
      helper: "Reviews should reference the employee being assessed.",
    },
  },
  ecommerce: {
    sales_order: {
      label: "Customer",
      entities: ["customer"],
      helper: "Sales orders should reference the customer placing the order.",
    },
    shipment: {
      label: "Sales Order",
      entities: ["sales_order"],
      helper: "Shipments are linked to the originating sales order.",
    },
    return_request: {
      label: "Sales Order",
      entities: ["sales_order"],
      helper: "Returns should trace back to the original order.",
    },
    inventory_move: {
      label: "Product",
      entities: ["product"],
      helper: "Inventory movements are tied to the stock item.",
    },
  },
  finance: {
    invoice: {
      label: "Customer or vendor",
      entities: ["customer", "vendor"],
      helper: "Pick the customer or vendor this invoice belongs to.",
    },
    payment: {
      label: "Invoice",
      entities: ["invoice"],
      helper: "Payments should settle a specific invoice.",
    },
    expense: {
      label: "Vendor",
      entities: ["vendor"],
      helper: "Expenses should reference the paying vendor or supplier.",
    },
    ledger_entry: {
      label: "Account",
      entities: ["account"],
      helper: "Ledger entries should point to the affected account.",
    },
  },
};

const ENTITY_LABELS: Record<string, string> = {
  student: "Student",
  attendance: "Attendance",
  exam: "Exam",
  class: "Class",
  teacher: "Teacher",
  timetable: "Timetable",
  fee_invoice: "Fee Invoice",
  announcement: "Announcement",
  patient: "Patient",
  doctor: "Doctor",
  department: "Department",
  appointment: "Appointment",
  prescription: "Prescription",
  lab_order: "Lab Order",
  billing_invoice: "Billing Invoice",
  employee: "Employee",
  team: "Team",
  leave_request: "Leave Request",
  payroll_run: "Payroll Run",
  timesheet: "Timesheet",
  performance_review: "Performance Review",
  customer: "Customer",
  product: "Product",
  warehouse: "Warehouse",
  sales_order: "Sales Order",
  shipment: "Shipment",
  return_request: "Return Request",
  inventory_move: "Inventory Move",
  vendor: "Vendor",
  account: "Account",
  invoice: "Invoice",
  payment: "Payment",
  expense: "Expense",
  budget: "Budget",
  ledger_entry: "Ledger Entry",
};

export default function ModuleDetailPage() {
  const { moduleName } = useParams<{ moduleName: string }>();
  const tenantId = useAuthStore((s) => s.selectedTenantId)!;
  const roleName = useAuthStore((s) => s.roleName);
  const canWrite =
    roleName === "Admin" || roleName === "Manager" || roleName === "admin";
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [newTitle, setNewTitle] = useState("");
  const [newEntity, setNewEntity] = useState("");
  const [newStatus, setNewStatus] = useState("open");
  const [newPriority, setNewPriority] = useState("normal");
  const [newAmount, setNewAmount] = useState("");
  const [newDueAt, setNewDueAt] = useState("");
  const [linkedEntityName, setLinkedEntityName] = useState("");
  const [linkedRecordId, setLinkedRecordId] = useState("");
  const [blockReason, setBlockReason] = useState("");

  const modulesQuery = useQuery({
    queryKey: ["tenant-modules", tenantId],
    queryFn: () => tenantsApi.getModules(tenantId),
  });

  const featuresQuery = useQuery({
    queryKey: ["tenant-features", tenantId],
    queryFn: () => tenantsApi.getFeatures(tenantId),
  });

  const erpSummaryQuery = useQuery({
    queryKey: ["erp-dashboard", tenantId],
    queryFn: () => modulesApi.getDashboardSummary(tenantId),
  });

  const normalizedModuleName = decodeURIComponent(moduleName || "")
    .trim()
    .toLowerCase();

  const selectedModule = useMemo(() => {
    const modules = Array.isArray(modulesQuery.data) ? modulesQuery.data : [];
    return modules.find(
      (m: { name?: string }) =>
        (m.name || "").toLowerCase() === normalizedModuleName,
    );
  }, [modulesQuery.data, normalizedModuleName]);

  const moduleConfig = MODULE_BLUEPRINT[normalizedModuleName];
  const defaultEntityName = moduleConfig?.entities?.[0] || "generic";

  useEffect(() => {
    if (!moduleConfig) return;
    setNewEntity((current) =>
      moduleConfig.entities.includes(current) ? current : defaultEntityName,
    );
  }, [defaultEntityName, moduleConfig]);

  const activeEntityName = newEntity || defaultEntityName;

  const linkedTargetConfig = useMemo(() => {
    return (
      MODULE_LINKED_RECORD_TARGETS[normalizedModuleName]?.[activeEntityName] ||
      null
    );
  }, [activeEntityName, normalizedModuleName]);

  useEffect(() => {
    if (!linkedTargetConfig) {
      setLinkedEntityName("");
      setLinkedRecordId("");
      return;
    }

    setLinkedEntityName((current) =>
      linkedTargetConfig.entities.includes(current)
        ? current
        : linkedTargetConfig.entities[0],
    );
    setLinkedRecordId("");
  }, [linkedTargetConfig]);

  const linkedRecordsQuery = useQuery({
    queryKey: [
      "erp-linked-records",
      tenantId,
      normalizedModuleName,
      linkedEntityName,
    ],
    enabled: !!selectedModule && !!linkedEntityName,
    queryFn: () =>
      modulesApi.listRecords(
        tenantId,
        normalizedModuleName,
        linkedEntityName,
        100,
      ),
  });

  const recordsQuery = useQuery({
    queryKey: ["erp-records", tenantId, normalizedModuleName],
    enabled: !!selectedModule,
    queryFn: () =>
      modulesApi.listRecords(tenantId, normalizedModuleName, undefined, 100),
  });

  const createRecordMutation = useMutation({
    mutationFn: () =>
      modulesApi.createRecord(tenantId, normalizedModuleName, {
        entity_name: activeEntityName,
        title: newTitle.trim(),
        status: newStatus,
        priority: newPriority,
        amount_cents: newAmount ? Number(newAmount) * 100 : undefined,
        due_at: newDueAt ? new Date(newDueAt).toISOString() : undefined,
        linked_record_id: linkedTargetConfig ? linkedRecordId || null : null,
      }),
    onSuccess: () => {
      setNewTitle("");
      setNewEntity(defaultEntityName);
      setNewStatus("open");
      setNewPriority("normal");
      setNewAmount("");
      setNewDueAt("");
      setLinkedRecordId("");
      queryClient.invalidateQueries({
        queryKey: ["erp-records", tenantId, normalizedModuleName],
      });
      queryClient.invalidateQueries({ queryKey: ["erp-dashboard", tenantId] });
      toast({
        title: "Record created",
        description: "ERP record added to module workflow.",
      });
    },
  });

  const transitionRecordMutation = useMutation({
    mutationFn: ({
      recordId,
      toStatus,
    }: {
      recordId: string;
      toStatus: string;
    }) =>
      modulesApi.transitionRecord(tenantId, recordId, {
        to_status: toStatus,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["erp-records", tenantId, normalizedModuleName],
      });
      queryClient.invalidateQueries({ queryKey: ["erp-dashboard", tenantId] });
    },
  });

  const blockRecordMutation = useMutation({
    mutationFn: (recordId: string) =>
      modulesApi.transitionRecord(tenantId, recordId, {
        to_status: "blocked",
        note: blockReason || "Blocked for review",
      }),
    onSuccess: () => {
      setBlockReason("");
      queryClient.invalidateQueries({
        queryKey: ["erp-records", tenantId, normalizedModuleName],
      });
      queryClient.invalidateQueries({ queryKey: ["erp-dashboard", tenantId] });
    },
  });

  const nextStatusMap: Record<string, string[]> = {
    draft: ["open", "blocked"],
    open: ["in_progress", "blocked", "completed"],
    in_progress: ["review", "blocked", "completed"],
    review: ["completed", "blocked"],
    blocked: ["open", "in_progress"],
  };

  const moduleFeatures = useMemo(() => {
    const features = Array.isArray(featuresQuery.data)
      ? featuresQuery.data
      : [];
    const keyPrefixes: Record<string, string[]> = {
      hospital: ["appointment", "prescription", "patient"],
      school: ["attendance", "results", "timetable", "announcement"],
      hrms: ["employee", "leave", "payroll"],
      ecommerce: ["product", "order", "inventory"],
      finance: ["invoice", "payment", "expense", "budget"],
    };
    const prefixes = keyPrefixes[normalizedModuleName] || [];
    return features
      .filter((f: { feature_key?: string; is_enabled?: boolean }) => {
        const key = (f.feature_key || "").toLowerCase();
        const enabled = f.is_enabled !== false;
        return enabled && prefixes.some((prefix) => key.startsWith(prefix));
      })
      .slice(0, 10);
  }, [featuresQuery.data, normalizedModuleName]);

  const moduleSummary = erpSummaryQuery.data?.modules?.find(
    (m) => m.module_name === normalizedModuleName,
  );
  const formatAmount = (amountCents: number) => {
    const amount = (amountCents / 100).toLocaleString();
    return normalizedModuleName === "finance" ? `₹${amount}` : amount;
  };
  const entityOptions = moduleConfig?.entities || ["generic"];
  const linkedRecordOptions = Array.isArray(linkedRecordsQuery.data)
    ? linkedRecordsQuery.data
    : [];
  const canCreateRecord =
    canWrite &&
    !!moduleConfig &&
    !!newTitle.trim() &&
    (!linkedTargetConfig || !!linkedRecordId);

  if (modulesQuery.isLoading || featuresQuery.isLoading) return <PageSpinner />;
  if (modulesQuery.isError)
    return (
      <ErrorDisplay
        message={getErrorMessage(modulesQuery.error)}
        onRetry={() => modulesQuery.refetch()}
      />
    );

  if (!selectedModule) {
    return (
      <EmptyState
        icon={<Building2 size={48} />}
        title="Module not enabled"
        description="Enable this module first to view module-specific information."
        action={
          <Button asChild variant="outline">
            <Link to="/app/modules">Back to Modules</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={moduleConfig?.title || "Module Workspace"}
        description={
          moduleConfig?.subtitle ||
          "Live ERP workflows and records for this module."
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/app/modules">
              <ArrowLeft size={14} /> Back to Modules
            </Link>
          </Button>
        }
      />

      <div className="mb-6 rounded-xl border bg-gradient-to-r from-cyan-500/15 to-blue-500/10 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-card/70">
            <Activity size={22} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">
              Active module: {selectedModule.name}
            </p>
            <p className="text-xs text-muted-foreground">
              Operational snapshot backed by tenant ERP records.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Records</p>
          <p className="mt-1 text-2xl font-bold">
            {moduleSummary?.total_records ?? 0}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Open</p>
          <p className="mt-1 text-2xl font-bold">
            {moduleSummary?.open_records ?? 0}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            {normalizedModuleName === "finance"
              ? "Amount Processed"
              : "Tracked Value"}
          </p>
          <p className="mt-1 text-2xl font-bold">
            {formatAmount(moduleSummary?.total_amount_cents ?? 0)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Blocked</p>
          <p className="mt-1 text-2xl font-bold">
            {moduleSummary?.blocked_records ?? 0}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ClipboardList size={16} className="text-muted-foreground" />
            Key Workflows
          </h3>
          <div className="space-y-2">
            {(
              moduleConfig?.workflows || ["Module workflow not configured yet"]
            ).map((workflow, idx) => (
              <div
                key={workflow}
                className="rounded-md border bg-background/60 p-3 text-sm"
              >
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {idx + 1}
                </span>
                {workflow}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ListTodo size={16} className="text-muted-foreground" />
            Create ERP Record
          </h3>
          <div className="space-y-3">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Record title (e.g. April payroll run)"
            />
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={newEntity || defaultEntityName}
              onChange={(e) => setNewEntity(e.target.value)}
            >
              {entityOptions.map((entity) => (
                <option key={entity} value={entity}>
                  {ENTITY_LABELS[entity] || entity}
                </option>
              ))}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              >
                {[
                  "draft",
                  "open",
                  "in_progress",
                  "review",
                  "completed",
                  "blocked",
                ].map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
              >
                {["low", "normal", "high", "critical"].map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
            <Input
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="Amount in major unit (optional)"
              type="number"
            />
            <Input
              value={newDueAt}
              onChange={(e) => setNewDueAt(e.target.value)}
              type="datetime-local"
            />
            {linkedTargetConfig ? (
              <div className="rounded-md border bg-background/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    Linked {linkedTargetConfig.label}
                  </p>
                  <Badge variant="outline">
                    {linkedTargetConfig.entities
                      .map((entity) => ENTITY_LABELS[entity] || entity)
                      .join(" / ")}
                  </Badge>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  {linkedTargetConfig.helper}
                </p>
                {linkedTargetConfig.entities.length > 1 ? (
                  <select
                    className="mb-3 h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={linkedEntityName}
                    onChange={(e) => setLinkedEntityName(e.target.value)}
                  >
                    {linkedTargetConfig.entities.map((entity) => (
                      <option key={entity} value={entity}>
                        {ENTITY_LABELS[entity] || entity}
                      </option>
                    ))}
                  </select>
                ) : null}
                <select
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={linkedRecordId}
                  onChange={(e) => setLinkedRecordId(e.target.value)}
                >
                  <option value="">Select {linkedTargetConfig.label}</option>
                  {linkedRecordOptions.map((record) => (
                    <option key={record.id} value={record.id}>
                      {record.title}
                    </option>
                  ))}
                </select>
                {linkedRecordsQuery.isLoading ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Loading linked records...
                  </p>
                ) : linkedRecordOptions.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Create a {linkedTargetConfig.label.toLowerCase()} first to
                    use this workflow.
                  </p>
                ) : null}
              </div>
            ) : null}
            <Button
              className="w-full"
              disabled={!canCreateRecord || createRecordMutation.isPending}
              onClick={() => createRecordMutation.mutate()}
            >
              <Plus size={14} /> Create Record
            </Button>
            {!canWrite ? (
              <p className="text-xs text-muted-foreground">
                You need Admin or Manager role to create records.
              </p>
            ) : !moduleConfig ? (
              <p className="text-xs text-muted-foreground">
                This module is not yet mapped to ERP entities. Add a blueprint
                first.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Workflow Controls</h3>
        <div className="mb-3 rounded-md border bg-background/60 p-3 text-sm text-muted-foreground">
          Use transitions to move records through their ERP lifecycle, or block
          a record with a reason so teams can triage it.
        </div>
        <div className="space-y-3">
          <Input
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="Block reason for the next blocked transition"
          />
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">
          Enabled Features in this Module
        </h3>
        {moduleFeatures.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No module-specific features are enabled yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {moduleFeatures.map((f: { id: string; feature_key?: string }) => (
              <Badge key={f.id} variant="outline">
                {f.feature_key || "feature"}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Recent ERP Records</h3>
        {recordsQuery.isLoading ? (
          <PageSpinner />
        ) : recordsQuery.isError ? (
          <ErrorDisplay
            message={getErrorMessage(recordsQuery.error)}
            onRetry={() => recordsQuery.refetch()}
          />
        ) : !recordsQuery.data?.length ? (
          <p className="text-sm text-muted-foreground">
            No records created yet.
          </p>
        ) : (
          <div className="space-y-2">
            {recordsQuery.data.map((record) => (
              <div
                key={record.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background/60 p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{record.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ENTITY_LABELS[record.entity_name] || record.entity_name} •
                    status: {record.status}
                    {record.linked_record_title
                      ? ` • linked to ${record.linked_record_title}`
                      : ""}
                    {record.amount_cents
                      ? ` • ${formatAmount(record.amount_cents)}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {ENTITY_LABELS[record.entity_name] || record.entity_name}
                  </Badge>
                  <Badge variant="outline">{record.status}</Badge>
                  {canWrite && record.status !== "completed" ? (
                    <>
                      {(nextStatusMap[record.status] || []).map(
                        (nextStatus) => (
                          <Button
                            key={`${record.id}-${nextStatus}`}
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              nextStatus === "blocked"
                                ? blockRecordMutation.mutate(record.id)
                                : transitionRecordMutation.mutate({
                                    recordId: record.id,
                                    toStatus: nextStatus,
                                  })
                            }
                            disabled={
                              transitionRecordMutation.isPending ||
                              blockRecordMutation.isPending
                            }
                          >
                            <Check size={14} />{" "}
                            {nextStatus === "blocked"
                              ? "Block"
                              : `Move to ${nextStatus}`}
                          </Button>
                        ),
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
