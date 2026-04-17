// app/api/auth/me/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/utils/database";

export async function GET() {
  const cookieName = process.env.SESSION_COOKIE_NAME || "session";
  const cookie = await cookies();
  const token = cookie.get(cookieName)?.value;

  if (!token) return NextResponse.json({ user: null }, { status: 401 });

  try {
    // verify session cookie and enforce revocation check
    const decoded = await auth.verifySessionCookie(token, true);
    const userRecord = await auth.getUser(decoded.uid);

    // Get operator data from Firestore
    const operatorDoc = await collections.operators().doc(decoded.uid).get();
    const operatorData = operatorDoc.exists ? operatorDoc.data() : {};

    return NextResponse.json({
      user: {
        uid: decoded.uid,
        email: decoded.email,
        emailVerified: decoded.email_verified ?? userRecord.emailVerified,
        role: operatorData.role || "user",
        structureIds: operatorData.structureIds || [],
      },
    });
  } catch (err) {
    console.error("verifySessionCookie failed", err);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
