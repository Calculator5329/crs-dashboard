import { useState, useEffect } from "react";
import { Activity, Brain, Zap, DollarSign } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { StatCard } from "@/components/shared/StatCard";
import { StatusPill, MethodBadge } from "@/components/shared/StatusPill";
import { ChartCard } from "@/components/charts/ChartCard";
import { useConfig } from "@/contexts/ConfigContext";
import { firestore } from "@/lib/crs-client";
import { formatCurrency, formatTokenCount, formatNumber, formatTimeAgo } from "@/lib/formatters";
import { PROVIDER_COLORS, ROUTE_GROUP_COLORS } from "@/lib/constants";
import { format } from "date-fns";

interface DailySummary {
  date: string;
  totalRequests?: number;
  totalAiCalls?: number;
  totalTokens?: number;
  totalEstimatedCost?: number;
  routeGroups?: Record<string, number>;
  aiProviders?: Record<string, number>;
}

interface ApiLog {
  id?: string;
  timestamp: string;
  method: string;
  path: string;
  status: number;
}

export function DashboardPage() {
  const { isConfigured } = useConfig();
  const [todaySummary, setTodaySummary] = useState<DailySummary | null>(null);
  const [historicalData, setHistoricalData] = useState<DailySummary[]>([]);
  const [recentLogs, setRecentLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const today = format(new Date(), "yyyy-MM-dd");

        const [todayDoc, history, logs] = await Promise.all([
          firestore.get(`_daily_summaries/${today}`).catch(() => null),
          firestore.list("_daily_summaries", {
            orderBy: "date",
            order: "desc",
            limit: 30,
          }).catch(() => []),
          firestore.query("_api_logs", {
            orderBy: "timestamp",
            order: "desc",
            limit: 10,
          }).catch(() => []),
        ]);

        setTodaySummary(todayDoc);
        const items = Array.isArray(history) ? history : history?.documents ?? [];
        setHistoricalData(items.reverse());
        setRecentLogs(Array.isArray(logs) ? logs : logs?.documents ?? []);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isConfigured]);

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-3">
          <h2 className="text-xl font-semibold">Welcome to CRS Dashboard</h2>
          <p className="text-muted-foreground">
            Click the gear icon in the top bar to configure your service URL and API key.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const routeGroupData = todaySummary?.routeGroups
    ? Object.entries(todaySummary.routeGroups).map(([name, value]) => ({
        name,
        value: value as number,
      }))
    : [];

  const providerData = todaySummary?.aiProviders
    ? Object.entries(todaySummary.aiProviders).map(([name, value]) => ({
        name,
        value: value as number,
      }))
    : [];

  const chartData = historicalData.map((d) => ({
    date: d.date ? format(new Date(d.date), "MMM d") : "",
    requests: d.totalRequests ?? 0,
    cost: d.totalEstimatedCost ?? 0,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Requests Today"
          value={formatNumber(todaySummary?.totalRequests ?? 0)}
          icon={Activity}
        />
        <StatCard
          title="AI Calls Today"
          value={formatNumber(todaySummary?.totalAiCalls ?? 0)}
          icon={Brain}
        />
        <StatCard
          title="Total Tokens Today"
          value={formatTokenCount(todaySummary?.totalTokens ?? 0)}
          icon={Zap}
        />
        <StatCard
          title="Estimated Cost Today"
          value={formatCurrency(todaySummary?.totalEstimatedCost ?? 0)}
          icon={DollarSign}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Requests Over Time">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="AI Cost Over Time">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
                <YAxis className="text-xs" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), "Cost"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="cost" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Requests by Route Group">
          <div className="h-[250px]">
            {routeGroupData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={routeGroupData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {routeGroupData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={ROUTE_GROUP_COLORS[entry.name] ?? "var(--chart-5)"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No route group data available
              </div>
            )}
          </div>
        </ChartCard>

        <ChartCard title="AI Calls by Provider">
          <div className="h-[250px]">
            {providerData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={providerData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {providerData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={PROVIDER_COLORS[entry.name] ?? "var(--chart-5)"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No provider data available
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
        <div className="space-y-2">
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No recent activity
            </p>
          ) : (
            recentLogs.map((log, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 rounded-lg border p-3 text-sm"
              >
                <span className="text-xs text-muted-foreground w-24 shrink-0">
                  {formatTimeAgo(log.timestamp)}
                </span>
                <MethodBadge method={log.method} />
                <span className="font-mono text-xs truncate flex-1">{log.path}</span>
                <StatusPill status={log.status} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
