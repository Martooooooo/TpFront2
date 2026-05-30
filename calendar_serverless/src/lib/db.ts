import { neon } from '@neondatabase/serverless';

let _sql: any = null;

function ensureClient() {
  if (_sql) return _sql;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Falta DATABASE_URL en calendar_serverless/.env');
  }

  _sql = neon(databaseUrl);
  return _sql;
}

// Export a function suitable for use as a tagged template: `await sql` or `await sql.query()`
export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  const client = ensureClient();
  // When used as a tagged template call, forward the call to the underlying client
  return (client as any)(strings, ...values);
}

// Also expose direct client getter for advanced usage
export function getClient() {
  return ensureClient();
}