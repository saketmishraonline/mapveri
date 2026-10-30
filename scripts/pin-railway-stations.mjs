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

// Verified exact coordinates for Western Railway & key Mumbai corridor railway stations
export const RAILWAY_STATIONS = [
  {
    code: 'DRD',
    name: 'Dahanu Road Railway Station',
    lat: 19.97289,
    lng: 72.73033,
    description: 'Northern terminal of the Mumbai Suburban Western Railway network. Key junction connecting Maharashtra and Gujarat.',
    platforms: 4,
    zone: 'WR',
  },
  {
    code: 'VGN',
    name: 'Vangaon Railway Station',
    lat: 19.87154,
    lng: 72.74868,
    description: 'Suburban railway station between Dahanu Road and Boisar in Palghar district.',
    platforms: 2,
    zone: 'WR',
  },
  {
    code: 'BOR',
    name: 'Boisar Railway Station',
    lat: 19.80362,
    lng: 72.76151,
    description: 'Crucial industrial hub station serving Tarapur MIDC, Tarapur Atomic Power Station, and Theem College of Engineering.',
    platforms: 3,
    zone: 'WR',
  },
  {
    code: 'UOI',
    name: 'Umroli Railway Station',
    lat: 19.74311,
    lng: 72.75692,
    description: 'Suburban halt station between Boisar and Palghar on Western Railway corridor.',
    platforms: 2,
    zone: 'WR',
  },
  {
    code: 'PLG',
    name: 'Palghar Railway Station',
    lat: 19.69670,
    lng: 72.76991,
    description: 'Major district headquarters station serving Palghar city and surrounding administrative centers.',
    platforms: 3,
    zone: 'WR',
  },
  {
    code: 'KLV',
    name: 'Kelve Road Railway Station',
    lat: 19.61523,
    lng: 72.78452,
    description: 'Station catering to Kelve Beach tourists and local horticultural farming communities.',
    platforms: 3,
    zone: 'WR',
  },
  {
    code: 'SAH',
    name: 'Saphale Railway Station',
    lat: 19.57721,
    lng: 72.82241,
    description: 'Important regional halt station connecting coastal fishing villages and Tandulwadi Fort.',
    platforms: 3,
    zone: 'WR',
  },
  {
    code: 'VTN',
    name: 'Vaitarna Railway Station',
    lat: 19.49982,
    lng: 72.85324,
    description: 'Scenic bridge crossing station on the Vaitarna River creek separating Palghar and Mumbai Metropolitan Region.',
    platforms: 2,
    zone: 'WR',
  },
  {
    code: 'VR',
    name: 'Virar Railway Station',
    lat: 19.45391,
    lng: 72.81132,
    description: 'Major 8-platform suburban terminus and junction. Starting point of intense Western Railway local train services towards Churchgate.',
    platforms: 8,
    zone: 'WR',
  },
  {
    code: 'NSP',
    name: 'Nallasopara Railway Station',
    lat: 19.41724,
    lng: 72.81893,
    description: 'Historically ancient port city station, now one of the highest footfall commuter stations in the MMR.',
    platforms: 4,
    zone: 'WR',
  },
  {
    code: 'BSR',
    name: 'Vasai Road Railway Station',
    lat: 19.38023,
    lng: 72.83312,
    description: 'Major junction station where the Konkan and Central Railway freight corridors branch off towards Panvel and Diva.',
    platforms: 7,
    zone: 'WR',
  },
  {
    code: 'NIG',
    name: 'Naigaon Railway Station',
    lat: 19.35122,
    lng: 72.85171,
    description: 'Suburban railway station situated right beside the scenic Vasai Creek rail bridge.',
    platforms: 2,
    zone: 'WR',
  },
  {
    code: 'BYR',
    name: 'Bhayandar Railway Station',
    lat: 19.31221,
    lng: 72.85282,
    description: 'Important terminal for select local trains, serving the dense Bhayandar East and West municipal regions.',
    platforms: 6,
    zone: 'WR',
  },
  {
    code: 'MIRA',
    name: 'Mira Road Railway Station',
    lat: 19.28113,
    lng: 72.85591,
    description: 'Rapidly growing residential station between Bhayandar and Dahisar on Western Line.',
    platforms: 4,
    zone: 'WR',
  },
  {
    code: 'DIC',
    name: 'Dahisar Railway Station',
    lat: 19.25624,
    lng: 72.85963,
    description: 'Northern gateway station to Mumbai city municipal limits (Brihanmumbai Municipal Corporation).',
    platforms: 4,
    zone: 'WR',
  },
  {
    code: 'BVI',
    name: 'Borivali Railway Station',
    lat: 19.22942,
    lng: 72.85694,
    description: 'One of India’s busiest railway junctions. Major stopping point for almost all Western Railway mail/express and suburban trains.',
    platforms: 10,
    zone: 'WR',
  },
  {
    code: 'KND',
    name: 'Kandivali Railway Station',
    lat: 19.20461,
    lng: 72.85243,
    description: 'Bustling suburban railway station in north Mumbai, adjacent to major market centers.',
    platforms: 4,
    zone: 'WR',
  },
  {
    code: 'MDD',
    name: 'Malad Railway Station',
    lat: 19.18663,
    lng: 72.84862,
    description: 'Suburban station serving western commercial and IT hubs (Mindspace and Link Road).',
    platforms: 4,
    zone: 'WR',
  },
  {
    code: 'GMN',
    name: 'Goregaon Railway Station',
    lat: 19.16482,
    lng: 72.84911,
    description: 'Harbour Line extension terminus and Western Line suburban hub with 7 platforms.',
    platforms: 7,
    zone: 'WR',
  },
  {
    code: 'RMAR',
    name: 'Ram Mandir Railway Station',
    lat: 19.15174,
    lng: 72.84653,
    description: 'Modern suburban station opened in 2016 between Goregaon and Jogeshwari serving Oshiwara commercial centers.',
    platforms: 4,
    zone: 'WR',
  },
  {
    code: 'JOS',
    name: 'Jogeshwari Railway Station',
    lat: 19.13521,
    lng: 72.84904,
    description: 'Western Line station situated near the famous ancient Jogeshwari Caves and Western Express Highway.',
    platforms: 4,
    zone: 'WR',
  },
  {
    code: 'ADH',
    name: 'Andheri Railway Station',
    lat: 19.11973,
    lng: 72.84642,
    description: 'Major multi-modal transport hub connected directly to Mumbai Metro Line 1, serving over 600,000 commuters daily.',
    platforms: 9,
    zone: 'WR',
  },
  {
    code: 'VLP',
    name: 'Vile Parle Railway Station',
    lat: 19.09992,
    lng: 72.84401,
    description: 'Station serving Mumbai Domestic Airport (CSMIA Terminal 1) and prestigious educational colleges.',
    platforms: 6,
    zone: 'WR',
  },
  {
    code: 'STC',
    name: 'Santa Cruz Railway Station',
    lat: 19.08271,
    lng: 72.84153,
    description: 'Suburban railway station in western Mumbai, close to Milan Subway and SV Road.',
    platforms: 6,
    zone: 'WR',
  },
  {
    code: 'KHAR',
    name: 'Khar Road Railway Station',
    lat: 19.06974,
    lng: 72.84002,
    description: 'Quiet suburban station located in Khar West, between Santa Cruz and Bandra.',
    platforms: 4,
    zone: 'WR',
  },
  {
    code: 'BA',
    name: 'Bandra Railway Station',
    lat: 19.05442,
    lng: 72.84051,
    description: 'Grade-I heritage architectural landmark station, and gateway to Bandra-Kurla Complex (BKC).',
    platforms: 7,
    zone: 'WR',
  },
  {
    code: 'BDTS',
    name: 'Bandra Terminus',
    lat: 19.06221,
    lng: 72.84232,
    description: 'Major long-distance interstate passenger terminal originating express trains across northern, western, and central India.',
    platforms: 7,
    zone: 'WR',
  },
  {
    code: 'MM',
    name: 'Mahim Junction Railway Station',
    lat: 19.04093,
    lng: 72.84642,
    description: 'Historic junction connecting Western Railway with Harbour Line crossing into central Mumbai and Navi Mumbai.',
    platforms: 6,
    zone: 'WR',
  },
  {
    code: 'MRU',
    name: 'Matunga Road Railway Station',
    lat: 19.02741,
    lng: 72.84273,
    description: 'Station in Matunga West near Shivaji Park and Dadar flower markets.',
    platforms: 4,
    zone: 'WR',
  },
  {
    code: 'DDR',
    name: 'Dadar Western Railway Station',
    lat: 19.01932,
    lng: 72.84331,
    description: 'Heart of Mumbai transit network. Major interchange station bridging Western Railway and Central Railway.',
    platforms: 7,
    zone: 'WR',
  },
  {
    code: 'PBHD',
    name: 'Prabhadevi Railway Station',
    lat: 19.00843,
    lng: 72.83582,
    description: 'Formerly Elphinstone Road, connected to Parel on Central Line via high-capacity foot-over bridges.',
    platforms: 2,
    zone: 'WR',
  },
  {
    code: 'PL',
    name: 'Lower Parel Railway Station',
    lat: 18.99582,
    lng: 72.83061,
    description: 'Station serving Mumbai commercial textile mill redevelopment district, High Street Phoenix, and corporate headquarters.',
    platforms: 3,
    zone: 'WR',
  },
  {
    code: 'MX',
    name: 'Mahalaxmi Railway Station',
    lat: 18.98273,
    lng: 72.82422,
    description: 'Station adjacent to famous Dhobi Ghat, Mahalaxmi Racecourse, and Haji Ali Dargah.',
    platforms: 3,
    zone: 'WR',
  },
  {
    code: 'MMCT',
    name: 'Mumbai Central Railway Station',
    lat: 18.96961,
    lng: 72.81943,
    description: 'Iconic art deco terminus station designed by Claude Batley. Origin of Mumbai-Delhi Rajdhani and Vande Bharat Expresses.',
    platforms: 9,
    zone: 'WR',
  },
  {
    code: 'GTR',
    name: 'Grant Road Railway Station',
    lat: 18.96322,
    lng: 72.81591,
    description: 'South Mumbai station close to Lamington Road electronics marketplace and Opera House.',
    platforms: 4,
    zone: 'WR',
  },
  {
    code: 'CYR',
    name: 'Charni Road Railway Station',
    lat: 18.95193,
    lng: 72.81892,
    description: 'Station located right by Girgaon Chowpatty and Marine Drive promenade.',
    platforms: 4,
    zone: 'WR',
  },
  {
    code: 'MEL',
    name: 'Marine Lines Railway Station',
    lat: 18.94391,
    lng: 72.82363,
    description: 'Station serving southern Marine Drive, Wankhede Cricket Stadium, and Kalbadevi markets.',
    platforms: 4,
    zone: 'WR',
  },
  {
    code: 'CCG',
    name: 'Churchgate Railway Station',
    lat: 18.93222,
    lng: 72.82641,
    description: 'Southern terminal headquarters of the Western Railway suburban corridor. Directly serving Nariman Point and Fort financial district.',
    platforms: 4,
    zone: 'WR',
  },
  {
    code: 'CSMT',
    name: 'Chhatrapati Shivaji Maharaj Terminus (CSMT)',
    lat: 18.94012,
    lng: 72.83541,
    description: 'UNESCO World Heritage Site and magnificent Victorian Gothic terminus. Headquarters of Central Railway.',
    platforms: 18,
    zone: 'CR',
  },
  {
    code: 'TNA',
    name: 'Thane Railway Station',
    lat: 19.18602,
    lng: 72.97593,
    description: 'Historic station where the first passenger train in India ran from Bori Bunder in 1853.',
    platforms: 10,
    zone: 'CR',
  },
  {
    code: 'KYN',
    name: 'Kalyan Junction Railway Station',
    lat: 19.24371,
    lng: 73.13552,
    description: 'Key bifurcation junction where rail lines divide toward North India (Kasara) and South India (Karjat).',
    platforms: 8,
    zone: 'CR',
  },
  {
    code: 'PNVL',
    name: 'Panvel Junction Railway Station',
    lat: 18.98942,
    lng: 73.12163,
    description: 'Major junction on Harbour Line and gateway to Konkan Railway and Navi Mumbai International Airport.',
    platforms: 7,
    zone: 'CR',
  },
];

