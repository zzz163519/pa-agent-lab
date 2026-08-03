BEGIN;

ALTER TABLE pa_case_policy_inputs
  ADD CONSTRAINT pa_case_policy_inputs_case_hash_uq UNIQUE (case_hash);

ALTER TABLE pa_chart_artifact_metadata
  ADD CONSTRAINT pa_chart_artifact_metadata_exact_artifact_uq UNIQUE (
    metadata_id,source_case_hash,panel,artifact_id,content_hash
  );

ALTER TABLE pa_doctrine_corpus_activations
  ADD CONSTRAINT pa_doctrine_corpus_activations_authority_chain_uq UNIQUE (
    activation_id,activation_kind,activation_sequence,run_id,snapshot_id,
    profile_hash,quality_report_hash
  );

CREATE FUNCTION pa_phase2_source_bundle_hash(requested_case_hash text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT 'sha256:' || encode(sha256(convert_to(pa_canonical_json(
    jsonb_build_object(
      'schemaVersion','synthetic-case-bundle.v1',
      'sourceScope','synthetic_fixture_only',
      'policyCase',policy_case.record,
      'policyInput',policy_input.record,
      'chartMetadata',jsonb_build_object(
        'context',context_chart.record,
        'detail',detail_chart.record
      ),
      'binding',jsonb_build_object(
        'caseHash',binding.case_hash,
        'inputHash',binding.input_hash,
        'contextMetadataId',binding.context_metadata_id,
        'detailMetadataId',binding.detail_metadata_id
      )
    )
  ),'UTF8')),'hex')
  FROM pa_policy_cases AS policy_case
  JOIN pa_case_policy_inputs AS binding
    ON binding.case_hash=policy_case.case_hash
  JOIN pa_policy_inputs AS policy_input
    ON policy_input.input_hash=binding.input_hash
  JOIN pa_chart_artifact_metadata AS context_chart
    ON context_chart.metadata_id=binding.context_metadata_id
  JOIN pa_chart_artifact_metadata AS detail_chart
    ON detail_chart.metadata_id=binding.detail_metadata_id
  WHERE policy_case.case_hash=requested_case_hash
$$;

CREATE TABLE pa_policy_assemblies (
  assembly_id text PRIMARY KEY CHECK (pa_is_sha256(assembly_id)),
  assembly_rules_version text NOT NULL
    CHECK (assembly_rules_version='policy-assembly-rules.v1'),
  case_hash text NOT NULL REFERENCES pa_policy_cases(case_hash),
  source_bundle_hash text NOT NULL CHECK (pa_is_sha256(source_bundle_hash)),
  activation_id text NOT NULL,
  activation_kind text NOT NULL CHECK (activation_kind IN ('standard','rollback')),
  activation_sequence bigint NOT NULL CHECK (activation_sequence > 0),
  run_id text NOT NULL,
  snapshot_id text NOT NULL,
  profile_hash text NOT NULL,
  quality_report_hash text NOT NULL,
  doctrine_context_hash text NOT NULL CHECK (pa_is_sha256(doctrine_context_hash)),
  doctrine_context_byte_length integer NOT NULL
    CHECK (doctrine_context_byte_length BETWEEN 1 AND 524288),
  input_hash text NOT NULL REFERENCES pa_policy_inputs(input_hash),
  operator_principal text NOT NULL
    CHECK (operator_principal='local:phase2-operator'),
  record jsonb NOT NULL CHECK (jsonb_typeof(record)='object'),
  CONSTRAINT pa_policy_assembly_natural_identity_uq
    UNIQUE (case_hash,activation_id,assembly_rules_version),
  UNIQUE (assembly_id,snapshot_id),
  UNIQUE (assembly_id,case_hash,input_hash),
  FOREIGN KEY (
    activation_id,activation_kind,activation_sequence,run_id,snapshot_id,
    profile_hash,quality_report_hash
  ) REFERENCES pa_doctrine_corpus_activations(
    activation_id,activation_kind,activation_sequence,run_id,snapshot_id,
    profile_hash,quality_report_hash
  ),
  CHECK (record ?& ARRAY[
    'schemaVersion','assemblyRulesVersion','sourceScope','caseHash',
    'sourceBundleHash','activationKind','activationId','activationSequence',
    'runId','snapshotId','profileHash','qualityReportHash',
    'doctrineContextHash','doctrineContextByteLength','doctrineManifest',
    'charts','policyInput','inputHash','operatorPrincipal','assemblyId'
  ]),
  CHECK ((record - ARRAY[
    'schemaVersion','assemblyRulesVersion','sourceScope','caseHash',
    'sourceBundleHash','activationKind','activationId','activationSequence',
    'runId','snapshotId','profileHash','qualityReportHash',
    'doctrineContextHash','doctrineContextByteLength','doctrineManifest',
    'charts','policyInput','inputHash','operatorPrincipal','assemblyId'
  ])='{}'::jsonb),
  CHECK (pa_required_text_equal(record->>'schemaVersion','policy-assembly.v1')),
  CHECK (pa_required_text_equal(record->>'assemblyRulesVersion',assembly_rules_version)),
  CHECK (pa_required_text_equal(record->>'sourceScope','synthetic_fixture_only')),
  CHECK (pa_required_text_equal(record->>'caseHash',case_hash)),
  CHECK (pa_required_text_equal(record->>'sourceBundleHash',source_bundle_hash)),
  CHECK (pa_required_text_equal(record->>'activationKind',activation_kind)),
  CHECK (pa_required_text_equal(record->>'activationId',activation_id)),
  CHECK ((record->>'activationSequence')::bigint=activation_sequence),
  CHECK (pa_required_text_equal(record->>'runId',run_id)),
  CHECK (pa_required_text_equal(record->>'snapshotId',snapshot_id)),
  CHECK (pa_required_text_equal(record->>'profileHash',profile_hash)),
  CHECK (pa_required_text_equal(record->>'qualityReportHash',quality_report_hash)),
  CHECK (pa_required_text_equal(record->>'doctrineContextHash',doctrine_context_hash)),
  CHECK ((record->>'doctrineContextByteLength')::integer=doctrine_context_byte_length),
  CHECK (pa_required_text_equal(record->>'inputHash',input_hash)),
  CHECK (pa_required_text_equal(record#>>'{policyInput,inputHash}',input_hash)),
  CHECK (pa_required_text_equal(record->>'operatorPrincipal',operator_principal)),
  CHECK ((jsonb_typeof(record->'doctrineManifest')='array') IS TRUE),
  CHECK (jsonb_array_length(record->'doctrineManifest') BETWEEN 1 AND 32),
  CHECK (assembly_id='sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record-'assemblyId'),'UTF8'
  )),'hex'))
);

