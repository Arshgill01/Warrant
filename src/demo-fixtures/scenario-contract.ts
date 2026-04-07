import type {
  DemoScenario,
  WarrantContract,
} from "@/contracts";

export type DemoScenarioProfile = "generic" | "main" | "comms-revoked";

export interface DemoScenarioValidationResult {
  ok: boolean;
  issues: string[];
}

function isRevocationCode(code: string): boolean {
  return code === "warrant_revoked" || code === "ancestor_revoked";
}

function pushIfMissing(
  predicate: boolean,
  issues: string[],
  message: string,
): void {
  if (!predicate) {
    issues.push(message);
  }
}

function isTimelineNonDecreasing(scenario: DemoScenario): boolean {
  for (let index = 1; index < scenario.timeline.length; index += 1) {
    const previous = scenario.timeline[index - 1];
    const current = scenario.timeline[index];

    if (!previous || !current) {
      continue;
    }

    if (previous.at.localeCompare(current.at) > 0) {
      return false;
    }
  }

  return true;
}

function validateMainProfile(
  scenario: DemoScenario,
  issues: string[],
): void {
  const commsWarrant = scenario.warrants.find(
    (warrant) => warrant.id === scenario.examples.commsChildWarrantId,
  );
  const commsApproval = scenario.approvals.find(
    (approval) => approval.id === scenario.examples.commsSendApprovalId,
  );

  pushIfMissing(
    scenario.revocations.length === 0,
    issues,
    "Main scenario should not contain revocations.",
  );
  pushIfMissing(
    commsWarrant?.status === "active",
    issues,
    "Main scenario should keep the Comms warrant active.",
  );
  pushIfMissing(
    commsApproval?.status === "pending",
    issues,
    "Main scenario should keep the send approval pending.",
  );
  pushIfMissing(
    !scenario.actionAttempts.some((attempt) =>
      isRevocationCode(attempt.authorization.code)
    ),
    issues,
    "Main scenario should not include revoked-branch action attempts.",
  );
}

function validateCommsRevokedProfile(
  scenario: DemoScenario,
  issues: string[],
): void {
  const commsWarrant = scenario.warrants.find(
    (warrant) => warrant.id === scenario.examples.commsChildWarrantId,
  );
  const commsApproval = scenario.approvals.find(
    (approval) => approval.id === scenario.examples.commsSendApprovalId,
  );

  pushIfMissing(
    scenario.revocations.length >= 1,
    issues,
    "Comms-revoked scenario should include at least one revocation record.",
  );
  pushIfMissing(
    commsWarrant?.status === "revoked",
    issues,
    "Comms-revoked scenario should mark the Comms warrant as revoked.",
  );
  pushIfMissing(
    commsApproval?.status === "approved",
    issues,
    "Comms-revoked scenario should preserve an approved send record in history.",
  );
  pushIfMissing(
    scenario.actionAttempts.some((attempt) =>
      isRevocationCode(attempt.authorization.code)
    ),
    issues,
    "Comms-revoked scenario should include a post-revoke blocked attempt.",
  );
}

