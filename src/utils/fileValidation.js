/**
 * File validation utilities
 * Provides consistent file validation across the application
 */

// Maximum file size: 10MB
export const FILE_SIZE_LIMIT = 10 * 1024 * 1024;

// Allowed file types
export const ALLOWED_MIME_TYPES = [
  // Images
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // Text
  "text/plain",
  "text/csv",
];

/**
 * Magic numbers (file signatures) for validating file content
 * Maps MIME types to their expected file signatures
 */
export const FILE_SIGNATURES = {
  "image/jpeg": [
    [0xff, 0xd8, 0xff, 0xe0],
    [0xff, 0xd8, 0xff, 0xe1],
    [0xff, 0xd8, 0xff, 0xe2],
    [0xff, 0xd8, 0xff, 0xe3],
    [0xff, 0xd8, 0xff, 0xe8],
  ],
  "image/jpg": [
    [0xff, 0xd8, 0xff, 0xe0],
    [0xff, 0xd8, 0xff, 0xe1],
    [0xff, 0xd8, 0xff, 0xe2],
    [0xff, 0xd8, 0xff, 0xe3],
    [0xff, 0xd8, 0xff, 0xe8],
  ],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF (followed by WEBP at offset 8)
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
  // MS Office documents (ZIP-based OOXML)
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    [0x50, 0x4b, 0x03, 0x04],
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    [0x50, 0x4b, 0x03, 0x04],
  ],
  // Legacy MS Office (OLE compound document)
  "application/msword": [[0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]],
  "application/vnd.ms-excel": [
    [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
  ],
};

/**
 * Validates file content by checking magic numbers (file signatures)
 * This prevents MIME type spoofing attacks
 *
 * @param {Buffer} buffer - File content as buffer
 * @param {string} claimedMimeType - The MIME type claimed by the client
 * @returns {boolean} True if file signature matches claimed MIME type
 */
export function validateFileSignature(buffer, claimedMimeType) {
  const signatures = FILE_SIGNATURES[claimedMimeType];

  // For text files, we can't validate by signature - allow them but with size limits
  if (claimedMimeType === "text/plain" || claimedMimeType === "text/csv") {
    // Basic check: ensure it's valid UTF-8 text (no null bytes in first KB)
    const sampleSize = Math.min(buffer.length, 1024);
    for (let i = 0; i < sampleSize; i++) {
      if (buffer[i] === 0x00) {
        return false; // Binary file disguised as text
      }
    }
    return true;
  }

  // If we don't have signatures for this type, reject to be safe
  if (!signatures) {
    return false;
  }

  // Check if buffer starts with any of the valid signatures
  return signatures.some((signature) => {
    if (buffer.length < signature.length) return false;
    return signature.every((byte, index) => buffer[index] === byte);
  });
}

/**
 * Validates a single file
 *
 * @param {File} file - File to validate
 * @returns {Object} Validation result with isValid flag and error message
 */
export function validateFile(file) {
  if (!file) {
    return {
      isValid: false,
      error: "No file provided",
    };
  }

  // Check file size
  if (file.size > FILE_SIZE_LIMIT) {
    return {
      isValid: false,
      error: `File size exceeds limit of ${FILE_SIZE_LIMIT / 1024 / 1024}MB`,
    };
  }

  // Check file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  return {
    isValid: true,
    error: null,
  };
}

/**
 * Validates multiple files
 *
 * @param {File[]} files - Array of files to validate
 * @returns {Object} Validation result with isValid flag, errors array, and valid files
 */
export function validateFiles(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return {
      isValid: false,
      errors: ["No files provided"],
      validFiles: [],
    };
  }

  const results = files.map((file) => ({
    file,
    validation: validateFile(file),
  }));

  const errors = results
    .filter((r) => !r.validation.isValid)
    .map((r) => `${r.file.name}: ${r.validation.error}`);

  const validFiles = results
    .filter((r) => r.validation.isValid)
    .map((r) => r.file);

  return {
    isValid: errors.length === 0,
    errors,
    validFiles,
  };
}

/**
 * Formats file size for display
 *
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size (e.g., "1.5 MB")
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
}
