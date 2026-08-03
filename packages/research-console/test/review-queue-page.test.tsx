import assert from "node:assert/strict";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { test, vi } from "vitest";

import { ReviewQueuePage } from "../src/features/review/review-queue-page.tsx";
import { REVIEWER_TOKEN_SESSION_KEY } from "../src/features/review/session-state.ts";

const caseHash = `sha256:${"1".repeat(64)}`;
const draftIdentityHash = `sha256:${"2".repeat(64)}`;

test("renders an anonymous deterministic queue without verdict or conflict fields", async () => {
  sessionStorage.setItem(REVIEWER_TOKEN_SESSION_KEY, "reviewer-token");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          schemaVersion: "review-work-queue.v1",
          items: [
            {
              caseHash,
              anonymousId: "case-1111111111",
              draftIdentityHash,
              visibleBarCount: 120,
              barDurationSeconds: 300,
              lastVisibleBarId: "bar:119",
              isLeftCensored: false,
              hasMissingData: false,
              state: "awaiting_assessment",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ),
  );
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ReviewQueuePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  assert.ok(await screen.findByText("case-1111111111"));
  assert.ok(screen.getByText("Awaiting assessment"));
  assert.equal(screen.queryByText(/long|short|no trade|conflict/i), null);
  const request = vi.mocked(fetch).mock.calls[0];
  assert.equal(request?.[0], "/v1/reviewer/work-items");
  assert.equal((request?.[1]?.headers as Record<string, string>).authorization, "Bearer reviewer-token");
});
