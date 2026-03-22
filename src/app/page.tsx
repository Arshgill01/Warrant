import { getCalendarReadPath, getGmailDraftPath, getGmailSendPath } from "@/actions";
import { getAuthSessionSnapshot } from "@/auth";
import { AuthShell } from "@/components/auth-shell/auth-shell";
import { getGoogleConnectionSetupSnapshot, getGoogleConnectionSnapshot } from "@/connections";
import { authShellPolicies, authShellSendApprovalStatus } from "@/demo-fixtures";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getAuthSessionSnapshot();
  const googleSetup = getGoogleConnectionSetupSnapshot();
  const googleConnection = await getGoogleConnectionSnapshot(session);

  const [calendarReadPath, gmailDraftPath, gmailSendPath] = await Promise.all([
    getCalendarReadPath({
      session,
      connection: googleConnection,
      policy: authShellPolicies.calendarRead,
    }),
    getGmailDraftPath({
      session,
      connection: googleConnection,
      policy: authShellPolicies.gmailDraft,
    }),
    getGmailSendPath({
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
      googleSetup={googleSetup}
      actionPaths={[calendarReadPath, gmailDraftPath, gmailSendPath]}
    />
  );
}
