import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL');
}

const sql = neon(databaseUrl);

await sql`ALTER TABLE eventos ADD COLUMN IF NOT EXISTS fecha date`;
await sql`ALTER TABLE eventos ADD COLUMN IF NOT EXISTS hora_inicio time`;
await sql`ALTER TABLE eventos ADD COLUMN IF NOT EXISTS hora_fin time`;
await sql`ALTER TABLE eventos ALTER COLUMN tipo_eventos DROP IDENTITY IF EXISTS`;

console.log('events schema migrated');