import type {
  ActionAttempt,
  ActionAuthorizationSnapshot,
  ApprovalStatus,
  RuntimeControlEvent,
  RuntimeControlState,
  RuntimeProposalControlDecision,
  RuntimeActionProposal,
  WarrantContract,
  ProviderActionState,
  WarrantDecisionCode,
} from "@/contracts";
import { authorizeAction } from "@/warrants";

interface ProviderExecutionCheck {
  available: boolean;
  state: ProviderActionState;
  reason: string;
}

interface EvaluateProposalControlInput {
  proposal: RuntimeActionProposal;
  warrant: WarrantContract;
  warrants: readonly WarrantContract[];
  approval?: {
    required: boolean;
    status?: ApprovalStatus | null;
  };
  providerCheck?: ProviderExecutionCheck;
}

export interface ProposalControlEvaluation {
  finalDecision: RuntimeProposalControlDecision;
  decisions: RuntimeProposalControlDecision[];
  runtimeEvents: RuntimeControlEvent[];
}

function toActionAttempt(proposal: RuntimeActionProposal): ActionAttempt {
  return {
    id: proposal.actionId,
    kind: proposal.kind,
    agentId: proposal.agentId,
    warrantId: proposal.warrantId,
    requestedAt: proposal.requestedAt,
    target: proposal.target,
    usage: proposal.usage,
  };
}

function isRevocationCode(code: WarrantDecisionCode): boolean {
  return code === "warrant_revoked" || code === "ancestor_revoked";
}

function isExpiryCode(code: WarrantDecisionCode): boolean {
  return code === "warrant_expired" || code === "ancestor_expired";
}

function toAuthorizationSnapshot(input: ReturnType<typeof authorizeAction>): ActionAuthorizationSnapshot {
  return {
    allowed: input.allowed,
    code: input.code,
    message: input.message,
    effectiveStatus: input.effectiveStatus,
    blockedByWarrantId: input.allowed ? null : input.blockedByWarrantId,
  };
}

function buildDecision(input: {
  proposal: RuntimeActionProposal;
  warrant: WarrantContract;
  controlState: RuntimeControlState;
  allowedToExecute: boolean;
  reason: string;
  policyCode?: WarrantDecisionCode | null;
  authorization?: ActionAuthorizationSnapshot | null;
  approvalStatus?: ApprovalStatus | null;
  providerState?: ProviderActionState | null;
  metadata?: Record<string, string | number | boolean | null>;
}): RuntimeProposalControlDecision {
  return {
    proposalId: input.proposal.id,
    actionId: input.proposal.actionId,
    at: input.proposal.requestedAt,
    agentId: input.proposal.agentId,
    warrantId: input.proposal.warrantId,
    parentWarrantId: input.warrant.parentId,
    controlState: input.controlState,
    allowedToExecute: input.allowedToExecute,
    reason: input.reason,
    policyCode: input.policyCode ?? null,
    authorization: input.authorization ?? null,
    approvalStatus: input.approvalStatus ?? null,
    providerState: input.providerState ?? null,
    metadata: input.metadata ?? {},
  };
}

function buildRuntimeEvent(
  decision: RuntimeProposalControlDecision,
  title: string,
): RuntimeControlEvent {
  return {
    id: `${decision.proposalId}:${decision.controlState}`,
    at: decision.at,
    proposalId: decision.proposalId,
    actionId: decision.actionId,
    agentId: decision.agentId,
    warrantId: decision.warrantId,
    parentWarrantId: decision.parentWarrantId,
    controlState: decision.controlState,
    title,
    detail: decision.reason,
  };
}

