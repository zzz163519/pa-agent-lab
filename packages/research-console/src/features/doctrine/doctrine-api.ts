import type {
  ApproveDoctrineCommandV1,
  DoctrineApprovalMutationResultV1,
  DoctrineWorkItemV1,
  DoctrineWorkQueueV1,
  RetireDoctrineCommandV1,
} from "@pa-agent-lab/persistence-contracts/doctrine-approval-transport-v1";

import { reviewerFetch } from "../review/reviewer-api.ts";

export function listDoctrineWorkItems(): Promise<DoctrineWorkQueueV1> {
  return reviewerFetch("/v1/doctrine/proposals");
}

export function getDoctrineWorkItem(doctrineId: string): Promise<DoctrineWorkItemV1> {
  return reviewerFetch(`/v1/doctrine/proposals/${encodeURIComponent(doctrineId)}`);
}

export function approveDoctrine(
  doctrineId: string,
  command: ApproveDoctrineCommandV1,
): Promise<DoctrineApprovalMutationResultV1> {
  return reviewerFetch(
    `/v1/doctrine/proposals/${encodeURIComponent(doctrineId)}/approve`,
    { method: "POST", body: JSON.stringify(command) },
  );
}

export function retireDoctrine(
  doctrineId: string,
  command: RetireDoctrineCommandV1,
): Promise<DoctrineApprovalMutationResultV1> {
  return reviewerFetch(
    `/v1/doctrine/proposals/${encodeURIComponent(doctrineId)}/retire`,
    { method: "POST", body: JSON.stringify(command) },
  );
}
