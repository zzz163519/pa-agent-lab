BEGIN;

CREATE TABLE pa_doctrine_corpus_snapshots (
  snapshot_id text PRIMARY KEY CHECK (pa_is_sha256(snapshot_id)),
  entry_count integer NOT NULL CHECK (entry_count > 0),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  CHECK (record ?& ARRAY['schemaVersion','entries','snapshotId']),
  CHECK ((record - ARRAY['schemaVersion','entries','snapshotId']) = '{}'::jsonb),
  CHECK (pa_required_text_equal(record->>'schemaVersion','doctrine-corpus-snapshot.v1')),
  CHECK (pa_required_text_equal(record->>'snapshotId',snapshot_id)),
  CHECK ((jsonb_typeof(record->'entries') = 'array') IS TRUE),
  CHECK (jsonb_array_length(record->'entries') = entry_count),
  CHECK (snapshot_id = 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record - 'snapshotId'), 'UTF8'
  )), 'hex'))
);

CREATE TABLE pa_doctrine_corpus_entries (
  snapshot_id text NOT NULL REFERENCES pa_doctrine_corpus_snapshots(snapshot_id),
  entry_index integer NOT NULL CHECK (entry_index >= 0),
  doctrine_id text NOT NULL,
  proposal_hash text NOT NULL CHECK (pa_is_sha256(proposal_hash)),
  approval_hash text NOT NULL CHECK (pa_is_sha256(approval_hash)),
  source_id text NOT NULL,
  source_content_hash text NOT NULL CHECK (pa_is_sha256(source_content_hash)),
  rag_record_hash text NOT NULL CHECK (pa_is_sha256(rag_record_hash)),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  PRIMARY KEY (snapshot_id, doctrine_id),
  UNIQUE (snapshot_id, entry_index),
  UNIQUE (snapshot_id, proposal_hash),
  UNIQUE (snapshot_id, approval_hash),
  UNIQUE (snapshot_id, rag_record_hash),
  FOREIGN KEY (proposal_hash, doctrine_id, source_id, source_content_hash)
    REFERENCES pa_doctrine_proposals(proposal_hash, doctrine_id, source_id, source_content_hash),
  FOREIGN KEY (approval_hash, proposal_hash, doctrine_id)
    REFERENCES pa_doctrine_approvals(approval_hash, proposal_hash, doctrine_id),
  CHECK (record ?& ARRAY['schemaVersion','doctrineId','proposalHash','approvalHash','sourceId','sourceContentHash','ragRecord','ragRecordHash']),
  CHECK ((record - ARRAY['schemaVersion','doctrineId','proposalHash','approvalHash','sourceId','sourceContentHash','ragRecord','ragRecordHash']) = '{}'::jsonb),
  CHECK (pa_required_text_equal(record->>'schemaVersion','doctrine-corpus-entry.v1')),
  CHECK (pa_required_text_equal(record->>'doctrineId',doctrine_id)),
  CHECK (pa_required_text_equal(record->>'proposalHash',proposal_hash)),
  CHECK (pa_required_text_equal(record->>'approvalHash',approval_hash)),
  CHECK (pa_required_text_equal(record->>'sourceId',source_id)),
  CHECK (pa_required_text_equal(record->>'sourceContentHash',source_content_hash)),
  CHECK (pa_required_text_equal(record->>'ragRecordHash',rag_record_hash)),
  CHECK ((record->'ragRecord') ?& ARRAY['doctrineId','concept','rule','appliesWhen','avoidWhen','decisionEffect']),
  CHECK (((record->'ragRecord') - ARRAY['doctrineId','concept','rule','appliesWhen','avoidWhen','decisionEffect']) = '{}'::jsonb),
  CHECK (pa_required_text_equal(record#>>'{ragRecord,doctrineId}',doctrine_id)),
  CHECK (rag_record_hash = 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record->'ragRecord'), 'UTF8'
  )), 'hex')),
  CHECK ((source_id, source_content_hash) IN (
    ('source:btc-six-aspects-v1','sha256:f1ec149fe8ba929b66836b22b516442b22cb4b7c3fffa260b0250c93b758c372'),
    ('source:btc-professional-pa-trader-v1','sha256:065ae939131da39f74d61d6e4b83a2a426f3dd1f4de6d3ac90e47cd5a43b7b8c'),
    ('source:ask-al-breakouts-2016-09-25','sha256:4728a7b3e24329e9bb58af024c016bd99b7af078f797574b4b67b22ccf500f8b'),
    ('source:ask-al-pullbacks-entering-2016-05-01','sha256:5a6f6262d86dc6f0a9094a60bdf9bddac973361cc4ae72ef16320cb884481bdb'),
    ('source:ask-al-trading-range-breakout-failures-2015-12-27','sha256:2703c5561739179736e4fbcc5b42bbfc7c27dcec85561dc58912687406bd6378'),
    ('source:ask-al-small-pullback-trend-2017-02-05','sha256:e84b0e60cfc574506d58ad214958013704f704efec35a8a3766445c4d3fa3155')
  ))
);

