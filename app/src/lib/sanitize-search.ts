/**
 * Escapes PostgREST special characters in user-provided search input.
 * Prevents injection into `.ilike()` and `.or()` filter expressions.
 */
export function sanitizePostgrestSearch(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/,/g, '\\,')
    .replace(/\./g, '\\.')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}
