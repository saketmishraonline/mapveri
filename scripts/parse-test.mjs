import fs from 'fs';

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
      rows.push({
        lineNum: i + 1,
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

const content = fs.readFileSync('d:/MapProject/unpinned_locations_boisar_to_churchgate.csv', 'utf8');
const rows = parseCSV(content);
console.log('Parsed rows count:', rows.length);
console.log('Sample row 0:', rows[0]);
console.log('Sample row last:', rows[rows.length - 1]);

const invalid = rows.filter(r => isNaN(r.lat) || isNaN(r.lng));
console.log('Invalid lat/lng count:', invalid.length);

const categories = [...new Set(rows.map(r => r.category))];
console.log('Categories found:', categories);
