import { useState, useEffect } from "react";
import { Save, Shield, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { PROVIDERS } from "@/lib/constants";

interface LimitsConfig {
  dailySpendCap: number;
  perIpDailyCallLimit: number;
  perIpDailyTokenLimit: number;
  globalRateLimit: number;
  alertThresholdPercent: number;
  errorRateAlertThreshold: number;
}

interface ProviderConfig {
  provider: string;
  enabled: boolean;
  apiKeySet: boolean;
  dailyLimit?: number;
}

const defaultLimits: LimitsConfig = {
  dailySpendCap: 50,
  perIpDailyCallLimit: 100,
  perIpDailyTokenLimit: 10000000,
  globalRateLimit: 100,
  alertThresholdPercent: 80,
  errorRateAlertThreshold: 10,
};

export function LimitsPage() {
  const { isConfigured } = useConfig();
  const [limits, setLimits] = useState<LimitsConfig>(defaultLimits);
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    if (!isConfigured) return;

    const fetchConfig = async () => {
      try {
        const [limitsDoc, providersDoc] = await Promise.all([
          firestore.get("_admin_config/limits").catch(() => null),
          firestore.get("_admin_config/providers").catch(() => null),
        ]);

        if (limitsDoc) {
          setLimits({ ...defaultLimits, ...limitsDoc });
        }

        if (providersDoc?.providers) {
          setProviders(providersDoc.providers);
        } else {
          setProviders(
            PROVIDERS.map((p) => ({
              provider: p,
              enabled: false,
              apiKeySet: false,
            }))
          );
        }
      } catch (err) {
        console.error("Config fetch error:", err);
      }
    };

    fetchConfig();
  }, [isConfigured]);

  const saveLimits = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      await firestore.set("_admin_config/limits", limits as unknown as Record<string, unknown>);
      setSaveMessage("Limits saved successfully");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      setSaveMessage("Failed to save limits");
    } finally {
      setSaving(false);
    }
  };

  const toggleProvider = async (provider: string) => {
    const updated = providers.map((p) =>
      p.provider === provider ? { ...p, enabled: !p.enabled } : p
    );
    setProviders(updated);
    try {
      await firestore.set("_admin_config/providers", { providers: updated });
    } catch (err) {
      console.error("Failed to update provider:", err);
    }
  };

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        Configure your service connection to manage limits.
      </div>
    );
  }

  const limitFields: { key: keyof LimitsConfig; label: string; prefix?: string; suffix?: string }[] = [
    { key: "dailySpendCap", label: "Daily AI Spend Cap", prefix: "$" },
    { key: "perIpDailyCallLimit", label: "Per-IP Daily Call Limit" },
    { key: "perIpDailyTokenLimit", label: "Per-IP Daily Token Limit" },
    { key: "globalRateLimit", label: "Global Rate Limit", suffix: "req/min" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Limits & Controls</h1>

      {/* Limits */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Service Limits
          </CardTitle>
          <div className="flex items-center gap-2">
            {saveMessage && (
              <span className={`text-xs ${saveMessage.includes("Failed") ? "text-red-500" : "text-green-500"}`}>
                {saveMessage}
              </span>
            )}
            <Button size="sm" onClick={saveLimits} disabled={saving}>
              <Save className="h-3 w-3 mr-1" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {limitFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <div className="flex items-center gap-2">
                  {field.prefix && (
                    <span className="text-sm text-muted-foreground">{field.prefix}</span>
                  )}
                  <Input
                    id={field.key}
                    type="number"
                    value={limits[field.key]}
                    onChange={(e) =>
                      setLimits((prev) => ({
                        ...prev,
                        [field.key]: Number(e.target.value),
                      }))
                    }
                  />
                  {field.suffix && (
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {field.suffix}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Provider controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Provider Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((p) => (
                  <TableRow key={p.provider}>
                    <TableCell className="font-medium capitalize">{p.provider}</TableCell>
                    <TableCell>
                      <Badge variant={p.enabled ? "default" : "secondary"}>
                        {p.enabled ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.apiKeySet ? (
                        <span className="text-green-600 text-sm">Set</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not set</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Label htmlFor={`toggle-${p.provider}`} className="text-xs">
                          {p.enabled ? "Disable" : "Enable"}
                        </Label>
                        <Switch
                          id={`toggle-${p.provider}`}
                          checked={p.enabled}
                          onCheckedChange={() => toggleProvider(p.provider)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Alert thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alert Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="alertThreshold">Spend Warning Threshold</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="alertThreshold"
                  type="number"
                  value={limits.alertThresholdPercent}
                  onChange={(e) =>
                    setLimits((prev) => ({
                      ...prev,
                      alertThresholdPercent: Number(e.target.value),
                    }))
                  }
                />
                <span className="text-sm text-muted-foreground">% of daily limit</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="errorRateThreshold">Error Rate Alert</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="errorRateThreshold"
                  type="number"
                  value={limits.errorRateAlertThreshold}
                  onChange={(e) =>
                    setLimits((prev) => ({
                      ...prev,
                      errorRateAlertThreshold: Number(e.target.value),
                    }))
                  }
                />
                <span className="text-sm text-muted-foreground">% error rate</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
