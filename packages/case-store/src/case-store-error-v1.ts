export type CaseStoreErrorCodeV1 =
  | "INTEGRITY_VIOLATION"
  | "IDENTITY_CONFLICT"
  | "DEPENDENCY_UNAVAILABLE"
  | "FORBIDDEN"
  | "NOT_FOUND";

export class CaseStoreError extends Error {
  override readonly name = "CaseStoreError";
  readonly code: CaseStoreErrorCodeV1;

  constructor(
    code: CaseStoreErrorCodeV1,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.code = code;
  }
}
