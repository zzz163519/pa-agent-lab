import type { ReviewWorkflowStateV1 } from "@pa-agent-lab/persistence-contracts/review-workflow-transport-v1";

export const REVIEWER_TOKEN_SESSION_KEY =
  "pa-agent-lab:reviewer-token:v1" as const;
const BLIND_DRAFT_KEY_PREFIX = "pa-agent-lab:blind-draft:v1:";

export interface BlindAssessmentDraftV1 {
  readonly independentVerdict: "long" | "short" | "no_trade" | "uncertain" | "";
  readonly blindSummary: string;
}

export type ReviewerAuthMode = "bearer" | "trusted_loopback";

export const REVIEWER_AUTH_MODE = reviewerAuthModeFromEnvironment(
  import.meta.env.VITE_PA_REVIEWER_AUTH_MODE,
);

export function reviewerAuthModeFromEnvironment(
  value: string | undefined,
): ReviewerAuthMode {
  return value === "trusted_loopback" ? "trusted_loopback" : "bearer";
}

export function bootstrapReviewerToken(
  authMode: ReviewerAuthMode = REVIEWER_AUTH_MODE,
): string | null {
  if (authMode === "trusted_loopback") {
    sessionStorage.removeItem(REVIEWER_TOKEN_SESSION_KEY);
    if (location.hash.length > 0) {
      history.replaceState(null, "", `${location.pathname}${location.search}`);
    }
    return null;
  }
  const parameters = new URLSearchParams(location.hash.replace(/^#/, ""));
  const fragmentToken = parameters.get("token");
  if (fragmentToken !== null && fragmentToken.length > 0) {
    sessionStorage.setItem(REVIEWER_TOKEN_SESSION_KEY, fragmentToken);
    history.replaceState(null, "", `${location.pathname}${location.search}`);
    return fragmentToken;
  }
  return sessionStorage.getItem(REVIEWER_TOKEN_SESSION_KEY);
}

export function reviewerSessionAvailable(
  authMode: ReviewerAuthMode,
  token: string | null,
): boolean {
  return authMode === "trusted_loopback" || token !== null;
}

export function reviewerToken(
  authMode: ReviewerAuthMode = REVIEWER_AUTH_MODE,
): string | null {
  return authMode === "trusted_loopback"
    ? null
    : sessionStorage.getItem(REVIEWER_TOKEN_SESSION_KEY);
}

export function blindDraftStorageKey(draftIdentityHash: string): string {
  if (!/^sha256:[0-9a-f]{64}$/.test(draftIdentityHash)) {
    throw new Error("draftIdentityHash must be an exact SHA-256 identity");
  }
  return `${BLIND_DRAFT_KEY_PREFIX}${draftIdentityHash}`;
}

export function loadBlindDraft(
  draftIdentityHash: string,
): BlindAssessmentDraftV1 | null {
  const stored = sessionStorage.getItem(blindDraftStorageKey(draftIdentityHash));
  if (stored === null) return null;
  try {
    const parsed = JSON.parse(stored) as Partial<BlindAssessmentDraftV1>;
    if (
      !["", "long", "short", "no_trade", "uncertain"].includes(
        parsed.independentVerdict ?? "invalid",
      ) ||
      typeof parsed.blindSummary !== "string"
    ) {
      return null;
    }
    return {
      independentVerdict: parsed.independentVerdict as BlindAssessmentDraftV1["independentVerdict"],
      blindSummary: parsed.blindSummary,
    };
  } catch {
    return null;
  }
}

export function saveBlindDraft(
  draftIdentityHash: string,
  draft: BlindAssessmentDraftV1,
): void {
  sessionStorage.setItem(
    blindDraftStorageKey(draftIdentityHash),
    JSON.stringify(draft),
  );
}

export function clearBlindDraftAfterFreeze(
  draftIdentityHash: string,
  state: ReviewWorkflowStateV1,
): void {
  if (state !== "awaiting_assessment") clearBlindDraft(draftIdentityHash);
}

export function clearBlindDraft(draftIdentityHash: string): void {
  sessionStorage.removeItem(blindDraftStorageKey(draftIdentityHash));
}
