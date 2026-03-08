import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { StatusPill, MethodBadge } from "@/components/shared/StatusPill";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DetailDrawer } from "@/components/shared/DetailDrawer";
import { ChartCard } from "@/components/charts/ChartCard";
import { useConfig } from "@/contexts/ConfigContext";
import { firestore } from "@/lib/crs-client";
import { formatTimeAgo, formatLatency } from "@/lib/formatters";
import { ROUTE_GROUPS, HTTP_METHODS } from "@/lib/constants";

interface ApiLogRecord {
  id?: string;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  latencyMs: number;
  ip: string;
  userAgent: string;
  routeGroup: string;
  [key: string]: unknown;
}

const filterDefs = [
  {
    key: "routeGroup",
    label: "Route Group",
    type: "select" as const,
    options: ROUTE_GROUPS.map((r) => ({ label: r, value: r })),
  },
  {
    key: "statusRange",
    label: "Status",
    type: "select" as const,
    options: [
      { label: "2xx Success", value: "2xx" },
      { label: "3xx Redirect", value: "3xx" },
      { label: "4xx Client Error", value: "4xx" },
      { label: "5xx Server Error", value: "5xx" },
    ],
  },
  {
    key: "method",
    label: "Method",
    type: "select" as const,
    options: HTTP_METHODS.map((m) => ({ label: m, value: m })),
  },
  {
    key: "ip",
    label: "IP Address",
    type: "search" as const,
    placeholder: "Search IP...",
  },
];

export function APILogsPage() {
  const { isConfigured } = useConfig();
  const [data, setData] = useState<ApiLogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);
  const [selectedRow, setSelectedRow] = useState<ApiLogRecord | null>(null);

  useEffect(() => {
    if (!isConfigured) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const queryFilters: { field: string; op: string; value: unknown }[] = [];

        if (filters.routeGroup && filters.routeGroup !== "all") {
          queryFilters.push({ field: "routeGroup", op: "==", value: filters.routeGroup });
        }
        if (filters.method && filters.method !== "all") {
          queryFilters.push({ field: "method", op: "==", value: filters.method });
        }
        if (filters.statusRange && filters.statusRange !== "all") {
          const ranges: Record<string, [number, number]> = {
            "2xx": [200, 300],
            "3xx": [300, 400],
            "4xx": [400, 500],
            "5xx": [500, 600],
          };
          const [min, max] = ranges[filters.statusRange] ?? [0, 600];
          queryFilters.push({ field: "status", op: ">=", value: min });
          queryFilters.push({ field: "status", op: "<", value: max });
        }

        const result = await firestore.query("_api_logs", {
          filters: queryFilters.length > 0 ? queryFilters : undefined,
          orderBy: "timestamp",
          order: "desc",
          limit: pageSize,
          offset: page * pageSize,
        });

        const items = Array.isArray(result) ? result : result?.documents ?? [];
        setData(items);
      } catch (err) {
        console.error("API logs fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isConfigured, filters.routeGroup, filters.method, filters.statusRange, pageSize, page]);

  const filteredData = useMemo(() => {
    if (!filters.ip) return data;
    return data.filter((row) => row.ip?.includes(filters.ip));
  }, [data, filters.ip]);

  const endpointBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach((r) => {
      map.set(r.path, (map.get(r.path) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredData]);

  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    filteredData.forEach((r) => {
      const cat = r.status < 300 ? "2xx" : r.status < 400 ? "3xx" : r.status < 500 ? "4xx" : "5xx";
      map.set(cat, (map.get(cat) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
  }, [filteredData]);

  const columns: Column<ApiLogRecord>[] = [
    {
      key: "timestamp",
      header: "Time",
      sortable: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">{formatTimeAgo(row.timestamp)}</span>
      ),
    },
    { key: "method", header: "Method", render: (row) => <MethodBadge method={row.method} /> },
    {
      key: "path",
      header: "Path",
      render: (row) => <span className="font-mono text-xs truncate max-w-[300px] block">{row.path}</span>,
    },
    { key: "status", header: "Status", sortable: true, render: (row) => <StatusPill status={row.status} /> },
    {
      key: "latency",
      header: "Latency",
      sortable: true,
      render: (row) => formatLatency(row.latencyMs ?? 0),
    },
    {
      key: "ip",
      header: "IP",
      render: (row) => <span className="font-mono text-xs">{row.ip}</span>,
    },
    {
      key: "userAgent",
      header: "User Agent",
      render: (row) => (
        <span className="text-xs truncate max-w-[200px] block" title={row.userAgent}>
          {row.userAgent}
        </span>
      ),
    },
  ];

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        Configure your service connection to view API logs.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">API Logs</h1>

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
        <ChartCard title="Requests by Status Code">
          <div className="h-[250px]">
            {statusBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {statusBreakdown.map((entry) => {
                      const colors: Record<string, string> = {
                        "2xx": "#22c55e",
                        "3xx": "#3b82f6",
                        "4xx": "#f59e0b",
                        "5xx": "#ef4444",
                      };
                      return (
                        <Bar
                          key={entry.status}
                          dataKey="count"
                          fill={colors[entry.status] ?? "#888"}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No data available
              </div>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Busiest Endpoints (Top 10)">
          <div className="h-[250px]">
            {endpointBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={endpointBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="path" tick={{ fontSize: 10 }} width={180} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
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
        title="Request Detail"
        data={selectedRow as Record<string, unknown> | null}
      />
    </div>
  );
}
