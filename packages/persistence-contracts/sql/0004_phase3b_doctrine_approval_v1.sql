BEGIN;

CREATE TABLE pa_doctrine_proposals (
  proposal_hash text PRIMARY KEY CHECK (pa_is_sha256(proposal_hash)),
  doctrine_id text NOT NULL UNIQUE,
  source_id text NOT NULL,
  source_content_hash text NOT NULL CHECK (pa_is_sha256(source_content_hash)),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  UNIQUE (proposal_hash, doctrine_id, source_id, source_content_hash),
  CHECK (record ?& ARRAY[
    'schemaVersion', 'proposalHash', 'source', 'doctrineUnit', 'sourceLocator'
  ]),
  CHECK ((record - ARRAY[
    'schemaVersion', 'proposalHash', 'source', 'doctrineUnit', 'sourceLocator'
  ]) = '{}'::jsonb),
  CHECK ((record->'source') ?& ARRAY[
    'sourceId', 'sourceType', 'title', 'urlOrLocalRef', 'contentHash', 'private'
  ]),
  CHECK (((record->'source') - ARRAY[
    'sourceId', 'sourceType', 'title', 'urlOrLocalRef', 'contentHash', 'private'
  ]) = '{}'::jsonb),
  CHECK ((record->'doctrineUnit') ?& ARRAY[
    'doctrineId', 'sourceId', 'concept', 'rule', 'appliesWhen', 'avoidWhen',
    'decisionEffect', 'status'
  ]),
  CHECK (((record->'doctrineUnit') - ARRAY[
    'doctrineId', 'sourceId', 'concept', 'rule', 'appliesWhen', 'avoidWhen',
    'decisionEffect', 'status'
  ]) = '{}'::jsonb),
  CHECK (proposal_hash = 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record - 'proposalHash'), 'UTF8'
  )), 'hex')),
  CHECK (pa_required_text_equal(
    record->>'schemaVersion', 'doctrine-proposal-bundle.v1'
  )),
  CHECK (pa_required_text_equal(record->>'proposalHash', proposal_hash)),
  CHECK (pa_required_text_equal(record#>>'{doctrineUnit,doctrineId}', doctrine_id)),
  CHECK (pa_required_text_equal(record#>>'{doctrineUnit,sourceId}', source_id)),
  CHECK (pa_required_text_equal(record#>>'{source,sourceId}', source_id)),
  CHECK (pa_required_text_equal(record#>>'{source,contentHash}', source_content_hash)),
  CHECK (pa_required_text_equal(record#>>'{source,private}', 'false')),
  CHECK ((record#>>'{source,sourceType}' IN (
    'brooks_website', 'official_youtube', 'reviewed_transcript'
  )) IS TRUE),
  CHECK ((record#>>'{source,urlOrLocalRef}' ~ '^https://[^[:space:]]+$') IS TRUE),
  CHECK (pa_required_text_equal(record#>>'{doctrineUnit,status}', 'draft')),
  CHECK (length(record->>'sourceLocator') BETWEEN 1 AND 600)
);

CREATE TABLE pa_doctrine_approvals (
  approval_hash text PRIMARY KEY CHECK (pa_is_sha256(approval_hash)),
  proposal_hash text NOT NULL UNIQUE CHECK (pa_is_sha256(proposal_hash)),
  doctrine_id text NOT NULL UNIQUE,
  source_id text NOT NULL,
  source_content_hash text NOT NULL CHECK (pa_is_sha256(source_content_hash)),
  approver_principal text NOT NULL CHECK (
    approver_principal IN ('local:phase2-operator', 'local:calvin-reviewer')
  ),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  UNIQUE (approval_hash, proposal_hash, doctrine_id),
  FOREIGN KEY (proposal_hash, doctrine_id, source_id, source_content_hash)
    REFERENCES pa_doctrine_proposals
      (proposal_hash, doctrine_id, source_id, source_content_hash),
  CHECK (record ?& ARRAY[
    'schemaVersion', 'approvalHash', 'proposalHash', 'doctrineId', 'sourceId',
    'sourceContentHash', 'approverPrincipal'
  ]),
  CHECK ((record - ARRAY[
    'schemaVersion', 'approvalHash', 'proposalHash', 'doctrineId', 'sourceId',
    'sourceContentHash', 'approverPrincipal'
  ]) = '{}'::jsonb),
  CHECK (approval_hash = 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record - 'approvalHash'), 'UTF8'
  )), 'hex')),
  CHECK (pa_required_text_equal(record->>'schemaVersion', 'doctrine-approval.v1')),
  CHECK (pa_required_text_equal(record->>'approvalHash', approval_hash)),
  CHECK (pa_required_text_equal(record->>'proposalHash', proposal_hash)),
  CHECK (pa_required_text_equal(record->>'doctrineId', doctrine_id)),
  CHECK (pa_required_text_equal(record->>'sourceId', source_id)),
  CHECK (pa_required_text_equal(record->>'sourceContentHash', source_content_hash)),
  CHECK (pa_required_text_equal(record->>'approverPrincipal', approver_principal))
);

CREATE TABLE pa_doctrine_retirements (
  retirement_hash text PRIMARY KEY CHECK (pa_is_sha256(retirement_hash)),
  approval_hash text NOT NULL UNIQUE CHECK (pa_is_sha256(approval_hash)),
  proposal_hash text NOT NULL UNIQUE CHECK (pa_is_sha256(proposal_hash)),
  doctrine_id text NOT NULL UNIQUE,
  retired_by_principal text NOT NULL CHECK (
    retired_by_principal IN ('local:phase2-operator', 'local:calvin-reviewer')
  ),
  record jsonb NOT NULL CHECK (jsonb_typeof(record) = 'object'),
  FOREIGN KEY (approval_hash, proposal_hash, doctrine_id)
    REFERENCES pa_doctrine_approvals (approval_hash, proposal_hash, doctrine_id),
  CHECK (record ?& ARRAY[
    'schemaVersion', 'retirementHash', 'proposalHash', 'approvalHash',
    'doctrineId', 'retiredByPrincipal', 'reason'
  ]),
  CHECK ((record - ARRAY[
    'schemaVersion', 'retirementHash', 'proposalHash', 'approvalHash',
    'doctrineId', 'retiredByPrincipal', 'reason'
  ]) = '{}'::jsonb),
  CHECK (retirement_hash = 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record - 'retirementHash'), 'UTF8'
  )), 'hex')),
  CHECK (pa_required_text_equal(
    record->>'schemaVersion', 'doctrine-retirement.v1'
  )),
  CHECK (pa_required_text_equal(record->>'retirementHash', retirement_hash)),
  CHECK (pa_required_text_equal(record->>'proposalHash', proposal_hash)),
  CHECK (pa_required_text_equal(record->>'approvalHash', approval_hash)),
  CHECK (pa_required_text_equal(record->>'doctrineId', doctrine_id)),
  CHECK (pa_required_text_equal(
    record->>'retiredByPrincipal', retired_by_principal
  )),
  CHECK (length(record->>'reason') BETWEEN 1 AND 400)
);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'pa_doctrine_proposals',
    'pa_doctrine_approvals',
    'pa_doctrine_retirements'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I_immutable BEFORE UPDATE OR DELETE ON %I '
      'FOR EACH ROW EXECUTE FUNCTION pa_reject_immutable_mutation()',
      table_name, table_name
    );
    EXECUTE format(
      'CREATE TRIGGER %I_immutable_truncate BEFORE TRUNCATE ON %I '
      'FOR EACH STATEMENT EXECUTE FUNCTION pa_reject_immutable_mutation()',
      table_name, table_name
    );
  END LOOP;
END;
$$;

COMMIT;
