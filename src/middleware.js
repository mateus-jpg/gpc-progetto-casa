import { NextResponse } from "next/server";
import { getCachedSession, setCachedSession } from "@/utils/session-cache";

function sanitizeHeader(value) {
  return (value || "").replace(/[\r\n]/g, "");
}

function getConfiguredOrigin() {
  const configured =
    process.env.AUTH_VERIFY_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "";

  if (!configured) return null;

  try {
    return new URL(configured).origin;
  } catch {
    return null;
  }
}

function getForwardedOrigin(req) {
  const host = (
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    ""
  )
    .split(",")[0]
    .trim();

  if (!host) return null;

  const protocol =
    req.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim()
      ?.toLowerCase() ||
    req.nextUrl.protocol.replace(":", "") ||
    "http";

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

function getVerifyUrl(req) {
  const configuredOrigin = getConfiguredOrigin();
  if (configuredOrigin) {
    return new URL("/api/auth/verify", configuredOrigin);
  }

  const forwardedOrigin = getForwardedOrigin(req);
  return new URL("/api/auth/verify", forwardedOrigin || req.nextUrl.origin);
}

function createResponseWithUserHeaders(req, user) {
  const headers = new Headers(req.headers);
  headers.set("x-user-uid", sanitizeHeader(user.uid));
  headers.set("x-user-email", sanitizeHeader(user.email));
  if (user.role) headers.set("x-user-role", sanitizeHeader(user.role));
  if (user.structureIds)
    headers.set("x-user-structures", JSON.stringify(user.structureIds));
  return NextResponse.next({ request: { headers } });
}

export async function middleware(req) {
  const cookieName = process.env.SESSION_COOKIE_NAME || "session";
  const sessionCookie = req.cookies.get(cookieName)?.value;

  const { pathname } = req.nextUrl;
  const publicPaths = [
    "/login",
    "/api/auth/sessionLogin",
    "/_next",
    "/static",
    "/favicon.ico",
  ];

  // Allow public paths to pass through
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // If there's no cookie, redirect to login
  if (!sessionCookie) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check session cache first (reduces /api/auth/verify calls)
  const cachedUser = getCachedSession(sessionCookie);
  if (cachedUser) {
    return createResponseWithUserHeaders(req, cachedUser);
  }

  // Cache miss - verify session via API
  const verifyUrl = getVerifyUrl(req);

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const verifyRes = await fetch(verifyUrl, {
      headers: {
        cookie: req.headers.get("cookie") || "",
        "cache-control": "no-cache",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!verifyRes.ok) {
      throw new Error("Session verification fetch failed");
    }

    const { user } = await verifyRes.json();

    // Cache the verified session for future requests
    setCachedSession(sessionCookie, user);

    return createResponseWithUserHeaders(req, user);
  } catch (error) {
    // Session verification failed - redirect to login
    if (process.env.NODE_ENV !== "production") {
      console.error(
        `Session verification error for ${pathname}:`,
        error.message,
      );
    }

    // If verification fails, clear the invalid cookie and redirect
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set(cookieName, "", { maxAge: -1, path: "/" });

    return response;
  }
}

export const config = {
  matcher: [
    "/((?!api/auth/sessionLogin|api/auth/|api/auth/verify|_next/static|_next/image|favicon.ico|.*\\.css).*)",
  ],
};
