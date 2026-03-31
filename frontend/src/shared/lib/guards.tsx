import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/shared/lib/auth-store";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

/** Requires account-level authentication */
export function AccountGuard({ children }: Props) {
  const accountToken = useAuthStore((s) => s.accountToken);
  const location = useLocation();

  if (!accountToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/** Requires tenant-level authentication */
export function TenantGuard({ children }: Props) {
  const accountToken = useAuthStore((s) => s.accountToken);
  const tenantToken = useAuthStore((s) => s.tenantToken);
  const location = useLocation();

  if (!accountToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!tenantToken) {
    return <Navigate to="/tenants" replace />;
  }

  return <>{children}</>;
}

/** Redirects authenticated users away from public routes */
export function GuestGuard({ children }: Props) {
  const accountToken = useAuthStore((s) => s.accountToken);
  const tenantToken = useAuthStore((s) => s.tenantToken);

  if (accountToken && tenantToken) {
    return <Navigate to="/app/dashboard" replace />;
  }

  if (accountToken) {
    return <Navigate to="/tenants" replace />;
  }

  return <>{children}</>;
}
