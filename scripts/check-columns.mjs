import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pg = require(require.resolve('pg', { paths: ['d:/MapProject/lib/db'] }));

const envContent = fs.readFileSync('d:/MapProject/.env', 'utf8');
const DATABASE_URL = envContent.match(/DATABASE_URL=([^\r\n]+)/)[1].trim();

const { Pool } = pg;
const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  const client = await pool.connect();
  const res = await client.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name IN ('pins', 'user_account', 'user_activity', 'verifications')
    ORDER BY table_name, ordinal_position;
  `);
  console.table(res.rows);
  client.release();
  await pool.end();
}
main().catch(console.error);
