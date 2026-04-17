import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/firebaseAdmin";

export async function GET(req) {
  try {
    const cookieName = process.env.SESSION_COOKIE_NAME || "session";
    const sessionCookie = req.cookies.get(cookieName)?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    // Verify session cookie with checkRevoked=true for security
    const decodedToken = await auth.verifySessionCookie(sessionCookie, true);

    return NextResponse.json({
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        email_verified: decodedToken.email_verified,
      },
    });
  } catch (error) {
    console.error("Session verification error:", error);
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
}