CREATE TABLE pa_policy_assembly_bindings (
  assembly_id text PRIMARY KEY,
  case_hash text NOT NULL,
  input_hash text NOT NULL,
  context_metadata_id text NOT NULL,
  context_panel text NOT NULL CHECK (context_panel='context'),
  context_artifact_id text NOT NULL CHECK (pa_is_sha256(context_artifact_id)),
  context_content_hash text NOT NULL CHECK (pa_is_sha256(context_content_hash)),
  detail_metadata_id text NOT NULL,
  detail_panel text NOT NULL CHECK (detail_panel='detail'),
  detail_artifact_id text NOT NULL CHECK (pa_is_sha256(detail_artifact_id)),
  detail_content_hash text NOT NULL CHECK (pa_is_sha256(detail_content_hash)),
  FOREIGN KEY (assembly_id,case_hash,input_hash)
    REFERENCES pa_policy_assemblies(assembly_id,case_hash,input_hash),
  FOREIGN KEY (input_hash,context_content_hash,detail_content_hash)
    REFERENCES pa_policy_inputs(input_hash,context_content_hash,detail_content_hash),
  FOREIGN KEY (
    context_metadata_id,case_hash,context_panel,context_artifact_id,
    context_content_hash
  ) REFERENCES pa_chart_artifact_metadata(
    metadata_id,source_case_hash,panel,artifact_id,content_hash
  ),
  FOREIGN KEY (
    detail_metadata_id,case_hash,detail_panel,detail_artifact_id,
    detail_content_hash
  ) REFERENCES pa_chart_artifact_metadata(
    metadata_id,source_case_hash,panel,artifact_id,content_hash
  )
);

