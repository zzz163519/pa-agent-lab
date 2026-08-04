REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

GRANT SELECT ON pa_schema_migrations TO pa_app;
GRANT SELECT, INSERT ON
  pa_policy_cases,
  pa_policy_inputs,
  pa_chart_artifact_metadata,
  pa_case_policy_inputs,
  pa_brooks_decisions,
  pa_calvin_reviews,
  pa_calvin_independent_assessments,
  pa_decision_reveal_receipts,
  pa_calvin_review_workflow_bindings,
  pa_doctrine_proposals,
  pa_doctrine_approvals,
  pa_doctrine_retirements,
  pa_doctrine_corpus_snapshots,
  pa_doctrine_corpus_entries,
  pa_doctrine_retrieval_profiles,
  pa_doctrine_lexical_documents,
  pa_doctrine_ingestion_runs,
  pa_doctrine_quality_suites,
  pa_doctrine_quality_reports,
  pa_doctrine_corpus_activations,
  pa_doctrine_retrieval_queries,
  pa_doctrine_retrieval_evidence,
  pa_policy_assemblies,
  pa_policy_assembly_bindings,
  pa_policy_assembly_doctrine_bindings,
  pa_policy_assembly_failures,
  pa_prompt_package_manifests,
  pa_prompt_package_approvals,
  pa_prompt_package_activations,
  pa_prepared_policy_payloads
TO pa_app;
GRANT SELECT ON
  pa_doctrine_activation_authority_v1,
  pa_prompt_package_activation_authority_v1,
  pa_model_runs,
  pa_provider_attempts,
  pa_model_run_audits
TO pa_app;
GRANT EXECUTE ON FUNCTION pa_is_sha256(text) TO pa_app;
GRANT EXECUTE ON FUNCTION pa_required_text_equal(text, text) TO pa_app;
GRANT EXECUTE ON FUNCTION pa_canonical_json(jsonb) TO pa_app;
GRANT EXECUTE ON FUNCTION pa_reject_immutable_mutation() TO pa_app;
GRANT EXECUTE ON FUNCTION pa_validate_doctrine_corpus_entry() TO pa_app;
GRANT EXECUTE ON FUNCTION pa_validate_doctrine_snapshot() TO pa_app;
GRANT EXECUTE ON FUNCTION pa_validate_doctrine_ingestion() TO pa_app;
GRANT EXECUTE ON FUNCTION pa_validate_doctrine_quality_suite() TO pa_app;
GRANT EXECUTE ON FUNCTION pa_validate_doctrine_quality_report() TO pa_app;
GRANT EXECUTE ON FUNCTION pa_validate_doctrine_activation() TO pa_app;
GRANT EXECUTE ON FUNCTION pa_doctrine_source_is_phase4a_allowed(text,text) TO pa_app;
GRANT EXECUTE ON FUNCTION pa_serialize_doctrine_retirement() TO pa_app;
GRANT EXECUTE ON FUNCTION pa_validate_doctrine_evidence() TO pa_app;
GRANT EXECUTE ON FUNCTION pa_phase2_source_bundle_hash(text) TO pa_app;
GRANT EXECUTE ON FUNCTION pa_serialize_policy_assembly_authority() TO pa_app;
GRANT EXECUTE ON FUNCTION pa_lock_policy_assembly_authority() TO pa_app;
GRANT EXECUTE ON FUNCTION pa_validate_policy_assembly() TO pa_app;
GRANT EXECUTE ON FUNCTION pa_validate_policy_assembly_failure() TO pa_app;
GRANT EXECUTE ON FUNCTION pa_serialize_prompt_package_authority() TO pa_app;
GRANT EXECUTE ON FUNCTION pa_validate_prompt_package_activation() TO pa_app;
GRANT EXECUTE ON FUNCTION pa_validate_prepared_policy_payload() TO pa_app;
GRANT USAGE ON SEQUENCE pa_doctrine_corpus_activation_sequence_seq TO pa_app;
GRANT USAGE ON SEQUENCE pa_prompt_package_activation_sequence_seq TO pa_app;
