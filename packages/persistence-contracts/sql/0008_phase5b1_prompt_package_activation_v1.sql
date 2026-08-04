BEGIN;

CREATE SEQUENCE pa_prompt_package_activation_sequence_seq AS bigint START WITH 1;

CREATE TABLE pa_prompt_package_manifests (
  package_hash text PRIMARY KEY CHECK (pa_is_sha256(package_hash)),
  package_version text NOT NULL CHECK (package_version='brooks-prompt-package.v1'),
  prompt_hash text NOT NULL CHECK (pa_is_sha256(prompt_hash)),
  prompt_byte_length integer NOT NULL CHECK (prompt_byte_length > 0),
  response_schema_hash text NOT NULL CHECK (pa_is_sha256(response_schema_hash)),
  response_schema_byte_length integer NOT NULL CHECK (response_schema_byte_length > 0),
  output_schema_version text NOT NULL
    CHECK (output_schema_version='brooks-identity-free-response.schema.v1'),
  validator_version text NOT NULL
    CHECK (validator_version='brooks-identity-free-response-validator.v1'),
  record jsonb NOT NULL CHECK (jsonb_typeof(record)='object'),
  UNIQUE (package_hash,prompt_hash,response_schema_hash,output_schema_version,validator_version),
  CHECK (record ?& ARRAY[
    'schemaVersion','packageVersion','prompt','responseSchema',
    'brooksDecisionContractVersion','validatorVersion','packageHash'
  ]),
  CHECK ((record - ARRAY[
    'schemaVersion','packageVersion','prompt','responseSchema',
    'brooksDecisionContractVersion','validatorVersion','packageHash'
  ])='{}'::jsonb),
  CHECK (pa_required_text_equal(
    record->>'schemaVersion','brooks-prompt-package-manifest.v1'
  )),
  CHECK (pa_required_text_equal(record->>'packageVersion',package_version)),
  CHECK (pa_required_text_equal(
    record->>'brooksDecisionContractVersion','brooks-decision.v1'
  )),
  CHECK (pa_required_text_equal(record->>'validatorVersion',validator_version)),
  CHECK (pa_required_text_equal(record#>>'{prompt,mediaType}','text/plain; charset=utf-8')),
  CHECK ((record#>>'{prompt,byteLength}')::integer=prompt_byte_length),
  CHECK (pa_required_text_equal(record#>>'{prompt,contentHash}',prompt_hash)),
  CHECK (pa_required_text_equal(
    record#>>'{responseSchema,mediaType}','application/schema+json'
  )),
  CHECK ((record#>>'{responseSchema,byteLength}')::integer=response_schema_byte_length),
  CHECK (pa_required_text_equal(
    record#>>'{responseSchema,schemaVersion}',output_schema_version
  )),
  CHECK (pa_required_text_equal(
    record#>>'{responseSchema,contentHash}',response_schema_hash
  )),
  CHECK (pa_required_text_equal(record->>'packageHash',package_hash)),
  CHECK (package_hash='sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record-'packageHash'),'UTF8'
  )),'hex'))
);

CREATE TABLE pa_prompt_package_approvals (
  approval_record_hash text PRIMARY KEY CHECK (pa_is_sha256(approval_record_hash)),
  approval_id text NOT NULL UNIQUE,
  package_hash text NOT NULL,
  approved_at text NOT NULL,
  approved_by text NOT NULL CHECK (approved_by='Calvin'),
  record jsonb NOT NULL CHECK (jsonb_typeof(record)='object'),
  UNIQUE (package_hash,approval_record_hash),
  FOREIGN KEY (package_hash) REFERENCES pa_prompt_package_manifests(package_hash),
  CHECK (record ?& ARRAY[
    'schemaVersion','approvalId','packageVersion','packageHash','approvedBy',
    'approvedAt','approvalMethod','approvalScope',
    'phase5b1ImplementationAuthorized','packageActivationPerformed',
    'providerCallsAuthorized','approvalRecordHash'
  ]),
  CHECK ((record - ARRAY[
    'schemaVersion','approvalId','packageVersion','packageHash','approvedBy',
    'approvedAt','approvalMethod','approvalScope',
    'phase5b1ImplementationAuthorized','packageActivationPerformed',
    'providerCallsAuthorized','approvalRecordHash'
  ])='{}'::jsonb),
  CHECK (pa_required_text_equal(
    record->>'schemaVersion','brooks-prompt-package-approval.v1'
  )),
  CHECK (pa_required_text_equal(record->>'approvalId',approval_id)),
  CHECK (pa_required_text_equal(record->>'packageVersion','brooks-prompt-package.v1')),
  CHECK (pa_required_text_equal(record->>'packageHash',package_hash)),
  CHECK (pa_required_text_equal(record->>'approvedBy',approved_by)),
  CHECK (pa_required_text_equal(record->>'approvedAt',approved_at)),
  CHECK (pa_required_text_equal(record->>'approvalMethod','direct-calvin-instruction')),
  CHECK (pa_required_text_equal(record->>'approvalScope','exact-package-content-only')),
  CHECK ((record->'phase5b1ImplementationAuthorized')='false'::jsonb),
  CHECK ((record->'packageActivationPerformed')='false'::jsonb),
  CHECK ((record->'providerCallsAuthorized')='false'::jsonb),
  CHECK (pa_required_text_equal(record->>'approvalRecordHash',approval_record_hash)),
  CHECK (approval_record_hash='sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record-'approvalRecordHash'),'UTF8'
  )),'hex')),
  CHECK (
    package_hash='sha256:b67896d15d5e2542c7bebaeca2b60c67cbb5510ef359efaca7f44e42fa17b0d9'
    AND approval_record_hash='sha256:d1c0ddbac5c14ec2d455de5ba85d0de381f8561dd928c8362207f7c41370389e'
  )
);

CREATE TABLE pa_prompt_package_activations (
  activation_sequence bigint NOT NULL UNIQUE CHECK (activation_sequence > 0),
  activation_id text PRIMARY KEY CHECK (pa_is_sha256(activation_id)),
  activation_kind text NOT NULL CHECK (activation_kind IN ('standard','rollback')),
  package_hash text NOT NULL,
  approval_record_hash text NOT NULL,
  target_activation_id text,
  replaces_activation_id text,
  reason_hash text,
  operator_principal text NOT NULL CHECK (operator_principal='local:phase2-operator'),
  record jsonb NOT NULL CHECK (jsonb_typeof(record)='object'),
  UNIQUE (activation_id,activation_kind,activation_sequence,package_hash,approval_record_hash),
  FOREIGN KEY (package_hash,approval_record_hash)
    REFERENCES pa_prompt_package_approvals(package_hash,approval_record_hash),
  FOREIGN KEY (target_activation_id)
    REFERENCES pa_prompt_package_activations(activation_id),
  FOREIGN KEY (replaces_activation_id)
    REFERENCES pa_prompt_package_activations(activation_id),
  CHECK (
    (activation_kind='standard' AND target_activation_id IS NULL
      AND replaces_activation_id IS NULL AND reason_hash IS NULL)
    OR
    (activation_kind='rollback' AND target_activation_id IS NOT NULL
      AND replaces_activation_id IS NOT NULL AND reason_hash IS NOT NULL
      AND target_activation_id<>replaces_activation_id)
  ),
  CHECK (
    (activation_kind='standard'
      AND record ?& ARRAY[
        'schemaVersion','activationKind','activationSequence','packageHash',
        'approvalRecordHash','operatorPrincipal','activationId'
      ]
      AND (record - ARRAY[
        'schemaVersion','activationKind','activationSequence','packageHash',
        'approvalRecordHash','operatorPrincipal','activationId'
      ])='{}'::jsonb
      AND pa_required_text_equal(
        record->>'schemaVersion','brooks-prompt-package-activation.v1'
      ))
    OR
    (activation_kind='rollback'
      AND record ?& ARRAY[
        'schemaVersion','activationKind','activationSequence',
        'replacesActivationId','targetActivationId','packageHash',
        'approvalRecordHash','reason','reasonHash','operatorPrincipal','activationId'
      ]
      AND (record - ARRAY[
        'schemaVersion','activationKind','activationSequence',
        'replacesActivationId','targetActivationId','packageHash',
        'approvalRecordHash','reason','reasonHash','operatorPrincipal','activationId'
      ])='{}'::jsonb
      AND pa_required_text_equal(
        record->>'schemaVersion','brooks-prompt-package-rollback-activation.v1'
      )
      AND pa_required_text_equal(record->>'targetActivationId',target_activation_id)
      AND pa_required_text_equal(record->>'replacesActivationId',replaces_activation_id)
      AND pa_required_text_equal(record->>'reasonHash',reason_hash))
  ),
  CHECK (pa_required_text_equal(record->>'activationKind',activation_kind)),
  CHECK ((record->>'activationSequence')::bigint=activation_sequence),
  CHECK (pa_required_text_equal(record->>'packageHash',package_hash)),
  CHECK (pa_required_text_equal(record->>'approvalRecordHash',approval_record_hash)),
  CHECK (pa_required_text_equal(record->>'operatorPrincipal',operator_principal)),
  CHECK (pa_required_text_equal(record->>'activationId',activation_id)),
  CHECK (activation_id='sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record-'activationId'),'UTF8'
  )),'hex'))
);