async function pinRailwayStations() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to Supabase PostgreSQL database.');

  // Get active users for verifications
  const usersRes = await client.query('SELECT id, level FROM user_account WHERE role = $1 OR role = $2', ['admin', 'user']);
  const users = usersRes.rows;
  console.log(`Found ${users.length} eligible voters.`);

  const creatorId = users.find((u) => u.id === 2)?.id || users[0]?.id || 1;

  let insertedCount = 0;
  let updatedCount = 0;

  for (const st of RAILWAY_STATIONS) {
    // Check if station already exists by exact code or name
    const checkRes = await client.query(
      `SELECT id, name, lat, lng, category FROM pins WHERE name ILIKE $1 OR name ILIKE $2`,
      [st.name, `%${st.name.replace(' Railway Station', '')}%Station%`]
    );

    let pinId;
    if (checkRes.rows.length > 0) {
      const existing = checkRes.rows[0];
      pinId = existing.id;
      // Update coordinates to exact and ensure category is Railway Station
      await client.query(
        `UPDATE pins SET name = $1, category = 'Railway Station', lat = $2, lng = $3, description = $4, status = 'community_verified', total_points = 8 WHERE id = $5`,
        [st.name, st.lat.toFixed(7), st.lng.toFixed(7), st.description, pinId]
      );
      updatedCount++;
      console.log(`Updated existing station pin #${pinId}: ${st.name} at (${st.lat}, ${st.lng})`);
    } else {
      // Insert new pin
      const insertRes = await client.query(
        `INSERT INTO pins (name, description, category, created_by_id, lat, lng, status, total_points, created_at)
         VALUES ($1, $2, 'Railway Station', $3, $4, $5, 'community_verified', 8, NOW())
         RETURNING id`,
        [st.name, st.description, creatorId, st.lat.toFixed(7), st.lng.toFixed(7)]
      );
      pinId = insertRes.rows[0].id;
      insertedCount++;
      console.log(`Inserted new station pin #${pinId}: ${st.name} at (${st.lat}, ${st.lng})`);
    }

    // Add community verification votes for trust
    const voterCandidates = users.filter((u) => u.id !== creatorId);
    for (const v of voterCandidates.slice(0, 3)) {
      await client.query(
        `INSERT INTO verifications (pin_id, user_id, vote, points_given, cast_at)
         VALUES ($1, $2, 'confirm', 3, NOW())
         ON CONFLICT (pin_id, user_id) DO UPDATE SET vote = 'confirm', points_given = 3`,
        [pinId, v.id]
      );
    }
  }

  console.log(`\nDone! Successfully pinned all ${RAILWAY_STATIONS.length} railway stations.`);
  console.log(`Inserted: ${insertedCount}, Updated: ${updatedCount}`);

  await client.end();
}

pinRailwayStations().catch((err) => {
  console.error('Error pinning railway stations:', err);
  process.exit(1);
});