CREATE TABLE pa_policy_assembly_doctrine_bindings (
  assembly_id text NOT NULL,
  doctrine_index integer NOT NULL CHECK (doctrine_index >= 0),
  snapshot_id text NOT NULL,
  doctrine_id text NOT NULL,
  rag_record_hash text NOT NULL CHECK (pa_is_sha256(rag_record_hash)),
  PRIMARY KEY (assembly_id,doctrine_index),
  UNIQUE (assembly_id,doctrine_id),
  UNIQUE (assembly_id,rag_record_hash),
  FOREIGN KEY (assembly_id,snapshot_id)
    REFERENCES pa_policy_assemblies(assembly_id,snapshot_id),
  FOREIGN KEY (snapshot_id,doctrine_id)
    REFERENCES pa_doctrine_corpus_entries(snapshot_id,doctrine_id),
  FOREIGN KEY (snapshot_id,rag_record_hash)
    REFERENCES pa_doctrine_corpus_entries(snapshot_id,rag_record_hash)
);

CREATE TABLE pa_policy_assembly_failures (
  failure_id text PRIMARY KEY CHECK (pa_is_sha256(failure_id)),
  assembly_rules_version text NOT NULL
    CHECK (assembly_rules_version='policy-assembly-rules.v1'),
  case_hash text NOT NULL REFERENCES pa_policy_cases(case_hash),
  source_bundle_hash text NOT NULL CHECK (pa_is_sha256(source_bundle_hash)),
  activation_kind text CHECK (activation_kind IS NULL OR activation_kind IN ('standard','rollback')),
  activation_id text REFERENCES pa_doctrine_corpus_activations(activation_id),
  activation_sequence bigint CHECK (activation_sequence IS NULL OR activation_sequence > 0),
  snapshot_id text REFERENCES pa_doctrine_corpus_snapshots(snapshot_id),
  observed_doctrine_count integer
    CHECK (observed_doctrine_count IS NULL OR observed_doctrine_count >= 0),
  observed_doctrine_context_byte_length integer CHECK (
    observed_doctrine_context_byte_length IS NULL
    OR observed_doctrine_context_byte_length >= 0
  ),
  error_codes jsonb NOT NULL CHECK (jsonb_typeof(error_codes)='array'),
  operator_principal text NOT NULL
    CHECK (operator_principal='local:phase2-operator'),
  record jsonb NOT NULL CHECK (jsonb_typeof(record)='object'),
  CHECK (record ?& ARRAY[
    'schemaVersion','assemblyRulesVersion','sourceScope','caseHash',
    'sourceBundleHash','activationKind','activationId','activationSequence',
    'snapshotId','observedDoctrineCount','observedDoctrineContextByteLength',
    'errorCodes','operatorPrincipal','failureId'
  ]),
  CHECK ((record - ARRAY[
    'schemaVersion','assemblyRulesVersion','sourceScope','caseHash',
    'sourceBundleHash','activationKind','activationId','activationSequence',
    'snapshotId','observedDoctrineCount','observedDoctrineContextByteLength',
    'errorCodes','operatorPrincipal','failureId'
  ])='{}'::jsonb),
  CHECK (pa_required_text_equal(record->>'schemaVersion','policy-assembly-failure.v1')),
  CHECK (pa_required_text_equal(record->>'assemblyRulesVersion',assembly_rules_version)),
  CHECK (pa_required_text_equal(record->>'sourceScope','synthetic_fixture_only')),
  CHECK (pa_required_text_equal(record->>'caseHash',case_hash)),
  CHECK (pa_required_text_equal(record->>'sourceBundleHash',source_bundle_hash)),
  CHECK (record->>'activationKind' IS NOT DISTINCT FROM activation_kind),
  CHECK (record->>'activationId' IS NOT DISTINCT FROM activation_id),
  CHECK ((record->>'activationSequence')::bigint IS NOT DISTINCT FROM activation_sequence),
  CHECK (record->>'snapshotId' IS NOT DISTINCT FROM snapshot_id),
  CHECK ((record->>'observedDoctrineCount')::integer IS NOT DISTINCT FROM observed_doctrine_count),
  CHECK ((record->>'observedDoctrineContextByteLength')::integer IS NOT DISTINCT FROM observed_doctrine_context_byte_length),
  CHECK (record->'errorCodes'=error_codes),
  CHECK (pa_required_text_equal(record->>'operatorPrincipal',operator_principal)),
  CHECK (failure_id='sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record-'failureId'),'UTF8'
  )),'hex'))
);