CREATE FUNCTION pa_validate_doctrine_corpus_entry() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  actual_source jsonb;
  expected_source jsonb;
BEGIN
  SELECT proposal.record->'source'
  INTO actual_source
  FROM pa_doctrine_proposals AS proposal
  WHERE proposal.proposal_hash = NEW.proposal_hash;

  expected_source := CASE NEW.source_id
    WHEN 'source:btc-six-aspects-v1' THEN jsonb_build_object(
      'sourceId', NEW.source_id,
      'sourceType', 'brooks_website',
      'title', 'What is Price Action? Six Aspects',
      'urlOrLocalRef', 'https://www.brookstradingcourse.com/price-action/what-is-price-action-6-aspects/',
      'contentHash', NEW.source_content_hash,
      'private', false
    )
    WHEN 'source:btc-professional-pa-trader-v1' THEN jsonb_build_object(
      'sourceId', NEW.source_id,
      'sourceType', 'brooks_website',
      'title', 'Professional Price Action Trader',
      'urlOrLocalRef', 'https://www.brookstradingcourse.com/price-action/professional-price-action-trader/',
      'contentHash', NEW.source_content_hash,
      'private', false
    )
    WHEN 'source:ask-al-breakouts-2016-09-25' THEN jsonb_build_object(
      'sourceId', NEW.source_id,
      'sourceType', 'brooks_website',
      'title', 'Breakouts',
      'urlOrLocalRef', 'https://www.brookstradingcourse.com/ask-al/breakouts/',
      'contentHash', NEW.source_content_hash,
      'private', false
    )
    WHEN 'source:ask-al-pullbacks-entering-2016-05-01' THEN jsonb_build_object(
      'sourceId', NEW.source_id,
      'sourceType', 'brooks_website',
      'title', 'Pullbacks and Entering',
      'urlOrLocalRef', 'https://www.brookstradingcourse.com/ask-al/pullbacks-entering/',
      'contentHash', NEW.source_content_hash,
      'private', false
    )
    WHEN 'source:ask-al-trading-range-breakout-failures-2015-12-27' THEN jsonb_build_object(
      'sourceId', NEW.source_id,
      'sourceType', 'brooks_website',
      'title', 'Trading Range Breakout Failures',
      'urlOrLocalRef', 'https://www.brookstradingcourse.com/ask-al/trading-range-breakout-failures/',
      'contentHash', NEW.source_content_hash,
      'private', false
    )
    WHEN 'source:ask-al-small-pullback-trend-2017-02-05' THEN jsonb_build_object(
      'sourceId', NEW.source_id,
      'sourceType', 'brooks_website',
      'title', 'Small Pullback Trend',
      'urlOrLocalRef', 'https://www.brookstradingcourse.com/ask-al/small-pullback-trend-bought-many-times/',
      'contentHash', NEW.source_content_hash,
      'private', false
    )
    ELSE NULL
  END;

  IF actual_source IS DISTINCT FROM expected_source THEN
    RAISE EXCEPTION 'Doctrine corpus entry Source is outside the exact Phase 4A allowlist';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pa_doctrine_corpus_entry_validate
BEFORE INSERT ON pa_doctrine_corpus_entries FOR EACH ROW
EXECUTE FUNCTION pa_validate_doctrine_corpus_entry();

CREATE FUNCTION pa_validate_doctrine_snapshot() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  expected jsonb;
  actual jsonb;
BEGIN
  SELECT jsonb_agg(entry.record ORDER BY entry.entry_index)
  INTO expected
  FROM pa_doctrine_corpus_entries AS entry
  WHERE entry.snapshot_id = NEW.snapshot_id;
  actual := NEW.record->'entries';
  IF expected IS DISTINCT FROM actual THEN
    RAISE EXCEPTION 'Doctrine snapshot entries are incomplete or out of order';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER pa_doctrine_snapshot_complete
AFTER INSERT ON pa_doctrine_corpus_snapshots
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION pa_validate_doctrine_snapshot();

