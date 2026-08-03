import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { createCaseStore, applyContentHashedMigrations, loadContentHashedMigrations, type CaseStoreDatabaseClientV1, type CaseStoreDatabaseV1 } from "@pa-agent-lab/case-store";
import { DOCTRINE_RETRIEVAL_RUNTIME } from "@pa-agent-lab/contracts";
import { createPhase3bPilotDoctrineProposalsV1 } from "../../case-cli/src/doctrine-pilot-v1.ts";
import { createCaseApiV1 } from "../src/case-api-v1.ts";

const pgliteModuleName = ["@electric-sql", "pglite"].join("/");
const { PGlite } = (await import(pgliteModuleName)) as unknown as { readonly PGlite: new () => PGliteDatabase };
interface PGliteDatabase { query<T>(sql:string, params?:readonly unknown[]):Promise<{readonly rows:T[]}>; exec(sql:string):Promise<unknown>; close():Promise<void>; }
const migrations = await loadContentHashedMigrations(new URL("../../persistence-contracts/sql", import.meta.url).pathname);
const operatorToken = "phase4a-operator-token-0123456789abcdef";
const reviewerToken = "phase4a-reviewer-token-0123456789abcdef";
const headers = { host:"127.0.0.1", origin:"http://127.0.0.1", authorization:`Bearer ${operatorToken}`, "content-type":"application/json" } as const;

describe("Phase 4A Doctrine retrieval API", () => {
  it("serves seven operator-only routes and rejects reviewer access", async () => {
    const db = new PGlite(); await applyContentHashedMigrations(db,migrations);
    const store=createCaseStore(makeDatabase(db), { doctrineRetrievalRuntime: DOCTRINE_RETRIEVAL_RUNTIME });
    const proposals=createPhase3bPilotDoctrineProposalsV1();
    for(const proposal of proposals){await store.appendDoctrineProposal(proposal); await store.approveDoctrine(proposal.doctrineUnit.doctrineId,{proposalHash:proposal.proposalHash},"local:phase2-operator");}
    const artifactRoot=await mkdtemp(resolve(tmpdir(),"pa-phase4a-api-"));
    const app=await createCaseApiV1({store,artifactRoot,localToken:operatorToken,reviewerToken,authorizedSyntheticBundleHashes:[`sha256:${"a".repeat(64)}`],authorizedDoctrineProposalHashes:proposals.map(p=>p.proposalHash),allowedHosts:["127.0.0.1"],allowedOrigins:["http://127.0.0.1"]});
    try {
      const denied=await app.inject({method:"POST",url:"/v1/doctrine/ingestion-runs",headers:{...headers,authorization:`Bearer ${reviewerToken}`},payload:"{}"});
      assert.equal(denied.statusCode,401);
      const ingested=await app.inject({method:"POST",url:"/v1/doctrine/ingestion-runs",headers,payload:"{}"});
      assert.equal(ingested.statusCode,201,ingested.body);
      const repeatedIngestion=await app.inject({method:"POST",url:"/v1/doctrine/ingestion-runs",headers,payload:"{}"});
      assert.equal(repeatedIngestion.statusCode,200,repeatedIngestion.body);
      const run=ingested.json();
      const report=await db.query<{readonly quality_report_hash:string}>("SELECT quality_report_hash FROM pa_doctrine_quality_reports WHERE run_id=$1",[run.runId]);
      const activated=await app.inject({method:"POST",url:"/v1/doctrine/activations",headers,payload:JSON.stringify({runId:run.runId,qualityReportHash:report.rows[0]!.quality_report_hash})});
      assert.equal(activated.statusCode,201,activated.body);
      const repeatedActivation=await app.inject({method:"POST",url:"/v1/doctrine/activations",headers,payload:JSON.stringify({runId:run.runId,qualityReportHash:report.rows[0]!.quality_report_hash})});
      assert.equal(repeatedActivation.statusCode,200,repeatedActivation.body);
      const secondIngestion=await app.inject({method:"POST",url:"/v1/doctrine/ingestion-runs",headers,payload:JSON.stringify({attemptIndex:1})});
      assert.equal(secondIngestion.statusCode,201,secondIngestion.body);
      const secondRun=secondIngestion.json();
      const secondReport=await db.query<{readonly quality_report_hash:string}>("SELECT quality_report_hash FROM pa_doctrine_quality_reports WHERE run_id=$1",[secondRun.runId]);
      const secondActivation=await app.inject({method:"POST",url:"/v1/doctrine/activations",headers,payload:JSON.stringify({runId:secondRun.runId,qualityReportHash:secondReport.rows[0]!.quality_report_hash})});
      assert.equal(secondActivation.statusCode,201,secondActivation.body);
      const rollbackPayload={targetActivationId:activated.json().activationId,reason:"Restore prior eligible corpus."};
      const reviewerDenied=await app.inject({method:"POST",url:"/v1/doctrine/rollback-activations",headers:{...headers,authorization:`Bearer ${reviewerToken}`},payload:JSON.stringify(rollbackPayload)});
      assert.equal(reviewerDenied.statusCode,401,reviewerDenied.body);
      const widenedRollback=await app.inject({method:"POST",url:"/v1/doctrine/rollback-activations",headers,payload:JSON.stringify({...rollbackPayload,activationSequence:99})});
      assert.equal(widenedRollback.statusCode,422,widenedRollback.body);
      const rolledBack=await app.inject({method:"POST",url:"/v1/doctrine/rollback-activations",headers,payload:JSON.stringify(rollbackPayload)});
      assert.equal(rolledBack.statusCode,201,rolledBack.body);
      assert.equal(rolledBack.json().activationKind,"rollback");
      assert.equal(rolledBack.json().replacesActivationId,secondActivation.json().activationId);
      const repeatedRollback=await app.inject({method:"POST",url:"/v1/doctrine/rollback-activations",headers,payload:JSON.stringify(rollbackPayload)});
      assert.equal(repeatedRollback.statusCode,200,repeatedRollback.body);
      assert.equal(repeatedRollback.json().activationId,rolledBack.json().activationId);
      const activationRead=await app.inject({method:"GET",url:`/v1/doctrine/activations/${rolledBack.json().activationId}`,headers});
      assert.equal(activationRead.statusCode,200,activationRead.body);
      assert.deepEqual(activationRead.json(),rolledBack.json());
      const currentActivation=await app.inject({method:"GET",url:"/v1/doctrine/activations/current",headers});
      assert.equal(currentActivation.statusCode,200,currentActivation.body);
      assert.equal(currentActivation.json().activationId,rolledBack.json().activationId);
      const queried=await app.inject({method:"POST",url:"/v1/doctrine/retrieval-queries",headers,payload:JSON.stringify({query:"breakout context"})});
      assert.equal(queried.statusCode,200,queried.body);
      assert.equal(queried.json().evidence.status,"matched");
      const evidence=await app.inject({method:"GET",url:`/v1/doctrine/retrieval-evidence/${queried.json().evidence.evidenceId}`,headers});
      assert.equal(evidence.statusCode,200,evidence.body);
    } finally { await app.close(); await db.close(); await rm(artifactRoot,{recursive:true,force:true}); }
  });
});
function makeDatabase(db:PGliteDatabase):CaseStoreDatabaseV1{return{query:(sql,params)=>db.query(sql,params),transaction:async work=>{await db.exec("BEGIN;");const client:CaseStoreDatabaseClientV1={query:(sql,params)=>db.query(sql,params)};try{const value=await work(client);await db.exec("COMMIT;");return value;}catch(error){await db.exec("ROLLBACK;");throw error;}}};}
