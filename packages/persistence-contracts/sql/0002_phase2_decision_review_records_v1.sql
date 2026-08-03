BEGIN;

ALTER TABLE pa_policy_cases
  ADD CONSTRAINT pa_policy_cases_hash_id_unique UNIQUE (case_hash, case_id);

CREATE TABLE pa_brooks_decisions (
  decision_hash text PRIMARY KEY CHECK (pa_is_sha256(decision_hash)),
  decision_id text NOT NULL UNIQUE,
  case_hash text NOT NULL,
  case_id text NOT NULL,
  input_hash text NOT NULL CHECK (pa_is_sha256(input_hash)),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  UNIQUE (decision_hash, decision_id),
  UNIQUE (case_hash, input_hash),
  FOREIGN KEY (case_hash, case_id)
    REFERENCES pa_policy_cases(case_hash, case_id),
  FOREIGN KEY (case_hash, input_hash)
    REFERENCES pa_case_policy_inputs(case_hash, input_hash),
  CHECK (pa_required_text_equal(record->>'schemaVersion', 'brooks-decision.v1')),
  CHECK (pa_required_text_equal(record->>'decisionHash', decision_hash)),
  CHECK (pa_required_text_equal(record->>'decisionId', decision_id)),
  CHECK (pa_required_text_equal(record->>'caseId', case_id)),
  CHECK (pa_required_text_equal(record->>'inputHash', input_hash))
);

CREATE TABLE pa_calvin_reviews (
  review_hash text PRIMARY KEY CHECK (pa_is_sha256(review_hash)),
  review_id text NOT NULL UNIQUE,
  decision_hash text NOT NULL UNIQUE CHECK (pa_is_sha256(decision_hash)),
  decision_id text NOT NULL,
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  UNIQUE (review_hash, review_id),
  FOREIGN KEY (decision_hash, decision_id)
    REFERENCES pa_brooks_decisions(decision_hash, decision_id),
  CHECK (pa_required_text_equal(record->>'schemaVersion', 'calvin-review.v1')),
  CHECK (pa_required_text_equal(record->>'reviewHash', review_hash)),
  CHECK (pa_required_text_equal(record->>'reviewId', review_id)),
  CHECK (pa_required_text_equal(record->>'reviewedDecisionHash', decision_hash)),
  CHECK (pa_required_text_equal(record->>'brooksDecisionId', decision_id)),
  CHECK (pa_required_text_equal(record->>'scope', 'whole_decision')),
  CHECK (pa_required_text_equal(record->>'outcomeBlind', 'true'))
);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'pa_brooks_decisions',
    'pa_calvin_reviews'
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
