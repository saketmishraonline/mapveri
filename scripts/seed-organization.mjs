import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const bcrypt = require(require.resolve('bcryptjs', { paths: ['d:/MapProject/apps/api-server'] }));
const pg = require(require.resolve('pg', { paths: ['d:/MapProject/lib/db'] }));

const envContent = fs.readFileSync('d:/MapProject/.env', 'utf8');
const DATABASE_URL = envContent.match(/DATABASE_URL=([^\r\n]+)/)[1].trim();

const { Pool } = pg;
const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  const client = await pool.connect();
  
  // Check if organization already exists
  const check = await client.query(`
    SELECT id, name, username, email, role FROM user_account 
    WHERE role = 'organization' OR username = 'apex_trucking' OR email = 'fleet@apextrucking.com'
  `);

  if (check.rows.length > 0) {
    console.log('Organization user already exists:', check.rows[0]);
    // Ensure role is organization
    await client.query(`UPDATE user_account SET role = 'organization' WHERE id = $1`, [check.rows[0].id]);
    console.log('Role confirmed as organization.');
  } else {
    const passwordHash = await bcrypt.hash('trucking123', 10);
    const insertRes = await client.query(`
      INSERT INTO user_account (name, username, email, password_hash, role, level, source, is_email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, username, email, role
    `, [
      'Apex Freight Logistics',
      'apex_trucking',
      'fleet@apextrucking.com',
      passwordHash,
      'organization',
      'A',
      'mapveri',
      true
    ]);
    const orgUser = insertRes.rows[0];
    console.log('Created organization user:', orgUser);

    await client.query(`
      INSERT INTO user_activity (user_id, pins_created, verifications_cast, last_active_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (user_id) DO NOTHING
    `, [orgUser.id, 48, 192]);
    console.log('Created user_activity for organization user.');
  }

  client.release();
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
