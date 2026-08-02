BEGIN;

CREATE FUNCTION pa_is_sha256(value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT value ~ '^sha256:[0-9a-f]{64}$'
$$;

CREATE FUNCTION pa_required_text_equal(actual text, expected text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT actual IS NOT NULL AND actual = expected
$$;

CREATE FUNCTION pa_reject_immutable_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'immutable table % rejects %', TG_TABLE_NAME, TG_OP
    USING ERRCODE = '55000';
END;
$$;

CREATE TABLE pa_policy_cases (
  case_hash text PRIMARY KEY CHECK (pa_is_sha256(case_hash)),
  case_id text NOT NULL UNIQUE,
  policy_stream_id text NOT NULL,
  last_visible_bar_id text NOT NULL,
  decision_point_sequence bigint NOT NULL CHECK (decision_point_sequence >= 0),
  bar_duration_seconds integer NOT NULL CHECK (bar_duration_seconds = 300),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  UNIQUE (policy_stream_id, last_visible_bar_id),
  UNIQUE (policy_stream_id, decision_point_sequence),
  CHECK (pa_required_text_equal(record->>'schemaVersion', 'brooks-policy-case.v1')),
  CHECK (pa_required_text_equal(record->>'caseHash', case_hash)),
  CHECK (pa_required_text_equal(record->>'caseId', case_id)),
  CHECK (pa_required_text_equal(record->>'policyStreamId', policy_stream_id)),
  CHECK (pa_required_text_equal(record->>'lastVisibleBarId', last_visible_bar_id)),
  CHECK (pa_required_text_equal(
    record->>'barDurationSeconds', bar_duration_seconds::text
  )),
  CHECK (pa_required_text_equal(
    record->'bars'->-1->>'sequence', decision_point_sequence::text
  ))
);

CREATE TABLE pa_policy_inputs (
  input_hash text PRIMARY KEY CHECK (pa_is_sha256(input_hash)),
  context_content_hash text NOT NULL CHECK (pa_is_sha256(context_content_hash)),
  detail_content_hash text NOT NULL CHECK (pa_is_sha256(detail_content_hash)),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  UNIQUE (input_hash, context_content_hash, detail_content_hash),
  CHECK (pa_required_text_equal(record->>'schemaVersion', 'brooks-policy-input.v1')),
  CHECK (pa_required_text_equal(record->>'inputHash', input_hash)),
  CHECK (pa_required_text_equal(
    record#>>'{charts,context,contentHash}', context_content_hash
  )),
  CHECK (pa_required_text_equal(
    record#>>'{charts,detail,contentHash}', detail_content_hash
  ))
);

CREATE TABLE pa_chart_artifact_metadata (
  metadata_id text PRIMARY KEY CHECK (pa_is_sha256(metadata_id)),
  artifact_id text NOT NULL CHECK (pa_is_sha256(artifact_id)),
  source_case_hash text NOT NULL REFERENCES pa_policy_cases(case_hash),
  anonymous_market_hash text NOT NULL CHECK (pa_is_sha256(anonymous_market_hash)),
  panel text NOT NULL CHECK (panel IN ('context', 'detail')),
  renderer_id text NOT NULL,
  renderer_runtime text NOT NULL,
  renderer_platform text NOT NULL,
  render_input_hash text NOT NULL CHECK (pa_is_sha256(render_input_hash)),
  content_hash text NOT NULL CHECK (pa_is_sha256(content_hash)),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  UNIQUE (source_case_hash, panel, render_input_hash),
  -- This redundant-looking key is the target that binds Case, panel, and bytes.
  UNIQUE (metadata_id, source_case_hash, panel, content_hash),
  CHECK (pa_required_text_equal(
    record->>'schemaVersion', 'anonymous-chart-artifact-metadata.v1'
  )),
  CHECK (pa_required_text_equal(record->>'metadataId', metadata_id)),
  CHECK (pa_required_text_equal(record->>'artifactId', artifact_id)),
  CHECK (pa_required_text_equal(record->>'sourceCaseHash', source_case_hash)),
  CHECK (pa_required_text_equal(
    record->>'anonymousMarketHash', anonymous_market_hash
  )),
  CHECK (pa_required_text_equal(record->>'panel', panel)),
  CHECK (pa_required_text_equal(record->>'rendererId', renderer_id)),
  CHECK (pa_required_text_equal(record->>'rendererRuntime', renderer_runtime)),
  CHECK (pa_required_text_equal(record->>'rendererPlatform', renderer_platform)),
  CHECK (pa_required_text_equal(record->>'renderInputHash', render_input_hash)),
  CHECK (pa_required_text_equal(record->>'contentHash', content_hash))
);

CREATE TABLE pa_case_policy_inputs (
  case_hash text NOT NULL REFERENCES pa_policy_cases(case_hash),
  input_hash text NOT NULL,
  context_metadata_id text NOT NULL,
  context_panel text NOT NULL CHECK (context_panel = 'context'),
  context_content_hash text NOT NULL CHECK (pa_is_sha256(context_content_hash)),
  detail_metadata_id text NOT NULL,
  detail_panel text NOT NULL CHECK (detail_panel = 'detail'),
  detail_content_hash text NOT NULL CHECK (pa_is_sha256(detail_content_hash)),
  PRIMARY KEY (case_hash, input_hash),
  FOREIGN KEY (input_hash, context_content_hash, detail_content_hash)
    REFERENCES pa_policy_inputs(
      input_hash, context_content_hash, detail_content_hash
    ),
  FOREIGN KEY (
    context_metadata_id, case_hash, context_panel, context_content_hash
  ) REFERENCES pa_chart_artifact_metadata(
    metadata_id, source_case_hash, panel, content_hash
  ),
  FOREIGN KEY (
    detail_metadata_id, case_hash, detail_panel, detail_content_hash
  ) REFERENCES pa_chart_artifact_metadata(
    metadata_id, source_case_hash, panel, content_hash
  )
);

CREATE TABLE pa_model_runs (
  model_run_id text PRIMARY KEY CHECK (pa_is_sha256(model_run_id)),
  call_id text NOT NULL UNIQUE CHECK (pa_is_sha256(call_id)),
  case_hash text NOT NULL,
  input_hash text NOT NULL,
  payload_hash text NOT NULL CHECK (pa_is_sha256(payload_hash)),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  FOREIGN KEY (case_hash, input_hash)
    REFERENCES pa_case_policy_inputs(case_hash, input_hash),
  UNIQUE (model_run_id, call_id, payload_hash),
  UNIQUE (model_run_id, call_id, case_hash, input_hash, payload_hash),
  CHECK (pa_required_text_equal(record->>'schemaVersion', 'model-run.v1')),
  CHECK (pa_required_text_equal(record->>'modelRunId', model_run_id)),
  CHECK (pa_required_text_equal(record->>'callId', call_id)),
  CHECK (pa_required_text_equal(record->>'caseHash', case_hash)),
  CHECK (pa_required_text_equal(record->>'inputHash', input_hash)),
  CHECK (pa_required_text_equal(record->>'payloadHash', payload_hash))
);

CREATE TABLE pa_provider_attempts (
  attempt_id text PRIMARY KEY CHECK (pa_is_sha256(attempt_id)),
  attempt_key text NOT NULL UNIQUE CHECK (pa_is_sha256(attempt_key)),
  model_run_id text NOT NULL,
  call_id text NOT NULL,
  attempt_index integer NOT NULL CHECK (attempt_index >= 0),
  request_hash text NOT NULL CHECK (pa_is_sha256(request_hash)),
  status text NOT NULL CHECK (
    status IN ('response_received', 'timeout', 'transport_error')
  ),
  response_hash text CHECK (response_hash IS NULL OR pa_is_sha256(response_hash)),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  UNIQUE (model_run_id, attempt_index),
  -- This key anchors the audit FK to the exact received response bytes.
  UNIQUE (attempt_id, model_run_id, call_id, response_hash),
  FOREIGN KEY (model_run_id, call_id, request_hash)
    REFERENCES pa_model_runs(model_run_id, call_id, payload_hash),
  CHECK (
    (status = 'response_received' AND response_hash IS NOT NULL) OR
    (status IN ('timeout', 'transport_error') AND response_hash IS NULL)
  ),
  CHECK (pa_required_text_equal(record->>'schemaVersion', 'provider-attempt.v1')),
  CHECK (pa_required_text_equal(record->>'attemptId', attempt_id)),
  CHECK (pa_required_text_equal(record->>'attemptKey', attempt_key)),
  CHECK (pa_required_text_equal(record->>'modelRunId', model_run_id)),
  CHECK (pa_required_text_equal(record->>'callId', call_id)),
  CHECK (pa_required_text_equal(
    record->>'attemptIndex', attempt_index::text
  )),
  CHECK (pa_required_text_equal(record->>'requestHash', request_hash)),
  CHECK (pa_required_text_equal(record->>'status', status)),
  CHECK (record ? 'responseHash'),
  CHECK (record->>'responseHash' IS NOT DISTINCT FROM response_hash)
);

CREATE TABLE pa_model_run_audits (
  audit_id text PRIMARY KEY CHECK (pa_is_sha256(audit_id)),
  model_run_id text NOT NULL,
  call_id text NOT NULL,
  attempt_id text NOT NULL UNIQUE,
  case_hash text NOT NULL,
  input_hash text NOT NULL,
  payload_hash text NOT NULL,
  raw_output_hash text NOT NULL CHECK (pa_is_sha256(raw_output_hash)),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  FOREIGN KEY (model_run_id, call_id, case_hash, input_hash, payload_hash)
    REFERENCES pa_model_runs(
      model_run_id, call_id, case_hash, input_hash, payload_hash
    ),
  FOREIGN KEY (attempt_id, model_run_id, call_id, raw_output_hash)
    REFERENCES pa_provider_attempts(
      attempt_id, model_run_id, call_id, response_hash
    ),
  CHECK (pa_required_text_equal(record->>'schemaVersion', 'model-run-audit.v1')),
  CHECK (pa_required_text_equal(record->>'auditId', audit_id)),
  CHECK (pa_required_text_equal(record->>'modelRunId', model_run_id)),
  CHECK (pa_required_text_equal(record->>'callId', call_id)),
  CHECK (pa_required_text_equal(record->>'attemptId', attempt_id)),
  CHECK (pa_required_text_equal(record->>'caseHash', case_hash)),
  CHECK (pa_required_text_equal(record->>'inputHash', input_hash)),
  CHECK (pa_required_text_equal(record->>'payloadHash', payload_hash)),
  CHECK (pa_required_text_equal(record->>'rawOutputHash', raw_output_hash))
);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'pa_policy_cases',
    'pa_policy_inputs',
    'pa_case_policy_inputs',
    'pa_chart_artifact_metadata',
    'pa_model_runs',
    'pa_provider_attempts',
    'pa_model_run_audits'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_immutable BEFORE UPDATE OR DELETE ON %I '
      'FOR EACH ROW EXECUTE FUNCTION pa_reject_immutable_mutation()',
      table_name,
      table_name
    );
    EXECUTE format(
      'CREATE TRIGGER %I_immutable_truncate BEFORE TRUNCATE ON %I '
      'FOR EACH STATEMENT EXECUTE FUNCTION pa_reject_immutable_mutation()',
      table_name,
      table_name
    );
  END LOOP;
END;
$$;

COMMIT;
