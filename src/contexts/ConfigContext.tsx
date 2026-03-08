import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { configureCRS } from "@/lib/crs-client";

interface Config {
  baseUrl: string;
  apiKey: string;
}

interface ConfigContextValue {
  config: Config;
  setConfig: (config: Config) => void;
  isConfigured: boolean;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

const STORAGE_KEY = "crs-dashboard-config";

function loadConfig(): Config {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { baseUrl: "http://localhost:3000", apiKey: "" };
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<Config>(loadConfig);

  const setConfig = (c: Config) => {
    setConfigState(c);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    configureCRS(c);
  };

  useEffect(() => {
    configureCRS(config);
  }, []);

  const isConfigured = config.apiKey.length > 0;

  return (
    <ConfigContext.Provider value={{ config, setConfig, isConfigured }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider");
  return ctx;
}
