BEGIN;

CREATE FUNCTION pa_canonical_json(value jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  value_type text := jsonb_typeof(value);
BEGIN
  IF value_type = 'object' THEN
    RETURN COALESCE(
      (
        SELECT '{' || string_agg(
          to_jsonb(entry.key)::text || ':' || pa_canonical_json(entry.value),
          ',' ORDER BY entry.key COLLATE "C"
        ) || '}'
        FROM jsonb_each(value) AS entry
      ),
      '{}'
    );
  END IF;
  IF value_type = 'array' THEN
    RETURN COALESCE(
      (
        SELECT '[' || string_agg(
          pa_canonical_json(element.value),
          ',' ORDER BY element.ordinality
        ) || ']'
        FROM jsonb_array_elements(value) WITH ORDINALITY AS element(value, ordinality)
      ),
      '[]'
    );
  END IF;
  RETURN value::text;
END;
$$;

ALTER TABLE pa_policy_inputs
  ADD COLUMN last_visible_bar_id text
    GENERATED ALWAYS AS (record#>>'{market,lastVisibleBarId}') STORED,
  ADD COLUMN bar_duration_seconds integer
    GENERATED ALWAYS AS ((record#>>'{market,barDurationSeconds}')::integer) STORED,
  ADD CONSTRAINT pa_policy_inputs_workflow_cutoff_unique
    UNIQUE (input_hash, last_visible_bar_id, bar_duration_seconds);

ALTER TABLE pa_brooks_decisions
  ADD CONSTRAINT pa_brooks_decisions_workflow_parent_unique
  UNIQUE (decision_hash, decision_id, case_hash, case_id, input_hash);

ALTER TABLE pa_calvin_reviews
  ADD COLUMN independent_verdict text
    GENERATED ALWAYS AS (record->>'independentVerdict') STORED,
  ADD CONSTRAINT pa_calvin_reviews_independent_verdict_valid
    CHECK (independent_verdict IN ('long', 'short', 'no_trade', 'uncertain')),
  ADD CONSTRAINT pa_calvin_reviews_workflow_parent_unique
    UNIQUE (review_hash, review_id, decision_hash, decision_id),
  ADD CONSTRAINT pa_calvin_reviews_workflow_verdict_unique
    UNIQUE (
      review_hash, review_id, decision_hash, decision_id, independent_verdict
    );

CREATE TABLE pa_calvin_independent_assessments (
  assessment_hash text PRIMARY KEY CHECK (pa_is_sha256(assessment_hash)),
  assessment_id text NOT NULL UNIQUE,
  decision_hash text NOT NULL UNIQUE CHECK (pa_is_sha256(decision_hash)),
  decision_id text NOT NULL,
  case_hash text NOT NULL CHECK (pa_is_sha256(case_hash)),
  case_id text NOT NULL,
  input_hash text NOT NULL CHECK (pa_is_sha256(input_hash)),
  last_visible_bar_id text NOT NULL,
  bar_duration_seconds integer NOT NULL CHECK (bar_duration_seconds = 300),
  independent_verdict text NOT NULL
    CHECK (independent_verdict IN ('long', 'short', 'no_trade', 'uncertain')),
  reviewer_principal text NOT NULL
    CHECK (reviewer_principal = 'local:calvin-reviewer'),
  protocol_version text NOT NULL
    CHECK (protocol_version = 'calvin-review-workflow.v1'),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  UNIQUE (assessment_hash, assessment_id, decision_hash, decision_id),
  UNIQUE (
    assessment_hash, assessment_id, decision_hash, decision_id,
    independent_verdict
  ),
  FOREIGN KEY (decision_hash, decision_id, case_hash, case_id, input_hash)
    REFERENCES pa_brooks_decisions
      (decision_hash, decision_id, case_hash, case_id, input_hash),
  FOREIGN KEY (input_hash, last_visible_bar_id, bar_duration_seconds)
    REFERENCES pa_policy_inputs (
      input_hash, last_visible_bar_id, bar_duration_seconds
    ),
  CHECK (record ?& ARRAY[
    'schemaVersion', 'assessmentHash', 'assessmentId', 'caseHash', 'caseId',
    'inputHash', 'lastVisibleBarId', 'barDurationSeconds',
    'brooksDecisionId', 'brooksDecisionHash', 'independentVerdict',
    'blindSummary', 'outcomeBlind', 'brooksDecisionContentSeen',
    'reviewerPrincipal', 'protocolVersion'
  ]),
  CHECK ((record - ARRAY[
    'schemaVersion', 'assessmentHash', 'assessmentId', 'caseHash', 'caseId',
    'inputHash', 'lastVisibleBarId', 'barDurationSeconds',
    'brooksDecisionId', 'brooksDecisionHash', 'independentVerdict',
    'blindSummary', 'outcomeBlind', 'brooksDecisionContentSeen',
    'reviewerPrincipal', 'protocolVersion'
  ]) = '{}'::jsonb),
  CHECK (assessment_hash = 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record - 'assessmentHash'), 'UTF8'
  )), 'hex')),
  CHECK (pa_required_text_equal(
    record->>'schemaVersion', 'calvin-independent-assessment.v1'
  )),
  CHECK (pa_required_text_equal(record->>'assessmentHash', assessment_hash)),
  CHECK (pa_required_text_equal(record->>'assessmentId', assessment_id)),
  CHECK (pa_required_text_equal(record->>'brooksDecisionHash', decision_hash)),
  CHECK (pa_required_text_equal(record->>'brooksDecisionId', decision_id)),
  CHECK (pa_required_text_equal(record->>'caseHash', case_hash)),
  CHECK (pa_required_text_equal(record->>'caseId', case_id)),
  CHECK (pa_required_text_equal(record->>'inputHash', input_hash)),
  CHECK (pa_required_text_equal(record->>'lastVisibleBarId', last_visible_bar_id)),
  CHECK ((record->>'barDurationSeconds')::integer = bar_duration_seconds),
  CHECK (pa_required_text_equal(
    record->>'independentVerdict', independent_verdict
  )),
  CHECK (pa_required_text_equal(record->>'reviewerPrincipal', reviewer_principal)),
  CHECK (pa_required_text_equal(record->>'protocolVersion', protocol_version)),
  CHECK (pa_required_text_equal(record->>'outcomeBlind', 'true')),
  CHECK (pa_required_text_equal(record->>'brooksDecisionContentSeen', 'false'))
);

