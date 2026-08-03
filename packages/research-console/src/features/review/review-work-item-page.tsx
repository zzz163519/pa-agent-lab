import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Eye,
  LoaderCircle,
  LockKeyhole,
  Send,
  X,
} from "lucide-react";
import { Link, useParams } from "react-router";
import type {
  ReviewWorkItemDetailV1,
  ReviewWorkflowMutationResultV1,
} from "@pa-agent-lab/persistence-contracts/review-workflow-transport-v1";
import type { ContractSha256 } from "@pa-agent-lab/contracts";

import { AuthenticatedChart } from "./authenticated-chart.tsx";
import { BrooksDecisionView } from "./brooks-decision-view.tsx";
import {
  getReviewWorkItem,
  revealDecision,
  submitFinalReview,
  submitIndependentAssessment,
} from "./reviewer-api.ts";
import {
  clearBlindDraft,
  clearBlindDraftAfterFreeze,
  loadBlindDraft,
  saveBlindDraft,
  type BlindAssessmentDraftV1,
} from "./session-state.ts";

const workflowSteps = [
  "Assessment",
  "Reveal",
  "Final review",
  "Completed",
] as const;
const verdicts = ["long", "short", "no_trade", "uncertain"] as const;
const dispositions = ["agree", "clarify", "disagree", "uncertain"] as const;