CREATE FUNCTION pa_serialize_policy_assembly_authority() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  LOCK TABLE pa_doctrine_corpus_activations IN SHARE ROW EXCLUSIVE MODE;
END;
$$;

CREATE FUNCTION pa_lock_policy_assembly_authority() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  PERFORM pa_serialize_policy_assembly_authority();
  RETURN NEW;
END;
$$;

CREATE TRIGGER pa_policy_assembly_authority_lock
BEFORE INSERT ON pa_policy_assemblies FOR EACH ROW
EXECUTE FUNCTION pa_lock_policy_assembly_authority();
CREATE TRIGGER pa_policy_assembly_failure_authority_lock
BEFORE INSERT ON pa_policy_assembly_failures FOR EACH ROW
EXECUTE FUNCTION pa_lock_policy_assembly_authority();

CREATE FUNCTION pa_validate_policy_assembly() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  bound_input jsonb;
  bound_binding pa_policy_assembly_bindings%ROWTYPE;
  expected_manifest jsonb;
  expected_doctrine jsonb;
  expected_context jsonb;
  expected_context_hash text;
  expected_context_bytes integer;
  bound_count integer;
BEGIN
  IF NEW.source_bundle_hash IS DISTINCT FROM
      pa_phase2_source_bundle_hash(NEW.case_hash) THEN
    RAISE EXCEPTION 'Policy Assembly source bundle hash mismatch';
  END IF;
  IF NEW.activation_sequence IS DISTINCT FROM (
    SELECT max(activation_sequence) FROM pa_doctrine_corpus_activations
  ) THEN
    RAISE EXCEPTION 'Policy Assembly must bind the current activation';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pa_policy_assembly_failures
    WHERE case_hash=NEW.case_hash AND activation_id=NEW.activation_id
  ) THEN
    RAISE EXCEPTION 'Policy Assembly success conflicts with a terminal failure';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pa_doctrine_ingestion_runs AS run
    JOIN pa_doctrine_quality_reports AS report
      ON report.run_id=run.run_id
     AND report.snapshot_id=run.snapshot_id
     AND report.profile_hash=run.profile_hash
    WHERE run.run_id=NEW.run_id
      AND run.snapshot_id=NEW.snapshot_id
      AND run.profile_hash=NEW.profile_hash
      AND run.status='succeeded'
      AND report.quality_report_hash=NEW.quality_report_hash
      AND report.status='passed'
  ) OR EXISTS (
    SELECT 1
    FROM pa_doctrine_corpus_entries AS entry
    WHERE entry.snapshot_id=NEW.snapshot_id
      AND NOT pa_doctrine_source_is_phase4a_allowed(
        entry.source_id,entry.source_content_hash
      )
  ) OR EXISTS (
    SELECT 1
    FROM pa_doctrine_corpus_entries AS entry
    JOIN pa_doctrine_retirements AS retirement
      ON retirement.doctrine_id=entry.doctrine_id
    WHERE entry.snapshot_id=NEW.snapshot_id
  ) THEN
    RAISE EXCEPTION 'Policy Assembly current corpus is ineligible';
  END IF;

  SELECT binding.* INTO bound_binding
  FROM pa_policy_assembly_bindings AS binding
  WHERE binding.assembly_id=NEW.assembly_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Policy Assembly Case/input/chart binding is missing';
  END IF;
  SELECT input.record INTO bound_input
  FROM pa_policy_inputs AS input
  WHERE input.input_hash=bound_binding.input_hash;
  IF bound_input IS DISTINCT FROM NEW.record->'policyInput' THEN
    RAISE EXCEPTION 'Policy Assembly policy input record mismatch';
  END IF;
  IF NEW.record#>>'{charts,context,metadataId}' IS DISTINCT FROM
      bound_binding.context_metadata_id
    OR NEW.record#>>'{charts,context,artifactId}' IS DISTINCT FROM
      bound_binding.context_artifact_id
    OR NEW.record#>>'{charts,context,contentHash}' IS DISTINCT FROM
      bound_binding.context_content_hash
    OR NEW.record#>>'{charts,detail,metadataId}' IS DISTINCT FROM
      bound_binding.detail_metadata_id
    OR NEW.record#>>'{charts,detail,artifactId}' IS DISTINCT FROM
      bound_binding.detail_artifact_id
    OR NEW.record#>>'{charts,detail,contentHash}' IS DISTINCT FROM
      bound_binding.detail_content_hash THEN
    RAISE EXCEPTION 'Policy Assembly chart binding mismatch';
  END IF;

  SELECT
    count(binding.assembly_id)::integer,
    jsonb_agg(jsonb_build_object(
      'doctrineId',binding.doctrine_id,
      'ragRecordHash',binding.rag_record_hash
    ) ORDER BY binding.doctrine_index),
    jsonb_agg(entry.record->'ragRecord' ORDER BY binding.doctrine_index)
  INTO bound_count,expected_manifest,expected_doctrine
  FROM pa_policy_assembly_doctrine_bindings AS binding
  JOIN pa_doctrine_corpus_entries AS entry
    ON entry.snapshot_id=binding.snapshot_id
   AND entry.doctrine_id=binding.doctrine_id
   AND entry.rag_record_hash=binding.rag_record_hash
  WHERE binding.assembly_id=NEW.assembly_id;
  IF bound_count NOT BETWEEN 1 AND 32
    OR expected_manifest IS DISTINCT FROM NEW.record->'doctrineManifest'
    OR expected_doctrine IS DISTINCT FROM NEW.record#>'{policyInput,doctrine}' THEN
    RAISE EXCEPTION 'Policy Assembly Doctrine manifest is incomplete or out of order';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM generate_series(0,bound_count-1) AS expected(doctrine_index)
    LEFT JOIN pa_policy_assembly_doctrine_bindings AS actual
      ON actual.assembly_id=NEW.assembly_id
     AND actual.doctrine_index=expected.doctrine_index
    WHERE actual.assembly_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Policy Assembly Doctrine indexes are not contiguous';
  END IF;

  expected_context := jsonb_build_object(
    'schemaVersion','policy-doctrine-context.v1',
    'doctrine',expected_doctrine
  );
  expected_context_hash := 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(expected_context),'UTF8'
  )),'hex');
  expected_context_bytes := octet_length(convert_to(
    pa_canonical_json(expected_context),'UTF8'
  ));
  IF NEW.doctrine_context_hash IS DISTINCT FROM expected_context_hash
    OR NEW.doctrine_context_byte_length IS DISTINCT FROM expected_context_bytes THEN
    RAISE EXCEPTION 'Policy Assembly Doctrine context identity mismatch';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER pa_policy_assembly_complete
