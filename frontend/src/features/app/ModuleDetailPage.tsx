import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/lib/auth-store";
import { tenantsApi } from "@/features/tenants/api";
import { getErrorMessage } from "@/shared/api/client";
import {
  PageHeader,
  PageSpinner,
  ErrorDisplay,
  EmptyState,
  Badge,
} from "@/shared/ui";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Building2,
  Activity,
  ClipboardList,
  HeartPulse,
  School,
  Briefcase,
  ShoppingCart,
} from "lucide-react";

type ModuleConfig = {
  title: string;
  subtitle: string;
  icon: typeof Activity;
  highlightGradient: string;
  quickFacts: Array<{ label: string; value: string }>;
  workflows: string[];
  alerts: string[];
};

const MODULE_CONTENT: Record<string, ModuleConfig> = {
  hospital: {
    title: "Hospital Command Center",
    subtitle:
      "Track appointments, patient records, and treatment queues from one view.",
    icon: HeartPulse,
    highlightGradient: "from-rose-500/15 to-orange-500/10",
    quickFacts: [
      { label: "Patient throughput", value: "132/day" },
      { label: "Avg wait time", value: "18 min" },
      { label: "Bed occupancy", value: "81%" },
    ],
    workflows: [
      "Admissions triage and token queue",
      "Doctor rounds and prescription dispatch",
      "Lab report turnaround tracking",
    ],
    alerts: [
      "2 ICU beds nearing capacity",
      "5 prescriptions pending review",
      "Radiology SLA breach risk in 1 hour",
    ],
  },
  school: {
    title: "School Operations Hub",
    subtitle: "Monitor attendance, exam readiness, and timetable compliance.",
    icon: School,
    highlightGradient: "from-blue-500/15 to-indigo-500/10",
    quickFacts: [
      { label: "Attendance today", value: "94%" },
      { label: "Upcoming exams", value: "7" },
      { label: "Open notices", value: "11" },
    ],
    workflows: [
      "Morning attendance capture",
      "Exam hall allocation and invigilation",
      "Weekly timetable exception handling",
    ],
    alerts: [
      "2 classes below 85% attendance",
      "Science lab booking conflict at 11:30",
      "Midterm marks upload due tomorrow",
    ],
  },
  hrms: {
    title: "HRMS Workforce Console",
    subtitle:
      "Stay on top of leave balances, payroll status, and workforce pulse.",
    icon: Briefcase,
    highlightGradient: "from-emerald-500/15 to-cyan-500/10",
    quickFacts: [
      { label: "Active employees", value: "412" },
      { label: "Pending leave requests", value: "23" },
      { label: "Payroll completion", value: "88%" },
    ],
    workflows: [
      "Leave approval and policy checks",
      "Payroll lock and bank export",
      "Quarterly performance calibration",
    ],
    alerts: [
      "12 profiles missing KYC documents",
      "Payroll cycle closes in 2 days",
      "3 probation reviews overdue",
    ],
  },
  ecommerce: {
    title: "E-Commerce Growth Desk",
    subtitle: "Watch orders, inventory velocity, and fulfillment performance.",
    icon: ShoppingCart,
    highlightGradient: "from-amber-500/15 to-lime-500/10",
    quickFacts: [
      { label: "Orders today", value: "286" },
      { label: "Cart conversion", value: "3.9%" },
      { label: "Low stock SKUs", value: "17" },
    ],
    workflows: [
      "Order capture to shipment handoff",
      "Inventory replenishment planning",
      "Returns and refund reconciliation",
    ],
    alerts: [
      "Flash sale starts in 4 hours",
      "4 high-demand SKUs under threshold",
      "Courier SLA dipped below 95%",
    ],
  },
};

const FALLBACK_CONFIG: ModuleConfig = {
  title: "Module Overview",
  subtitle:
    "Module-specific summaries, workflows, and alerts will appear here.",
  icon: Building2,
  highlightGradient: "from-cyan-500/15 to-sky-500/10",
  quickFacts: [
    { label: "Configured widgets", value: "6" },
    { label: "Active integrations", value: "4" },
    { label: "Pending actions", value: "9" },
  ],
  workflows: [
    "Review module health metrics",
    "Coordinate daily operational tasks",
    "Resolve pending alerts",
  ],
  alerts: [
    "No module-specific alert map found",
    "Using default operational template",
    "Add module profile to customize this view",
  ],
};

export default function ModuleDetailPage() {
  const { moduleName } = useParams<{ moduleName: string }>();
  const tenantId = useAuthStore((s) => s.selectedTenantId)!;

  const modulesQuery = useQuery({
    queryKey: ["tenant-modules", tenantId],
    queryFn: () => tenantsApi.getModules(tenantId),
  });

  const featuresQuery = useQuery({
    queryKey: ["tenant-features", tenantId],
    queryFn: () => tenantsApi.getFeatures(tenantId),
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

  const config = MODULE_CONTENT[normalizedModuleName] || FALLBACK_CONFIG;
  const Icon = config.icon;

  const moduleFeatures = useMemo(() => {
    const features = Array.isArray(featuresQuery.data)
      ? featuresQuery.data
      : [];
    const keyPrefixes: Record<string, string[]> = {
      hospital: ["appointment", "prescription", "patient"],
      school: ["attendance", "results", "timetable", "announcement"],
      hrms: ["employee", "leave", "payroll"],
      ecommerce: ["product", "order", "inventory"],
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
        title={config.title}
        description={config.subtitle}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/app/modules">
              <ArrowLeft size={14} /> Back to Modules
            </Link>
          </Button>
        }
      />

      <div
        className={`mb-6 rounded-xl border bg-gradient-to-r ${config.highlightGradient} p-5`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-card/70">
            <Icon size={22} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">
              Active module: {selectedModule.name}
            </p>
            <p className="text-xs text-muted-foreground">
              Operational snapshot and static guidance.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {config.quickFacts.map((fact) => (
          <div key={fact.label} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">{fact.label}</p>
            <p className="mt-1 text-2xl font-bold">{fact.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ClipboardList size={16} className="text-muted-foreground" />
            Key Workflows
          </h3>
          <div className="space-y-2">
            {config.workflows.map((workflow, idx) => (
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
            <Activity size={16} className="text-muted-foreground" />
            Alerts and Focus Areas
          </h3>
          <div className="space-y-2">
            {config.alerts.map((alert) => (
              <div
                key={alert}
                className="rounded-md border bg-background/60 p-3 text-sm"
              >
                {alert}
              </div>
            ))}
          </div>
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
    </div>
  );
}
