import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DOCTRINE_RETRIEVAL_PROFILE_V1, canonicalHash } from "@pa-agent-lab/contracts";
import { applyContentHashedMigrations, loadContentHashedMigrations } from "../../case-store/src/migration-runner-v1.ts";

const pgliteModuleName=["@electric-sql","pglite"].join("/");
const {PGlite}=await import(pgliteModuleName) as unknown as {readonly PGlite:new()=>PGliteDatabase};
interface PGliteDatabase{query<T>(sql:string,params?:readonly unknown[]):Promise<{readonly rows:T[]}>;exec(sql:string):Promise<unknown>;close():Promise<void>}
const migrations=await loadContentHashedMigrations(new URL("../sql",import.meta.url).pathname);

describe("Phase 4A Doctrine PostgreSQL constraints",()=>{
  it("creates only native lexical tables and protects each one from mutation",async()=>{
    const db=new PGlite();
    try{
      await applyContentHashedMigrations(db,migrations);
      const tables=["pa_doctrine_corpus_snapshots","pa_doctrine_corpus_entries","pa_doctrine_retrieval_profiles","pa_doctrine_ingestion_runs","pa_doctrine_lexical_documents","pa_doctrine_quality_suites","pa_doctrine_quality_reports","pa_doctrine_corpus_activations","pa_doctrine_retrieval_queries","pa_doctrine_retrieval_evidence"];
      for(const table of tables){
        await assert.rejects(()=>db.exec(`TRUNCATE ${table}`));
      }
      const columns=await db.query<{readonly data_type:string;readonly udt_name:string}>("SELECT data_type,udt_name FROM information_schema.columns WHERE table_name LIKE 'pa_doctrine_%'");
      assert.equal(columns.rows.some(row=>row.udt_name==="vector"),false);
      const extension=await db.query<{readonly count:number}>("SELECT count(*)::int AS count FROM pg_extension WHERE extname='vector'");
      assert.equal(extension.rows[0]?.count,0);
    }finally{await db.close();}
  });

  it("rejects rehashed extra keys in profiles and nested quality fixtures", async () => {
    const db = new PGlite();
    try {
      await applyContentHashedMigrations(db, migrations);
      const { profileHash: _profileHash, ...profileBody } =
        DOCTRINE_RETRIEVAL_PROFILE_V1;
      const forgedProfileBody = { ...profileBody, unauthorized: true };
      const forgedProfile = {
        ...forgedProfileBody,
        profileHash: canonicalHash(forgedProfileBody),
      };
      await assert.rejects(() =>
        db.query(
          `INSERT INTO pa_doctrine_retrieval_profiles (profile_hash,record)
           VALUES ($1,$2::jsonb)`,
          [forgedProfile.profileHash, JSON.stringify(forgedProfile)],
        ),
      );

      await db.query(
        `INSERT INTO pa_doctrine_retrieval_profiles (profile_hash,record)
         VALUES ($1,$2::jsonb)`,
        [
          DOCTRINE_RETRIEVAL_PROFILE_V1.profileHash,
          JSON.stringify(DOCTRINE_RETRIEVAL_PROFILE_V1),
        ],
      );
      const fixture = {
        fixtureId: "quality:closed-json-negative",
        kind: "positive",
        query: "source grounded words",
        requiredDoctrineIds: [],
        expectedDoctrineIdOrder: [],
        expectedStatus: "no_match",
        unauthorized: true,
      } as const;
      const suiteBody = {
        schemaVersion: "doctrine-retrieval-quality-suite.v1",
        profileHash: DOCTRINE_RETRIEVAL_PROFILE_V1.profileHash,
        fixtures: [fixture],
      } as const;
      const suite = {
        ...suiteBody,
        qualitySuiteHash: canonicalHash(suiteBody),
      };
      await assert.rejects(() =>
        db.query(
          `INSERT INTO pa_doctrine_quality_suites
            (quality_suite_hash,profile_hash,fixture_count,record)
           VALUES ($1,$2,$3,$4::jsonb)`,
          [
            suite.qualitySuiteHash,
            suite.profileHash,
            suite.fixtures.length,
            JSON.stringify(suite),
          ],
        ),
      );
    } finally {
      await db.close();
    }
  });
});
