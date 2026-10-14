import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pg = require(require.resolve('pg', { paths: ['d:/MapProject/lib/db'] }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const dbUrlMatch = envContent.match(/DATABASE_URL=([^\r\n]+)/);
if (!dbUrlMatch) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

const DATABASE_URL = dbUrlMatch[1].trim();
console.log('Connecting to Supabase PostgreSQL...');

const { Pool } = pg;
const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  const client = await pool.connect();
  console.log('Connected successfully!');

  const usersRes = await client.query('SELECT id, name, username, email, role, level FROM user_account ORDER BY id ASC');
  console.log(`\nFound ${usersRes.rows.length} users in user_account:`);
  console.table(usersRes.rows);

  const pinsRes = await client.query('SELECT id, name, category, lat, lng, status, total_points, created_by_id FROM pins ORDER BY id ASC');
  console.log(`\nFound ${pinsRes.rows.length} existing pins in pins table.`);
  if (pinsRes.rows.length > 0) {
    console.log('Sample pins (first 5):');
    console.table(pinsRes.rows.slice(0, 5));
  }

  const verifRes = await client.query('SELECT COUNT(*) as count FROM verifications');
  console.log(`\nFound ${verifRes.rows[0].count} existing verification records in verifications table.`);

  client.release();
  await pool.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
