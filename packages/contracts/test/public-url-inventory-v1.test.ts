import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const inventory = JSON.parse(
  await readFile(
    new URL("../../../docs/research/BROOKS_PUBLIC_URL_INVENTORY_V1.json", import.meta.url),
    "utf8",
  ),
) as {
  readonly schemaVersion: string;
  readonly counts: Readonly<Record<string, number>>;
  readonly sitemapDocuments: readonly { readonly url: string; readonly contentHash: string }[];
  readonly urls: readonly {
    readonly url: string;
    readonly title: string;
    readonly lastModified: string | null;
    readonly contentHash: string | null;
    readonly eligibility: "doctrine_candidate" | "inventory_only";
    readonly reason: string;
    readonly markets: readonly string[];
    readonly protectedWindowExcluded?: true;
  }[];
};

describe("Brooks public URL inventory V1", () => {
  it("freezes one normalized unique all-public discovery snapshot", () => {
    assert.equal(inventory.schemaVersion, "brooks-public-url-inventory.v1");
    assert.equal(inventory.urls.length, 6_287);
    assert.equal(new Set(inventory.urls.map(({ url }) => url)).size, inventory.urls.length);
    assert.ok(inventory.urls.every(({ url }) => url.startsWith("https://")));
    assert.equal(inventory.sitemapDocuments.length, 36);
    assert.ok(inventory.sitemapDocuments.every(({ contentHash }) => /^sha256:[0-9a-f]{64}$/.test(contentHash)));
    assert.equal(inventory.counts.doctrineCandidate, 182);
    assert.equal(inventory.counts.inventoryOnly, 6_105);
  });

  it("covers multiple markets without promoting analysis or protected windows", () => {
    const markets = new Set(inventory.urls.flatMap(({ markets }) => markets));
    assert.deepEqual([...markets].sort(), [
      "commodities_rates",
      "crypto",
      "forex",
      "general",
      "gold_metals",
      "stock_indexes_emini",
      "stocks_etf",
    ]);
    assert.equal(inventory.urls.filter(({ protectedWindowExcluded }) => protectedWindowExcluded === true).length, 130);
    for (const item of inventory.urls) {
      if (
        /\/(?:analysis|analisis-de-mercado|analise-de-mercado)\//.test(item.url) &&
        item.lastModified !== null &&
        /^2025-(02|05|08)-/.test(item.lastModified)
      ) {
        assert.equal(item.protectedWindowExcluded, true, item.url);
        assert.equal(item.eligibility, "inventory_only", item.url);
        assert.equal(item.title, "", item.url);
      }
      if (item.eligibility === "doctrine_candidate") {
        assert.doesNotMatch(item.url, /\/(analysis|support-forum|es|pt-br)\//);
      }
    }
  });

  it("keeps direct interviews reviewable and publisher metadata non-authoritative", () => {
    const direct = inventory.urls.filter(({ reason }) => reason === "direct_al_brooks_interview_requires_locator_review");
    assert.equal(direct.length, 5);
    assert.ok(direct.every(({ contentHash, eligibility }) =>
      eligibility === "doctrine_candidate" && contentHash !== null && /^sha256:[0-9a-f]{64}$/.test(contentHash),
    ));
    const publisher = inventory.urls.filter(({ reason }) => reason === "publisher_identity_only_not_doctrine_text");
    assert.equal(publisher.length, 5);
    assert.ok(publisher.every(({ eligibility }) => eligibility === "inventory_only"));
  });
});