CREATE TABLE pa_doctrine_retrieval_profiles (
  profile_hash text PRIMARY KEY CHECK (pa_is_sha256(profile_hash)),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  CHECK (record ?& ARRAY[
    'schemaVersion','engine','runtime','postgresqlMajor',
    'textSearchConfiguration','fields','fieldWeight','arraySeparator',
    'queryParser','matchPredicate','rankFunction','defaultLimit','maxLimit',
    'ordering','scoreEncoding','queryRewriting','profileHash'
  ]),
  CHECK ((record - ARRAY[
    'schemaVersion','engine','runtime','postgresqlMajor',
    'textSearchConfiguration','fields','fieldWeight','arraySeparator',
    'queryParser','matchPredicate','rankFunction','defaultLimit','maxLimit',
    'ordering','scoreEncoding','queryRewriting','profileHash'
  ]) = '{}'::jsonb),
  CHECK (pa_required_text_equal(record->>'schemaVersion','doctrine-retrieval-profile.v1')),
  CHECK (pa_required_text_equal(record->>'profileHash',profile_hash)),
  CHECK (pa_required_text_equal(record->>'engine','postgresql_fts')),
  CHECK (pa_required_text_equal(record->>'runtime',
    'pgvector/pgvector:0.8.6-pg18-trixie@sha256:8888de64a42b12a8e56df21d0d404c81864c18bafec7ab0f802a1453ec6cd352'
  )),
  CHECK ((record->>'postgresqlMajor')::integer = 18),
  CHECK (pa_required_text_equal(record->>'textSearchConfiguration','pg_catalog.english')),
  CHECK ((record->'fields') = '["concept","rule","appliesWhen","avoidWhen","decisionEffect"]'::jsonb),
  CHECK (pa_required_text_equal(record->>'fieldWeight','D')),
  CHECK (pa_required_text_equal(record->>'arraySeparator', E'\n')),
  CHECK (pa_required_text_equal(record->>'queryParser','plainto_tsquery')),
  CHECK (pa_required_text_equal(record->>'matchPredicate','document_vector_@@_parsed_query')),
  CHECK (pa_required_text_equal(record->>'rankFunction','ts_rank_cd_0')),
  CHECK ((record->>'defaultLimit')::integer = 5),
  CHECK ((record->>'maxLimit')::integer = 8),
  CHECK (pa_required_text_equal(record->>'ordering','rank_desc_doctrine_id_c')),
  CHECK (pa_required_text_equal(record->>'scoreEncoding','float4send_hex')),
  CHECK (pa_required_text_equal(record->>'queryRewriting','none')),
  CHECK (profile_hash = 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record - 'profileHash'), 'UTF8'
  )), 'hex'))
);

CREATE TABLE pa_doctrine_ingestion_runs (
  run_id text PRIMARY KEY CHECK (pa_is_sha256(run_id)),
  snapshot_id text NOT NULL REFERENCES pa_doctrine_corpus_snapshots(snapshot_id),
  profile_hash text NOT NULL REFERENCES pa_doctrine_retrieval_profiles(profile_hash),
  attempt_index integer NOT NULL CHECK (attempt_index >= 0),
  status text NOT NULL CHECK (status IN ('succeeded','failed')),
  entry_count integer NOT NULL CHECK (entry_count >= 0),
  lexical_manifest_hash text CHECK (lexical_manifest_hash IS NULL OR pa_is_sha256(lexical_manifest_hash)),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  UNIQUE (snapshot_id, profile_hash, attempt_index),
  UNIQUE (run_id, snapshot_id, profile_hash),
  CHECK (record ?& ARRAY['schemaVersion','snapshotId','profileHash','attemptIndex','status','entryCount','ragRecordHashes','logicalDocumentHashes','lexicalManifestHash','errorCodes','runId']),
  CHECK ((record - ARRAY['schemaVersion','snapshotId','profileHash','attemptIndex','status','entryCount','ragRecordHashes','logicalDocumentHashes','lexicalManifestHash','errorCodes','runId']) = '{}'::jsonb),
  CHECK (pa_required_text_equal(record->>'schemaVersion','doctrine-ingestion-run.v1')),
  CHECK (pa_required_text_equal(record->>'runId',run_id)),
  CHECK (pa_required_text_equal(record->>'snapshotId',snapshot_id)),
  CHECK (pa_required_text_equal(record->>'profileHash',profile_hash)),
  CHECK ((record->>'attemptIndex')::integer = attempt_index),
  CHECK (pa_required_text_equal(record->>'status',status)),
  CHECK ((record->>'entryCount')::integer = entry_count),
  CHECK (record->>'lexicalManifestHash' IS NOT DISTINCT FROM lexical_manifest_hash),
  CHECK ((status = 'succeeded' AND entry_count > 0 AND lexical_manifest_hash IS NOT NULL
    AND jsonb_array_length(record->'ragRecordHashes') = entry_count
    AND jsonb_array_length(record->'logicalDocumentHashes') = entry_count
    AND jsonb_array_length(record->'errorCodes') = 0)
    OR (status = 'failed' AND entry_count = 0 AND lexical_manifest_hash IS NULL
      AND jsonb_array_length(record->'ragRecordHashes') = 0
      AND jsonb_array_length(record->'logicalDocumentHashes') = 0
      AND jsonb_array_length(record->'errorCodes') > 0)),
  CHECK (run_id = 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record - 'runId'), 'UTF8'
  )), 'hex'))
);

