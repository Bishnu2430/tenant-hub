"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

function shortId(id: string): string {
  return id.length <= 8 ? id : id.slice(0, 8);
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname?.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={
        "block rounded-lg px-3 py-2 text-sm " +
        (active
          ? "bg-emerald-50 text-emerald-800"
          : "text-zinc-700 hover:bg-zinc-100")
      }
    >
      {label}
    </Link>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { state, logout } = useAuth();

  useEffect(() => {
    if (!state.accountToken) {
      router.replace("/login");
      return;
    }
    if (!state.tenantToken) {
      router.replace("/tenants");
    }
  }, [router, state.accountToken, state.tenantToken]);

  return (
    <div className="min-h-full flex-1 bg-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6">
        <aside className="w-60 shrink-0">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-3">
              <div className="text-xs font-medium text-zinc-500">Tenant</div>
              <div className="text-sm font-semibold text-zinc-900">
                {state.tenant?.name ??
                  (state.tenantId ? shortId(state.tenantId) : "—")}
              </div>
              <div className="text-xs text-zinc-500">
                {state.tenant?.slug ? `@${state.tenant.slug}` : ""}
                {state.tenantId ? ` • #${shortId(state.tenantId)}` : ""}
              </div>
              <div className="text-xs text-zinc-500">
                Role: {state.roleName ?? "—"}
              </div>
            </div>

            <nav className="space-y-1">
              <NavLink href="/app" label="Dashboard" />
              <NavLink href="/app/members" label="Members" />
              <NavLink href="/app/roles" label="Roles" />
              <NavLink href="/app/modules" label="Modules" />
              <NavLink href="/app/audit" label="Audit logs" />
              <Link
                href="/tenants"
                className="block rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                Switch tenant
              </Link>
            </nav>

            <div className="mt-4">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => void logout()}
              >
                Logout
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