CREATE UNIQUE INDEX pa_prompt_package_standard_activation_package_uq
ON pa_prompt_package_activations(package_hash,approval_record_hash)
WHERE activation_kind='standard';

CREATE FUNCTION pa_serialize_prompt_package_authority() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  LOCK TABLE pa_prompt_package_activations IN SHARE ROW EXCLUSIVE MODE;
END;
$$;

CREATE FUNCTION pa_validate_prompt_package_activation() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  current_activation pa_prompt_package_activations%ROWTYPE;
  target_activation pa_prompt_package_activations%ROWTYPE;
  replaced_activation pa_prompt_package_activations%ROWTYPE;
  normalized_reason text;
  expected_reason_hash text;
BEGIN
  PERFORM pa_serialize_prompt_package_authority();
  SELECT activation.* INTO current_activation
  FROM pa_prompt_package_activations AS activation
  ORDER BY activation_sequence DESC
  LIMIT 1;
  IF FOUND AND NEW.activation_sequence <= current_activation.activation_sequence THEN
    RAISE EXCEPTION 'Prompt Package activation sequence must advance current authority';
  END IF;
  IF NEW.activation_kind='standard' THEN
    RETURN NEW;
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prompt Package rollback requires current authority';
  END IF;
  SELECT activation.* INTO target_activation
  FROM pa_prompt_package_activations AS activation
  WHERE activation.activation_id=NEW.target_activation_id;
  IF NOT FOUND OR target_activation.activation_kind<>'standard' THEN
    RAISE EXCEPTION 'Prompt Package rollback target must be a standard activation';
  END IF;
  SELECT activation.* INTO replaced_activation
  FROM pa_prompt_package_activations AS activation
  WHERE activation.activation_id=NEW.replaces_activation_id;
  IF NOT FOUND OR replaced_activation.activation_id<>current_activation.activation_id THEN
    RAISE EXCEPTION 'Prompt Package rollback must replace current authority';
  END IF;
  IF target_activation.activation_sequence>=replaced_activation.activation_sequence
    OR NEW.activation_sequence<=replaced_activation.activation_sequence THEN
    RAISE EXCEPTION 'Prompt Package rollback ordering is invalid';
  END IF;
  IF NEW.package_hash IS DISTINCT FROM target_activation.package_hash
    OR NEW.approval_record_hash IS DISTINCT FROM target_activation.approval_record_hash THEN
    RAISE EXCEPTION 'Prompt Package rollback must copy the exact target package';
  END IF;
  normalized_reason := NEW.record->>'reason';
  IF normalized_reason IS NULL
    OR char_length(normalized_reason) NOT BETWEEN 1 AND 500
    OR normalized_reason IS DISTINCT FROM btrim(normalized_reason)
    OR (normalized_reason ~ '[[:cntrl:]]') IS TRUE
    OR (normalized_reason ~ '[[:space:]]{2,}') IS TRUE THEN
    RAISE EXCEPTION 'Prompt Package rollback reason is not normalized or bounded';
  END IF;
  expected_reason_hash := 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(jsonb_build_object(
      'schemaVersion','brooks-prompt-package-rollback-reason.v1',
      'reason',normalized_reason
    )),'UTF8'
  )),'hex');
  IF NEW.reason_hash IS DISTINCT FROM expected_reason_hash THEN
    RAISE EXCEPTION 'Prompt Package rollback reason hash mismatch';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pa_prompt_package_activation_validate
BEFORE INSERT ON pa_prompt_package_activations FOR EACH ROW
EXECUTE FUNCTION pa_validate_prompt_package_activation();

CREATE VIEW pa_prompt_package_activation_authority_v1 AS
SELECT activation_sequence,activation_id,activation_kind,package_hash,
       approval_record_hash,target_activation_id,replaces_activation_id,
       reason_hash,operator_principal,record
FROM pa_prompt_package_activations;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'pa_prompt_package_manifests','pa_prompt_package_approvals',
    'pa_prompt_package_activations'
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