CREATE TABLE pa_doctrine_lexical_documents (
  run_id text NOT NULL,
  snapshot_id text NOT NULL,
  profile_hash text NOT NULL,
  doctrine_id text NOT NULL,
  rag_record_hash text NOT NULL CHECK (pa_is_sha256(rag_record_hash)),
  document_vector tsvector NOT NULL,
  logical_document_hash text NOT NULL CHECK (pa_is_sha256(logical_document_hash)),
  PRIMARY KEY (run_id, doctrine_id),
  FOREIGN KEY (run_id, snapshot_id, profile_hash)
    REFERENCES pa_doctrine_ingestion_runs(run_id, snapshot_id, profile_hash),
  FOREIGN KEY (snapshot_id, doctrine_id)
    REFERENCES pa_doctrine_corpus_entries(snapshot_id, doctrine_id),
  FOREIGN KEY (snapshot_id, rag_record_hash)
    REFERENCES pa_doctrine_corpus_entries(snapshot_id, rag_record_hash),
  CHECK (logical_document_hash = 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(jsonb_build_object(
      'doctrineId', doctrine_id,
      'ragRecordHash', rag_record_hash,
      'documentVectorText', document_vector::text
    )), 'UTF8'
  )), 'hex'))
);
CREATE INDEX pa_doctrine_lexical_documents_gin
  ON pa_doctrine_lexical_documents USING gin (document_vector);

CREATE FUNCTION pa_validate_doctrine_ingestion() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  actual_count integer;
  invalid_vector_count integer;
  actual_rag_hashes jsonb;
  actual_document_hashes jsonb;
  manifest_documents jsonb;
  expected_manifest_hash text;
BEGIN
  IF NEW.status = 'succeeded' THEN
    SELECT
      count(document.run_id)::integer,
      count(*) FILTER (WHERE document.document_vector IS DISTINCT FROM (
        setweight(to_tsvector(
          'pg_catalog.english', entry.record#>>'{ragRecord,concept}'
        ), 'D') ||
        setweight(to_tsvector(
          'pg_catalog.english', entry.record#>>'{ragRecord,rule}'
        ), 'D') ||
        setweight(to_tsvector(
          'pg_catalog.english', coalesce((
            SELECT string_agg(value, E'\n' ORDER BY ordinal)
            FROM jsonb_array_elements_text(
              entry.record#>'{ragRecord,appliesWhen}'
            ) WITH ORDINALITY AS item(value, ordinal)
          ), '')
        ), 'D') ||
        setweight(to_tsvector(
          'pg_catalog.english', coalesce((
            SELECT string_agg(value, E'\n' ORDER BY ordinal)
            FROM jsonb_array_elements_text(
              entry.record#>'{ragRecord,avoidWhen}'
            ) WITH ORDINALITY AS item(value, ordinal)
          ), '')
        ), 'D') ||
        setweight(to_tsvector(
          'pg_catalog.english', coalesce((
            SELECT string_agg(value, E'\n' ORDER BY ordinal)
            FROM jsonb_array_elements_text(
              entry.record#>'{ragRecord,decisionEffect}'
            ) WITH ORDINALITY AS item(value, ordinal)
          ), '')
        ), 'D')
      )),
      jsonb_agg(entry.rag_record_hash ORDER BY entry.entry_index),
      jsonb_agg(document.logical_document_hash ORDER BY entry.entry_index),
      jsonb_agg(jsonb_build_object(
        'doctrineId', entry.doctrine_id,
        'ragRecordHash', entry.rag_record_hash,
        'logicalDocumentHash', document.logical_document_hash
      ) ORDER BY entry.entry_index)
    INTO
      actual_count,
      invalid_vector_count,
      actual_rag_hashes,
      actual_document_hashes,
      manifest_documents
    FROM pa_doctrine_corpus_entries AS entry
    LEFT JOIN pa_doctrine_lexical_documents AS document
      ON document.snapshot_id = entry.snapshot_id
      AND document.run_id = NEW.run_id
      AND document.doctrine_id = entry.doctrine_id
      AND document.rag_record_hash = entry.rag_record_hash
    WHERE entry.snapshot_id = NEW.snapshot_id;

    expected_manifest_hash := 'sha256:' || encode(sha256(convert_to(
      pa_canonical_json(jsonb_build_object(
        'schemaVersion', 'doctrine-lexical-manifest.v1',
        'documents', manifest_documents
      )), 'UTF8'
    )), 'hex');

    IF actual_count <> NEW.entry_count OR invalid_vector_count <> 0 THEN
      RAISE EXCEPTION 'Doctrine ingestion document content mismatch';
    END IF;
    IF actual_rag_hashes IS DISTINCT FROM NEW.record->'ragRecordHashes'
      OR actual_document_hashes IS DISTINCT FROM NEW.record->'logicalDocumentHashes'
      OR expected_manifest_hash IS DISTINCT FROM NEW.lexical_manifest_hash THEN
      RAISE EXCEPTION 'Doctrine ingestion logical manifest mismatch';
    END IF;
  ELSEIF EXISTS (
    SELECT 1 FROM pa_doctrine_lexical_documents WHERE run_id = NEW.run_id
  ) THEN
    RAISE EXCEPTION 'Failed Doctrine ingestion exposes lexical documents';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER pa_doctrine_ingestion_complete
