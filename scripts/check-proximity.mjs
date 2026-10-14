import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pg = require(require.resolve('pg', { paths: ['d:/MapProject/lib/db'] }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const DATABASE_URL = envContent.match(/DATABASE_URL=([^\r\n]+)/)[1].trim();

function distanceMeters(lat1, lng1, lat2, lng2) {
  const radius = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else current += char;
    }
    values.push(current.trim());
    if (values.length >= 5) {
      rows.push({
        name: values[0].replace(/^"|"$/g, ''),
        description: values[1].replace(/^"|"$/g, ''),
        category: values[2].replace(/^"|"$/g, ''),
        lat: parseFloat(values[3]),
        lng: parseFloat(values[4]),
      });
    }
  }
  return rows;
}

const { Pool } = pg;
const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  const client = await pool.connect();
  const existingPinsRes = await client.query('SELECT id, name, lat, lng FROM pins');
  const existingPins = existingPinsRes.rows.map(p => ({
    ...p,
    lat: parseFloat(p.lat),
    lng: parseFloat(p.lng)
  }));
  console.log('Existing DB pins count:', existingPins.length);

  const csvRows = parseCSV(fs.readFileSync('d:/MapProject/unpinned_locations_boisar_to_churchgate.csv', 'utf8'));
  console.log('Total CSV rows:', csvRows.length);

  const acceptedPins = [];
  const skippedPins = [];

  for (const row of csvRows) {
    // Check against existing pins in DB
    let isNear = false;
    let nearPin = null;
    let nearDist = Infinity;

    for (const ep of existingPins) {
      const dist = distanceMeters(row.lat, row.lng, ep.lat, ep.lng);
      if (dist <= 100) {
        isNear = true;
        nearPin = ep;
        nearDist = dist;
        break;
      }
    }

    if (!isNear) {
      // Also check against already accepted pins in this batch
      for (const ap of acceptedPins) {
        const dist = distanceMeters(row.lat, row.lng, ap.lat, ap.lng);
        if (dist <= 100) {
          isNear = true;
          nearPin = ap;
          nearDist = dist;
          break;
        }
      }
    }

    if (isNear) {
      skippedPins.push({
        row,
        nearPinName: nearPin.name,
        distanceMeters: Math.round(nearDist)
      });
    } else {
      acceptedPins.push(row);
    }
  }

  console.log(`\nResults:`);
  console.log(`Accepted pins to insert: ${acceptedPins.length}`);
  console.log(`Skipped pins (<100m proximity): ${skippedPins.length}`);
  if (skippedPins.length > 0) {
    console.log('Sample skipped pins:');
    console.table(skippedPins.slice(0, 10));
  }

  client.release();
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
