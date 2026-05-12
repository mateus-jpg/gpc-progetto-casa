import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/firebaseAdmin";
import { isSecureRequest } from "@/utils/auth-cookies";
import { logger } from "@/utils/logger";

export async function POST(req) {
  try {
    const cookieName = process.env.SESSION_COOKIE_NAME || "session";
    const sessionCookie = req.cookies.get(cookieName)?.value;

    // Create response first
    const response = NextResponse.json({ success: true });

    // Always clear the cookie, regardless of whether we can verify/revoke it
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      secure: isSecureRequest(req),
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    if (sessionCookie) {
      try {
        // Security: Verify session cookie with checkRevoked=true
        const decodedToken = await auth.verifySessionCookie(
          sessionCookie,
          true,
        );
        await auth.revokeRefreshTokens(decodedToken.uid);

        logger.info("Session tokens revoked", { uid: decodedToken.uid });
      } catch (error) {
        logger.warn("Error revoking session", { error: error.message });
        // Continue with logout even if revocation fails
        // The cookie is still cleared above
      }
    }

    return response;
  } catch (error) {
    logger.error("Session logout error", error);

    // Even if there's an error, try to clear the cookie
    const response = NextResponse.json(
      { error: "Logout failed" },
      { status: 500 },
    );
    response.cookies.set(process.env.SESSION_COOKIE_NAME || "session", "", {
      httpOnly: true,
      secure: isSecureRequest(req),
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  }
}
