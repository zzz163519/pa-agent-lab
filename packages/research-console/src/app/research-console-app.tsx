import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BookOpenCheck, FlaskConical, ListChecks, LockKeyhole } from "lucide-react";
import { NavLink, Outlet, createBrowserRouter, RouterProvider } from "react-router";

import { DoctrineQueuePage } from "../features/doctrine/doctrine-queue-page.tsx";
import { DoctrineWorkItemPage } from "../features/doctrine/doctrine-work-item-page.tsx";
import { ReviewQueuePage } from "../features/review/review-queue-page.tsx";
import { ReviewWorkItemPage } from "../features/review/review-work-item-page.tsx";
import { bootstrapReviewerToken } from "../features/review/session-state.ts";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
    mutations: { retry: false },
  },
});

const router = createBrowserRouter(
  [
    {
      element: <ResearchConsoleShell />,
      children: [
        { index: true, element: <ReviewQueuePage /> },
        { path: "review/:caseHash", element: <ReviewWorkItemPage /> },
        { path: "doctrine", element: <DoctrineQueuePage /> },
        { path: "doctrine/:doctrineId", element: <DoctrineWorkItemPage /> },
      ],
    },
  ],
  { basename: "/console" },
);

export function ResearchConsoleApp() {
  const token = bootstrapReviewerToken();
  if (token === null) return <MissingReviewerSession />;
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

function ResearchConsoleShell() {
  return (
    <div className="console-shell">
      <aside className="console-sidebar">
        <div className="console-brand">
          <FlaskConical aria-hidden="true" />
          <div><strong>PA Agent Lab</strong><span>Research Console</span></div>
        </div>
        <nav aria-label="Research console modules">
          <NavLink to="/" end aria-label="Review" title="Review">
            <ListChecks aria-hidden="true" />
            <span>Review</span>
          </NavLink>
          <NavLink to="/doctrine" aria-label="Doctrine" title="Doctrine">
            <BookOpenCheck aria-hidden="true" />
            <span>Doctrine</span>
          </NavLink>
        </nav>
        <div className="sidebar-foot">
          <span className="connection-dot" aria-hidden="true" />
          Local reviewer
        </div>
      </aside>
      <div className="console-content">
        <Outlet />
      </div>
    </div>
  );
}

function MissingReviewerSession() {
  return (
    <main className="auth-state">
      <LockKeyhole aria-hidden="true" />
      <h1>Reviewer session unavailable</h1>
    </main>
  );
}
