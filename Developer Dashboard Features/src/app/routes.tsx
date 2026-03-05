import { createBrowserRouter } from "react-router";
import { DashboardLayout } from "./components/DashboardLayout";
import { DeveloperDashboard } from "./components/DeveloperDashboard";
import { AnalysisList } from "./components/AnalysisList";
import { AnnotatedDiff } from "./components/AnnotatedDiff";
import { GlobalReport } from "./components/GlobalReport";
import { RagCitations } from "./components/RagCitations";
import { HistoryComparison } from "./components/HistoryComparison";
import { KnowledgeBase } from "./components/KnowledgeBase";
import { PoliciesRules } from "./components/PoliciesRules";
import { UserManagement } from "./components/UserManagement";
import { Observability } from "./components/Observability";
import { Integrations } from "./components/Integrations";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: DashboardLayout,
    children: [
      { index: true, Component: DeveloperDashboard },
      { path: "analyses", Component: AnalysisList },
      { path: "diff/:id", Component: AnnotatedDiff },
      { path: "report/:id", Component: GlobalReport },
      { path: "rag/:id", Component: RagCitations },
      { path: "history/:id", Component: HistoryComparison },
      { path: "admin/knowledge-base", Component: KnowledgeBase },
      { path: "admin/policies", Component: PoliciesRules },
      { path: "admin/users", Component: UserManagement },
      { path: "admin/observability", Component: Observability },
      { path: "admin/integrations", Component: Integrations },
    ],
  },
]);
