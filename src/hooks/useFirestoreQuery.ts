import { useState, useEffect, useCallback } from "react";
import { firestore } from "@/lib/crs-client";

interface UseFirestoreQueryOptions<T> {
  collection: string;
  filters?: { field: string; op: string; value: unknown }[];
  orderBy?: string;
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
  enabled?: boolean;
  transform?: (data: unknown[]) => T[];
}

interface UseFirestoreQueryResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFirestoreQuery<T = Record<string, unknown>>(
  options: UseFirestoreQueryOptions<T>
): UseFirestoreQueryResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { collection, filters, orderBy, order, limit, offset, enabled = true, transform } = options;

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      let result;
      if (filters && filters.length > 0) {
        result = await firestore.query(collection, {
          filters,
          orderBy,
          order,
          limit,
          offset,
        });
      } else {
        result = await firestore.list(collection, { orderBy, order, limit });
      }
      const items = Array.isArray(result) ? result : result?.documents ?? [];
      setData(transform ? transform(items) : items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [collection, JSON.stringify(filters), orderBy, order, limit, offset, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

interface UseFirestoreDocOptions<T> {
  path: string;
  enabled?: boolean;
  transform?: (data: unknown) => T;
}

export function useFirestoreDoc<T = Record<string, unknown>>(
  options: UseFirestoreDocOptions<T>
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { path, enabled = true, transform } = options;

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await firestore.get(path);
      setData(transform ? transform(result) : result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch document");
    } finally {
      setLoading(false);
    }
  }, [path, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export function useFirestoreAggregate(
  collection: string,
  params: {
    filters?: { field: string; op: string; value: unknown }[];
    aggregations: {
      type: "count" | "sum" | "average";
      field?: string;
      alias: string;
    }[];
  },
  enabled = true
) {
  const [data, setData] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const result = await firestore.aggregate(collection, params);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to aggregate");
    } finally {
      setLoading(false);
    }
  }, [collection, JSON.stringify(params), enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
