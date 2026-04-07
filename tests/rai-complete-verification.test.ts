import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { runMainScenarioPlannerFlow } from "@/agents";
import {
  createDelegationGraphView,
  createTimelineEventDisplayRecords,
} from "@/demo-fixtures";

function collectSourceFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });

  entries.forEach((entry) => {
    const absolutePath = join(dir, entry.name);

    if (entry.isDirectory()) {
      collectSourceFiles(absolutePath, files);
      return;
    }

    if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(absolutePath);
    }
  });

  return files;
}

describe("rai complete verification truth checks", () => {
  it("keeps Gemma model mapping centralized and env secret hygiene explicit", () => {
    const sourceFiles = collectSourceFiles(join(process.cwd(), "src"));
    const providerModelMatches = sourceFiles
      .filter((filePath) =>
        readFileSync(filePath, "utf8").includes("gemma-4-31b-it"),
      )
      .map((filePath) => relative(process.cwd(), filePath))
      .sort();

    expect(providerModelMatches).toEqual(["src/agents/runtime/config.ts"]);

    const envExample = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    expect(envExample).toContain("GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY");
    expect(envExample).not.toMatch(/GOOGLE_API_KEY=AIza[0-9A-Za-z_-]{20,}/);

    const gitIgnore = readFileSync(join(process.cwd(), ".gitignore"), "utf8");
    expect(gitIgnore).toContain(".env*.local");

    const trackedEnvLocal = execSync("git ls-files .env.local", {
      cwd: process.cwd(),
    })
      .toString()
      .trim();
    expect(trackedEnvLocal).toBe("");
  });

  it("proves runtime actor flow, control-state distinctions, and state surfacing across the main scenario", () => {
    const scenarioRun = runMainScenarioPlannerFlow();
    const scenario = scenarioRun.scenario;
    const controlStates = new Set(
      scenario.controlDecisions.map((decision) => decision.controlState),
    );

    expect(controlStates.has("denied_policy")).toBe(true);
    expect(controlStates.has("approval_required")).toBe(true);
    expect(controlStates.has("approval_approved")).toBe(true);
    expect(controlStates.has("executed")).toBe(true);
    expect(controlStates.has("blocked_revoked")).toBe(true);

    const executedActionIds = scenario.controlDecisions
      .filter((decision) => decision.controlState === "executed")
      .map((decision) => decision.actionId);

    expect(executedActionIds).toEqual([
      "action-calendar-read-001",
      "action-comms-draft-001",
      "action-comms-send-approved-001",
    ]);

    expect(
      scenario.controlDecisions.some(
        (decision) =>
          decision.actionId === "action-comms-send-001" &&
          decision.controlState === "executed",
      ),
    ).toBe(false);

    const calendarActions = scenario.actionAttempts.filter(
      (attempt) => attempt.agentId === "agent-calendar-001",
    );
    const commsActions = scenario.actionAttempts.filter(
      (attempt) => attempt.agentId === "agent-comms-001",
    );

    expect(calendarActions.every((attempt) => attempt.kind.startsWith("calendar."))).toBe(true);
    expect(commsActions.every((attempt) => attempt.kind.startsWith("gmail."))).toBe(true);

    const graph = createDelegationGraphView(scenario);
    const plannerNode = graph.nodes.find((node) => node.id === "warrant-planner-root-001");
    const calendarNode = graph.nodes.find((node) => node.id === "warrant-calendar-child-001");
    const commsNode = graph.nodes.find((node) => node.id === "warrant-comms-child-001");

    expect(plannerNode?.runtimeActorId).toBe("runtime-planner-001");
    expect(calendarNode?.runtimeActorId).toBe("runtime-calendar-001");
    expect(commsNode?.runtimeActorId).toBe("runtime-comms-001");

    const timeline = createTimelineEventDisplayRecords(scenario);
    const actionTimelineEntries = timeline.filter((event) => event.actionId !== null);
    expect(actionTimelineEntries.every((event) => event.runtimeActorId !== null)).toBe(true);

    expect(
      scenario.controlDecisions.some(
        (decision) =>
          decision.actionId === "action-comms-send-overreach-001" &&
          decision.controlState === "denied_policy",
      ),
    ).toBe(true);
    expect(
      scenario.controlDecisions.some(
        (decision) =>
          decision.actionId === "action-comms-send-001" &&
          decision.controlState === "approval_required",
      ),
    ).toBe(true);
    expect(
      scenario.controlDecisions.some(
        (decision) =>
          decision.actionId === "action-comms-send-post-revoke-001" &&
          decision.controlState === "blocked_revoked",
      ),
    ).toBe(true);

    expect(runMainScenarioPlannerFlow()).toEqual(runMainScenarioPlannerFlow());
  });
});
