import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CircleAlert, LoaderCircle } from "lucide-react";
import { Link } from "react-router";

import { listDoctrineWorkItems } from "./doctrine-api.ts";

const statusLabels = {
  draft: "Draft",
  approved: "Approved",
  retired: "Retired",
} as const;

export function DoctrineQueuePage() {
  const query = useQuery({
    queryKey: ["doctrine-work-items"],
    queryFn: listDoctrineWorkItems,
  });

  return (
    <main className="page doctrine-queue-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Source workspace</p>
          <h1>Doctrine approval queue</h1>
        </div>
        {query.data !== undefined ? (
          <div className="queue-count" aria-label={`${query.data.items.length} doctrine items`}>
            <strong>{query.data.items.length}</strong>
            <span>items</span>
          </div>
        ) : null}
      </header>

      {query.isPending ? (
        <div className="state-message" role="status">
          <LoaderCircle className="spin" aria-hidden="true" />
          Loading doctrine
        </div>
      ) : query.isError ? (
        <div className="state-message error" role="alert">
          <CircleAlert aria-hidden="true" />
          {query.error.message}
        </div>
      ) : query.data.items.length === 0 ? (
        <div className="empty-state">No doctrine proposals</div>
      ) : (
        <div className="table-frame">
          <table className="queue-table">
            <thead>
              <tr>
                <th>Concept</th>
                <th>Source</th>
                <th>Status</th>
                <th>Approver</th>
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {query.data.items.map((item) => (
                <tr key={item.proposalHash}>
                  <td><span className="case-identity">{item.concept}</span></td>
                  <td className="mono">{item.sourceId}</td>
                  <td>
                    <span className={`status status-${item.status}`}>
                      {statusLabels[item.status]}
                    </span>
                  </td>
                  <td>{item.approverPrincipal ?? "-"}</td>
                  <td>
                    <Link
                      className="icon-link"
                      to={`/doctrine/${encodeURIComponent(item.doctrineId)}`}
                      aria-label={`Open ${item.concept}`}
                      title={`Open ${item.concept}`}
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
