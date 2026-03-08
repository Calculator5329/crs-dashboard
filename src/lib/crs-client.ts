const DEFAULT_BASE_URL = "http://localhost:3000";

interface CRSConfig {
  baseUrl: string;
  apiKey: string;
}

let config: CRSConfig = {
  baseUrl: DEFAULT_BASE_URL,
  apiKey: "",
};

export function configureCRS(cfg: Partial<CRSConfig>) {
  config = { ...config, ...cfg };
}

export function getCRSConfig(): CRSConfig {
  return config;
}

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`CRS API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// Firestore operations via CRS proxy
export const firestore = {
  async get(docPath: string) {
    const res = await request(`/firestore/${docPath}`);
    return res.data ?? res;
  },

  async list(
    collection: string,
    params?: { orderBy?: string; order?: "asc" | "desc"; limit?: number }
  ) {
    const searchParams = new URLSearchParams();
    if (params?.orderBy) searchParams.set("orderBy", params.orderBy);
    if (params?.order) searchParams.set("order", params.order);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    const res = await request(`/firestore/${collection}${qs ? `?${qs}` : ""}`);
    return res.data ?? res;
  },

  async query(
    collection: string,
    params: {
      filters?: { field: string; op: string; value: unknown }[];
      orderBy?: string;
      order?: "asc" | "desc";
      limit?: number;
      offset?: number;
    }
  ) {
    const res = await request(`/firestore/${collection}/query`, {
      method: "POST",
      body: JSON.stringify(params),
    });
    return res.data ?? res;
  },

  async aggregate(
    collection: string,
    params: {
      filters?: { field: string; op: string; value: unknown }[];
      aggregations: {
        type: "count" | "sum" | "average";
        field?: string;
        alias: string;
      }[];
    }
  ) {
    const res = await request(`/firestore/${collection}/aggregate`, {
      method: "POST",
      body: JSON.stringify(params),
    });
    return res.data ?? res;
  },

  async set(docPath: string, data: Record<string, unknown>) {
    const res = await request(`/firestore/${docPath}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return res.data ?? res;
  },
};

export async function healthCheck(): Promise<{
  status: string;
  latency: number;
}> {
  const start = Date.now();
  try {
    const res = await request("/health");
    return { status: res.status ?? "ok", latency: Date.now() - start };
  } catch {
    return { status: "error", latency: Date.now() - start };
  }
}

export async function getSetupStatus() {
  return request("/setup/status");
}
