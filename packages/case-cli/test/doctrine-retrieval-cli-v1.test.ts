import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runCaseCliV1 } from "../src/case-cli-v1.ts";

const token="phase4a-cli-token-0123456789abcdef";
const HASH=`sha256:${"a".repeat(64)}`;

describe("Phase 4A Doctrine retrieval CLI",()=>{
  it("maps bounded commands only to operator routes",async()=>{
    const requested:{path:string;body:unknown}[]=[];
    const fakeFetch=(async(input,init)=>{requested.push({path:new URL(String(input)).pathname,body:init?.body===undefined?undefined:JSON.parse(String(init.body))});return new Response(JSON.stringify({status:"ok"}),{status:200,headers:{"content-type":"application/json"}});}) as typeof fetch;
    for(const argv of [
      ["run-doctrine-ingestion"],
      ["inspect-doctrine-snapshot",HASH],
      ["inspect-doctrine-ingestion",HASH],
      ["activate-doctrine-corpus",HASH,HASH],
      ["inspect-current-doctrine-activation"],
      ["query-doctrine","--query","breakout context","--limit","5"],
      ["inspect-doctrine-evidence",HASH],
    ]){
      const errors:string[]=[];
      assert.equal(await runCaseCliV1({argv,env:{PA_API_TOKEN:token},stdout:()=>{},stderr:value=>errors.push(value),fetchImpl:fakeFetch}),0,errors.join("\n"));
    }
    assert.deepEqual(requested.map(value=>value.path),[
      "/v1/doctrine/ingestion-runs",
      `/v1/doctrine/corpus-snapshots/${HASH}`,
      `/v1/doctrine/ingestion-runs/${HASH}`,
      "/v1/doctrine/activations",
      "/v1/doctrine/activations/current",
      "/v1/doctrine/retrieval-queries",
      `/v1/doctrine/retrieval-evidence/${HASH}`,
    ]);
    assert.deepEqual(requested[5]!.body,{query:"breakout context",limit:5});
  });
});
