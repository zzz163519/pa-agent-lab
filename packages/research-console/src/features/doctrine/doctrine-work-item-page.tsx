import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowLeft, Check, CircleAlert, ExternalLink, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";

import { approveDoctrine, getDoctrineWorkItem, retireDoctrine } from "./doctrine-api.ts";

export function DoctrineWorkItemPage() {
  const { doctrineId } = useParams();
  const queryClient = useQueryClient();
  const [retirementReason, setRetirementReason] = useState("");
  const query = useQuery({
    queryKey: ["doctrine-work-item", doctrineId],
    queryFn: () => getDoctrineWorkItem(doctrineId!),
    enabled: doctrineId !== undefined,
  });
  const refresh = async (workItem: NonNullable<typeof query.data>) => {
    queryClient.setQueryData(["doctrine-work-item", doctrineId], workItem);
    await queryClient.invalidateQueries({ queryKey: ["doctrine-work-items"] });
  };
  const approval = useMutation({
    mutationFn: () => approveDoctrine(doctrineId!, { proposalHash: query.data!.proposal.proposalHash }),
    onSuccess: async (result) => refresh(result.workItem),
  });
  const retirement = useMutation({
    mutationFn: () => retireDoctrine(doctrineId!, {
      approvalHash: query.data!.approval!.approvalHash,
      reason: retirementReason,
    }),
    onSuccess: async (result) => {
      setRetirementReason("");
      await refresh(result.workItem);
    },
  });

  if (query.isPending) {
    return <main className="page"><div className="state-message" role="status"><LoaderCircle className="spin" aria-hidden="true" />Loading doctrine</div></main>;
  }
  if (query.isError || query.data === undefined) {
    return <main className="page"><div className="state-message error" role="alert"><CircleAlert aria-hidden="true" />{query.error?.message ?? "Doctrine proposal unavailable"}</div></main>;
  }

  const item = query.data;
  const unit = item.proposal.doctrineUnit;
  const source = item.proposal.source;
  const mutationError = approval.error ?? retirement.error;

  return (
    <main className="page doctrine-work-item-page">
      <header className="work-item-header">
        <div className="work-item-title">
          <Link className="back-link" to="/doctrine" aria-label="Back to doctrine queue" title="Back to doctrine queue">
            <ArrowLeft aria-hidden="true" />
          </Link>
          <div>
            <p className="eyebrow">Doctrine proposal</p>
            <h1>{unit.concept}</h1>
          </div>
        </div>
        <span className={`status status-${item.status}`}>{item.status}</span>
      </header>

      <section className="record-section doctrine-source">
        <div className="section-heading">
          <div><p className="eyebrow">Source</p><h2>{source.title}</h2></div>
          <a className="command-button secondary" href={source.urlOrLocalRef} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden="true" />Open source
          </a>
        </div>
        <dl className="key-value-record">
          <div><dt>Source ID</dt><dd>{source.sourceId}</dd></div>
          <div><dt>Content hash</dt><dd>{source.contentHash}</dd></div>
          <div><dt>Locator</dt><dd>{item.proposal.sourceLocator}</dd></div>
          <div><dt>Proposal hash</dt><dd>{item.proposal.proposalHash}</dd></div>
        </dl>
      </section>

      <section className="record-section doctrine-semantics">
        <div className="section-heading"><div><p className="eyebrow">Semantics</p><h2>{unit.rule}</h2></div></div>
        <DoctrineList title="Applies when" values={unit.appliesWhen} />
        <DoctrineList title="Avoid when" values={unit.avoidWhen} />
        <DoctrineList title="Decision effect" values={unit.decisionEffect} />
      </section>

      {item.status === "draft" ? (
        <section className="action-band">
          <div><p className="eyebrow">Explicit approval</p><h2>Approve this exact proposal</h2></div>
          <button className="command-button primary" type="button" onClick={() => approval.mutate()} disabled={approval.isPending}>
            {approval.isPending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
            Approve
          </button>
        </section>
      ) : null}

      {item.status === "approved" ? (
        <section className="review-form-section">
          <div className="section-heading"><div><p className="eyebrow">Retirement</p><h2>Remove from the approved projection</h2></div></div>
          <label className="summary-field">
            <span>Reason</span>
            <textarea value={retirementReason} maxLength={400} onChange={(event) => setRetirementReason(event.target.value)} />
            <small>{retirementReason.length}/400</small>
          </label>
          <div className="form-actions">
            <button className="command-button secondary" type="button" onClick={() => retirement.mutate()} disabled={retirement.isPending || retirementReason.trim().length === 0}>
              {retirement.isPending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Archive aria-hidden="true" />}
              Retire
            </button>
          </div>
        </section>
      ) : null}

      {item.approval !== null ? (
        <section className="record-section">
          <div className="section-heading"><div><p className="eyebrow">Approval audit</p><h2>{item.approval.approverPrincipal}</h2></div></div>
          <div className="record-identities"><span><code>{item.approval.approvalHash}</code></span></div>
        </section>
      ) : null}
      {item.retirement !== null ? (
        <section className="record-section">
          <div className="section-heading"><div><p className="eyebrow">Retired</p><h2>{item.retirement.reason}</h2></div></div>
          <div className="record-identities"><span><code>{item.retirement.retirementHash}</code></span></div>
        </section>
      ) : null}
      {mutationError !== null && mutationError !== undefined ? <div className="inline-error" role="alert"><CircleAlert aria-hidden="true" />{mutationError.message}</div> : null}
    </main>
  );
}

function DoctrineList({ title, values }: { readonly title: string; readonly values: readonly string[] }) {
  return (
    <div className="doctrine-list">
      <h3>{title}</h3>
      <ul>{values.map((value) => <li key={value}>{value}</li>)}</ul>
    </div>
  );
}
