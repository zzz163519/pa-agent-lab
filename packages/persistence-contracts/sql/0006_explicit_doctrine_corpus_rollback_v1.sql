BEGIN;

ALTER TABLE pa_doctrine_corpus_activations
  DROP CONSTRAINT pa_doctrine_corpus_activations_run_id_quality_report_hash_key,
  DROP CONSTRAINT pa_doctrine_corpus_activations_record_check1,
  DROP CONSTRAINT pa_doctrine_corpus_activations_record_check2,
  DROP CONSTRAINT pa_doctrine_corpus_activations_record_check3;

ALTER TABLE pa_doctrine_corpus_activations
  ADD COLUMN activation_kind text NOT NULL DEFAULT 'standard'
    CHECK (activation_kind IN ('standard','rollback')),
  ADD COLUMN target_activation_id text
    CHECK (target_activation_id IS NULL OR pa_is_sha256(target_activation_id)),
  ADD COLUMN replaces_activation_id text
    CHECK (replaces_activation_id IS NULL OR pa_is_sha256(replaces_activation_id)),
  ADD COLUMN reason_hash text
    CHECK (reason_hash IS NULL OR pa_is_sha256(reason_hash)),
  ADD CONSTRAINT pa_doctrine_corpus_activations_target_activation_fkey
    FOREIGN KEY (target_activation_id)
    REFERENCES pa_doctrine_corpus_activations(activation_id),
  ADD CONSTRAINT pa_doctrine_corpus_activations_replaces_activation_fkey
    FOREIGN KEY (replaces_activation_id)
    REFERENCES pa_doctrine_corpus_activations(activation_id),
  ADD CONSTRAINT pa_doctrine_corpus_activation_kind_shape_check CHECK (
    (activation_kind = 'standard'
      AND target_activation_id IS NULL
      AND replaces_activation_id IS NULL
      AND reason_hash IS NULL)
    OR
    (activation_kind = 'rollback'
      AND target_activation_id IS NOT NULL
      AND replaces_activation_id IS NOT NULL
      AND reason_hash IS NOT NULL
      AND target_activation_id <> replaces_activation_id)
  ),
  ADD CONSTRAINT pa_doctrine_corpus_activation_record_shape_check CHECK (
    (activation_kind = 'standard'
      AND record ?& ARRAY[
        'schemaVersion','activationSequence','runId','snapshotId','profileHash',
        'qualityReportHash','operatorPrincipal','activationId'
      ]
      AND (record - ARRAY[
        'schemaVersion','activationSequence','runId','snapshotId','profileHash',
        'qualityReportHash','operatorPrincipal','activationId'
      ]) = '{}'::jsonb
      AND pa_required_text_equal(
        record->>'schemaVersion','doctrine-corpus-activation.v1'
      ))
    OR
    (activation_kind = 'rollback'
      AND record ?& ARRAY[
        'schemaVersion','activationKind','activationSequence',
        'replacesActivationId','targetActivationId','runId','snapshotId',
        'profileHash','qualityReportHash','reason','reasonHash',
        'operatorPrincipal','activationId'
      ]
      AND (record - ARRAY[
        'schemaVersion','activationKind','activationSequence',
        'replacesActivationId','targetActivationId','runId','snapshotId',
        'profileHash','qualityReportHash','reason','reasonHash',
        'operatorPrincipal','activationId'
      ]) = '{}'::jsonb
      AND pa_required_text_equal(
        record->>'schemaVersion','doctrine-corpus-rollback-activation.v1'
      )
      AND pa_required_text_equal(record->>'activationKind','rollback')
      AND pa_required_text_equal(
        record->>'targetActivationId',target_activation_id
      )
      AND pa_required_text_equal(
        record->>'replacesActivationId',replaces_activation_id
      )
      AND pa_required_text_equal(record->>'reasonHash',reason_hash))
  );

CREATE UNIQUE INDEX pa_doctrine_corpus_activations_standard_run_report_uq
  ON pa_doctrine_corpus_activations(run_id,quality_report_hash)
  WHERE activation_kind = 'standard';

