const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");
const path = require("path");

const dbPath = path.join(__dirname, "data.json");
const adapter = new JSONFile(dbPath);

const defaultData = {
  users: [],
  trucks: [],
  jobs: [],
  job_assignments: [],
  ratings: [],
  tracking: [],
  pricing: [
    // TIER 1 — KARIBU
    { id: 1, destination: "Temeke", tier: 1, basePrice: 470000, maxPrice: 490000, km: 18, timeRestriction: null, type: "Mjini", zone: null },
    { id: 2, destination: "Buguruni", tier: 1, basePrice: 470000, maxPrice: 490000, km: 16, timeRestriction: null, type: "Mjini", zone: null },
    { id: 3, destination: "Ilala", tier: 1, basePrice: 500000, maxPrice: 520000, km: 14, timeRestriction: null, type: "Mjini", zone: null },
    { id: 4, destination: "Magomeni / Sinza", tier: 1, basePrice: 500000, maxPrice: 520000, km: 15, timeRestriction: null, type: "Mjini", zone: null },
    // TIER 2 — NDANI YA DAR
    { id: 5, destination: "Kariakoo", tier: 2, basePrice: 550000, maxPrice: 580000, km: 13, timeRestriction: "USIKU_TU", type: "Mjini", zone: null },
    { id: 6, destination: "Morocco / Ali Hassan Mwinyi", tier: 2, basePrice: 550000, maxPrice: 580000, km: 20, timeRestriction: null, type: "Mjini", zone: "Kinondoni" },
    { id: 7, destination: "Msasani", tier: 2, basePrice: 550000, maxPrice: 590000, km: 22, timeRestriction: null, type: "Mjini", zone: null },
    { id: 8, destination: "Mbezi Beach", tier: 2, basePrice: 600000, maxPrice: 650000, km: 28, timeRestriction: null, type: "Mjini", zone: "Kinondoni" },
    // TIER 3 — VIWANDA
    { id: 9, destination: "Salasala / IPTL", tier: 3, basePrice: 650000, maxPrice: 750000, km: 25, timeRestriction: null, type: "Viwanda", zone: null },
    { id: 10, destination: "Visiga Industrial", tier: 3, basePrice: 650000, maxPrice: 700000, km: 24, timeRestriction: null, type: "Viwanda", zone: null },
    { id: 11, destination: "Lake Steel", tier: 3, basePrice: 700000, maxPrice: 900000, km: 55, timeRestriction: null, type: "Viwanda", zone: "Kibaha" },
    // TIER 4 — LONG HAUL
    { id: 12, destination: "Kibaha Kati", tier: 4, basePrice: 850000, maxPrice: 1000000, km: 65, timeRestriction: null, type: "Long Haul", zone: "Kibaha" },
    { id: 13, destination: "Kibaha Mbali", tier: 4, basePrice: 1000000, maxPrice: 1200000, km: 80, timeRestriction: null, type: "Long Haul", zone: "Kibaha" },
  ],
};

let db;

async function getDb() {
  if (!db) {
    db = new Low(adapter, defaultData);
    await db.read();
    // Merge any missing keys from defaultData
    db.data = { ...defaultData, ...db.data };
    await db.write();
  }
  return db;
}

module.exports = { getDb };