CREATE TABLE pa_decision_reveal_receipts (
  receipt_hash text PRIMARY KEY CHECK (pa_is_sha256(receipt_hash)),
  receipt_id text NOT NULL UNIQUE,
  assessment_hash text NOT NULL UNIQUE CHECK (pa_is_sha256(assessment_hash)),
  assessment_id text NOT NULL,
  decision_hash text NOT NULL UNIQUE CHECK (pa_is_sha256(decision_hash)),
  decision_id text NOT NULL,
  reviewer_principal text NOT NULL
    CHECK (reviewer_principal = 'local:calvin-reviewer'),
  protocol_version text NOT NULL
    CHECK (protocol_version = 'calvin-review-workflow.v1'),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  UNIQUE (receipt_hash, receipt_id, assessment_hash, assessment_id,
          decision_hash, decision_id),
  FOREIGN KEY (assessment_hash, assessment_id, decision_hash, decision_id)
    REFERENCES pa_calvin_independent_assessments
      (assessment_hash, assessment_id, decision_hash, decision_id),
  CHECK (record ?& ARRAY[
    'schemaVersion', 'receiptHash', 'receiptId', 'assessmentId',
    'assessmentHash', 'brooksDecisionId', 'brooksDecisionHash',
    'reviewerPrincipal', 'protocolVersion'
  ]),
  CHECK ((record - ARRAY[
    'schemaVersion', 'receiptHash', 'receiptId', 'assessmentId',
    'assessmentHash', 'brooksDecisionId', 'brooksDecisionHash',
    'reviewerPrincipal', 'protocolVersion'
  ]) = '{}'::jsonb),
  CHECK (receipt_hash = 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record - 'receiptHash'), 'UTF8'
  )), 'hex')),
  CHECK (pa_required_text_equal(
    record->>'schemaVersion', 'decision-reveal-receipt.v1'
  )),
  CHECK (pa_required_text_equal(record->>'receiptHash', receipt_hash)),
  CHECK (pa_required_text_equal(record->>'receiptId', receipt_id)),
  CHECK (pa_required_text_equal(record->>'assessmentHash', assessment_hash)),
  CHECK (pa_required_text_equal(record->>'assessmentId', assessment_id)),
  CHECK (pa_required_text_equal(record->>'brooksDecisionHash', decision_hash)),
  CHECK (pa_required_text_equal(record->>'brooksDecisionId', decision_id)),
  CHECK (pa_required_text_equal(record->>'reviewerPrincipal', reviewer_principal)),
  CHECK (pa_required_text_equal(record->>'protocolVersion', protocol_version))
);

