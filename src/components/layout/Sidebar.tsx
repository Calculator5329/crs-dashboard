import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Brain,
  ScrollText,
  DollarSign,
  Settings,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/ai-usage", icon: Brain, label: "AI Usage" },
  { to: "/api-logs", icon: ScrollText, label: "API Logs" },
  { to: "/cost", icon: DollarSign, label: "Cost & Billing" },
  { to: "/limits", icon: Settings, label: "Limits & Controls" },
  { to: "/health", icon: Activity, label: "Health & Status" },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-sidebar-border bg-sidebar-background">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <span className="text-lg font-semibold tracking-tight">CRS Dashboard</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
