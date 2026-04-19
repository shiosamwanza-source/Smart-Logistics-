const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../db/database");
const { authMiddleware, requireRole } = require("../middleware/auth");

const router = express.Router();

// ─── REGISTER NEW TRUCK ───────────────────────────────────────
// POST /api/trucks
// Body: { plate, type, driverName, phone, insuranceExpiry }
router.post("/", authMiddleware, requireRole("truck_owner"), async (req, res) => {
  try {
    const db = await getDb();
    const { plate, type, driverName, phone, insuranceExpiry } = req.body;

    if (!plate || !type) {
      return res.status(400).json({ error: "Namba ya usajili na aina ya kontena vinahitajika" });
    }

    // Check plate uniqueness
    const exists = db.data.trucks.find(t => t.plate === plate.toUpperCase());
    if (exists) {
      return res.status(409).json({ error: "Namba hii ya gari tayari imesajiliwa" });
    }

    const truck = {
      id: uuidv4(),
      ownerId: req.user.id,
      plate: plate.toUpperCase(),
      type: Array.isArray(type) ? type : [type],
      status: "WAZI",
      location: null,
      lat: null,
      lng: null,
      driverName: driverName || req.user.name,
      phone: phone || req.user.phone,
      insuranceExpiry: insuranceExpiry || null,
      rating: null,
      trips: 0,
      currentJobId: null,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    db.data.trucks.push(truck);
    await db.write();

    res.status(201).json({ message: "Gari limesajiliwa", truck });
  } catch (err) {
    res.status(500).json({ error: "Hitilafu ya seva" });
  }
});

// ─── GET AVAILABLE TRUCKS ─────────────────────────────────────
// GET /api/trucks/available?containerType=20ft&origin=
router.get("/available", authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const { containerType } = req.query;

    let trucks = db.data.trucks.filter(t => t.isActive && t.status === "WAZI");

    if (containerType) {
      trucks = trucks.filter(t => t.type.includes(containerType));
    }

    // Enrich with owner info and ratings
    const enriched = trucks.map(truck => {
      const owner = db.data.users.find(u => u.id === truck.ownerId);
      const recentRatings = db.data.ratings
        .filter(r => r.toTruckId === truck.id)
        .slice(-20);
      const avgRating = recentRatings.length
        ? (recentRatings.reduce((s, r) => s + r.rating, 0) / recentRatings.length).toFixed(1)
        : null;

      return {
        ...truck,
        ownerName: owner?.name || "Haijulikani",
        rating: avgRating || truck.rating,
        totalReviews: recentRatings.length,
      };
    });

    // Sort by rating (best first), then by trips (experienced first)
    enriched.sort((a, b) => {
      if (b.rating && a.rating) return parseFloat(b.rating) - parseFloat(a.rating);
      return b.trips - a.trips;
    });

    res.json({ count: enriched.length, trucks: enriched });
  } catch (err) {
    res.status(500).json({ error: "Hitilafu ya seva" });
  }
});

// ─── UPDATE TRUCK STATUS ──────────────────────────────────────
// PATCH /api/trucks/:id/status
// Body: { status, lat?, lng?, location? }
router.patch("/:id/status", authMiddleware, requireRole("truck_owner"), async (req, res) => {
  try {
    const db = await getDb();
    const truck = db.data.trucks.find(t => t.id === req.params.id && t.ownerId === req.user.id);

    if (!truck) return res.status(404).json({ error: "Gari halipatikani au si lako" });

    const { status, lat, lng, location } = req.body;
    const validStatuses = ["WAZI", "FOLENI", "NJIANI", "INAKARIBIA", "HAIFANYI"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status lazima iwe moja ya: ${validStatuses.join(", ")}` });
    }

    // Only allow manual WAZI, FOLENI, HAIFANYI
    // NJIANI and INAKARIBIA are set automatically via job status updates
    if (["NJIANI", "INAKARIBIA"].includes(status) && truck.currentJobId) {
      return res.status(400).json({
        error: "NJIANI na INAKARIBIA zinawekwa kiotomatiki na mfumo wakati wa safari"
      });
    }

    truck.status = status;
    truck.updatedAt = new Date().toISOString();
    if (lat) truck.lat = lat;
    if (lng) truck.lng = lng;
    if (location) truck.location = location;
    if (status === "WAZI") truck.currentJobId = null;

    await db.write();

    const messages = {
      WAZI: "Umeweka hali: WAZI — utaonekana kwa agents wanaotafuta magari",
      FOLENI: "Umeweka hali: FOLENI — uko bandarini",
      HAIFANYI: "Umeweka hali: HAIFANYI — hutaonyeshwa kwa kazi mpya",
    };

    res.json({ message: messages[status] || "Status imesasishwa", truck });
  } catch (err) {
    res.status(500).json({ error: "Hitilafu ya seva" });
  }
});

// ─── UPDATE TRUCK LOCATION (GPS ping) ────────────────────────
// PATCH /api/trucks/:id/location
// Body: { lat, lng }
router.patch("/:id/location", authMiddleware, requireRole("truck_owner"), async (req, res) => {
  try {
    const db = await getDb();
    const truck = db.data.trucks.find(t => t.id === req.params.id && t.ownerId === req.user.id);
    if (!truck) return res.status(404).json({ error: "Gari halipatikani" });

    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: "Latitude na longitude vinahitajika" });

    truck.lat = lat;
    truck.lng = lng;
    truck.lastSeen = new Date().toISOString();

    // Log tracking if on an active job
    if (truck.currentJobId) {
      db.data.tracking.push({
        id: uuidv4(),
        jobId: truck.currentJobId,
        truckId: truck.id,
        lat, lng,
        timestamp: new Date().toISOString(),
      });
    }

    await db.write();
    res.json({ message: "Mahali imesasishwa", lat, lng });
  } catch (err) {
    res.status(500).json({ error: "Hitilafu ya seva" });
  }
});

// ─── GET MY TRUCKS ────────────────────────────────────────────
// GET /api/trucks/mine
router.get("/mine", authMiddleware, requireRole("truck_owner"), async (req, res) => {
  try {
    const db = await getDb();
    const trucks = db.data.trucks.filter(t => t.ownerId === req.user.id);
    res.json({ count: trucks.length, trucks });
  } catch (err) {
    res.status(500).json({ error: "Hitilafu ya seva" });
  }
});

// ─── GET SINGLE TRUCK ─────────────────────────────────────────
// GET /api/trucks/:id
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const truck = db.data.trucks.find(t => t.id === req.params.id);
    if (!truck) return res.status(404).json({ error: "Gari halipatikani" });

    const ratings = db.data.ratings.filter(r => r.toTruckId === truck.id);
    const avgRating = ratings.length
      ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
      : null;

    // Get recent completed jobs for this truck
    const recentJobs = db.data.jobs
      .filter(j => j.assignedTruckId === truck.id && j.status === "IMEKAMILIKA")
      .slice(-5)
      .map(j => ({
        id: j.id,
        destination: j.destination,
        completedAt: j.completedAt,
        pricing: j.pricing.suggested,
      }));

    res.json({
      ...truck,
      rating: avgRating || truck.rating,
      totalReviews: ratings.length,
      recentJobs,
    });
  } catch (err) {
    res.status(500).json({ error: "Hitilafu ya seva" });
  }
});

module.exports = router;
      
