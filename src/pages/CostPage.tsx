import { useState, useEffect, useMemo } from "react";
import { DollarSign, TrendingUp, Calendar, Target } from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useConfig } from "@/contexts/ConfigContext";
import { firestore } from "@/lib/crs-client";
import { formatCurrency, formatTokenCount, formatNumber } from "@/lib/formatters";
import { PROVIDER_COLORS } from "@/lib/constants";
import { format, getDaysInMonth } from "date-fns";

interface DailySummary {
  date: string;
  totalEstimatedCost?: number;
  aiModels?: Record<string, { calls?: number; inputTokens?: number; outputTokens?: number; estimatedCost?: number }>;
  aiProviders?: Record<string, { calls?: number; estimatedCost?: number }>;
}

export function CostPage() {
  const { isConfigured } = useConfig();
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [dailyLimit, setDailyLimit] = useState<number>(50);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [summaries, configDoc] = await Promise.all([
          firestore.list("_daily_summaries", {
            orderBy: "date",
            order: "desc",
            limit: 30,
          }).catch(() => []),
          firestore.get("_admin_config/limits").catch(() => null),
        ]);

        const items = Array.isArray(summaries) ? summaries : summaries?.documents ?? [];
        setDailySummaries(items);
        if (configDoc?.dailySpendCap) setDailyLimit(configDoc.dailySpendCap);
      } catch (err) {
        console.error("Cost fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isConfigured]);

  const stats = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const todaySummary = dailySummaries.find((s) => s.date === today);
    const todaySpend = todaySummary?.totalEstimatedCost ?? 0;

    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = getDaysInMonth(now);
    const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd");

    const thisMonthSummaries = dailySummaries.filter((s) => s.date >= monthStart);
    const monthSpend = thisMonthSummaries.reduce((sum, s) => sum + (s.totalEstimatedCost ?? 0), 0);

    const weekAgo = format(new Date(now.getTime() - 7 * 86400000), "yyyy-MM-dd");
    const weekSummaries = dailySummaries.filter((s) => s.date >= weekAgo);
    const weekSpend = weekSummaries.reduce((sum, s) => sum + (s.totalEstimatedCost ?? 0), 0);

    const avgDailySpend = dayOfMonth > 0 ? monthSpend / dayOfMonth : 0;
    const projectedMonthly = avgDailySpend * daysInMonth;

    return { todaySpend, weekSpend, monthSpend, projectedMonthly, dailyLimit };
  }, [dailySummaries, dailyLimit]);

  const modelBreakdown = useMemo(() => {
    const map = new Map<string, { provider: string; calls: number; inputTokens: number; outputTokens: number; cost: number }>();

    dailySummaries.forEach((s) => {
      if (!s.aiModels) return;
      Object.entries(s.aiModels).forEach(([model, data]) => {
        const existing = map.get(model) ?? { provider: "", calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
        existing.calls += data.calls ?? 0;
        existing.inputTokens += data.inputTokens ?? 0;
        existing.outputTokens += data.outputTokens ?? 0;
        existing.cost += data.estimatedCost ?? 0;
        map.set(model, existing);
      });
    });

    return Array.from(map.entries())
      .map(([model, data]) => ({ model, ...data }))
      .sort((a, b) => b.cost - a.cost);
  }, [dailySummaries]);

  const providerCostData = useMemo(() => {
    const map = new Map<string, number>();
    dailySummaries.forEach((s) => {
      if (!s.aiProviders) return;
      Object.entries(s.aiProviders).forEach(([provider, data]) => {
        map.set(provider, (map.get(provider) ?? 0) + ((data as { estimatedCost?: number }).estimatedCost ?? 0));
      });
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [dailySummaries]);

  const chartData = useMemo(() => {
    return [...dailySummaries]
      .reverse()
      .map((s) => ({
        date: s.date ? format(new Date(s.date), "MMM d") : "",
        cost: s.totalEstimatedCost ?? 0,
      }));
  }, [dailySummaries]);

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        Configure your service connection to view cost data.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        Loading cost data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cost & Billing</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today vs Daily Limit
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.todaySpend)}</div>
            <Progress
              value={Math.min((stats.todaySpend / stats.dailyLimit) * 100, 100)}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              of {formatCurrency(stats.dailyLimit)} limit
            </p>
          </CardContent>
        </Card>
        <StatCard
          title="This Week"
          value={formatCurrency(stats.weekSpend)}
          icon={Calendar}
        />
        <StatCard
          title="This Month"
          value={formatCurrency(stats.monthSpend)}
          icon={DollarSign}
        />
        <StatCard
          title="Projected Monthly"
          value={formatCurrency(stats.projectedMonthly)}
          icon={TrendingUp}
        />
      </div>

      {/* Model cost breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Cost Breakdown by Model</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Input Tokens</TableHead>
                  <TableHead className="text-right">Output Tokens</TableHead>
                  <TableHead className="text-right">Estimated Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelBreakdown.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No model data available
                    </TableCell>
                  </TableRow>
                ) : (
                  modelBreakdown.map((m) => (
                    <TableRow key={m.model}>
                      <TableCell className="font-mono text-xs">{m.model}</TableCell>
                      <TableCell className="text-right">{formatNumber(m.calls)}</TableCell>
                      <TableCell className="text-right">{formatTokenCount(m.inputTokens)}</TableCell>
                      <TableCell className="text-right">{formatTokenCount(m.outputTokens)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(m.cost)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Daily Spend">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Cost"]} />
                <ReferenceLine
                  y={stats.dailyLimit}
                  stroke="#ef4444"
                  strokeDasharray="5 5"
                  label={{ value: "Limit", position: "right", fontSize: 11 }}
                />
                <Bar dataKey="cost" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Cost by Provider">
          <div className="h-[300px]">
            {providerCostData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={providerCostData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {providerCostData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={PROVIDER_COLORS[entry.name] ?? "var(--chart-5)"}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Cost"]} />
                  <Legend />
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

      <ChartCard title="Cost Trend (30 days)">
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Cost"]} />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
