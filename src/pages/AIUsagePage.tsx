import { useState, useEffect, useMemo } from "react";
import { Brain, Zap, DollarSign, Clock, Activity } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { StatCard } from "@/components/shared/StatCard";
import { StatusPill } from "@/components/shared/StatusPill";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DetailDrawer } from "@/components/shared/DetailDrawer";
import { ChartCard } from "@/components/charts/ChartCard";
import { useConfig } from "@/contexts/ConfigContext";
import { firestore } from "@/lib/crs-client";
import {
  formatCurrency,
  formatTokenCount,
  formatNumber,
  formatLatency,
  formatTimeAgo,
} from "@/lib/formatters";
import { PROVIDERS, PROVIDER_COLORS } from "@/lib/constants";

interface AIUsageRecord {
  id?: string;
  timestamp: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
  status: number;
  stream: boolean;
  [key: string]: unknown;
}

const filterDefs = [
  {
    key: "provider",
    label: "Provider",
    type: "select" as const,
    options: PROVIDERS.map((p) => ({ label: p, value: p })),
  },
  {
    key: "status",
    label: "Status",
    type: "select" as const,
    options: [
      { label: "Success", value: "success" },
      { label: "Error", value: "error" },
    ],
  },
  {
    key: "model",
    label: "Model",
    type: "search" as const,
    placeholder: "Search model...",
  },
];

export function AIUsagePage() {
  const { isConfigured } = useConfig();
  const [data, setData] = useState<AIUsageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [selectedRow, setSelectedRow] = useState<AIUsageRecord | null>(null);

  useEffect(() => {
    if (!isConfigured) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const queryFilters: { field: string; op: string; value: unknown }[] = [];

        if (filters.provider && filters.provider !== "all") {
          queryFilters.push({ field: "provider", op: "==", value: filters.provider });
        }
        if (filters.status === "success") {
          queryFilters.push({ field: "status", op: "<", value: 400 });
        } else if (filters.status === "error") {
          queryFilters.push({ field: "status", op: ">=", value: 400 });
        }

        const result = await firestore.query("_ai_usage", {
          filters: queryFilters.length > 0 ? queryFilters : undefined,
          orderBy: "timestamp",
          order: "desc",
          limit: pageSize,
          offset: page * pageSize,
        });

        const items = Array.isArray(result) ? result : result?.documents ?? [];
        setData(items);
      } catch (err) {
        console.error("AI usage fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isConfigured, filters.provider, filters.status, pageSize, page]);

  const filteredData = useMemo(() => {
    if (!filters.model) return data;
    return data.filter((row) =>
      row.model?.toLowerCase().includes(filters.model.toLowerCase())
    );
  }, [data, filters.model]);

  const summaryStats = useMemo(() => {
    const items = filteredData;
    return {
      totalCalls: items.length,
      inputTokens: items.reduce((sum, r) => sum + (r.inputTokens ?? 0), 0),
      outputTokens: items.reduce((sum, r) => sum + (r.outputTokens ?? 0), 0),
      totalTokens: items.reduce((sum, r) => sum + (r.totalTokens ?? 0), 0),
      estimatedCost: items.reduce((sum, r) => sum + (r.estimatedCost ?? 0), 0),
      avgLatency:
        items.length > 0
          ? items.reduce((sum, r) => sum + (r.latencyMs ?? 0), 0) / items.length
          : 0,
    };
  }, [filteredData]);

  const modelBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach((r) => {
      map.set(r.model, (map.get(r.model) ?? 0) + (r.totalTokens ?? 0));
    });
    return Array.from(map.entries())
      .map(([model, tokens]) => ({ model, tokens }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 10);
  }, [filteredData]);

  const columns: Column<AIUsageRecord>[] = [
    {
      key: "timestamp",
      header: "Time",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">{formatTimeAgo(row.timestamp)}</span>
      ),
    },
    { key: "provider", header: "Provider", sortable: true, render: (row) => row.provider },
    {
      key: "model",
      header: "Model",
      render: (row) => <span className="font-mono text-xs">{row.model}</span>,
    },
    {
      key: "tokens",
      header: "Tokens (in/out)",
      render: (row) => (
        <span className="text-xs">
          {formatTokenCount(row.inputTokens ?? 0)} / {formatTokenCount(row.outputTokens ?? 0)}
        </span>
      ),
    },
    {
      key: "cost",
      header: "Cost",
      sortable: true,
      render: (row) => formatCurrency(row.estimatedCost ?? 0),
    },
    {
      key: "latency",
      header: "Latency",
      sortable: true,
      render: (row) => formatLatency(row.latencyMs ?? 0),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "stream",
      header: "Stream",
      render: (row) => (
        <span className={`text-xs ${row.stream ? "text-green-600" : "text-muted-foreground"}`}>
          {row.stream ? "Yes" : "No"}
        </span>
      ),
    },
  ];

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        Configure your service connection to view AI usage.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">AI Usage</h1>

      <FilterBar
        filters={filterDefs}
        values={filters}
        onChange={(key, value) => {
          setFilters((prev) => ({ ...prev, [key]: value }));
          setPage(0);
        }}
        onClear={() => {
          setFilters({});
          setPage(0);
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Calls" value={formatNumber(summaryStats.totalCalls)} icon={Brain} />
        <StatCard
          title="Total Tokens"
          value={formatTokenCount(summaryStats.totalTokens)}
          subtitle={`${formatTokenCount(summaryStats.inputTokens)} in / ${formatTokenCount(summaryStats.outputTokens)} out`}
          icon={Zap}
        />
        <StatCard
          title="Estimated Cost"
          value={formatCurrency(summaryStats.estimatedCost)}
          icon={DollarSign}
        />
        <StatCard
          title="Avg Latency"
          value={formatLatency(summaryStats.avgLatency)}
          icon={Clock}
        />
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        page={page}
        onPageChange={setPage}
        onRowClick={setSelectedRow}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Token Usage by Model">
          <div className="h-[300px]">
            {modelBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => formatTokenCount(v)} />
                  <YAxis
                    type="category"
                    dataKey="model"
                    tick={{ fontSize: 11 }}
                    width={150}
                  />
                  <Tooltip formatter={(v: number) => [formatTokenCount(v), "Tokens"]} />
                  <Bar dataKey="tokens" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No data available
              </div>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Latency Distribution">
          <div className="h-[300px]">
            {filteredData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getLatencyBuckets(filteredData)}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No data available
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      <DetailDrawer
        open={selectedRow !== null}
        onOpenChange={(open) => !open && setSelectedRow(null)}
        title="AI Usage Detail"
        data={selectedRow as Record<string, unknown> | null}
      />
    </div>
  );
}

function getLatencyBuckets(data: AIUsageRecord[]) {
  const buckets = [
    { range: "<100ms", min: 0, max: 100, count: 0 },
    { range: "100-500ms", min: 100, max: 500, count: 0 },
    { range: "500ms-1s", min: 500, max: 1000, count: 0 },
    { range: "1-2s", min: 1000, max: 2000, count: 0 },
    { range: "2-5s", min: 2000, max: 5000, count: 0 },
    { range: "5-10s", min: 5000, max: 10000, count: 0 },
    { range: ">10s", min: 10000, max: Infinity, count: 0 },
  ];

  data.forEach((r) => {
    const ms = r.latencyMs ?? 0;
    const bucket = buckets.find((b) => ms >= b.min && ms < b.max);
    if (bucket) bucket.count++;
  });

  return buckets.map(({ range, count }) => ({ range, count }));
}