export function evaluateProposalControl(
  input: EvaluateProposalControlInput,
): ProposalControlEvaluation {
  const decisions: RuntimeProposalControlDecision[] = [];
  const runtimeEvents: RuntimeControlEvent[] = [];

  const createdDecision = buildDecision({
    proposal: input.proposal,
    warrant: input.warrant,
    controlState: "proposal_created",
    allowedToExecute: false,
    reason: "Proposal recorded for runtime control evaluation.",
  });

  decisions.push(createdDecision);
  runtimeEvents.push(buildRuntimeEvent(createdDecision, "Proposal created"));

  const authorization = authorizeAction({
    warrant: input.warrant,
    warrants: input.warrants,
    action: toActionAttempt(input.proposal),
    now: input.proposal.requestedAt,
  });
  const authorizationSnapshot = toAuthorizationSnapshot(authorization);

  if (!authorization.allowed) {
    const state: RuntimeControlState = isRevocationCode(authorization.code)
      ? "blocked_revoked"
      : isExpiryCode(authorization.code)
        ? "blocked_expired"
        : "denied_policy";
    const deniedDecision = buildDecision({
      proposal: input.proposal,
      warrant: input.warrant,
      controlState: state,
      allowedToExecute: false,
      reason: authorization.message,
      policyCode: authorization.code,
      authorization: authorizationSnapshot,
    });

    decisions.push(deniedDecision);
    runtimeEvents.push(buildRuntimeEvent(deniedDecision, "Proposal blocked by policy"));

    return {
      finalDecision: deniedDecision,
      decisions,
      runtimeEvents,
    };
  }

  const approvalRequired = input.approval?.required ?? false;
  const approvalStatus = input.approval?.status ?? null;

  if (approvalRequired) {
    if (approvalStatus === null) {
      const approvalRequiredDecision = buildDecision({
        proposal: input.proposal,
        warrant: input.warrant,
        controlState: "approval_required",
        allowedToExecute: false,
        reason: "Human approval is required before this action can execute.",
        policyCode: authorization.code,
        authorization: authorizationSnapshot,
      });

      decisions.push(approvalRequiredDecision);
      runtimeEvents.push(
        buildRuntimeEvent(approvalRequiredDecision, "Approval required"),
      );

      return {
        finalDecision: approvalRequiredDecision,
        decisions,
        runtimeEvents,
      };
    }

    if (approvalStatus === "pending") {
      const approvalPendingDecision = buildDecision({
        proposal: input.proposal,
        warrant: input.warrant,
        controlState: "approval_pending",
        allowedToExecute: false,
        reason: "Approval is pending for this exact action.",
        policyCode: authorization.code,
        authorization: authorizationSnapshot,
        approvalStatus,
      });

      decisions.push(approvalPendingDecision);
      runtimeEvents.push(
        buildRuntimeEvent(approvalPendingDecision, "Approval pending"),
      );

      return {
        finalDecision: approvalPendingDecision,
        decisions,
        runtimeEvents,
      };
    }

    if (approvalStatus === "denied" || approvalStatus === "expired") {
      const approvalDeniedDecision = buildDecision({
        proposal: input.proposal,
        warrant: input.warrant,
        controlState: "approval_denied",
        allowedToExecute: false,
        reason: "Approval was denied, so execution remains blocked.",
        policyCode: authorization.code,
        authorization: authorizationSnapshot,
        approvalStatus,
      });

      decisions.push(approvalDeniedDecision);
      runtimeEvents.push(
        buildRuntimeEvent(approvalDeniedDecision, "Approval denied"),
      );

      return {
        finalDecision: approvalDeniedDecision,
        decisions,
        runtimeEvents,
      };
    }

    const approvalApprovedDecision = buildDecision({
      proposal: input.proposal,
      warrant: input.warrant,
      controlState: "approval_approved",
      allowedToExecute: false,
      reason: "Approval was granted for this exact action.",
      policyCode: authorization.code,
      authorization: authorizationSnapshot,
      approvalStatus,
    });

    decisions.push(approvalApprovedDecision);
    runtimeEvents.push(buildRuntimeEvent(approvalApprovedDecision, "Approval approved"));
  }

  if (input.providerCheck && !input.providerCheck.available) {
    const providerUnavailableDecision = buildDecision({
      proposal: input.proposal,
      warrant: input.warrant,
      controlState: "provider_unavailable",
      allowedToExecute: false,
      reason: input.providerCheck.reason,
      policyCode: authorization.code,
      authorization: authorizationSnapshot,
      approvalStatus,
      providerState: input.providerCheck.state,
    });

    decisions.push(providerUnavailableDecision);
    runtimeEvents.push(
      buildRuntimeEvent(providerUnavailableDecision, "Provider unavailable"),
    );

    return {
      finalDecision: providerUnavailableDecision,
      decisions,
      runtimeEvents,
    };
  }

  const executableDecision = buildDecision({
    proposal: input.proposal,
    warrant: input.warrant,
    controlState: "executable",
    allowedToExecute: true,
    reason: "Proposal passed runtime control checks and is executable.",
    policyCode: authorization.code,
    authorization: authorizationSnapshot,
    approvalStatus,
    providerState: input.providerCheck?.state ?? null,
  });

  decisions.push(executableDecision);
  runtimeEvents.push(buildRuntimeEvent(executableDecision, "Proposal executable"));

  return {
    finalDecision: executableDecision,
    decisions,
    runtimeEvents,
  };
}

export function createExecutionFailedDecision(input: {
  proposal: RuntimeActionProposal;
  warrant: WarrantContract;
  reason: string;
  authorization: ActionAuthorizationSnapshot | null;
  approvalStatus?: ApprovalStatus | null;
  providerState?: ProviderActionState | null;
}): RuntimeProposalControlDecision {
  return buildDecision({
    proposal: input.proposal,
    warrant: input.warrant,
    controlState: "execution_failed",
    allowedToExecute: false,
    reason: input.reason,
    policyCode: input.authorization?.code ?? null,
    authorization: input.authorization,
    approvalStatus: input.approvalStatus ?? null,
    providerState: input.providerState ?? null,
  });
}

export function createRuntimeEventFromDecision(
  decision: RuntimeProposalControlDecision,
  title: string,
): RuntimeControlEvent {
  return buildRuntimeEvent(decision, title);
}
