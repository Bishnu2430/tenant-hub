import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/shared/lib/auth-store";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Users,
  Shield,
  Boxes,
  FileText,
  ArrowLeftRight,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/shared/ui";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/members", label: "Members", icon: Users },
  { to: "/app/roles", label: "Roles", icon: Shield },
  { to: "/app/modules", label: "Modules", icon: Boxes },
  { to: "/app/audit", label: "Audit Logs", icon: FileText },
];

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTenant, roleName, currentUser, logout, clearTenantAuth } =
    useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSwitchTenant = () => {
    clearTenantAuth();
    navigate("/tenants");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const currentPage = navItems.find((n) => location.pathname.startsWith(n.to));

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md gradient-primary text-xs font-bold text-primary-foreground">
            {currentTenant?.name?.charAt(0)?.toUpperCase() || "T"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {currentTenant?.name || "Tenant"}
            </p>
            <p className="truncate text-xs text-sidebar-muted">
              {currentTenant?.slug}
            </p>
          </div>
          <button
            className="lg:hidden text-sidebar-muted hover:text-sidebar-foreground"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
              activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
              onClick={() => setMobileOpen(false)}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3 space-y-1">
          <button
            onClick={handleSwitchTenant}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <ArrowLeftRight size={18} />
            Switch Tenant
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/80 backdrop-blur-sm px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </Button>

          <div className="flex-1">
            <h2 className="text-sm font-semibold">
              {currentPage?.label || "App"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {roleName && <Badge variant="default">{roleName}</Badge>}
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {currentUser?.email}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
