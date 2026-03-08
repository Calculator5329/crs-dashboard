import { useState, useEffect } from "react";
import { Moon, Sun, Menu, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useConfig } from "@/contexts/ConfigContext";
import { healthCheck } from "@/lib/crs-client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { ConfigDialog } from "@/components/shared/ConfigDialog";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/ai-usage", icon: Brain, label: "AI Usage" },
  { to: "/api-logs", icon: ScrollText, label: "API Logs" },
  { to: "/cost", icon: DollarSign, label: "Cost & Billing" },
  { to: "/limits", icon: Settings, label: "Limits & Controls" },
  { to: "/health", icon: Activity, label: "Health & Status" },
];

export function TopBar() {
  const { theme, toggleTheme } = useTheme();
  const { isConfigured } = useConfig();
  const [serviceStatus, setServiceStatus] = useState<"ok" | "error" | "checking">("checking");
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    if (!isConfigured) {
      setServiceStatus("error");
      return;
    }
    const check = async () => {
      const { status } = await healthCheck();
      setServiceStatus(status === "ok" ? "ok" : "error");
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [isConfigured]);

  return (
    <header className="flex h-14 items-center justify-between border-b px-4 bg-background">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" className="md:hidden" />}
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <SheetHeader className="border-b px-4 h-14 flex justify-center">
              <SheetTitle>CRS Dashboard</SheetTitle>
            </SheetHeader>
            <nav className="space-y-1 p-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              serviceStatus === "ok" && "bg-green-500",
              serviceStatus === "error" && "bg-red-500",
              serviceStatus === "checking" && "bg-yellow-500 animate-pulse"
            )}
          />
          <span className="text-sm text-muted-foreground">
            {serviceStatus === "ok"
              ? "Service Online"
              : serviceStatus === "checking"
                ? "Checking..."
                : "Service Offline"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setConfigOpen(true)}>
          <Settings2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <ConfigDialog open={configOpen} onOpenChange={setConfigOpen} />
    </header>
  );
}