AFTER INSERT ON pa_doctrine_ingestion_runs
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION pa_validate_doctrine_ingestion();

CREATE TABLE pa_doctrine_quality_suites (
  quality_suite_hash text PRIMARY KEY CHECK (pa_is_sha256(quality_suite_hash)),
  profile_hash text NOT NULL REFERENCES pa_doctrine_retrieval_profiles(profile_hash),
  fixture_count integer NOT NULL CHECK (fixture_count > 0),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  UNIQUE (quality_suite_hash, profile_hash),
  CHECK (record ?& ARRAY[
    'schemaVersion','profileHash','fixtures','qualitySuiteHash'
  ]),
  CHECK ((record - ARRAY[
    'schemaVersion','profileHash','fixtures','qualitySuiteHash'
  ]) = '{}'::jsonb),
  CHECK (pa_required_text_equal(
    record->>'schemaVersion','doctrine-retrieval-quality-suite.v1'
  )),
  CHECK (pa_required_text_equal(record->>'qualitySuiteHash',quality_suite_hash)),
  CHECK (pa_required_text_equal(record->>'profileHash',profile_hash)),
  CHECK ((jsonb_typeof(record->'fixtures') = 'array') IS TRUE),
  CHECK (jsonb_array_length(record->'fixtures') = fixture_count),
  CHECK (quality_suite_hash = 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record - 'qualitySuiteHash'), 'UTF8'
  )), 'hex'))
);

CREATE FUNCTION pa_validate_doctrine_quality_suite() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(NEW.record->'fixtures') AS item(fixture)
    WHERE (jsonb_typeof(fixture) = 'object') IS NOT TRUE
      OR NOT (fixture ?& ARRAY[
        'fixtureId','kind','query','requiredDoctrineIds',
        'expectedDoctrineIdOrder','expectedStatus'
      ])
      OR (fixture - ARRAY[
        'fixtureId','kind','query','requiredDoctrineIds',
        'expectedDoctrineIdOrder','expectedStatus'
      ]) <> '{}'::jsonb
      OR (fixture->>'kind' IN (
        'positive','cross_concept','no_match','isolation'
      )) IS NOT TRUE
      OR (fixture->>'expectedStatus' IN ('matched','no_match')) IS NOT TRUE
      OR (jsonb_typeof(fixture->'requiredDoctrineIds') = 'array') IS NOT TRUE
      OR (jsonb_typeof(fixture->'expectedDoctrineIdOrder') = 'array') IS NOT TRUE
  ) THEN
    RAISE EXCEPTION 'Doctrine quality suite fixture violates the closed contract';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pa_doctrine_quality_suite_validate
BEFORE INSERT ON pa_doctrine_quality_suites FOR EACH ROW
EXECUTE FUNCTION pa_validate_doctrine_quality_suite();

CREATE TABLE pa_doctrine_quality_reports (
  quality_report_hash text PRIMARY KEY CHECK (pa_is_sha256(quality_report_hash)),
  suite_hash text NOT NULL CHECK (pa_is_sha256(suite_hash)),
  run_id text NOT NULL,
  snapshot_id text NOT NULL,
  profile_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('passed','failed')),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  UNIQUE (run_id, quality_report_hash),
  FOREIGN KEY (run_id, snapshot_id, profile_hash)
    REFERENCES pa_doctrine_ingestion_runs(run_id, snapshot_id, profile_hash),
  FOREIGN KEY (suite_hash, profile_hash)
    REFERENCES pa_doctrine_quality_suites(quality_suite_hash, profile_hash),
  CHECK (record ?& ARRAY[
    'schemaVersion','suiteHash','snapshotId','runId','profileHash','status',
    'fixtureResultHashes','qualityReportHash'
  ]),
  CHECK ((record - ARRAY[
    'schemaVersion','suiteHash','snapshotId','runId','profileHash','status',
    'fixtureResultHashes','qualityReportHash'
  ]) = '{}'::jsonb),
  CHECK (pa_required_text_equal(record->>'schemaVersion','doctrine-retrieval-quality-report.v1')),
  CHECK (pa_required_text_equal(record->>'qualityReportHash',quality_report_hash)),
  CHECK (pa_required_text_equal(record->>'suiteHash',suite_hash)),
  CHECK (pa_required_text_equal(record->>'runId',run_id)),
  CHECK (pa_required_text_equal(record->>'snapshotId',snapshot_id)),
  CHECK (pa_required_text_equal(record->>'profileHash',profile_hash)),
  CHECK (pa_required_text_equal(record->>'status',status)),
  CHECK ((jsonb_typeof(record->'fixtureResultHashes') = 'array') IS TRUE),
  CHECK (jsonb_array_length(record->'fixtureResultHashes') > 0),
  CHECK (quality_report_hash = 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record - 'qualityReportHash'), 'UTF8'
  )), 'hex'))
);