CREATE FUNCTION pa_doctrine_source_is_phase4a_allowed(
  candidate_source_id text,
  candidate_source_content_hash text
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT (candidate_source_id,candidate_source_content_hash) IN (
    ('source:btc-six-aspects-v1','sha256:f1ec149fe8ba929b66836b22b516442b22cb4b7c3fffa260b0250c93b758c372'),
    ('source:btc-professional-pa-trader-v1','sha256:065ae939131da39f74d61d6e4b83a2a426f3dd1f4de6d3ac90e47cd5a43b7b8c'),
    ('source:ask-al-breakouts-2016-09-25','sha256:4728a7b3e24329e9bb58af024c016bd99b7af078f797574b4b67b22ccf500f8b'),
    ('source:ask-al-pullbacks-entering-2016-05-01','sha256:5a6f6262d86dc6f0a9094a60bdf9bddac973361cc4ae72ef16320cb884481bdb'),
    ('source:ask-al-trading-range-breakout-failures-2015-12-27','sha256:2703c5561739179736e4fbcc5b42bbfc7c27dcec85561dc58912687406bd6378'),
    ('source:ask-al-small-pullback-trend-2017-02-05','sha256:e84b0e60cfc574506d58ad214958013704f704efec35a8a3766445c4d3fa3155')
  )
$$;

CREATE OR REPLACE FUNCTION pa_validate_doctrine_activation() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  target_activation pa_doctrine_corpus_activations%ROWTYPE;
  replaced_activation pa_doctrine_corpus_activations%ROWTYPE;
  current_activation_sequence bigint;
  normalized_reason text;
  expected_reason_hash text;
BEGIN
  LOCK TABLE pa_doctrine_corpus_activations IN SHARE ROW EXCLUSIVE MODE;

  IF NOT EXISTS (
    SELECT 1
    FROM pa_doctrine_ingestion_runs AS run
    JOIN pa_doctrine_quality_reports AS report
      ON report.run_id = run.run_id
      AND report.snapshot_id = run.snapshot_id
      AND report.profile_hash = run.profile_hash
    WHERE run.run_id = NEW.run_id
      AND run.snapshot_id = NEW.snapshot_id
      AND run.profile_hash = NEW.profile_hash
      AND run.status = 'succeeded'
      AND report.quality_report_hash = NEW.quality_report_hash
      AND report.status = 'passed'
  ) THEN
    RAISE EXCEPTION
      'Doctrine activation requires an exact succeeded run and passed quality report';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pa_doctrine_corpus_entries AS entry
    WHERE entry.snapshot_id = NEW.snapshot_id
      AND NOT pa_doctrine_source_is_phase4a_allowed(
        entry.source_id,entry.source_content_hash
      )
  ) THEN
    RAISE EXCEPTION
      'Doctrine activation snapshot Source is outside the exact Phase 4A allowlist';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pa_doctrine_corpus_entries AS entry
    JOIN pa_doctrine_retirements AS retirement
      ON retirement.doctrine_id = entry.doctrine_id
    WHERE entry.snapshot_id = NEW.snapshot_id
  ) THEN
    RAISE EXCEPTION 'Doctrine activation snapshot contains a retirement';
  END IF;

  IF NEW.activation_kind = 'standard' THEN
    RETURN NEW;
  END IF;

  SELECT activation.*
  INTO target_activation
  FROM pa_doctrine_corpus_activations AS activation
  WHERE activation.activation_id = NEW.target_activation_id;
  IF NOT FOUND OR target_activation.activation_kind <> 'standard' THEN
    RAISE EXCEPTION 'Doctrine rollback target must be an ordinary activation';
  END IF;

  SELECT activation.*
  INTO replaced_activation
  FROM pa_doctrine_corpus_activations AS activation
  WHERE activation.activation_id = NEW.replaces_activation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Doctrine rollback replaced activation is missing';
  END IF;

  SELECT max(activation_sequence)
  INTO current_activation_sequence
  FROM pa_doctrine_corpus_activations;
  IF replaced_activation.activation_sequence IS DISTINCT FROM
      current_activation_sequence THEN
    RAISE EXCEPTION 'Doctrine rollback must replace the current activation';
  END IF;
  IF target_activation.activation_sequence >=
      replaced_activation.activation_sequence
    OR NEW.activation_sequence <= replaced_activation.activation_sequence THEN
    RAISE EXCEPTION 'Doctrine rollback activation ordering is invalid';
  END IF;

  IF NEW.run_id IS DISTINCT FROM target_activation.run_id
    OR NEW.snapshot_id IS DISTINCT FROM target_activation.snapshot_id
    OR NEW.profile_hash IS DISTINCT FROM target_activation.profile_hash
    OR NEW.quality_report_hash IS DISTINCT FROM
      target_activation.quality_report_hash THEN
    RAISE EXCEPTION 'Doctrine rollback must copy the exact target chain';
  END IF;

  normalized_reason := NEW.record->>'reason';
  IF normalized_reason IS NULL
    OR char_length(normalized_reason) NOT BETWEEN 1 AND 500
    OR normalized_reason IS DISTINCT FROM btrim(normalized_reason)
    OR (normalized_reason ~ '[[:cntrl:]]') IS TRUE
    OR (normalized_reason ~ '[[:space:]]{2,}') IS TRUE THEN
    RAISE EXCEPTION 'Doctrine rollback reason is not normalized or bounded';
  END IF;
  expected_reason_hash := 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(jsonb_build_object(
      'schemaVersion','doctrine-corpus-rollback-reason.v1',
      'reason',normalized_reason
    )), 'UTF8'
  )), 'hex');
  IF NEW.reason_hash IS DISTINCT FROM expected_reason_hash THEN
    RAISE EXCEPTION 'Doctrine rollback reason hash mismatch';
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION pa_serialize_doctrine_retirement() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  LOCK TABLE pa_doctrine_corpus_activations IN SHARE ROW EXCLUSIVE MODE;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pa_doctrine_retirement_serialize_with_activation
BEFORE INSERT ON pa_doctrine_retirements FOR EACH ROW
EXECUTE FUNCTION pa_serialize_doctrine_retirement();

CREATE VIEW pa_doctrine_activation_authority_v1 AS
SELECT
  activation_sequence,
  activation_id,
  activation_kind,
  run_id,
  snapshot_id,
  profile_hash,
  quality_report_hash,
  operator_principal,
  target_activation_id,
  replaces_activation_id,
  reason_hash,
  record
FROM pa_doctrine_corpus_activations;

COMMIT;