AFTER INSERT ON pa_policy_assemblies
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION pa_validate_policy_assembly();

CREATE FUNCTION pa_validate_policy_assembly_failure() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_activation pa_doctrine_corpus_activations%ROWTYPE;
  actual_count integer;
  expected_context jsonb;
  expected_bytes integer;
  code text;
BEGIN
  IF NEW.source_bundle_hash IS DISTINCT FROM
      pa_phase2_source_bundle_hash(NEW.case_hash) THEN
    RAISE EXCEPTION 'Policy Assembly failure source bundle hash mismatch';
  END IF;
  IF jsonb_array_length(NEW.error_codes) <> 1 THEN
    RAISE EXCEPTION 'Policy Assembly failure requires one V1 terminal code';
  END IF;
  code := NEW.error_codes->>0;
  SELECT activation.* INTO current_activation
  FROM pa_doctrine_corpus_activations AS activation
  ORDER BY activation.activation_sequence DESC
  LIMIT 1;

  IF code='ACTIVATION_UNAVAILABLE' THEN
    IF FOUND OR NEW.activation_id IS NOT NULL OR NEW.activation_kind IS NOT NULL
      OR NEW.activation_sequence IS NOT NULL OR NEW.snapshot_id IS NOT NULL
      OR NEW.observed_doctrine_count IS NOT NULL
      OR NEW.observed_doctrine_context_byte_length IS NOT NULL THEN
      RAISE EXCEPTION 'ACTIVATION_UNAVAILABLE failure shape mismatch';
    END IF;
    RETURN NEW;
  END IF;

  IF NOT FOUND
    OR NEW.activation_id IS DISTINCT FROM current_activation.activation_id
    OR NEW.activation_kind IS DISTINCT FROM current_activation.activation_kind
    OR NEW.activation_sequence IS DISTINCT FROM current_activation.activation_sequence
    OR NEW.snapshot_id IS DISTINCT FROM current_activation.snapshot_id THEN
    RAISE EXCEPTION 'Policy Assembly failure must bind the current activation';
  END IF;

  SELECT count(*)::integer INTO actual_count
  FROM pa_doctrine_corpus_entries
  WHERE snapshot_id=NEW.snapshot_id;

  IF code='ACTIVE_CORPUS_INELIGIBLE' THEN
    IF NEW.observed_doctrine_count IS NOT NULL
      OR NEW.observed_doctrine_context_byte_length IS NOT NULL
      OR NOT (
        EXISTS (
          SELECT 1
          FROM pa_doctrine_corpus_entries AS entry
          WHERE entry.snapshot_id=NEW.snapshot_id
            AND NOT pa_doctrine_source_is_phase4a_allowed(
              entry.source_id,entry.source_content_hash
            )
        )
        OR EXISTS (
          SELECT 1
          FROM pa_doctrine_corpus_entries AS entry
          JOIN pa_doctrine_retirements AS retirement
            ON retirement.doctrine_id=entry.doctrine_id
          WHERE entry.snapshot_id=NEW.snapshot_id
        )
        OR NOT EXISTS (
          SELECT 1
          FROM pa_doctrine_ingestion_runs AS run
          JOIN pa_doctrine_quality_reports AS report
            ON report.run_id=run.run_id
          WHERE run.run_id=current_activation.run_id
            AND run.status='succeeded'
            AND report.quality_report_hash=current_activation.quality_report_hash
            AND report.status='passed'
        )
      ) THEN
      RAISE EXCEPTION 'ACTIVE_CORPUS_INELIGIBLE failure shape mismatch';
    END IF;
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pa_policy_assemblies
    WHERE case_hash=NEW.case_hash AND activation_id=NEW.activation_id
  ) THEN
    RAISE EXCEPTION 'Policy Assembly bounded failure conflicts with an existing success';
  END IF;

  IF code='DOCTRINE_COUNT_EXCEEDED' THEN
    IF actual_count <= 32
      OR NEW.observed_doctrine_count IS DISTINCT FROM actual_count
      OR NEW.observed_doctrine_context_byte_length IS NOT NULL THEN
      RAISE EXCEPTION 'DOCTRINE_COUNT_EXCEEDED failure evidence mismatch';
    END IF;
    RETURN NEW;
  END IF;

  IF code='DOCTRINE_CONTEXT_BYTES_EXCEEDED' THEN
    SELECT jsonb_build_object(
      'schemaVersion','policy-doctrine-context.v1',
      'doctrine',jsonb_agg(entry.record->'ragRecord' ORDER BY entry.entry_index)
    ) INTO expected_context
    FROM pa_doctrine_corpus_entries AS entry
    WHERE entry.snapshot_id=NEW.snapshot_id;
    expected_bytes := octet_length(convert_to(
      pa_canonical_json(expected_context),'UTF8'
    ));
    IF actual_count NOT BETWEEN 1 AND 32
      OR expected_bytes <= 524288
      OR NEW.observed_doctrine_count IS DISTINCT FROM actual_count
      OR NEW.observed_doctrine_context_byte_length IS DISTINCT FROM expected_bytes THEN
      RAISE EXCEPTION 'DOCTRINE_CONTEXT_BYTES_EXCEEDED failure evidence mismatch';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Policy Assembly failure code is unsupported';
END;
$$;

CREATE TRIGGER pa_policy_assembly_failure_validate
BEFORE INSERT ON pa_policy_assembly_failures FOR EACH ROW
EXECUTE FUNCTION pa_validate_policy_assembly_failure();

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'pa_policy_assemblies','pa_policy_assembly_bindings',
    'pa_policy_assembly_doctrine_bindings','pa_policy_assembly_failures'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_immutable BEFORE UPDATE OR DELETE ON %I '
      'FOR EACH ROW EXECUTE FUNCTION pa_reject_immutable_mutation()',
      table_name,table_name
    );
    EXECUTE format(
      'CREATE TRIGGER %I_immutable_truncate BEFORE TRUNCATE ON %I '
      'FOR EACH STATEMENT EXECUTE FUNCTION pa_reject_immutable_mutation()',
      table_name,table_name
    );
  END LOOP;
END;
$$;

COMMIT;