CREATE TABLE pa_calvin_review_workflow_bindings (
  binding_hash text PRIMARY KEY CHECK (pa_is_sha256(binding_hash)),
  binding_id text NOT NULL UNIQUE,
  assessment_hash text NOT NULL UNIQUE CHECK (pa_is_sha256(assessment_hash)),
  assessment_id text NOT NULL,
  receipt_hash text NOT NULL UNIQUE CHECK (pa_is_sha256(receipt_hash)),
  receipt_id text NOT NULL,
  decision_hash text NOT NULL UNIQUE CHECK (pa_is_sha256(decision_hash)),
  decision_id text NOT NULL,
  review_hash text NOT NULL UNIQUE CHECK (pa_is_sha256(review_hash)),
  review_id text NOT NULL,
  independent_verdict text NOT NULL
    CHECK (independent_verdict IN ('long', 'short', 'no_trade', 'uncertain')),
  reviewer_principal text NOT NULL
    CHECK (reviewer_principal = 'local:calvin-reviewer'),
  protocol_version text NOT NULL
    CHECK (protocol_version = 'calvin-review-workflow.v1'),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  FOREIGN KEY (
    assessment_hash, assessment_id, decision_hash, decision_id,
    independent_verdict
  ) REFERENCES pa_calvin_independent_assessments (
    assessment_hash, assessment_id, decision_hash, decision_id,
    independent_verdict
  ),
  FOREIGN KEY (
    receipt_hash, receipt_id, assessment_hash, assessment_id,
    decision_hash, decision_id
  ) REFERENCES pa_decision_reveal_receipts (
    receipt_hash, receipt_id, assessment_hash, assessment_id,
    decision_hash, decision_id
  ),
  FOREIGN KEY (
    review_hash, review_id, decision_hash, decision_id, independent_verdict
  ) REFERENCES pa_calvin_reviews (
    review_hash, review_id, decision_hash, decision_id, independent_verdict
  ),
  CHECK (record ?& ARRAY[
    'schemaVersion', 'bindingHash', 'bindingId', 'assessmentId',
    'assessmentHash', 'revealReceiptId', 'revealReceiptHash',
    'brooksDecisionId', 'brooksDecisionHash', 'calvinReviewId',
    'calvinReviewHash', 'reviewerPrincipal', 'protocolVersion'
  ]),
  CHECK ((record - ARRAY[
    'schemaVersion', 'bindingHash', 'bindingId', 'assessmentId',
    'assessmentHash', 'revealReceiptId', 'revealReceiptHash',
    'brooksDecisionId', 'brooksDecisionHash', 'calvinReviewId',
    'calvinReviewHash', 'reviewerPrincipal', 'protocolVersion'
  ]) = '{}'::jsonb),
  CHECK (binding_hash = 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record - 'bindingHash'), 'UTF8'
  )), 'hex')),
  CHECK (pa_required_text_equal(
    record->>'schemaVersion', 'calvin-review-workflow-binding.v1'
  )),
  CHECK (pa_required_text_equal(record->>'bindingHash', binding_hash)),
  CHECK (pa_required_text_equal(record->>'bindingId', binding_id)),
  CHECK (pa_required_text_equal(record->>'assessmentHash', assessment_hash)),
  CHECK (pa_required_text_equal(record->>'assessmentId', assessment_id)),
  CHECK (pa_required_text_equal(record->>'revealReceiptHash', receipt_hash)),
  CHECK (pa_required_text_equal(record->>'revealReceiptId', receipt_id)),
  CHECK (pa_required_text_equal(record->>'brooksDecisionHash', decision_hash)),
  CHECK (pa_required_text_equal(record->>'brooksDecisionId', decision_id)),
  CHECK (pa_required_text_equal(record->>'calvinReviewHash', review_hash)),
  CHECK (pa_required_text_equal(record->>'calvinReviewId', review_id)),
  CHECK (pa_required_text_equal(record->>'reviewerPrincipal', reviewer_principal)),
  CHECK (pa_required_text_equal(record->>'protocolVersion', protocol_version))
);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'pa_calvin_independent_assessments',
    'pa_decision_reveal_receipts',
    'pa_calvin_review_workflow_bindings'
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
