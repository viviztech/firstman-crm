/**
 * Postgres unique-violation error code (23505) as thrown by the postgres-js driver that
 * drizzle-orm sits on top of — drizzle doesn't wrap this in its own error type, so a caller that
 * needs to distinguish "duplicate key" from any other DB failure has to check the raw driver
 * error shape (surfaced as `.cause` on the Error drizzle throws) directly.
 */
export function isUniqueViolation(error: unknown, constraintName?: string): boolean {
  if (!(error instanceof Error)) return false;
  const cause = (error as { cause?: unknown }).cause ?? error;
  if (!cause || typeof cause !== "object") return false;
  const pgError = cause as { code?: string; constraint_name?: string };
  if (pgError.code !== "23505") return false;
  return constraintName ? pgError.constraint_name === constraintName : true;
}
