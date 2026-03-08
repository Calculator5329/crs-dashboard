import { useState, useEffect, useCallback } from "react";
import { Activity, Database, Server, RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shared/StatusPill";
import { useConfig } from "@/contexts/ConfigContext";
import { healthCheck, getSetupStatus, firestore } from "@/lib/crs-client";
import { formatLatency, formatTimeAgo } from "@/lib/formatters";

interface HealthState {
  serviceStatus: "ok" | "error" | "checking";
  serviceLatency: number;
  firestoreStatus: "ok" | "error" | "checking";
  activeProviders: string[];
  environment: string;
}

interface ErrorLog {
  timestamp: string;
  path: string;
  status: number;
  method: string;
}

export function HealthPage() {
  const { isConfigured } = useConfig();
  const [health, setHealth] = useState<HealthState>({
    serviceStatus: "checking",
    serviceLatency: 0,
    firestoreStatus: "checking",
    activeProviders: [],
    environment: "unknown",
  });
  const [recentErrors, setRecentErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);

  const runChecks = useCallback(async () => {
    if (!isConfigured) return;
    setLoading(true);

    try {
      const [healthResult, setupStatus, errors] = await Promise.all([
        healthCheck(),
        getSetupStatus().catch(() => null),
        firestore
          .query("_api_logs", {
            filters: [{ field: "status", op: ">=", value: 500 }],
            orderBy: "timestamp",
            order: "desc",
            limit: 20,
          })
          .catch(() => []),
      ]);

      setHealth({
        serviceStatus: healthResult.status === "ok" ? "ok" : "error",
        serviceLatency: healthResult.latency,
        firestoreStatus: setupStatus ? "ok" : "error",
        activeProviders: setupStatus?.providers ?? setupStatus?.activeProviders ?? [],
        environment: setupStatus?.environment ?? "unknown",
      });

      const errorItems = Array.isArray(errors) ? errors : errors?.documents ?? [];
      setRecentErrors(errorItems);
    } catch {
      setHealth((prev) => ({
        ...prev,
        serviceStatus: "error",
        firestoreStatus: "error",
      }));
    } finally {
      setLoading(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  // Group errors by path
  const errorsByPath = recentErrors.reduce(
    (acc, err) => {
      acc[err.path] = (acc[err.path] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const sortedErrorPaths = Object.entries(errorsByPath)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        Configure your service connection to view health status.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Health & Status</h1>
        <Button variant="outline" size="sm" onClick={runChecks} disabled={loading}>
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Live checks */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Service Health
            </CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  health.serviceStatus === "ok"
                    ? "bg-green-500"
                    : health.serviceStatus === "checking"
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-red-500"
                }`}
              />
              <span className="text-lg font-semibold capitalize">{health.serviceStatus}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Latency: {formatLatency(health.serviceLatency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Firestore
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  health.firestoreStatus === "ok"
                    ? "bg-green-500"
                    : health.firestoreStatus === "checking"
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-red-500"
                }`}
              />
              <span className="text-lg font-semibold capitalize">{health.firestoreStatus}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Environment
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <span className="text-lg font-semibold capitalize">{health.environment}</span>
            <div className="flex flex-wrap gap-1 mt-2">
              {health.activeProviders.map((p) => (
                <Badge key={p} variant="secondary" className="text-xs">
                  {p}
                </Badge>
              ))}
              {health.activeProviders.length === 0 && (
                <span className="text-xs text-muted-foreground">No providers detected</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Recent 5xx Errors
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentErrors.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No recent server errors
            </p>
          ) : (
            <div className="space-y-4">
              {/* Grouped by path */}
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Errors by Endpoint
                </h3>
                {sortedErrorPaths.map(([path, count]) => (
                  <div key={path} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="font-mono text-xs">{path}</span>
                    <Badge variant="destructive">{count}</Badge>
                  </div>
                ))}
              </div>

              {/* Recent list */}
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Recent Errors
                </h3>
                {recentErrors.slice(0, 10).map((err, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 rounded-lg border p-3 text-sm"
                  >
                    <span className="text-xs text-muted-foreground w-24 shrink-0">
                      {formatTimeAgo(err.timestamp)}
                    </span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {err.method}
                    </Badge>
                    <span className="font-mono text-xs truncate flex-1">{err.path}</span>
                    <StatusPill status={err.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
