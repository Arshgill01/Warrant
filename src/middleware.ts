import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth0 } from "@/auth";
import { getAuth0Environment } from "@/auth/env";

function isAuthRoute(pathname: string): boolean {
  return pathname === "/auth" || pathname.startsWith("/auth/");
}

function createAuthUnavailableResponse(): NextResponse {
  const authEnv = getAuth0Environment();

  return NextResponse.json(
    {
      error: "Auth0 routes are unavailable because server auth configuration is incomplete.",
      missingValues: authEnv.missingValues,
      invalidValues: authEnv.invalidValues,
      nextStep:
        "Set APP_BASE_URL, AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, and AUTH0_SECRET, then redeploy.",
    },
    {
      status: 503,
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

export async function middleware(request: NextRequest) {
  if (!auth0) {
    if (isAuthRoute(request.nextUrl.pathname)) {
      return createAuthUnavailableResponse();
    }

    return NextResponse.next();
  }

  return auth0.middleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
