import { executeSendEmail, prepareGmailDraft, readCalendarAvailability } from "@/actions";
import { getAuthSessionSnapshot } from "@/auth";
import { AuthShell } from "@/components/auth-shell/auth-shell";
import { getGoogleConnectionSnapshot } from "@/connections";
import { authShellProviderRequests } from "@/demo-fixtures";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getAuthSessionSnapshot();
  const googleConnection = await getGoogleConnectionSnapshot(session);

  const [calendarAvailability, gmailDraft, gmailSend] = await Promise.all([
    readCalendarAvailability(authShellProviderRequests.calendarAvailability, {
      session,
      connection: googleConnection,
    }),
    prepareGmailDraft(authShellProviderRequests.gmailDraft, {
      session,
      connection: googleConnection,
    }),
    executeSendEmail(authShellProviderRequests.gmailSend, {
      session,
      connection: googleConnection,
    }),
  ]);

  return (
    <AuthShell
      session={session}
      googleConnection={googleConnection}
      providerResults={[calendarAvailability, gmailDraft, gmailSend]}
    />
  );
}
