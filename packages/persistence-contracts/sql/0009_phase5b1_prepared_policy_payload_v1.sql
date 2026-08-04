BEGIN;

ALTER TABLE pa_policy_assemblies
  ADD CONSTRAINT pa_policy_assemblies_input_identity_uq UNIQUE (assembly_id,input_hash);

CREATE TABLE pa_prepared_policy_payloads (
  preparation_id text PRIMARY KEY CHECK (pa_is_sha256(preparation_id)),
  preparation_rules_version text NOT NULL
    CHECK (preparation_rules_version='prepared-policy-payload-rules.v1'),
  source_scope text NOT NULL CHECK (source_scope='synthetic_fixture_only'),
  assembly_id text NOT NULL,
  input_hash text NOT NULL CHECK (pa_is_sha256(input_hash)),
  package_activation_id text NOT NULL,
  package_activation_kind text NOT NULL CHECK (package_activation_kind IN ('standard','rollback')),
  package_activation_sequence bigint NOT NULL CHECK (package_activation_sequence > 0),
  package_hash text NOT NULL,
  approval_record_hash text NOT NULL,
  prompt_hash text NOT NULL CHECK (pa_is_sha256(prompt_hash)),
  response_schema_hash text NOT NULL CHECK (pa_is_sha256(response_schema_hash)),
  output_schema_version text NOT NULL
    CHECK (output_schema_version='brooks-identity-free-response.schema.v1'),
  validator_version text NOT NULL
    CHECK (validator_version='brooks-identity-free-response-validator.v1'),
  payload_hash text NOT NULL CHECK (pa_is_sha256(payload_hash)),
  operator_principal text NOT NULL CHECK (operator_principal='local:phase2-operator'),
  record jsonb NOT NULL CHECK (jsonb_typeof(record)='object'),
  CONSTRAINT pa_prepared_policy_payload_natural_identity_uq
    UNIQUE (assembly_id,package_activation_id,preparation_rules_version),
  FOREIGN KEY (assembly_id,input_hash)
    REFERENCES pa_policy_assemblies(assembly_id,input_hash),
  FOREIGN KEY (
    package_activation_id,package_activation_kind,package_activation_sequence,
    package_hash,approval_record_hash
  ) REFERENCES pa_prompt_package_activations(
    activation_id,activation_kind,activation_sequence,package_hash,approval_record_hash
  ),
  FOREIGN KEY (
    package_hash,prompt_hash,response_schema_hash,output_schema_version,validator_version
  ) REFERENCES pa_prompt_package_manifests(
    package_hash,prompt_hash,response_schema_hash,output_schema_version,validator_version
  ),
  CHECK (record ?& ARRAY[
    'schemaVersion','preparationRulesVersion','sourceScope','preparationId',
    'assemblyId','packageActivationId','packageHash','promptHash',
    'responseSchemaHash','outputSchemaVersion','validatorVersion','payload',
    'payloadHash','operatorPrincipal'
  ]),
  CHECK ((record - ARRAY[
    'schemaVersion','preparationRulesVersion','sourceScope','preparationId',
    'assemblyId','packageActivationId','packageHash','promptHash',
    'responseSchemaHash','outputSchemaVersion','validatorVersion','payload',
    'payloadHash','operatorPrincipal'
  ])='{}'::jsonb),
  CHECK (pa_required_text_equal(record->>'schemaVersion','prepared-policy-payload.v1')),
  CHECK (pa_required_text_equal(
    record->>'preparationRulesVersion',preparation_rules_version
  )),
  CHECK (pa_required_text_equal(record->>'sourceScope',source_scope)),
  CHECK (pa_required_text_equal(record->>'preparationId',preparation_id)),
  CHECK (pa_required_text_equal(record->>'assemblyId',assembly_id)),
  CHECK (pa_required_text_equal(record->>'packageActivationId',package_activation_id)),
  CHECK (pa_required_text_equal(record->>'packageHash',package_hash)),
  CHECK (pa_required_text_equal(record->>'promptHash',prompt_hash)),
  CHECK (pa_required_text_equal(record->>'responseSchemaHash',response_schema_hash)),
  CHECK (pa_required_text_equal(record->>'outputSchemaVersion',output_schema_version)),
  CHECK (pa_required_text_equal(record->>'validatorVersion',validator_version)),
  CHECK (pa_required_text_equal(record->>'payloadHash',payload_hash)),
  CHECK (pa_required_text_equal(record#>>'{payload,payloadHash}',payload_hash)),
  CHECK (pa_required_text_equal(record#>>'{payload,policyInput,inputHash}',input_hash)),
  CHECK (pa_required_text_equal(record->>'operatorPrincipal',operator_principal)),
  CHECK (preparation_id='sha256:' || encode(sha256(convert_to(
    pa_canonical_json(record-'preparationId'),'UTF8'
  )),'hex'))
);

CREATE FUNCTION pa_validate_prepared_policy_payload() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  assembly pa_policy_assemblies%ROWTYPE;
  current_package_activation pa_prompt_package_activations%ROWTYPE;
  current_doctrine_activation pa_doctrine_corpus_activations%ROWTYPE;
  expected_payload jsonb;
  expected_payload_hash text;
BEGIN
  PERFORM pa_serialize_prompt_package_authority();
  PERFORM pa_serialize_policy_assembly_authority();

  SELECT activation.* INTO current_package_activation
  FROM pa_prompt_package_activations AS activation
  ORDER BY activation_sequence DESC
  LIMIT 1;
  IF NOT FOUND OR NEW.package_activation_id IS DISTINCT FROM
      current_package_activation.activation_id THEN
    RAISE EXCEPTION 'Prepared payload must bind current Prompt Package authority';
  END IF;

  SELECT stored.* INTO assembly
  FROM pa_policy_assemblies AS stored
  WHERE stored.assembly_id=NEW.assembly_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Prepared payload requires a successful Policy Assembly';
  END IF;
  SELECT activation.* INTO current_doctrine_activation
  FROM pa_doctrine_corpus_activations AS activation
  ORDER BY activation_sequence DESC
  LIMIT 1;
  IF NOT FOUND OR assembly.activation_id IS DISTINCT FROM
      current_doctrine_activation.activation_id THEN
    RAISE EXCEPTION 'Prepared payload Policy Assembly is not current Doctrine authority';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pa_doctrine_corpus_entries AS entry
    WHERE entry.snapshot_id=assembly.snapshot_id
      AND NOT pa_doctrine_source_is_phase4a_allowed(
        entry.source_id,entry.source_content_hash
      )
  ) OR EXISTS (
    SELECT 1
    FROM pa_doctrine_corpus_entries AS entry
    JOIN pa_doctrine_retirements AS retirement
      ON retirement.doctrine_id=entry.doctrine_id
    WHERE entry.snapshot_id=assembly.snapshot_id
  ) OR NOT EXISTS (
    SELECT 1
    FROM pa_doctrine_ingestion_runs AS run
    JOIN pa_doctrine_quality_reports AS report
      ON report.run_id=run.run_id
     AND report.snapshot_id=run.snapshot_id
     AND report.profile_hash=run.profile_hash
    WHERE run.run_id=assembly.run_id
      AND run.snapshot_id=assembly.snapshot_id
      AND run.profile_hash=assembly.profile_hash
      AND run.status='succeeded'
      AND report.quality_report_hash=assembly.quality_report_hash
      AND report.status='passed'
  ) THEN
    RAISE EXCEPTION 'Prepared payload Policy Assembly authority is ineligible';
  END IF;
  IF NEW.input_hash IS DISTINCT FROM assembly.input_hash
    OR NEW.record#>'{payload,policyInput}' IS DISTINCT FROM
      assembly.record->'policyInput' THEN
    RAISE EXCEPTION 'Prepared payload Policy Assembly input mismatch';
  END IF;

  expected_payload_hash := 'sha256:' || encode(sha256(convert_to(
    pa_canonical_json(jsonb_build_object(
      'policyInput',assembly.record->'policyInput',
      'promptHash',NEW.prompt_hash,
      'outputSchemaVersion',NEW.output_schema_version
    )),'UTF8'
  )),'hex');
  expected_payload := jsonb_build_object(
    'schemaVersion','outbound-model-payload.v1',
    'payloadHash',expected_payload_hash,
    'policyInput',assembly.record->'policyInput',
    'promptHash',NEW.prompt_hash,
    'outputSchemaVersion',NEW.output_schema_version
  );
  IF NEW.payload_hash IS DISTINCT FROM expected_payload_hash
    OR NEW.record->'payload' IS DISTINCT FROM expected_payload THEN
    RAISE EXCEPTION 'Prepared payload reconstruction mismatch';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pa_prepared_policy_payload_validate
BEFORE INSERT ON pa_prepared_policy_payloads FOR EACH ROW
EXECUTE FUNCTION pa_validate_prepared_policy_payload();

CREATE TRIGGER pa_prepared_policy_payloads_immutable
BEFORE UPDATE OR DELETE ON pa_prepared_policy_payloads FOR EACH ROW
EXECUTE FUNCTION pa_reject_immutable_mutation();
CREATE TRIGGER pa_prepared_policy_payloads_immutable_truncate
BEFORE TRUNCATE ON pa_prepared_policy_payloads FOR EACH STATEMENT
EXECUTE FUNCTION pa_reject_immutable_mutation();

COMMIT;
