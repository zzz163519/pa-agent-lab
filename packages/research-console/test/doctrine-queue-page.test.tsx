import assert from "node:assert/strict";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { test, vi } from "vitest";

import { DoctrineQueuePage } from "../src/features/doctrine/doctrine-queue-page.tsx";
import { REVIEWER_TOKEN_SESSION_KEY } from "../src/features/review/session-state.ts";

const proposalHash = `sha256:${"1".repeat(64)}`;

test("renders the minimal Doctrine queue without creating approval state", async () => {
  sessionStorage.setItem(REVIEWER_TOKEN_SESSION_KEY, "reviewer-token");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          schemaVersion: "doctrine-work-queue.v1",
          items: [
            {
              proposalHash,
              doctrineId: "du:pilot:context-over-candle-pattern",
              sourceId: "source:btc-six-aspects-v1",
              concept: "context_over_candle_pattern",
              status: "draft",
              approverPrincipal: null,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ),
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DoctrineQueuePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  assert.ok(await screen.findByText("context_over_candle_pattern"));
  assert.ok(screen.getByText("Draft"));
  assert.ok(screen.getByText("source:btc-six-aspects-v1"));
  assert.equal(screen.queryByText(/approved by/i), null);
  const request = vi.mocked(fetch).mock.calls[0];
  assert.equal(request?.[0], "/v1/doctrine/proposals");
  assert.equal((request?.[1]?.headers as Record<string, string>).authorization, "Bearer reviewer-token");
});
