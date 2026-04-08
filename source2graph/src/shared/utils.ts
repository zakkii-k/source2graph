import { createHash } from 'crypto'

/**
 * Normalize a file path to use forward slashes regardless of OS.
 * Explicitly replaces all backslashes so the result is consistent on Windows too.
 */
export function normalizeFilePath(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

/**
 * Generate a deterministic node ID from its constituent parts.
 * Format: "Label:normalizedPath:qualifiedName"
 */
export function generateNodeId(label: string, filePath: string, qualifiedName: string): string {
  const normalized = normalizeFilePath(filePath)
  return `${label}:${normalized}:${qualifiedName}`
}

/**
 * Generate a node ID for method overloads, appending param count for uniqueness.
 */
export function generateMethodNodeId(filePath: string, qualifiedName: string, paramCount: number): string {
  const normalized = normalizeFilePath(filePath)
  return `Method:${normalized}:${qualifiedName}#${paramCount}`
}

/**
 * Generate a deterministic relationship ID.
 */
export function generateRelationshipId(type: string, startNodeId: string, endNodeId: string): string {
  const raw = `${type}:${startNodeId}->${endNodeId}`
  return createHash('sha1').update(raw).digest('hex').slice(0, 16)
}

/**
 * Escape a string value for CSV output (RFC 4180).
 */
export function escapeCsvValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Format a row of values as a CSV line.
 */
export function toCsvLine(values: (string | number | boolean | null | undefined)[]): string {
  return values.map(escapeCsvValue).join(',')
}
