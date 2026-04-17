import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/firebaseAdmin";
import { validateSessionLogin } from "@/schemas/auth";
import { logger } from "@/utils/logger";
import { rateLimiters } from "@/utils/rateLimit";

export async function POST(req) {
  // Apply rate limiting
  const rateLimitResponse = rateLimiters.login(req);
  if (rateLimitResponse) {
    logger.warn("Rate limit exceeded for login", {
      ip: req.headers.get("x-forwarded-for"),
    });
    return rateLimitResponse;
  }

  try {
    // Parse and validate request body
    const rawBody = await req.json();
    const validation = validateSessionLogin(rawBody);

    if (!validation.success) {
      logger.warn("Invalid session login request", { error: validation.error });
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { idToken } = validation.data;

    // Verify the ID token first
    const decodedToken = await auth.verifyIdToken(idToken);

    // Create session cookie (5 days expiry)
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn,
    });

    const response = NextResponse.json({
      success: true,
      uid: decodedToken.uid,
    });

    const cookieName = process.env.SESSION_COOKIE_NAME || "session";

    // Set new secure cookie with proper attributes
    response.cookies.set(cookieName, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: expiresIn / 1000,
      path: "/",
    });

    logger.info("Session created", { uid: decodedToken.uid });

    return response;
  } catch (error) {
    logger.error("Session login error", error);

    // Don't expose internal error details
    const isTokenExpired =
      error.message?.includes("Token expired") ||
      error.code === "auth/id-token-expired";

    return NextResponse.json(
      {
        error: isTokenExpired
          ? "Session expired, please try again"
          : "Authentication failed",
      },
      { status: 401 },
    );
  }
}
