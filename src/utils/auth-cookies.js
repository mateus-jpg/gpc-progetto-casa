export function isSecureRequest(req) {
  const forwardedProto = req.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    ?.toLowerCase();

  if (forwardedProto) {
    return forwardedProto === "https";
  }

  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
}