export function ReviewWorkItemPage() {
  const { caseHash = "" } = useParams();
  const queryClient = useQueryClient();
  const queryKey = ["review-work-item", caseHash] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => getReviewWorkItem(caseHash),
    enabled: caseHash.length > 0,
  });

  const acceptMutation = (result: ReviewWorkflowMutationResultV1) => {
    queryClient.setQueryData(queryKey, result.workItem);
    void queryClient.invalidateQueries({ queryKey: ["review-work-items"] });
  };
  const assessmentMutation = useMutation({
    mutationFn: submitIndependentAssessment,
    onSuccess: (result) => {
      clearBlindDraft(result.workItem.draftIdentityHash);
      acceptMutation(result);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
  const revealMutation = useMutation({
    mutationFn: (input: { readonly caseHash: ContractSha256; readonly assessmentHash: ContractSha256 }) =>
      revealDecision(input.caseHash, { assessmentHash: input.assessmentHash }),
    onSuccess: acceptMutation,
  });
  const finalMutation = useMutation({
    mutationFn: submitFinalReview,
    onSuccess: acceptMutation,
  });

  useEffect(() => {
    if (query.data !== undefined) {
      clearBlindDraftAfterFreeze(
        query.data.draftIdentityHash,
        query.data.state,
      );
    }
  }, [query.data?.draftIdentityHash, query.data?.state]);

  if (query.isPending) return <LoadingWorkItem />;
  if (query.isError) return <WorkItemError message={query.error.message} />;
  const item = query.data;

  return (
    <main className="page review-work-item-page">
      <header className="work-item-header">
        <div className="work-item-title">
          <Link className="back-link" to="/" aria-label="Back to review queue" title="Back to queue">
            <ArrowLeft aria-hidden="true" />
          </Link>
          <div>
            <p className="eyebrow">Anonymous work item</p>
            <h1>{item.anonymousId}</h1>
          </div>
        </div>
        <WorkflowProgress state={item.state} />
      </header>

      <CausalContext item={item} />

      {item.state === "awaiting_assessment" ? (
        <BlindAssessmentForm
          item={item}
          pending={assessmentMutation.isPending}
          error={assessmentMutation.error?.message}
          onSubmit={(draft) =>
            assessmentMutation.mutate({
              caseHash: item.caseHash,
              draftIdentityHash: item.draftIdentityHash,
              independentVerdict: draft.independentVerdict as Exclude<BlindAssessmentDraftV1["independentVerdict"], "">,
              blindSummary: draft.blindSummary,
            })
          }
        />
      ) : (
        <FrozenAssessment item={item} />
      )}

      {item.state === "awaiting_reveal" && item.assessment !== null ? (
        <section className="action-band reveal-action">
          <div>
            <p className="eyebrow">Assessment locked</p>
            <h2>BrooksDecision ready</h2>
          </div>
          <AsyncButton
            pending={revealMutation.isPending}
            icon={<Eye aria-hidden="true" />}
            onClick={() =>
              revealMutation.mutate({
                caseHash: item.caseHash,
                assessmentHash: item.assessment!.assessmentHash,
              })
            }
          >
            Reveal decision
          </AsyncButton>
          <MutationError message={revealMutation.error?.message} />
        </section>
      ) : null}

      {item.decision !== null ? <BrooksDecisionView decision={item.decision} /> : null}

      {item.state === "awaiting_final_review" &&
      item.assessment !== null &&
      item.revealReceipt !== null ? (
        <FinalReviewForm
          item={item}
          pending={finalMutation.isPending}
          error={finalMutation.error?.message}
          onSubmit={(disposition, summary) =>
            finalMutation.mutate({
              caseHash: item.caseHash,
              assessmentHash: item.assessment!.assessmentHash,
              revealReceiptHash: item.revealReceipt!.receiptHash,
              disposition,
              summary,
            })
          }
        />
      ) : null}

      {item.state === "completed" ? <CompletedReview item={item} /> : null}
    </main>
  );
}

function CausalContext(props: { readonly item: ReviewWorkItemDetailV1 }) {
  const item = props.item;
  const continuityCounts = item.market.bars.reduce<Record<string, number>>(
    (counts, bar) => ({
      ...counts,
      [bar.continuityFromPrevious]: (counts[bar.continuityFromPrevious] ?? 0) + 1,
    }),
    {},
  );
  return (
    <section className="causal-context" aria-labelledby="causal-context-title">
      <header className="section-heading">
        <div>
          <p className="eyebrow">Blind causal input</p>
          <h2 id="causal-context-title">Closed five-minute bars</h2>
        </div>
        <div className="context-facts">
          <span>{item.market.visibleBarCount} bars</span>
          <span className="mono">through {item.market.lastVisibleBarId}</span>
          <span>{item.market.isLeftCensored ? "Left-censored" : "Full context"}</span>
        </div>
      </header>
      <div className="chart-layout">
        <figure>
          <figcaption>Context · 120</figcaption>
          <AuthenticatedChart
            panel="context"
            artifactId={item.charts.context.artifactId}
          />
        </figure>
        <figure>
          <figcaption>Detail · 40</figcaption>
          <AuthenticatedChart
            panel="detail"
            artifactId={item.charts.detail.artifactId}
          />
        </figure>
      </div>
      <div className="continuity-strip">
        {Object.entries(continuityCounts).map(([state, count]) => (
          <span key={state} className={`continuity continuity-${state}`}>
            {state.replaceAll("_", " ")} <strong>{count}</strong>
          </span>
        ))}
      </div>
      <details className="ohlc-table">
        <summary>Normalized OHLC</summary>
        <div className="table-frame compact">
          <table>
            <thead>
              <tr>
                <th>Bar</th><th>Seq</th><th>Open</th><th>High</th><th>Low</th><th>Close</th><th>Continuity</th>
              </tr>
            </thead>
            <tbody>
              {item.market.bars.map((bar) => (
                <tr key={bar.barId}>
                  <td className="mono">{bar.barId}</td>
                  <td>{bar.sequence}</td>
                  <td>{bar.open.toFixed(5)}</td>
                  <td>{bar.high.toFixed(5)}</td>
                  <td>{bar.low.toFixed(5)}</td>
                  <td>{bar.close.toFixed(5)}</td>
                  <td>{bar.continuityFromPrevious.replaceAll("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function BlindAssessmentForm(props: {
  readonly item: ReviewWorkItemDetailV1;
  readonly pending: boolean;
  readonly error: string | undefined;
  readonly onSubmit: (draft: BlindAssessmentDraftV1) => void;
}) {
  const [draft, setDraft] = useState<BlindAssessmentDraftV1>(
    () => loadBlindDraft(props.item.draftIdentityHash) ?? {
      independentVerdict: "",
      blindSummary: "",
    },
  );
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    saveBlindDraft(props.item.draftIdentityHash, draft);
  }, [draft, props.item.draftIdentityHash]);
  const valid = draft.independentVerdict !== "" && draft.blindSummary.trim().length > 0;
  const requestConfirmation = (event: { preventDefault(): void }) => {
    event.preventDefault();
    if (valid) setConfirming(true);
  };
  return (
    <section className="review-form-section" aria-labelledby="independent-assessment-title">
      <header className="section-heading">
        <div>
          <p className="eyebrow">Stage 1</p>
          <h2 id="independent-assessment-title">Independent assessment</h2>
        </div>
        <span className="blind-indicator"><LockKeyhole aria-hidden="true" /> Blind</span>
      </header>
      <form onSubmit={requestConfirmation}>
        <fieldset className="segmented-fieldset">
          <legend>Independent verdict</legend>
          <div className="segmented-control">
            {verdicts.map((verdict) => (
              <label key={verdict}>
                <input
                  type="radio"
                  name="independent-verdict"
                  value={verdict}
                  checked={draft.independentVerdict === verdict}
                  onChange={() => setDraft({ ...draft, independentVerdict: verdict })}
                />
                <span>{verdict.replaceAll("_", " ")}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <SummaryField
          id="blind-summary"
          label="Blind summary"
          value={draft.blindSummary}
          onChange={(blindSummary) => setDraft({ ...draft, blindSummary })}
        />
        <div className="form-actions">
          <button className="command-button primary" type="submit" disabled={!valid || props.pending}>
            <LockKeyhole aria-hidden="true" /> Freeze assessment
          </button>
        </div>
        <MutationError message={props.error} />
      </form>
      {confirming ? (
        <ConfirmationDialog
          title="Freeze independent assessment?"
          confirmLabel="Freeze"
          pending={props.pending}
          onCancel={() => setConfirming(false)}
          onConfirm={() => props.onSubmit(draft)}
        />
      ) : null}
    </section>
  );
}

function FrozenAssessment(props: { readonly item: ReviewWorkItemDetailV1 }) {
  const assessment = props.item.assessment;
  if (assessment === null) return null;
  return (
    <section className="frozen-assessment" aria-labelledby="frozen-assessment-title">
      <header className="section-heading">
        <div>
          <p className="eyebrow">Frozen blind record</p>
          <h2 id="frozen-assessment-title">Independent assessment</h2>
        </div>
        <span className={`verdict verdict-${assessment.independentVerdict}`}>
          {assessment.independentVerdict.replaceAll("_", " ")}
        </span>
      </header>
      <p>{assessment.blindSummary}</p>
      <div className="record-identities">
        <span><LockKeyhole aria-hidden="true" /> Immutable</span>
        <code>{assessment.assessmentHash}</code>
      </div>
    </section>
  );
}

function FinalReviewForm(props: {
  readonly item: ReviewWorkItemDetailV1;
  readonly pending: boolean;
  readonly error: string | undefined;
  readonly onSubmit: (
    disposition: "agree" | "clarify" | "disagree" | "uncertain",
    summary: string,
  ) => void;
}) {
  const [disposition, setDisposition] = useState<(typeof dispositions)[number] | "">("");
  const [summary, setSummary] = useState("");
  const [confirming, setConfirming] = useState(false);
  const valid = disposition !== "" && summary.trim().length > 0;
  return (
    <section className="review-form-section final-review" aria-labelledby="final-review-title">
      <header className="section-heading">
        <div>
          <p className="eyebrow">Stage 2</p>
          <h2 id="final-review-title">Whole-decision review</h2>
        </div>
      </header>
      <form onSubmit={(event) => { event.preventDefault(); if (valid) setConfirming(true); }}>
        <fieldset className="segmented-fieldset dispositions">
          <legend>Disposition</legend>
          <div className="segmented-control">
            {dispositions.map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="disposition"
                  checked={disposition === value}
                  onChange={() => setDisposition(value)}
                />
                <span>{value}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <SummaryField id="final-summary" label="Whole-decision summary" value={summary} onChange={setSummary} />
        <div className="form-actions">
          <button className="command-button primary" type="submit" disabled={!valid || props.pending}>
            <Send aria-hidden="true" /> Submit final review
          </button>
        </div>
        <MutationError message={props.error} />
      </form>
      {confirming && disposition !== "" ? (
        <ConfirmationDialog
          title="Submit final review?"
          confirmLabel="Submit"
          pending={props.pending}
          onCancel={() => setConfirming(false)}
          onConfirm={() => props.onSubmit(disposition, summary)}
        />
      ) : null}
    </section>
  );
}

function CompletedReview(props: { readonly item: ReviewWorkItemDetailV1 }) {
  const { review, workflowBinding, decisionConflict } = props.item;
  if (review === null || workflowBinding === null || decisionConflict === null) return null;
  return (
    <section className="completed-review" aria-labelledby="completed-review-title">
      <header className="section-heading">
        <div>
          <p className="eyebrow">Workflow complete</p>
          <h2 id="completed-review-title">CalvinReview</h2>
        </div>
        <span className={`disposition disposition-${review.disposition}`}>
          <Check aria-hidden="true" /> {review.disposition}
        </span>
      </header>
      <p>{review.summary}</p>
      <div className="completion-grid">
        <div><span>Independent verdict</span><strong>{review.independentVerdict.replaceAll("_", " ")}</strong></div>
        <div><span>Conflict status</span><strong>{decisionConflict.status}</strong></div>
        <div><span>Conflict kinds</span><strong>{decisionConflict.kinds.join(", ").replaceAll("_", " ")}</strong></div>
      </div>
      <details className="raw-record">
        <summary>Workflow binding</summary>
        <pre>{JSON.stringify(workflowBinding, null, 2)}</pre>
      </details>
    </section>
  );
}

function WorkflowProgress(props: { readonly state: ReviewWorkItemDetailV1["state"] }) {
  const activeIndex = {
    awaiting_assessment: 0,
    awaiting_reveal: 1,
    awaiting_final_review: 2,
    completed: 3,
  }[props.state];
  return (
    <ol className="workflow-progress" aria-label="Review workflow progress">
      {workflowSteps.map((step, index) => (
        <li key={step} className={index <= activeIndex ? "active" : ""}>
          <span>{index + 1}</span>{step}
        </li>
      ))}
    </ol>
  );
}

function SummaryField(props: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  return (
    <label className="summary-field" htmlFor={props.id}>
      <span>{props.label}</span>
      <textarea
        id={props.id}
        maxLength={600}
        rows={5}
        value={props.value}
        onChange={(event) => props.onChange(event.currentTarget.value)}
        required
      />
      <small>{Array.from(props.value).length} / 600</small>
    </label>
  );
}

function AsyncButton(props: {
  readonly pending: boolean;
  readonly icon: ReactNode;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button className="command-button primary" type="button" disabled={props.pending} onClick={props.onClick}>
      {props.pending ? <LoaderCircle className="spin" aria-hidden="true" /> : props.icon}
      {props.children}
    </button>
  );
}

function ConfirmationDialog(props: {
  readonly title: string;
  readonly confirmLabel: string;
  readonly pending: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
        <button className="dialog-close" type="button" onClick={props.onCancel} aria-label="Close" title="Close">
          <X aria-hidden="true" />
        </button>
        <LockKeyhole aria-hidden="true" className="dialog-icon" />
        <h3 id="confirmation-title">{props.title}</h3>
        <div className="dialog-actions">
          <button className="command-button secondary" type="button" onClick={props.onCancel}>Cancel</button>
          <button className="command-button primary" type="button" disabled={props.pending} onClick={props.onConfirm}>
            {props.pending ? <LoaderCircle className="spin" aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
            {props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function MutationError(props: { readonly message: string | undefined }) {
  return props.message === undefined ? null : (
    <div className="inline-error" role="alert"><CircleAlert aria-hidden="true" />{props.message}</div>
  );
}

function LoadingWorkItem() {
  return <main className="page state-message" role="status"><LoaderCircle className="spin" aria-hidden="true" />Loading work item</main>;
}

function WorkItemError(props: { readonly message: string }) {
  return <main className="page state-message error" role="alert"><CircleAlert aria-hidden="true" />{props.message}</main>;
}