CREATE FUNCTION pa_validate_doctrine_quality_report() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  expected_fixture_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pa_doctrine_ingestion_runs AS run
    WHERE run.run_id = NEW.run_id
      AND run.snapshot_id = NEW.snapshot_id
      AND run.profile_hash = NEW.profile_hash
      AND run.status = 'succeeded'
  ) THEN
    RAISE EXCEPTION 'Doctrine quality report requires a succeeded ingestion run';
  END IF;

  SELECT suite.fixture_count
  INTO expected_fixture_count
  FROM pa_doctrine_quality_suites AS suite
  WHERE suite.quality_suite_hash = NEW.suite_hash
    AND suite.profile_hash = NEW.profile_hash;
  IF expected_fixture_count IS DISTINCT FROM
      jsonb_array_length(NEW.record->'fixtureResultHashes')
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(
        NEW.record->'fixtureResultHashes'
      ) AS fixture_hash(value)
      WHERE NOT pa_is_sha256(value)
    ) THEN
    RAISE EXCEPTION 'Doctrine quality report fixture results are incomplete';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pa_doctrine_quality_report_validate
BEFORE INSERT ON pa_doctrine_quality_reports FOR EACH ROW
EXECUTE FUNCTION pa_validate_doctrine_quality_report();

CREATE SEQUENCE pa_doctrine_corpus_activation_sequence_seq AS bigint;

CREATE TABLE pa_doctrine_corpus_activations (
  activation_sequence bigint PRIMARY KEY,
  activation_id text NOT NULL UNIQUE CHECK (pa_is_sha256(activation_id)),
  run_id text NOT NULL,
  snapshot_id text NOT NULL,
  profile_hash text NOT NULL,
  quality_report_hash text NOT NULL,
  operator_principal text NOT NULL CHECK (operator_principal = 'local:phase2-operator'),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  UNIQUE (run_id, quality_report_hash),
  UNIQUE (activation_id, run_id, snapshot_id, profile_hash),
  FOREIGN KEY (run_id, snapshot_id, profile_hash)
    REFERENCES pa_doctrine_ingestion_runs(run_id, snapshot_id, profile_hash),
  FOREIGN KEY (run_id, quality_report_hash)
    REFERENCES pa_doctrine_quality_reports(run_id, quality_report_hash),
  CHECK (record ?& ARRAY[
    'schemaVersion','activationSequence','runId','snapshotId','profileHash',
    'qualityReportHash','operatorPrincipal','activationId'
  ]),
  CHECK ((record - ARRAY[
    'schemaVersion','activationSequence','runId','snapshotId','profileHash',
    'qualityReportHash','operatorPrincipal','activationId'
  ]) = '{}'::jsonb),
  CHECK (pa_required_text_equal(record->>'schemaVersion','doctrine-corpus-activation.v1')),
  CHECK (pa_required_text_equal(record->>'activationId',activation_id)),
  CHECK ((record->>'activationSequence')::bigint = activation_sequence),
  CHECK (pa_required_text_equal(record->>'runId',run_id)),
  CHECK (pa_required_text_equal(record->>'snapshotId',snapshot_id)),
  CHECK (pa_required_text_equal(record->>'profileHash',profile_hash)),
  CHECK (pa_required_text_equal(record->>'qualityReportHash',quality_report_hash)),
  CHECK (pa_required_text_equal(record->>'operatorPrincipal',operator_principal)),
  CHECK (activation_id = 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record - 'activationId'), 'UTF8'
  )), 'hex'))
);

CREATE FUNCTION pa_validate_doctrine_activation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pa_doctrine_ingestion_runs AS run
    JOIN pa_doctrine_quality_reports AS report ON report.run_id = run.run_id
    WHERE run.run_id = NEW.run_id AND run.status = 'succeeded'
      AND report.quality_report_hash = NEW.quality_report_hash
      AND report.status = 'passed'
  ) THEN RAISE EXCEPTION 'Doctrine activation requires succeeded run and passed quality report'; END IF;
  IF EXISTS (
    SELECT 1 FROM pa_doctrine_corpus_entries AS entry
    JOIN pa_doctrine_retirements AS retirement ON retirement.doctrine_id = entry.doctrine_id
    WHERE entry.snapshot_id = NEW.snapshot_id
  ) THEN RAISE EXCEPTION 'Doctrine activation snapshot contains a retirement'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER pa_doctrine_activation_validate
