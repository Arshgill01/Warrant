import { executeSendEmail, prepareGmailDraft, readCalendarAvailability } from "@/actions";
import { getAuthSessionSnapshot } from "@/auth";
import { AuthShell } from "@/components/auth-shell/auth-shell";
import {
  getGoogleConnectionSetupSnapshot,
  getGoogleConnectionSnapshot,
  readGoogleConnectFlowContext,
} from "@/connections";
import { authShellProviderRequests } from "@/demo-fixtures";

export const dynamic = "force-dynamic";

type PageSearchParams = Record<string, string | string[] | undefined>;

interface HomeProps {
  searchParams?: Promise<PageSearchParams>;
}

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const connectFlow = readGoogleConnectFlowContext(resolvedSearchParams);
  const session = await getAuthSessionSnapshot();
  const googleSetup = getGoogleConnectionSetupSnapshot();
  const googleConnection = await getGoogleConnectionSnapshot(session, {
    connectFlow,
  });

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
      googleSetup={googleSetup}
    />
  );
}
