import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CircleAlert, LoaderCircle } from "lucide-react";
import { Link } from "react-router";

import { listReviewWorkItems } from "./reviewer-api.ts";

const stateLabels = {
  awaiting_assessment: "Awaiting assessment",
  awaiting_reveal: "Awaiting reveal",
  awaiting_final_review: "Awaiting final review",
  completed: "Completed",
} as const;

export function ReviewQueuePage() {
  const query = useQuery({
    queryKey: ["review-work-items"],
    queryFn: listReviewWorkItems,
  });

  return (
    <main className="page review-queue-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Review workspace</p>
          <h1>Decision review queue</h1>
        </div>
        {query.data !== undefined ? (
          <div className="queue-count" aria-label={`${query.data.items.length} work items`}>
            <strong>{query.data.items.length}</strong>
            <span>items</span>
          </div>
        ) : null}
      </header>

      {query.isPending ? (
        <div className="state-message" role="status">
          <LoaderCircle className="spin" aria-hidden="true" />
          Loading queue
        </div>
      ) : query.isError ? (
        <div className="state-message error" role="alert">
          <CircleAlert aria-hidden="true" />
          {query.error.message}
        </div>
      ) : query.data.items.length === 0 ? (
        <div className="empty-state">No review work items</div>
      ) : (
        <div className="table-frame">
          <table className="queue-table">
            <thead>
              <tr>
                <th>Case</th>
                <th>Status</th>
                <th>Visible bars</th>
                <th>Duration</th>
                <th>Visible through</th>
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((item) => (
                <tr key={item.caseHash}>
                  <td>
                    <span className="case-identity">{item.anonymousId}</span>
                  </td>
                  <td>
                    <span className={`status status-${item.state}`}>
                      {stateLabels[item.state]}
                    </span>
                  </td>
                  <td>{item.visibleBarCount}</td>
                  <td>{item.barDurationSeconds / 60} min</td>
                  <td className="mono">{item.lastVisibleBarId}</td>
                  <td>
                    <Link
                      className="icon-link"
                      to={`/review/${encodeURIComponent(item.caseHash)}`}
                      aria-label={`Open ${item.anonymousId}`}
                      title={`Open ${item.anonymousId}`}
                    >
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