BEFORE INSERT ON pa_doctrine_corpus_activations FOR EACH ROW
EXECUTE FUNCTION pa_validate_doctrine_activation();

CREATE TABLE pa_doctrine_retrieval_queries (
  query_id text PRIMARY KEY CHECK (pa_is_sha256(query_id)),
  activation_id text NOT NULL,
  run_id text NOT NULL,
  snapshot_id text NOT NULL,
  profile_hash text NOT NULL,
  query_hash text NOT NULL CHECK (pa_is_sha256(query_hash)),
  normalized_query text NOT NULL,
  original_query text NOT NULL,
  requested_limit integer NOT NULL CHECK (requested_limit BETWEEN 1 AND 8),
  repeat_index integer NOT NULL CHECK (repeat_index >= 0),
  operator_principal text NOT NULL CHECK (operator_principal = 'local:phase2-operator'),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  UNIQUE (snapshot_id, profile_hash, query_hash, requested_limit, repeat_index),
  UNIQUE (query_id, activation_id, run_id, snapshot_id, profile_hash),
  FOREIGN KEY (activation_id, run_id, snapshot_id, profile_hash)
    REFERENCES pa_doctrine_corpus_activations(activation_id, run_id, snapshot_id, profile_hash),
  CHECK (record ?& ARRAY[
    'schemaVersion','activationId','runId','snapshotId','profileHash',
    'originalQuery','normalizedQuery','queryHash','limit','repeatIndex',
    'operatorPrincipal','queryId'
  ]),
  CHECK ((record - ARRAY[
    'schemaVersion','activationId','runId','snapshotId','profileHash',
    'originalQuery','normalizedQuery','queryHash','limit','repeatIndex',
    'operatorPrincipal','queryId'
  ]) = '{}'::jsonb),
  CHECK (pa_required_text_equal(record->>'schemaVersion','doctrine-retrieval-query.v1')),
  CHECK (pa_required_text_equal(record->>'queryId',query_id)),
  CHECK (pa_required_text_equal(record->>'activationId',activation_id)),
  CHECK (pa_required_text_equal(record->>'runId',run_id)),
  CHECK (pa_required_text_equal(record->>'snapshotId',snapshot_id)),
  CHECK (pa_required_text_equal(record->>'profileHash',profile_hash)),
  CHECK (pa_required_text_equal(record->>'queryHash',query_hash)),
  CHECK (pa_required_text_equal(record->>'normalizedQuery',normalized_query)),
  CHECK (pa_required_text_equal(record->>'originalQuery',original_query)),
  CHECK ((record->>'limit')::integer = requested_limit),
  CHECK ((record->>'repeatIndex')::integer = repeat_index),
  CHECK (pa_required_text_equal(record->>'operatorPrincipal',operator_principal)),
  CHECK (length(normalized_query) BETWEEN 1 AND 400),
  CHECK (normalized_query = btrim(normalized_query)),
  CHECK ((normalized_query !~ '[[:cntrl:]]') IS TRUE),
  CHECK (query_hash = 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(jsonb_build_object(
      'schemaVersion', 'doctrine-retrieval.v1',
      'normalizedQuery', normalized_query
    )), 'UTF8'
  )), 'hex')),
  CHECK (query_id = 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record - 'queryId'), 'UTF8'
  )), 'hex'))
);

CREATE TABLE pa_doctrine_retrieval_evidence (
  evidence_id text PRIMARY KEY CHECK (pa_is_sha256(evidence_id)),
  query_id text NOT NULL UNIQUE,
  activation_id text NOT NULL,
  run_id text NOT NULL,
  snapshot_id text NOT NULL,
  profile_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('matched','no_match','failed')),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  FOREIGN KEY (query_id, activation_id, run_id, snapshot_id, profile_hash)
    REFERENCES pa_doctrine_retrieval_queries(query_id, activation_id, run_id, snapshot_id, profile_hash),
  CHECK (record ?& ARRAY['schemaVersion','queryId','activationId','runId','snapshotId','profileHash','normalizedQuery','queryHash','limit','status','results','errorCodes','evidenceId']),
  CHECK ((record - ARRAY['schemaVersion','queryId','activationId','runId','snapshotId','profileHash','normalizedQuery','queryHash','limit','status','results','errorCodes','evidenceId']) = '{}'::jsonb),
  CHECK (pa_required_text_equal(record->>'schemaVersion','doctrine-retrieval-evidence.v1')),
  CHECK (pa_required_text_equal(record->>'evidenceId',evidence_id)),
  CHECK (pa_required_text_equal(record->>'queryId',query_id)),
  CHECK (pa_required_text_equal(record->>'activationId',activation_id)),
  CHECK (pa_required_text_equal(record->>'runId',run_id)),
  CHECK (pa_required_text_equal(record->>'snapshotId',snapshot_id)),
  CHECK (pa_required_text_equal(record->>'profileHash',profile_hash)),
  CHECK (pa_required_text_equal(record->>'status',status)),
  CHECK ((status = 'matched' AND jsonb_array_length(record->'results') BETWEEN 1 AND (record->>'limit')::integer AND jsonb_array_length(record->'errorCodes') = 0)
    OR (status = 'no_match' AND jsonb_array_length(record->'results') = 0 AND jsonb_array_length(record->'errorCodes') = 0)
    OR (status = 'failed' AND jsonb_array_length(record->'results') = 0 AND jsonb_array_length(record->'errorCodes') > 0)),
  CHECK (evidence_id = 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record - 'evidenceId'), 'UTF8'
  )), 'hex'))
);

