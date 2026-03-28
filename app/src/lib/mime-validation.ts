/**
 * Server-side MIME type validation using magic bytes.
 * Detects file type from the first bytes of the file buffer and
 * validates it against the declared content type.
 */

interface MimeMatch {
  mime: string
  /** Alternate MIME types that are considered equivalent */
  aliases?: string[]
}

const MAGIC_BYTES: { bytes: number[]; offset: number; match: MimeMatch }[] = [
  // PDF: %PDF
  { bytes: [0x25, 0x50, 0x44, 0x46], offset: 0, match: { mime: 'application/pdf' } },
  // PNG: 0x89 P N G
  { bytes: [0x89, 0x50, 0x4e, 0x47], offset: 0, match: { mime: 'image/png' } },
  // JPEG: FFD8FF
  { bytes: [0xff, 0xd8, 0xff], offset: 0, match: { mime: 'image/jpeg', aliases: ['image/jpg'] } },
  // ZIP-based Office formats (DOCX, XLSX, etc.): PK\x03\x04
  {
    bytes: [0x50, 0x4b, 0x03, 0x04],
    offset: 0,
    match: {
      mime: 'application/zip',
      aliases: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ],
    },
  },
  // Legacy Office formats (DOC, XLS): D0CF11E0
  {
    bytes: [0xd0, 0xcf, 0x11, 0xe0],
    offset: 0,
    match: {
      mime: 'application/x-cfb',
      aliases: [
        'application/msword',
        'application/vnd.ms-excel',
        'application/vnd.ms-powerpoint',
      ],
    },
  },
]

/** MIME types that are allowed for document uploads */
const ALLOWED_DECLARED_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv',
])

/**
 * Checks if a buffer contains only text-like content (for CSV validation).
 * Allows printable ASCII, tabs, newlines, and common UTF-8 characters.
 */
function isTextContent(buffer: Uint8Array): boolean {
  for (let i = 0; i < Math.min(buffer.length, 8192); i++) {
    const byte = buffer[i]
    // Allow tab (0x09), newline (0x0A), carriage return (0x0D), and printable ASCII (0x20-0x7E)
    // Also allow UTF-8 continuation bytes (0x80-0xFF)
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20 && byte !== 0x1b)) {
      // Found a binary control character that isn't whitespace
      return false
    }
  }
  return true
}

export interface MimeValidationResult {
  valid: boolean
  detectedType: string | null
  error?: string
}

/**
 * Validates that file content matches the declared MIME type.
 * Returns { valid: true } if the content matches, or { valid: false, error: string } if not.
 */
export function validateMimeType(
  buffer: Uint8Array,
  declaredType: string,
): MimeValidationResult {
  const normalizedDeclared = declaredType.toLowerCase().trim()

  // Check if the declared type is in the allowed list
  if (!ALLOWED_DECLARED_TYPES.has(normalizedDeclared)) {
    return {
      valid: false,
      detectedType: null,
      error: `File type "${normalizedDeclared}" is not allowed`,
    }
  }

  // For CSV/text files, verify there's no binary content
  if (normalizedDeclared === 'text/csv' || normalizedDeclared === 'application/csv') {
    if (buffer.length > 0 && !isTextContent(buffer)) {
      return {
        valid: false,
        detectedType: 'binary',
        error: 'File declared as CSV contains binary content',
      }
    }
    return { valid: true, detectedType: 'text/csv' }
  }

  // Need at least 4 bytes to check magic bytes
  if (buffer.length < 4) {
    return {
      valid: false,
      detectedType: null,
      error: 'File too small to validate type',
    }
  }

  // Check magic bytes
  for (const entry of MAGIC_BYTES) {
    const { bytes, offset, match } = entry
    if (buffer.length < offset + bytes.length) continue

    let matched = true
    for (let i = 0; i < bytes.length; i++) {
      if (buffer[offset + i] !== bytes[i]) {
        matched = false
        break
      }
    }

    if (matched) {
      // Check if the declared type matches this detection
      if (
        normalizedDeclared === match.mime ||
        match.aliases?.includes(normalizedDeclared)
      ) {
        return { valid: true, detectedType: match.mime }
      }
      return {
        valid: false,
        detectedType: match.mime,
        error: `File content (${match.mime}) does not match declared type (${normalizedDeclared})`,
      }
    }
  }

  // No magic bytes matched
  return {
    valid: false,
    detectedType: null,
    error: `Could not verify file content matches declared type (${normalizedDeclared})`,
  }
}
