import { describe, expect, it } from "vitest";
import type { ActionProposal, WarrantContract } from "@/contracts";
import { evaluateProposalControl } from "@/agents";
import { issueRootWarrant, revokeWarrantBranch } from "@/warrants";

const NOW = "2026-04-17T09:00:00.000Z";

function createRootWarrant(overrides: Partial<WarrantContract> = {}): WarrantContract {
  const warrant = issueRootWarrant({
    id: "warrant-root-test",
    rootRequestId: "request-test-001",
    createdBy: "user-1",
    agentId: "agent-comms-1",
    purpose: "Runtime proposal control tests",
    capabilities: ["gmail.send", "gmail.draft", "calendar.read"],
    resourceConstraints: {
      allowedRecipients: ["partners@northstar.vc"],
      allowedDomains: ["northstar.vc"],
      maxSends: 1,
      maxDrafts: 2,
    },
    canDelegate: true,
    maxChildren: 2,
    createdAt: NOW,
    expiresAt: "2026-04-18T18:00:00.000Z",
  });

  return {
    ...warrant,
    ...overrides,
  };
}

function createSendProposal(overrides: Partial<ActionProposal> = {}): ActionProposal {
  return {
    id: "proposal-send-001",
    actionId: "action-send-001",
    requestedAt: NOW,
    kind: "gmail.send",
    agentId: "agent-comms-1",
    warrantId: "warrant-root-test",
    target: {
      recipients: ["partners@northstar.vc"],
    },
    usage: {
      sendsUsed: 0,
    },
    summary: "Send one bounded follow-up.",
    resource: "Send to partners@northstar.vc",
    ...overrides,
  };
}

describe("runtime control bridge", () => {
  it("returns executable for allowed active actions with provider available", () => {
    const warrant = createRootWarrant();
    const proposal = createSendProposal();

    const result = evaluateProposalControl({
      proposal,
      warrant,
      warrants: [warrant],
      providerCheck: {
        available: true,
        state: "success",
        reason: "Provider path is available.",
      },
    });

    expect(result.finalDecision.controlState).toBe("executable");
    expect(result.finalDecision.allowedToExecute).toBe(true);
    expect(result.decisions.map((decision) => decision.controlState)).toEqual([
      "proposal_created",
      "executable",
    ]);
  });

  it("returns approval_required when policy allows but approval is not yet requested", () => {
    const warrant = createRootWarrant();
    const proposal = createSendProposal();

    const result = evaluateProposalControl({
      proposal,
      warrant,
      warrants: [warrant],
      approval: {
        required: true,
        status: null,
      },
    });

    expect(result.finalDecision.controlState).toBe("approval_required");
    expect(result.finalDecision.allowedToExecute).toBe(false);
  });

  it("keeps approval_approved distinct while final state is executable", () => {
    const warrant = createRootWarrant();
    const proposal = createSendProposal();

    const result = evaluateProposalControl({
      proposal,
      warrant,
      warrants: [warrant],
      approval: {
        required: true,
        status: "approved",
      },
      providerCheck: {
        available: true,
        state: "success",
        reason: "Provider path is available.",
      },
    });

    expect(result.finalDecision.controlState).toBe("executable");
    expect(result.decisions.map((decision) => decision.controlState)).toEqual([
      "proposal_created",
      "approval_approved",
      "executable",
    ]);
  });

  it("returns provider_unavailable when approval is approved but provider cannot execute", () => {
    const warrant = createRootWarrant();
    const proposal = createSendProposal();

    const result = evaluateProposalControl({
      proposal,
      warrant,
      warrants: [warrant],
      approval: {
        required: true,
        status: "approved",
      },
      providerCheck: {
        available: false,
        state: "unavailable",
        reason: "Delegated provider path is unavailable.",
      },
    });

    expect(result.finalDecision.controlState).toBe("provider_unavailable");
    expect(result.finalDecision.allowedToExecute).toBe(false);
  });

  it("returns denied_policy for active warrant policy denial", () => {
    const warrant = createRootWarrant();
    const proposal = createSendProposal({
      target: {
        recipients: ["ceo@external-partner.com"],
      },
    });

    const result = evaluateProposalControl({
      proposal,
      warrant,
      warrants: [warrant],
    });

    expect(result.finalDecision.controlState).toBe("denied_policy");
    expect(result.finalDecision.policyCode).toBe("recipient_not_allowed");
  });

  it("returns blocked_revoked for revoked branches", () => {
    const warrant = createRootWarrant();
    const revoked = revokeWarrantBranch({
      warrants: [warrant],
      warrantId: warrant.id,
      revokedAt: "2026-04-17T09:10:00.000Z",
      revokedBy: "user-1",
      reason: "Revoked by test",
    }).warrants[0];
    const proposal = createSendProposal();

    if (!revoked) {
      throw new Error("Expected revoked warrant.");
    }

    const result = evaluateProposalControl({
      proposal,
      warrant: revoked,
      warrants: [revoked],
    });

    expect(result.finalDecision.controlState).toBe("blocked_revoked");
    expect(result.finalDecision.policyCode).toBe("warrant_revoked");
  });

  it("returns blocked_expired for expired warrants", () => {
    const warrant = createRootWarrant({
      expiresAt: "2026-04-17T08:59:00.000Z",
    });
    const proposal = createSendProposal();

    const result = evaluateProposalControl({
      proposal,
      warrant,
      warrants: [warrant],
    });

    expect(result.finalDecision.controlState).toBe("blocked_expired");
    expect(result.finalDecision.policyCode).toBe("warrant_expired");
  });

  it("returns approval_denied for denied approval outcomes", () => {
    const warrant = createRootWarrant();
    const proposal = createSendProposal();

    const result = evaluateProposalControl({
      proposal,
      warrant,
      warrants: [warrant],
      approval: {
        required: true,
        status: "denied",
      },
    });

    expect(result.finalDecision.controlState).toBe("approval_denied");
    expect(result.finalDecision.allowedToExecute).toBe(false);
  });
});
