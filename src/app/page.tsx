import { getCalendarReadResult, getGmailDraftResult, getGmailSendResult } from "@/actions";
import { getAuthSessionSnapshot } from "@/auth";
import { AuthShell } from "@/components/auth-shell/auth-shell";
import { getGoogleConnectionSnapshot } from "@/connections";
import { authShellPolicies, authShellSendApprovalStatus } from "@/demo-fixtures";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getAuthSessionSnapshot();
  const googleConnection = await getGoogleConnectionSnapshot(session);

  const actionResults = await Promise.all([
    getCalendarReadResult({
      session,
      connection: googleConnection,
      policy: authShellPolicies.calendarRead,
    }),
    getGmailDraftResult({
      session,
      connection: googleConnection,
      policy: authShellPolicies.gmailDraft,
    }),
    getGmailSendResult({
      session,
      connection: googleConnection,
      policy: authShellPolicies.gmailSend,
      approvalStatus: authShellSendApprovalStatus,
    }),
  ]);

  return (
    <AuthShell
      session={session}
      googleConnection={googleConnection}
      actionPaths={actionResults.map((result) => result.path)}
    />
  );
}
