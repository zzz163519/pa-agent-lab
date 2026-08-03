import type {
  RevealDecisionCommandV1,
  ReviewWorkItemDetailV1,
  ReviewWorkQueueV1,
  ReviewWorkflowMutationResultV1,
  SubmitFinalReviewCommandV1,
  SubmitIndependentAssessmentCommandV1,
} from "@pa-agent-lab/persistence-contracts/review-workflow-transport-v1";

import {
  REVIEWER_AUTH_MODE,
  reviewerToken,
} from "./session-state.ts";

export class ReviewerApiError extends Error {
  override readonly name = "ReviewerApiError";
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function listReviewWorkItems(): Promise<ReviewWorkQueueV1> {
  return reviewerFetch("/v1/reviewer/work-items");
}

export function getReviewWorkItem(caseHash: string): Promise<ReviewWorkItemDetailV1> {
  return reviewerFetch(`/v1/reviewer/work-items/${encodeURIComponent(caseHash)}`);
}

export function submitIndependentAssessment(
  command: SubmitIndependentAssessmentCommandV1,
): Promise<ReviewWorkflowMutationResultV1> {
  return reviewerFetch("/v1/reviewer/independent-assessments", {
    method: "POST",
    body: JSON.stringify(command),
  });
}

export function revealDecision(
  caseHash: string,
  command: RevealDecisionCommandV1,
): Promise<ReviewWorkflowMutationResultV1> {
  return reviewerFetch(
    `/v1/reviewer/work-items/${encodeURIComponent(caseHash)}/reveal`,
    { method: "POST", body: JSON.stringify(command) },
  );
}

export function submitFinalReview(
  command: SubmitFinalReviewCommandV1,
): Promise<ReviewWorkflowMutationResultV1> {
  return reviewerFetch("/v1/reviewer/final-reviews", {
    method: "POST",
    body: JSON.stringify(command),
  });
}

export async function loadChartArtifact(artifactId: string): Promise<string> {
  const response = await authenticatedRequest(
    `/v1/chart-artifacts/${encodeURIComponent(artifactId)}/content`,
  );
  if (!response.ok) throw await responseError(response);
  const blob = await response.blob();
  if (blob.type !== "image/png") {
    throw new ReviewerApiError(502, "Chart response is not a PNG artifact.");
  }
  return URL.createObjectURL(blob);
}

export async function reviewerFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await authenticatedRequest(path, init);
  if (!response.ok) throw await responseError(response);
  return (await response.json()) as T;
}

async function authenticatedRequest(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = reviewerToken();
  if (REVIEWER_AUTH_MODE === "bearer" && token === null) {
    throw new ReviewerApiError(401, "Reviewer session is not authorized.");
  }
  return fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      ...(token === null ? {} : { authorization: `Bearer ${token}` }),
      ...(init.body === undefined ? {} : { "content-type": "application/json" }),
      ...headersToRecord(init.headers),
    },
  });
}

async function responseError(response: Response): Promise<ReviewerApiError> {
  let message = `Reviewer API request failed with status ${response.status}.`;
  try {
    const body = (await response.json()) as { readonly message?: unknown };
    if (typeof body.message === "string") message = body.message;
  } catch {
    // The bounded status remains the error authority when no JSON envelope exists.
  }
  return new ReviewerApiError(response.status, message);
}

function headersToRecord(headers: HeadersInit | undefined): Record<string, string> {
  if (headers === undefined) return {};
  return Object.fromEntries(new Headers(headers).entries());
}
