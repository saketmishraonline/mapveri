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

const LEVEL_POINTS = { A: 3, B: 2, C: 1 };

function distanceMeters(lat1, lng1, lat2, lng2) {
  const radius = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    if (values.length >= 5) {
      const lat = parseFloat(values[3]);
      const lng = parseFloat(values[4]);
      if (!isNaN(lat) && !isNaN(lng)) {
        rows.push({
          name: values[0].replace(/^"|"$/g, ''),
          description: values[1].replace(/^"|"$/g, ''),
          category: values[2].replace(/^"|"$/g, ''),
          lat,
          lng,
        });
      }
    }
  }
  return rows;
}

function selectVotersForVerified(creatorId, allUsers) {
  const candidates = allUsers.filter((u) => u.id !== creatorId);
  // We want a subset of candidates whose points sum >= 6 (community_verified threshold)
  for (let attempt = 0; attempt < 50; attempt++) {
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const chosen = [];
    let sum = 0;
    for (const u of shuffled) {
      chosen.push(u);
      sum += u.points;
      if (sum >= 6) {
        return { voters: chosen, totalPoints: sum };
      }
    }
  }
  // Fallback: take all candidates
  const allSum = candidates.reduce((acc, u) => acc + u.points, 0);
  return { voters: candidates, totalPoints: allSum };
}

function selectVotersForTarget(creatorId, allUsers, targetPoints) {
  const candidates = allUsers.filter((u) => u.id !== creatorId);

  function findSubset(list, target) {
    if (target === 0) return [];
    if (list.length === 0 || target < 0) return null;
    const [first, ...rest] = list;
    if (first.points <= target) {
      const withFirst = findSubset(rest, target - first.points);
      if (withFirst !== null) return [first, ...withFirst];
    }
    return findSubset(rest, target);
  }

  for (let attempt = 0; attempt < 50; attempt++) {
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const res = findSubset(shuffled, targetPoints);
    if (res && res.length > 0) {
      return { voters: res, totalPoints: targetPoints };
    }
  }

  // Fallback matching
  if (targetPoints === 1) {
    const u = candidates.find((c) => c.points === 1);
    return u ? { voters: [u], totalPoints: 1 } : null;
  }
  if (targetPoints === 2) {
    const u2 = candidates.find((c) => c.points === 2);
    if (u2) return { voters: [u2], totalPoints: 2 };
    const u1s = candidates.filter((c) => c.points === 1);
    if (u1s.length >= 2) return { voters: u1s.slice(0, 2), totalPoints: 2 };
  }
  if (targetPoints === 3) {
    const u3 = candidates.find((c) => c.points === 3);
    if (u3) return { voters: [u3], totalPoints: 3 };
    const u2 = candidates.find((c) => c.points === 2);
    const u1 = candidates.find((c) => c.points === 1);
    if (u2 && u1) return { voters: [u2, u1], totalPoints: 3 };
  }
  if (targetPoints === 4) {
    const u3 = candidates.find((c) => c.points === 3);
    const u1 = candidates.find((c) => c.points === 1);
    if (u3 && u1) return { voters: [u3, u1], totalPoints: 4 };
    const u2s = candidates.filter((c) => c.points === 2);
    if (u2s.length >= 2) return { voters: u2s.slice(0, 2), totalPoints: 4 };
  }
  if (targetPoints === 5) {
    const u3 = candidates.find((c) => c.points === 3);
    const u2 = candidates.find((c) => c.points === 2);
    if (u3 && u2) return { voters: [u3, u2], totalPoints: 5 };
  }

  return null;
}

