import { describe, expect, it } from "vitest";
import {
  authorizeAction,
  issueChildWarrant,
  issueRootWarrant,
  revokeWarrantBranch,
  validateChildWarrant,
} from "@/warrants";

const NOW = "2026-03-20T10:00:00.000Z";
const LATER = "2026-03-20T12:00:00.000Z";
const TOMORROW = "2026-03-21T10:00:00.000Z";

function createParentWarrant() {
  return issueRootWarrant({
    id: "warrant_parent",
    rootRequestId: "root_request_1",
    createdBy: "user_1",
    agentId: "planner_agent",
    purpose: "Coordinate investor follow-ups",
    capabilities: ["gmail.draft", "gmail.send", "warrant.issue"],
    resourceConstraints: {
      allowedRecipients: ["ceo@example.com", "cfo@example.com"],
      allowedDomains: ["example.com"],
      maxSends: 2,
      maxDrafts: 3,
    },
    canDelegate: true,
    maxChildren: 2,
    createdAt: NOW,
    expiresAt: TOMORROW,
  });
}

describe("warrant engine", () => {
  it("lets a parent issue a narrower child", () => {
    const parent = createParentWarrant();
    const validation = validateChildWarrant({
      parent,
      child: {
        id: "warrant_child",
        createdBy: parent.agentId,
        agentId: "comms_agent",
        purpose: "Draft investor follow-up emails",
        capabilities: ["gmail.draft"],
        resourceConstraints: {
          allowedRecipients: ["ceo@example.com"],
          allowedDomains: ["example.com"],
          maxDrafts: 1,
        },
        canDelegate: false,
        maxChildren: 0,
        expiresAt: LATER,
      },
      existingChildrenCount: 0,
      now: NOW,
    });

    expect(validation.valid).toBe(true);

    const issued = issueChildWarrant({
      parent,
      child: {
        id: "warrant_child",
        createdBy: parent.agentId,
        agentId: "comms_agent",
        purpose: "Draft investor follow-up emails",
        capabilities: ["gmail.draft"],
        resourceConstraints: {
          allowedRecipients: ["ceo@example.com"],
          allowedDomains: ["example.com"],
          maxDrafts: 1,
        },
        canDelegate: false,
        maxChildren: 0,
        expiresAt: LATER,
      },
      existingChildrenCount: 0,
      now: NOW,
    });

    expect(issued.ok).toBe(true);

    if (!issued.ok) {
      throw new Error("child issuance unexpectedly failed");
    }

    expect(issued.warrant.parentId).toBe(parent.id);
    expect(issued.warrant.rootRequestId).toBe(parent.rootRequestId);
    expect(issued.warrant.capabilities).toEqual(["gmail.draft"]);
    expect(issued.warrant.status).toBe("active");
  });

  it("blocks a child from gaining a new capability", () => {
    const parent = createParentWarrant();
    const validation = validateChildWarrant({
      parent,
      child: {
        id: "warrant_child",
        createdBy: parent.agentId,
        agentId: "calendar_agent",
        purpose: "Schedule meetings",
        capabilities: ["calendar.read"],
        canDelegate: false,
        maxChildren: 0,
        expiresAt: LATER,
      },
      existingChildrenCount: 0,
      now: NOW,
    });

    expect(validation.valid).toBe(false);
    expect(validation.reasons[0]?.code).toBe("child_capability_exceeds_parent");
  });

  it("blocks a child from outliving its parent", () => {
    const parent = createParentWarrant();
    const validation = validateChildWarrant({
      parent,
      child: {
        id: "warrant_child",
        createdBy: parent.agentId,
        agentId: "comms_agent",
        purpose: "Draft investor follow-up emails",
        capabilities: ["gmail.draft"],
        canDelegate: false,
        maxChildren: 0,
        expiresAt: "2026-03-22T10:00:00.000Z",
      },
      existingChildrenCount: 0,
      now: NOW,
    });

    expect(validation.valid).toBe(false);
    expect(validation.reasons[0]?.code).toBe("child_expiry_exceeds_parent");
  });

  it("applies calendar window narrowing to calendar-read children", () => {
    const parent = issueRootWarrant({
      id: "warrant_calendar_parent",
      rootRequestId: "root_request_calendar",
      createdBy: "user_1",
      agentId: "planner_agent",
      purpose: "Coordinate schedule context",
      capabilities: ["calendar.read", "warrant.issue"],
      resourceConstraints: {
        calendarWindow: {
          startsAt: "2026-03-21T08:00:00.000Z",
          endsAt: "2026-03-21T18:00:00.000Z",
        },
      },
      canDelegate: true,
      maxChildren: 1,
      createdAt: NOW,
      expiresAt: TOMORROW,
    });

    const validation = validateChildWarrant({
      parent,
      child: {
        id: "warrant_calendar_child",
        createdBy: parent.agentId,
        agentId: "calendar_agent",
        purpose: "Read tomorrow's schedule",
        capabilities: ["calendar.read"],
        resourceConstraints: {
          calendarWindow: {
            startsAt: "2026-03-21T07:00:00.000Z",
            endsAt: "2026-03-21T12:00:00.000Z",
          },
        },
        canDelegate: false,
        maxChildren: 0,
        expiresAt: LATER,
      },
      existingChildrenCount: 0,
      now: NOW,
    });

    expect(validation.valid).toBe(false);
    expect(validation.reasons[0]?.code).toBe("child_calendar_window_exceeds_parent");
  });

  it("invalidates descendants when a parent branch is revoked", () => {
    const parent = createParentWarrant();
    const issued = issueChildWarrant({
      parent,
      child: {
        id: "warrant_child",
        createdBy: parent.agentId,
        agentId: "comms_agent",
        purpose: "Draft investor follow-up emails",
        capabilities: ["gmail.draft"],
        resourceConstraints: {
          allowedRecipients: ["ceo@example.com"],
          allowedDomains: ["example.com"],
          maxDrafts: 1,
        },
        canDelegate: false,
        maxChildren: 0,
        expiresAt: LATER,
      },
      existingChildrenCount: 0,
      now: NOW,
    });

    if (!issued.ok) {
      throw new Error("child issuance unexpectedly failed");
    }

    const revoked = revokeWarrantBranch({
      warrants: [parent, issued.warrant],
      warrantId: parent.id,
      revokedAt: LATER,
      revokedBy: "user_1",
      reason: "User revoked the branch.",
    });

    const child = revoked.warrants.find((warrant) => warrant.id === issued.warrant.id);

    expect(child?.status).toBe("revoked");
    expect(child?.revocationSourceId).toBe(parent.id);
    expect(revoked.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          warrantId: parent.id,
          metadata: expect.objectContaining({
            inherited: false,
            revocationSourceId: parent.id,
          }),
        }),
        expect.objectContaining({
          warrantId: issued.warrant.id,
          metadata: expect.objectContaining({
            inherited: true,
            revocationSourceId: parent.id,
          }),
        }),
      ]),
    );

    const result = authorizeAction({
      warrant: child!,
      warrants: revoked.warrants,
      action: {
        id: "action_1",
        kind: "gmail.draft",
        agentId: child!.agentId,
        warrantId: child!.id,
        requestedAt: LATER,
        target: {
          recipients: ["ceo@example.com"],
        },
      },
      now: LATER,
    });

    expect(result.allowed).toBe(false);
    expect(result.code).toBe("warrant_revoked");
  });

  it("blocks disallowed recipients", () => {
    const parent = createParentWarrant();
    const result = authorizeAction({
      warrant: parent,
      warrants: [parent],
      action: {
        id: "action_2",
        kind: "gmail.send",
        agentId: parent.agentId,
        warrantId: parent.id,
        requestedAt: NOW,
        target: {
          recipients: ["outsider@other.com"],
        },
        usage: {
          sendsUsed: 0,
        },
      },
      now: NOW,
    });

    expect(result.allowed).toBe(false);
    expect(result.code).toBe("recipient_not_allowed");
  });

  it("blocks calendar reads outside the warrant window", () => {
    const parent = issueRootWarrant({
      id: "warrant_calendar_read",
      rootRequestId: "root_request_calendar_read",
      createdBy: "user_1",
      agentId: "calendar_agent",
      purpose: "Read schedule context",
      capabilities: ["calendar.read"],
      resourceConstraints: {
        calendarWindow: {
          startsAt: "2026-03-21T08:00:00.000Z",
          endsAt: "2026-03-21T18:00:00.000Z",
        },
      },
      canDelegate: false,
      maxChildren: 0,
      createdAt: NOW,
      expiresAt: TOMORROW,
    });

    const result = authorizeAction({
      warrant: parent,
      warrants: [parent],
      action: {
        id: "action_calendar_1",
        kind: "calendar.read",
        agentId: parent.agentId,
        warrantId: parent.id,
        requestedAt: NOW,
        target: {
          scheduledFor: "2026-03-21T19:00:00.000Z",
        },
      },
      now: NOW,
    });

    expect(result.allowed).toBe(false);
    expect(result.code).toBe("calendar_window_exceeded");
  });

  it("denies expired warrants", () => {
    const parent = createParentWarrant();
    const result = authorizeAction({
      warrant: parent,
      warrants: [parent],
      action: {
        id: "action_3",
        kind: "gmail.draft",
        agentId: parent.agentId,
        warrantId: parent.id,
        requestedAt: "2026-03-22T10:00:00.000Z",
        target: {
          recipients: ["ceo@example.com"],
        },
        usage: {
          draftsUsed: 0,
        },
      },
      now: "2026-03-22T10:00:00.000Z",
    });

    expect(result.allowed).toBe(false);
    expect(result.code).toBe("warrant_expired");
  });

  it("returns a human-readable denial reason", () => {
    const parent = createParentWarrant();
    const result = authorizeAction({
      warrant: parent,
      warrants: [parent],
      action: {
        id: "action_4",
        kind: "gmail.send",
        agentId: parent.agentId,
        warrantId: parent.id,
        requestedAt: NOW,
        target: {
          recipients: ["outsider@other.com"],
        },
        usage: {
          sendsUsed: 0,
        },
      },
      now: NOW,
    });

    expect(result.allowed).toBe(false);
    expect(result.message).toMatch(/approved recipients/i);
  });

  it("denies a draft-only child that attempts gmail.send", () => {
    const parent = createParentWarrant();
    const issued = issueChildWarrant({
      parent,
      child: {
        id: "warrant_child",
        createdBy: parent.agentId,
        agentId: "comms_agent",
        purpose: "Draft investor follow-up emails",
        capabilities: ["gmail.draft"],
        resourceConstraints: {
          allowedRecipients: ["ceo@example.com"],
          allowedDomains: ["example.com"],
          maxDrafts: 1,
        },
        canDelegate: false,
        maxChildren: 0,
        expiresAt: LATER,
      },
      existingChildrenCount: 0,
      now: NOW,
    });

    if (!issued.ok) {
      throw new Error("child issuance unexpectedly failed");
    }

    const result = authorizeAction({
      warrant: issued.warrant,
      warrants: [parent, issued.warrant],
      action: {
        id: "action_send_overreach",
        kind: "gmail.send",
        agentId: issued.warrant.agentId,
        warrantId: issued.warrant.id,
        requestedAt: NOW,
        target: {
          recipients: ["ceo@example.com"],
        },
        usage: {
          sendsUsed: 0,
        },
      },
      now: NOW,
    });

    expect(result.allowed).toBe(false);
    expect(result.code).toBe("capability_missing");
    expect(result.message).toMatch(/gmail\.send/i);
    expect(result.warrantId).toBe(issued.warrant.id);
    expect(result.lineage.parentWarrantId).toBe(parent.id);

    if (result.allowed) {
      throw new Error("send overreach unexpectedly authorized");
    }

    expect(result.blockedByWarrantId).toBe(issued.warrant.id);
  });

  it("preserves lineage metadata in action authorization results", () => {
    const parent = createParentWarrant();
    const issued = issueChildWarrant({
      parent,
      child: {
        id: "warrant_child",
        createdBy: parent.agentId,
        agentId: "comms_agent",
        purpose: "Draft investor follow-up emails",
        capabilities: ["gmail.draft"],
        resourceConstraints: {
          allowedRecipients: ["ceo@example.com"],
          allowedDomains: ["example.com"],
          maxDrafts: 1,
        },
        canDelegate: false,
        maxChildren: 0,
        expiresAt: LATER,
      },
      existingChildrenCount: 0,
      now: NOW,
    });

    if (!issued.ok) {
      throw new Error("child issuance unexpectedly failed");
    }

    const result = authorizeAction({
      warrant: issued.warrant,
      warrants: [parent, issued.warrant],
      action: {
        id: "action_5",
        kind: "gmail.draft",
        agentId: issued.warrant.agentId,
        warrantId: issued.warrant.id,
        requestedAt: NOW,
        target: {
          recipients: ["ceo@example.com"],
        },
        usage: {
          draftsUsed: 0,
        },
      },
      now: NOW,
    });

    expect(result.allowed).toBe(true);
    expect(result.lineage.rootRequestId).toBe(parent.rootRequestId);
    expect(result.lineage.warrantId).toBe(issued.warrant.id);
    expect(result.lineage.parentWarrantId).toBe(parent.id);
    expect(result.lineage.agentId).toBe(issued.warrant.agentId);
    expect(result.metadata.actionId).toBe("action_5");
  });
});
