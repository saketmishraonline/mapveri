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
  await client.query(`
    CREATE TABLE IF NOT EXISTS redemptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
      crypto TEXT NOT NULL,
      tokens INTEGER NOT NULL,
      crypto_amount NUMERIC(18, 8) NOT NULL,
      wallet_address TEXT NOT NULL,
      tx_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
  console.log('Table redemptions created successfully or already exists!');
  client.release();
  await pool.end();
}

main().catch(console.error);
