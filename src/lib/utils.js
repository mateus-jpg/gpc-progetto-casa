import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Serializes Firestore data to plain JSON.
 * Converts Timestamps to ISO strings.
 *
 * Handles multiple Timestamp formats:
 * - Admin SDK Timestamp with toDate() method
 * - Client SDK Timestamp with _seconds/_nanoseconds
 * - GeoPoint with latitude/longitude
 *
 * @param {any} data - Data to serialize (can be any type)
 * @returns {any} Serialized data safe for JSON stringification
 */
export function serializeFirestoreData(data) {
  if (data === null || data === undefined) return data;

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(serializeFirestoreData);
  }

  // Handle objects
  if (typeof data === "object") {
    // Check for Timestamp with toDate() method (Admin SDK or client SDK)
    if (typeof data.toDate === "function") {
      return data.toDate().toISOString();
    }

    // Handle serialized Timestamp structure (_seconds/_nanoseconds)
    if (
      "_seconds" in data &&
      "_nanoseconds" in data &&
      Object.keys(data).length === 2
    ) {
      return new Date(
        data._seconds * 1000 + data._nanoseconds / 1000000,
      ).toISOString();
    }

    // Handle GeoPoint
    if (
      typeof data.latitude === "number" &&
      typeof data.longitude === "number" &&
      Object.keys(data).length === 2
    ) {
      return { latitude: data.latitude, longitude: data.longitude };
    }

    // Handle plain objects recursively
    const plain = {};
    for (const key in data) {
      if (Object.hasOwn(data, key)) {
        plain[key] = serializeFirestoreData(data[key]);
      }
    }
    return plain;
  }

  return data;
}

/**
 * @deprecated Use serializeFirestoreData instead
 * Alias for backward compatibility
 */
export const serializeFirestoreDoc = serializeFirestoreData;

/**
 * Format bytes to human readable string
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}
