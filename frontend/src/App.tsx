import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GuestGuard, AccountGuard, TenantGuard } from "@/shared/lib/guards";
import { PageSpinner } from "@/shared/ui";

// Route-level code splitting
const LoginPage = lazy(() => import("@/features/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/RegisterPage"));
const TenantsPage = lazy(() => import("@/features/tenants/TenantsPage"));
const AppShell = lazy(() => import("@/features/app/AppShell"));
const DashboardPage = lazy(() => import("@/features/app/DashboardPage"));
const MembersPage = lazy(() => import("@/features/app/MembersPage"));
const RolesPage = lazy(() => import("@/features/app/RolesPage"));
const ModulesPage = lazy(() => import("@/features/app/ModulesPage"));
const ModuleDetailPage = lazy(() => import("@/features/app/ModuleDetailPage"));
const AuditPage = lazy(() => import("@/features/app/AuditPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function SuspenseWrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSpinner />}>{children}</Suspense>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SuspenseWrap>
          <Routes>
            {/* Public */}
            <Route
              path="/login"
              element={
                <GuestGuard>
                  <LoginPage />
                </GuestGuard>
              }
            />
            <Route
              path="/register"
              element={
                <GuestGuard>
                  <RegisterPage />
                </GuestGuard>
              }
            />

            {/* Account-level */}
            <Route
              path="/tenants"
              element={
                <AccountGuard>
                  <TenantsPage />
                </AccountGuard>
              }
            />

            {/* Tenant-level */}
            <Route
              path="/app"
              element={
                <TenantGuard>
                  <AppShell />
                </TenantGuard>
              }
            >
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="roles" element={<RolesPage />} />
              <Route path="modules" element={<ModulesPage />} />
              <Route
                path="modules/:moduleName"
                element={<ModuleDetailPage />}
              />
              <Route path="audit" element={<AuditPage />} />
            </Route>

            {/* Redirects & catch-all */}
            <Route
              path="/"
              element={
                <GuestGuard>
                  <LoginPage />
                </GuestGuard>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SuspenseWrap>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