CREATE FUNCTION pa_validate_doctrine_evidence() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  bound_query pa_doctrine_retrieval_queries%ROWTYPE;
  expected_results jsonb;
BEGIN
  SELECT query.* INTO bound_query
  FROM pa_doctrine_retrieval_queries AS query
  WHERE query.query_id = NEW.query_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Doctrine retrieval evidence query is missing';
  END IF;
  IF NEW.record->>'normalizedQuery' IS DISTINCT FROM bound_query.normalized_query
    OR NEW.record->>'queryHash' IS DISTINCT FROM bound_query.query_hash
    OR (NEW.record->>'limit')::integer IS DISTINCT FROM bound_query.requested_limit THEN
    RAISE EXCEPTION 'Doctrine retrieval evidence does not bind its exact query';
  END IF;

  IF NEW.status <> 'failed' THEN
    WITH parsed AS (
      SELECT plainto_tsquery(
        'pg_catalog.english', bound_query.normalized_query
      ) AS query
    ), scored AS (
      SELECT
        document.doctrine_id,
        document.rag_record_hash,
        ts_rank_cd(document.document_vector, parsed.query, 0)::real AS score
      FROM pa_doctrine_lexical_documents AS document
      CROSS JOIN parsed
      WHERE document.run_id = bound_query.run_id
        AND parsed.query <> ''::tsquery
        AND document.document_vector @@ parsed.query
    ), limited AS (
      SELECT
        row_number() OVER (
          ORDER BY score DESC, doctrine_id COLLATE "C" ASC
        )::integer AS rank,
        doctrine_id,
        rag_record_hash,
        encode(float4send(score), 'hex') AS score_hex
      FROM scored
      ORDER BY score DESC, doctrine_id COLLATE "C" ASC
      LIMIT bound_query.requested_limit
    )
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'rank', rank,
      'doctrineId', doctrine_id,
      'ragRecordHash', rag_record_hash,
      'scoreHex', score_hex
    ) ORDER BY rank), '[]'::jsonb)
    INTO expected_results
    FROM limited;

    IF NEW.record->'results' IS DISTINCT FROM expected_results THEN
      RAISE EXCEPTION 'Doctrine retrieval evidence results do not match PostgreSQL lexical execution';
    END IF;
    IF (NEW.status = 'matched') IS DISTINCT FROM (jsonb_array_length(expected_results) > 0) THEN
      RAISE EXCEPTION 'Doctrine retrieval evidence terminal status is inconsistent';
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements_text(NEW.record->'errorCodes') AS error_code(value)
      WHERE value NOT IN (
        'ACTIVATION_NOT_ELIGIBLE','CORPUS_RETIRED','RETRIEVAL_FAILED'
      )
    ) THEN
      RAISE EXCEPTION 'Doctrine retrieval evidence contains an unsupported error code';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pa_doctrine_evidence_validate
BEFORE INSERT ON pa_doctrine_retrieval_evidence FOR EACH ROW
EXECUTE FUNCTION pa_validate_doctrine_evidence();

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'pa_doctrine_corpus_snapshots','pa_doctrine_corpus_entries',
    'pa_doctrine_retrieval_profiles','pa_doctrine_ingestion_runs',
    'pa_doctrine_lexical_documents','pa_doctrine_quality_suites',
    'pa_doctrine_quality_reports','pa_doctrine_corpus_activations','pa_doctrine_retrieval_queries',
    'pa_doctrine_retrieval_evidence'
  ] LOOP
    EXECUTE format('CREATE TRIGGER %I_immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION pa_reject_immutable_mutation()', table_name, table_name);
    EXECUTE format('CREATE TRIGGER %I_immutable_truncate BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION pa_reject_immutable_mutation()', table_name, table_name);
  END LOOP;
END;
$$;

COMMIT;
