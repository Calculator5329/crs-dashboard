export const ROUTE_GROUPS = [
  "ai",
  "auth",
  "firestore",
  "storage",
  "vectors",
  "agent",
  "setup",
] as const;

export type RouteGroup = (typeof ROUTE_GROUPS)[number];

export const PROVIDERS = ["openai", "anthropic", "gemini", "openrouter"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_COLORS: Record<string, string> = {
  openai: "var(--chart-1)",
  anthropic: "var(--chart-2)",
  gemini: "var(--chart-3)",
  openrouter: "var(--chart-4)",
};

export const ROUTE_GROUP_COLORS: Record<string, string> = {
  ai: "var(--chart-1)",
  auth: "var(--chart-2)",
  firestore: "var(--chart-3)",
  storage: "var(--chart-4)",
  vectors: "var(--chart-5)",
  agent: "#8b5cf6",
  setup: "#f59e0b",
};

export const STATUS_COLORS: Record<string, string> = {
  "2xx": "#22c55e",
  "3xx": "#3b82f6",
  "4xx": "#f59e0b",
  "5xx": "#ef4444",
};

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [25, 50, 100];