export function validateDemoScenarioContract(
  scenario: DemoScenario,
  profile: DemoScenarioProfile = "generic",
): DemoScenarioValidationResult {
  const issues: string[] = [];
  const warrantsById = new Map(scenario.warrants.map((warrant) => [warrant.id, warrant]));
  const actionsById = new Map(scenario.actionAttempts.map((action) => [action.id, action]));
  const approvalsById = new Map(scenario.approvals.map((approval) => [approval.id, approval]));
  const revocationsById = new Map(
    scenario.revocations.map((revocation) => [revocation.id, revocation]),
  );

  const uniqueSets: Array<[label: string, values: string[]]> = [
    ["warrant", scenario.warrants.map((warrant) => warrant.id)],
    ["runtime actor", scenario.agents.map((agent) => agent.runtimeActorId)],
    ["action", scenario.actionAttempts.map((action) => action.id)],
    ["approval", scenario.approvals.map((approval) => approval.id)],
    ["revocation", scenario.revocations.map((revocation) => revocation.id)],
    ["timeline event", scenario.timeline.map((event) => event.id)],
  ];

  uniqueSets.forEach(([label, values]) => {
    if (new Set(values).size !== values.length) {
      issues.push(`Scenario contains duplicate ${label} ids.`);
    }
  });

  pushIfMissing(
    warrantsById.has(scenario.rootWarrantId),
    issues,
    `Root warrant ${scenario.rootWarrantId} is missing from scenario.warrants.`,
  );

  scenario.warrants.forEach((warrant) => {
    if (warrant.parentId && !warrantsById.has(warrant.parentId)) {
      issues.push(
        `Warrant ${warrant.id} references missing parent warrant ${warrant.parentId}.`,
      );
    }
  });

  scenario.agents.forEach((agent) => {
    if (!agent.runtimeActorId.trim()) {
      issues.push(`Agent ${agent.id} is missing runtimeActorId.`);
    }

    if (!agent.runtimeActorLabel.trim()) {
      issues.push(`Agent ${agent.id} is missing runtimeActorLabel.`);
    }

    const warrant = warrantsById.get(agent.warrantId);

    if (!warrant) {
      issues.push(`Agent ${agent.id} references missing warrant ${agent.warrantId}.`);
      return;
    }

    if (warrant.agentId !== agent.id) {
      issues.push(
        `Agent ${agent.id} is linked to warrant ${agent.warrantId}, but warrant.agentId is ${warrant.agentId}.`,
      );
    }

    if (agent.parentAgentId) {
      const parent = scenario.agents.find((candidate) => candidate.id === agent.parentAgentId);

      if (!parent) {
        issues.push(`Agent ${agent.id} references missing parent agent ${agent.parentAgentId}.`);
      }
    }
  });

  scenario.actionAttempts.forEach((attempt) => {
    const warrant = warrantsById.get(attempt.warrantId);

    if (!warrant) {
      issues.push(`Action ${attempt.id} references missing warrant ${attempt.warrantId}.`);
      return;
    }

    if (attempt.agentId !== warrant.agentId) {
      issues.push(
        `Action ${attempt.id} agent ${attempt.agentId} does not match warrant holder ${warrant.agentId}.`,
      );
    }

    if (attempt.parentWarrantId !== warrant.parentId) {
      issues.push(
        `Action ${attempt.id} parent warrant ${attempt.parentWarrantId} does not match warrant parent ${warrant.parentId}.`,
      );
    }
  });

  scenario.approvals.forEach((approval) => {
    if (!actionsById.has(approval.actionId)) {
      issues.push(`Approval ${approval.id} references missing action ${approval.actionId}.`);
    }

    const warrant = warrantsById.get(approval.warrantId);

    if (!warrant) {
      issues.push(`Approval ${approval.id} references missing warrant ${approval.warrantId}.`);
      return;
    }

    if (approval.requestedByAgentId !== warrant.agentId) {
      issues.push(
        `Approval ${approval.id} requester ${approval.requestedByAgentId} does not match warrant holder ${warrant.agentId}.`,
      );
    }
  });

  scenario.revocations.forEach((revocation) => {
    if (!warrantsById.has(revocation.warrantId)) {
      issues.push(
        `Revocation ${revocation.id} references missing warrant ${revocation.warrantId}.`,
      );
    }

    if (
      revocation.parentWarrantId &&
      !warrantsById.has(revocation.parentWarrantId)
    ) {
      issues.push(
        `Revocation ${revocation.id} references missing parent warrant ${revocation.parentWarrantId}.`,
      );
    }

    revocation.cascadedWarrantIds.forEach((warrantId) => {
      if (!warrantsById.has(warrantId)) {
        issues.push(
          `Revocation ${revocation.id} references missing cascaded warrant ${warrantId}.`,
        );
      }
    });
  });

  scenario.timeline.forEach((event) => {
    if (event.warrantId && !warrantsById.has(event.warrantId)) {
      issues.push(`Timeline event ${event.id} references missing warrant ${event.warrantId}.`);
    }

    if (event.parentWarrantId && !warrantsById.has(event.parentWarrantId)) {
      issues.push(
        `Timeline event ${event.id} references missing parent warrant ${event.parentWarrantId}.`,
      );
    }

    if (event.actionId && !actionsById.has(event.actionId)) {
      issues.push(`Timeline event ${event.id} references missing action ${event.actionId}.`);
    }

    if (event.approvalId && !approvalsById.has(event.approvalId)) {
      issues.push(
        `Timeline event ${event.id} references missing approval ${event.approvalId}.`,
      );
    }

    if (event.revocationId && !revocationsById.has(event.revocationId)) {
      issues.push(
        `Timeline event ${event.id} references missing revocation ${event.revocationId}.`,
      );
    }
  });

  if (!isTimelineNonDecreasing(scenario)) {
    issues.push("Scenario timeline is not sorted in non-decreasing timestamp order.");
  }

  const rootWarrant = warrantsById.get(scenario.rootWarrantId) as WarrantContract | undefined;

  if (rootWarrant) {
    scenario.actionAttempts.forEach((attempt) => {
      if (attempt.rootRequestId !== rootWarrant.rootRequestId) {
        issues.push(
          `Action ${attempt.id} root request ${attempt.rootRequestId} does not match root warrant request ${rootWarrant.rootRequestId}.`,
        );
      }
    });
  }

  switch (profile) {
    case "main":
      validateMainProfile(scenario, issues);
      break;
    case "comms-revoked":
      validateCommsRevokedProfile(scenario, issues);
      break;
    default:
      break;
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

export function assertDemoScenarioContract(
  scenario: DemoScenario,
  profile: DemoScenarioProfile = "generic",
): DemoScenario {
  const validation = validateDemoScenarioContract(scenario, profile);

  if (!validation.ok) {
    throw new Error(
      `Scenario contract validation failed (${profile}): ${validation.issues.join(" | ")}`,
    );
  }

  return scenario;
}
