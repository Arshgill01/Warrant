import { describe, expect, it } from "vitest";
import {
  buildSendApprovalBoundarySummary,
  buildSendApprovalStateMatrix,
  buildSendApprovalStateRecord,
  createSendApprovalRequest,
} from "@/approvals";

describe("send approval flow", () => {
  it("creates an explicit approval request with exact preview fields", () => {
    const request = createSendApprovalRequest({
      id: "approval-1",
      actionId: "action-1",
      warrantId: "warrant-1",
      requestedByAgentId: "agent-1",
      title: "Approve investor follow-up send",
      reason: "Live send needs approval.",
      subject: "Investor follow-up",
      bodyText: "Please review before send.",
      to: ["founders@northstar.vc"],
      cc: ["maya@northstar.vc"],
      requestedAt: "2026-04-17T09:10:00.000Z",
      expiresAt: "2026-04-17T18:00:00.000Z",
      draftId: "draft-1",
      blastRadius: "One email will be sent.",
    });

    expect(request).toEqual(
      expect.objectContaining({
        provider: "auth0",
        status: "pending",
        affectedRecipients: ["founders@northstar.vc"],
      }),
    );
    expect(request.preview).toEqual(
      expect.objectContaining({
        actionKind: "gmail.send",
        subject: "Investor follow-up",
        to: ["founders@northstar.vc"],
        cc: ["maya@northstar.vc"],
        draftId: "draft-1",
      }),
    );
  });

  it("keeps execution blocked until approval becomes approved", () => {
    const pending = buildSendApprovalBoundarySummary("pending");
    const approved = buildSendApprovalBoundarySummary("approved");
    const denied = buildSendApprovalBoundarySummary("denied");

    expect(pending.localEligibility.state).toBe("ready");
    expect(pending.approvalRequirement.state).toBe("pending");
    expect(pending.executionReadiness.state).toBe("pending");
    expect(approved.approvalRequirement.state).toBe("ready");
    expect(approved.executionReadiness.state).toBe("ready");
    expect(denied.executionReadiness.state).toBe("blocked");
  });

  it("covers the full deterministic send approval state ladder", () => {
    const states = buildSendApprovalStateMatrix();

    expect(states.map((state) => state.state)).toEqual([
      "not-requested",
      "pending",
      "approved",
      "denied",
      "unavailable",
      "error",
    ]);
    expect(buildSendApprovalStateRecord("approved")).toEqual(
      expect.objectContaining({
        executionReady: true,
        release: expect.objectContaining({
          releasedBy: "approval-layer",
        }),
      }),
    );
    expect(buildSendApprovalStateRecord("error").executionReady).toBe(false);
  });
});
