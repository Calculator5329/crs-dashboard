import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ConfigProvider } from "@/contexts/ConfigContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { AIUsagePage } from "@/pages/AIUsagePage";
import { APILogsPage } from "@/pages/APILogsPage";
import { CostPage } from "@/pages/CostPage";
import { LimitsPage } from "@/pages/LimitsPage";
import { HealthPage } from "@/pages/HealthPage";

function App() {
  return (
    <ThemeProvider>
      <ConfigProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/ai-usage" element={<AIUsagePage />} />
              <Route path="/api-logs" element={<APILogsPage />} />
              <Route path="/cost" element={<CostPage />} />
              <Route path="/limits" element={<LimitsPage />} />
              <Route path="/health" element={<HealthPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </ThemeProvider>
  );
}

export default App;