const { Pool } = pg;
const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  const client = await pool.connect();
  console.log('--- Pinning Unpinned Locations Script Starting ---');

  try {
    await client.query('BEGIN');

    // 1. Fetch registered users from user_account
    const usersRes = await client.query(`
      SELECT id, name, username, level, role
      FROM user_account
      ORDER BY id ASC;
    `);
    const users = usersRes.rows.map((u) => ({
      ...u,
      points: LEVEL_POINTS[u.level] ?? 1,
    }));
    console.log(`Loaded ${users.length} registered users from user_account:`);
    console.table(users.map((u) => ({ id: u.id, name: u.name, level: u.level, points: u.points })));

    if (users.length === 0) {
      throw new Error('No users found in user_account!');
    }

    // 2. Fetch existing pins from DB
    const existingPinsRes = await client.query('SELECT id, name, lat, lng FROM pins');
    const existingPins = existingPinsRes.rows.map((p) => ({
      ...p,
      lat: parseFloat(p.lat),
      lng: parseFloat(p.lng),
    }));
    console.log(`Found ${existingPins.length} existing pins in database.`);

    // 3. Read and parse CSV
    const csvPath = 'd:/MapProject/unpinned_locations_boisar_to_churchgate.csv';
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvRows = parseCSV(csvContent);
    console.log(`Loaded ${csvRows.length} locations from CSV.`);

    // 4. Proximity Check (100 meters threshold)
    const acceptedLocations = [];
    const skippedLocations = [];

    for (const loc of csvRows) {
      let isNear = false;
      let nearPin = null;
      let nearDist = Infinity;

      // Check against existing pins in DB
      for (const ep of existingPins) {
        const dist = distanceMeters(loc.lat, loc.lng, ep.lat, ep.lng);
        if (dist <= 100) {
          isNear = true;
          nearPin = ep;
          nearDist = dist;
          break;
        }
      }

      // Check against accepted pins in current batch
      if (!isNear) {
        for (const ap of acceptedLocations) {
          const dist = distanceMeters(loc.lat, loc.lng, ap.lat, ap.lng);
          if (dist <= 100) {
            isNear = true;
            nearPin = ap;
            nearDist = dist;
            break;
          }
        }
      }

      if (isNear) {
        skippedLocations.push({
          name: loc.name,
          lat: loc.lat,
          lng: loc.lng,
          nearPinName: nearPin.name,
          distanceMeters: Math.round(nearDist),
        });
      } else {
        acceptedLocations.push(loc);
      }
    }

    console.log(`\nProximity Check Summary:`);
    console.log(`- Accepted locations (> 100m distance): ${acceptedLocations.length}`);
    console.log(`- Skipped locations (<= 100m proximity): ${skippedLocations.length}`);
    if (skippedLocations.length > 0) {
      console.log('Skipped details:');
      console.table(skippedLocations);
    }

    // 5. Partition accepted pins: exactly 122 verified, remaining 121 in verification stage (unverified)
    const numToVerify = 122;
    console.log(`\nPartitioning pins:`);
    console.log(`- Verified target: ${numToVerify}`);
    console.log(`- Verification stage (unverified): ${acceptedLocations.length - numToVerify}`);

    // Shuffle indices to distribute verified locations randomly across the dataset
    const indices = acceptedLocations.map((_, i) => i);
    // Deterministic shuffle for reproducibility or standard shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const verifiedIndices = new Set(indices.slice(0, numToVerify));

    // Distribution counters for user activity
    const userPinsCount = {};
    const userVerificationsCount = {};
    for (const u of users) {
      userPinsCount[u.id] = 0;
      userVerificationsCount[u.id] = 0;
    }

    // Unverified points tracker
    const unverifiedPointsDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    let totalPinsInserted = 0;
    let totalVerificationsInserted = 0;

    // 6. Insert pins and verifications
    for (let i = 0; i < acceptedLocations.length; i++) {
      const loc = acceptedLocations[i];
      // Distribute creator across registered users in user_account
      const creator = users[i % users.length];
      userPinsCount[creator.id]++;

      const isVerified = verifiedIndices.has(i);
      let status = 'unverified';
      let totalPoints = 0;
      let voters = [];

      if (isVerified) {
        status = 'community_verified';
        const result = selectVotersForVerified(creator.id, users);
        voters = result.voters;
        totalPoints = result.totalPoints;
      } else {
        status = 'unverified';
        // Randomly pick target points from 1, 2, 3, 4, 5
        const targetPoints = (i % 5) + 1; // Evenly distributed 1 to 5 across the remaining pins
        unverifiedPointsDist[targetPoints]++;
        const result = selectVotersForTarget(creator.id, users, targetPoints);
        if (!result) {
          throw new Error(`Could not find voters for creator ${creator.id} and target points ${targetPoints}`);
        }
        voters = result.voters;
        totalPoints = result.totalPoints;
      }

      // Generate staggered created_at timestamp in the last 7 days
      const daysAgo = (acceptedLocations.length - i) * (7 / acceptedLocations.length);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      // Insert pin into pins table
      const insertPinRes = await client.query(
        `
        INSERT INTO pins (name, description, category, created_by_id, lat, lng, status, total_points, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id;
      `,
        [
          loc.name,
          loc.description,
          loc.category,
          creator.id,
          loc.lat.toFixed(7),
          loc.lng.toFixed(7),
          status,
          totalPoints,
          createdAt,
        ]
      );
      const pinId = insertPinRes.rows[0].id;
      totalPinsInserted++;

      // Insert verification records
      for (let vIdx = 0; vIdx < voters.length; vIdx++) {
        const voter = voters[vIdx];
        userVerificationsCount[voter.id]++;

        // Stagger cast_at after pin created_at
        const castAt = new Date(createdAt.getTime() + (vIdx + 1) * 3600 * 1000);

        await client.query(
          `
          INSERT INTO verifications (pin_id, user_id, vote, points_given, cast_at)
          VALUES ($1, $2, $3, $4, $5);
        `,
          [pinId, voter.id, 'confirm', voter.points, castAt]
        );
        totalVerificationsInserted++;
      }
    }

    console.log(`\nSuccessfully inserted:`);
    console.log(`- Total pins inserted: ${totalPinsInserted}`);
    console.log(`- Total verifications inserted: ${totalVerificationsInserted}`);
    console.log(`- Unverified points distribution:`, unverifiedPointsDist);

    // 7. Update user_activity table for all users
    console.log(`\nUpdating user_activity table:`);
    for (const u of users) {
      const addedPins = userPinsCount[u.id];
      const addedVerifs = userVerificationsCount[u.id];

      await client.query(
        `
        INSERT INTO user_activity (user_id, pins_created, verifications_cast, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          pins_created = user_activity.pins_created + EXCLUDED.pins_created,
          verifications_cast = user_activity.verifications_cast + EXCLUDED.verifications_cast,
          updated_at = NOW();
      `,
        [u.id, addedPins, addedVerifs]
      );

      console.log(`- User #${u.id} (${u.name}): +${addedPins} pins, +${addedVerifs} verifications`);
    }

    // 8. Update user levels if qualified (pins >= 100 or verifications >= 250 -> A; pins >= 50 or verifications >= 100 -> B)
    console.log(`\nChecking user promotions based on new activity:`);
    const activityRes = await client.query(`
      SELECT ua.user_id, u.name, u.level, ua.pins_created, ua.verifications_cast
      FROM user_activity ua
      JOIN user_account u ON u.id = ua.user_id
      ORDER BY ua.user_id ASC;
    `);

    for (const row of activityRes.rows) {
      const pins = row.pins_created;
      const verifs = row.verifications_cast;
      const nextLevel = pins >= 100 || verifs >= 250 ? 'A' : pins >= 50 || verifs >= 100 ? 'B' : 'C';
      if (nextLevel !== row.level && (row.level === 'C' && (nextLevel === 'B' || nextLevel === 'A') || row.level === 'B' && nextLevel === 'A')) {
        await client.query(`UPDATE user_account SET level = $1 WHERE id = $2`, [nextLevel, row.user_id]);
        console.log(`User #${row.user_id} (${row.name}) promoted from Level ${row.level} to Level ${nextLevel}!`);
      }
    }

    await client.query('COMMIT');
    console.log('\n--- Transaction Committed Successfully! ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transaction rolled back due to error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
