import {
  executeBlockedGmailSendAction,
} from "@/actions";
import type {
  DemoScenario,
  LedgerEvent,
  RevocationRecord,
} from "@/contracts";
import { runMainScenarioPlannerFlow } from "@/agents";
import { assertDemoScenarioContract } from "@/demo-fixtures/scenario-contract";
import { revokeWarrantBranch } from "@/warrants";

const cloneScenario = <Value>(value: Value): Value => structuredClone(value);

const COMMS_WARRANT_ID = "warrant-comms-child-001";
const COMMS_POST_REVOKE_ACTION_ID = "action-comms-send-post-revoke-001";
const COMMS_REVOCATION_ID = "revocation-comms-001";
const COMMS_REVOKED_AT = "2026-04-17T09:13:00.000Z";
const COMMS_POST_REVOKE_ATTEMPT_AT = "2026-04-17T09:14:00.000Z";

export function createCommsRevokedDemoScenario(): DemoScenario {
  return cloneScenario(
    assertDemoScenarioContract(
      runMainScenarioPlannerFlow(undefined, { stage: "comms-revoked" }).scenario,
      "comms-revoked",
    ),
  );
}

export function createMainDemoScenario(): DemoScenario {
  return cloneScenario(
    assertDemoScenarioContract(
      runMainScenarioPlannerFlow(undefined, { stage: "main" }).scenario,
      "main",
    ),
  );
}

/**
 * @deprecated Prefer explicit helpers:
 * - createMainDemoScenario() for the pre-revoke approval-gate state
 * - createCommsRevokedDemoScenario() for the post-revoke replay state
 */
export function createDefaultDemoScenario(): DemoScenario {
  return createCommsRevokedDemoScenario();
}

function createRevocationTimelineEvents(input: {
  scenario: DemoScenario;
  revocationId: string;
  revokedAt: string;
  revokedWarrantIds: string[];
}): LedgerEvent[] {
  return input.revokedWarrantIds.map((warrantId, index) => {
    const revokedWarrant = input.scenario.warrants.find(
      (warrant) => warrant.id === warrantId,
    );

    if (!revokedWarrant) {
      throw new Error(`Missing revoked warrant ${warrantId} in scenario timeline.`);
    }

    const inherited = warrantId !== COMMS_WARRANT_ID;

    return {
      id: `${input.revocationId}:event:${index + 1}`,
      at: input.revokedAt,
      kind: "warrant.revoked",
      actorKind: "user",
      actorId: input.scenario.user.id,
      warrantId: revokedWarrant.id,
      parentWarrantId: revokedWarrant.parentId,
      actionId: null,
      approvalId: null,
      revocationId: input.revocationId,
      title: inherited
        ? "Descendant warrant invalidated"
        : "Comms branch revoked",
      description: inherited
        ? `Maya revoked the Comms branch, so descendant warrant ${revokedWarrant.id} lost authority immediately.`
        : "Maya deliberately revoked the Comms branch. That warrant and any descendants can no longer execute Gmail work.",
    };
  });
}

export function revokeCommsBranchScenario(
  scenario: DemoScenario,
): DemoScenario {
  const currentScenario = cloneScenario(scenario);
  const commsWarrant = currentScenario.warrants.find(
    (warrant) => warrant.id === COMMS_WARRANT_ID,
  );

  if (!commsWarrant) {
    throw new Error("Expected Comms warrant in demo scenario.");
  }

  if (commsWarrant.status === "revoked") {
    return currentScenario;
  }

  const revocationReason =
    "Maya revoked the Comms branch. Any delegated authority under that branch is now invalid.";
  const revoked = revokeWarrantBranch({
    warrants: currentScenario.warrants,
    warrantId: commsWarrant.id,
    revokedAt: COMMS_REVOKED_AT,
    revokedBy: currentScenario.user.id,
    reason: revocationReason,
  });

  const updatedScenario: DemoScenario = {
    ...currentScenario,
    warrants: revoked.warrants,
    agents: currentScenario.agents.map((agent) =>
      revoked.revokedWarrantIds.includes(agent.warrantId)
        ? {
            ...agent,
            status: "revoked",
          }
        : agent,
    ),
    revocations: [
      ...currentScenario.revocations,
      {
        id: COMMS_REVOCATION_ID,
        warrantId: commsWarrant.id,
        parentWarrantId: commsWarrant.parentId,
        revokedByKind: "user",
        revokedById: currentScenario.user.id,
        revokedAt: COMMS_REVOKED_AT,
        reason: revocationReason,
        cascadedWarrantIds: revoked.revokedWarrantIds.filter(
          (warrantId) => warrantId !== commsWarrant.id,
        ),
      } satisfies RevocationRecord,
    ],
    timeline: [
      ...currentScenario.timeline,
      ...createRevocationTimelineEvents({
        scenario: currentScenario,
        revocationId: COMMS_REVOCATION_ID,
        revokedAt: COMMS_REVOKED_AT,
        revokedWarrantIds: revoked.revokedWarrantIds,
      }),
    ],
  };

  const revokedCommsWarrant = updatedScenario.warrants.find(
    (warrant) => warrant.id === COMMS_WARRANT_ID,
  );

  if (!revokedCommsWarrant) {
    throw new Error("Expected revoked Comms warrant after scenario revocation.");
  }

  const postRevokeSendAttempt = executeBlockedGmailSendAction({
    actionId: COMMS_POST_REVOKE_ACTION_ID,
    requestedAt: COMMS_POST_REVOKE_ATTEMPT_AT,
    warrant: revokedCommsWarrant,
    warrants: updatedScenario.warrants,
    recipients: ["partners@northstar.vc", "finance@northstar.vc"],
    usage: {
      sendsUsed: 0,
    },
    fallbackSummary:
      "Comms Agent tried to resume the prepared follow-up send after the branch was revoked.",
    fallbackResource:
      "Send to partners@northstar.vc and finance@northstar.vc",
    blockedTitle: "Revoked Comms branch blocked the later send attempt",
    blockedDescription:
      "The approval record remains in history, but Maya revoked the Comms branch before execution, so Warrant denied the later send attempt.",
  });

  updatedScenario.actionAttempts = [
    ...updatedScenario.actionAttempts,
    postRevokeSendAttempt.attempt,
  ];
  updatedScenario.timeline = [
    ...updatedScenario.timeline,
    postRevokeSendAttempt.timelineEvent,
  ];

  return assertDemoScenarioContract(updatedScenario);
}
