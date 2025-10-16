import { readFileSync } from 'fs';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sql = readFileSync('src/db/schema.sql', 'utf8');
  await pool.query(sql);
  await pool.end();
  console.log('Migration completed');
}
main().catch((e) => { console.error(e); process.exit(1); });
