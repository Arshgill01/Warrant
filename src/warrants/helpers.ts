import type { ActionAttempt, ActionKind } from "@/contracts/action";
import type {
  CalendarWindowConstraint,
  WarrantContract,
  WarrantLineage,
  WarrantResourceConstraints,
} from "@/contracts/warrant";

export function normalizeCapabilities(
  capabilities: readonly ActionKind[],
): ActionKind[] {
  return [...new Set(capabilities)];
}

export function normalizeCalendarWindow(
  calendarWindow?: CalendarWindowConstraint,
): CalendarWindowConstraint | undefined {
  if (!calendarWindow) {
    return undefined;
  }

  return {
    startsAt: calendarWindow.startsAt,
    endsAt: calendarWindow.endsAt,
  };
}

export function normalizeStringList(
  values?: readonly string[],
  options: { lowerCase?: boolean } = {},
): string[] | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }

  const normalized = values.map((value) =>
    options.lowerCase ? value.toLowerCase() : value,
  );

  return [...new Set(normalized)];
}

export function normalizeResourceConstraints(
  constraints?: WarrantResourceConstraints,
): WarrantResourceConstraints {
  return {
    allowedRecipients: normalizeStringList(constraints?.allowedRecipients, {
      lowerCase: true,
    }),
    allowedDomains: normalizeStringList(constraints?.allowedDomains, {
      lowerCase: true,
    }),
    maxSends: constraints?.maxSends,
    maxDrafts: constraints?.maxDrafts,
    calendarWindow: normalizeCalendarWindow(constraints?.calendarWindow),
    allowedFolderIds: normalizeStringList(constraints?.allowedFolderIds),
  };
}

export function toTimestamp(value: string): number {
  return new Date(value).getTime();
}

export function isWithinCalendarWindow(
  target: string,
  calendarWindow: CalendarWindowConstraint,
): boolean {
  const targetTime = toTimestamp(target);

  return (
    targetTime >= toTimestamp(calendarWindow.startsAt) &&
    targetTime <= toTimestamp(calendarWindow.endsAt)
  );
}

export function isChildWindowWithinParent(
  childWindow: CalendarWindowConstraint,
  parentWindow: CalendarWindowConstraint,
): boolean {
  return (
    toTimestamp(childWindow.startsAt) >= toTimestamp(parentWindow.startsAt) &&
    toTimestamp(childWindow.endsAt) <= toTimestamp(parentWindow.endsAt)
  );
}

export function createWarrantMap(
  warrants: readonly WarrantContract[],
): Map<string, WarrantContract> {
  return new Map(warrants.map((warrant) => [warrant.id, warrant]));
}

export function collectDescendantIds(
  warrants: readonly WarrantContract[],
  warrantId: string,
): string[] {
  const descendants: string[] = [];
  const queue = [warrantId];

  while (queue.length > 0) {
    const currentId = queue.shift();

    if (!currentId) {
      continue;
    }

    for (const warrant of warrants) {
      if (warrant.parentId === currentId) {
        descendants.push(warrant.id);
        queue.push(warrant.id);
      }
    }
  }

  return descendants;
}

export function createLineage(warrant: WarrantContract): WarrantLineage {
  return {
    rootRequestId: warrant.rootRequestId,
    warrantId: warrant.id,
    parentWarrantId: warrant.parentId,
    agentId: warrant.agentId,
  };
}

export function getActionRecipients(action: ActionAttempt): string[] {
  const recipients = action.target?.recipients;

  if (!recipients || recipients.length === 0) {
    return [];
  }

  return recipients.map((recipient) => recipient.toLowerCase());
}

export function getRecipientDomain(recipient: string): string {
  const parts = recipient.toLowerCase().split("@");
  return parts[parts.length - 1] ?? recipient.toLowerCase();
}

export function hasCapability(
  capabilities: readonly ActionKind[],
  capability: ActionKind,
): boolean {
  return capabilities.includes(capability);
}

export function actionUsesRecipients(kind: ActionKind): boolean {
  return kind === "gmail.draft" || kind === "gmail.send";
}

export function capabilitiesUseRecipients(
  capabilities: readonly ActionKind[],
): boolean {
  return capabilities.some((capability) => actionUsesRecipients(capability));
}

export function capabilitiesUseCalendar(
  capabilities: readonly ActionKind[],
): boolean {
  return capabilities.includes("calendar.schedule");
}

export function capabilitiesUseFolders(
  capabilities: readonly ActionKind[],
): boolean {
  return capabilities.includes("docs.read");
}
