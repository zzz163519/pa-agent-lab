REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

GRANT SELECT ON pa_schema_migrations TO pa_app;
GRANT SELECT, INSERT ON
  pa_policy_cases,
  pa_policy_inputs,
  pa_chart_artifact_metadata,
  pa_case_policy_inputs,
  pa_brooks_decisions,
  pa_calvin_reviews
TO pa_app;
GRANT SELECT ON
  pa_model_runs,
  pa_provider_attempts,
  pa_model_run_audits
TO pa_app;
GRANT EXECUTE ON FUNCTION pa_is_sha256(text) TO pa_app;
GRANT EXECUTE ON FUNCTION pa_required_text_equal(text, text) TO pa_app;
GRANT EXECUTE ON FUNCTION pa_reject_immutable_mutation() TO pa_app;
