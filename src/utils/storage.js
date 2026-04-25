import path from "node:path";

export function normalizeBucketName(bucketName) {
  if (!bucketName || typeof bucketName !== "string") {
    return null;
  }

  const normalized = bucketName
    .trim()
    .replace(/^gs:\/\//, "")
    .replace(/\/+$/, "");
  return normalized || null;
}

function sanitizeObjectPath(candidatePath) {
  if (!candidatePath || typeof candidatePath !== "string") {
    return null;
  }

  const trimmed = candidatePath.trim();
  if (!trimmed || trimmed.includes("..")) {
    return null;
  }

  const normalized = path.posix.normalize(trimmed).replace(/^\/+/, "");
  if (!normalized || normalized === "." || normalized.includes("..")) {
    return null;
  }

  return normalized;
}

export function normalizeStorageObjectPath(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return null;
  }

  const trimmed = filePath.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("gs://")) {
    try {
      const url = new URL(trimmed);
      return sanitizeObjectPath(decodeURIComponent(url.pathname));
    } catch {
      return null;
    }
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);

      if (url.pathname.includes("/o/")) {
        const objectPath = url.pathname.split("/o/")[1];
        return sanitizeObjectPath(decodeURIComponent(objectPath));
      }

      if (url.hostname === "storage.googleapis.com") {
        const [, , ...objectSegments] = url.pathname.split("/");
        return sanitizeObjectPath(decodeURIComponent(objectSegments.join("/")));
      }
    } catch {
      return null;
    }
  }

  return sanitizeObjectPath(trimmed);
}

export function buildStorageBucketCandidates({
  defaultBucketName,
  envBucketName,
  publicBucketName,
  projectId,
} = {}) {
  const candidates = [];

  const pushCandidate = (value) => {
    const normalized = normalizeBucketName(value);
    if (normalized && !candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  pushCandidate(defaultBucketName);
  pushCandidate(envBucketName);
  pushCandidate(publicBucketName);
  pushCandidate(projectId);

  const normalizedProjectId = normalizeBucketName(projectId);
  if (normalizedProjectId) {
    pushCandidate(`${normalizedProjectId}.appspot.com`);
    pushCandidate(`${normalizedProjectId}.firebasestorage.app`);
  }

  return candidates;
}

export async function resolveExistingStorageObject(
  storage,
  filePath,
  options = {},
) {
  const normalizedPath = normalizeStorageObjectPath(filePath);
  if (!normalizedPath) {
    return null;
  }

  let defaultBucketName = options.defaultBucketName;
  if (!defaultBucketName) {
    try {
      defaultBucketName = storage.bucket().name;
    } catch {
      defaultBucketName = null;
    }
  }

  const bucketCandidates = buildStorageBucketCandidates({
    defaultBucketName,
    envBucketName: options.envBucketName ?? process.env.FIREBASE_STORAGE_BUCKET,
    publicBucketName:
      options.publicBucketName ??
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    projectId: options.projectId ?? process.env.FIREBASE_PROJECT_ID,
  });

  for (const bucketName of bucketCandidates) {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(normalizedPath);
    const [exists] = await file.exists();

    if (exists) {
      return {
        bucket,
        file,
        path: normalizedPath,
      };
    }
  }

  return null;
}
