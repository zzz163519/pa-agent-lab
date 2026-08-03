import assert from "node:assert/strict";
import { test } from "vitest";

import {
  REVIEWER_TOKEN_SESSION_KEY,
  blindDraftStorageKey,
  bootstrapReviewerToken,
  clearBlindDraftAfterFreeze,
  reviewerAuthModeFromEnvironment,
  reviewerSessionAvailable,
  saveBlindDraft,
} from "../src/features/review/session-state.ts";

test("moves the fragment token into tab-local session storage and clears the URL", () => {
  history.replaceState(null, "", "/console/#token=reviewer-token-value");
  assert.equal(bootstrapReviewerToken(), "reviewer-token-value");
  assert.equal(sessionStorage.getItem(REVIEWER_TOKEN_SESSION_KEY), "reviewer-token-value");
  assert.equal(location.hash, "");
  assert.equal(location.pathname, "/console/");
});

test("allows the trusted-loopback deployment without browser token state", () => {
  history.replaceState(null, "", "/console/");
  sessionStorage.removeItem(REVIEWER_TOKEN_SESSION_KEY);
  const mode = reviewerAuthModeFromEnvironment("trusted_loopback");
  const token = bootstrapReviewerToken(mode);
  assert.equal(mode, "trusted_loopback");
  assert.equal(token, null);
  assert.equal(reviewerSessionAvailable(mode, token), true);
  assert.equal(sessionStorage.getItem(REVIEWER_TOKEN_SESSION_KEY), null);
});

test("fails closed to bearer mode for an unknown frontend deployment value", () => {
  assert.equal(reviewerAuthModeFromEnvironment("public"), "bearer");
  assert.equal(reviewerSessionAvailable("bearer", null), false);
});

test("binds blind drafts to the exact server-owned workflow identity", () => {
  const first = `sha256:${"1".repeat(64)}`;
  const second = `sha256:${"2".repeat(64)}`;
  assert.notEqual(blindDraftStorageKey(first), blindDraftStorageKey(second));
  assert.match(blindDraftStorageKey(first), new RegExp(first));
});

test("clears a stale blind draft when a resumed workflow is already frozen", () => {
  const draftIdentityHash = `sha256:${"3".repeat(64)}`;
  saveBlindDraft(draftIdentityHash, {
    independentVerdict: "no_trade",
    blindSummary: "Unsubmitted tab-local draft.",
  });
  clearBlindDraftAfterFreeze(draftIdentityHash, "awaiting_reveal");
  assert.equal(sessionStorage.getItem(blindDraftStorageKey(draftIdentityHash)), null);
});
