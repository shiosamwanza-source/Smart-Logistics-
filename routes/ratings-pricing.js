// ============================================================
// RATINGS ROUTES
// ============================================================
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../db/database");
const { authMiddleware } = require("../middleware/auth");

const ratingsRouter = express.Router();

// POST /api/ratings
// Body: { jobId, toUserId, toTruckId?, rating (1-5), comment?, categories? }
ratingsRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const { jobId, toUserId, toTruckId, rating, comment, categories } = req.body;

    if (!jobId || !toUserId || !rating) {
      return res.status(400).json({ error: "JobId, toUserId, na rating vinahitajika" });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating lazima iwe kati ya 1 na 5" });
    }

    const job = db.data.jobs.find(j => j.id === jobId);
    if (!job) return res.status(404).json({ error: "Kazi haipatikani" });
    if (job.status !== "IMEKAMILIKA") {
      return res.status(400).json({ error: "Unaweza kutoa rating baada ya kazi kukamilika tu" });
    }

    // Prevent duplicate ratings
    const existing = db.data.ratings.find(
      r => r.jobId === jobId && r.fromUserId === req.user.id
    );
    if (existing) {
      return res.status(409).json({ error: "Umeshatoa rating kwa kazi hii" });
    }

    // Verify the rater is part of this job
    const isAgent = job.agentId === req.user.id;
    const isDriver = job.assignedDriverId === req.user.id;
    if (!isAgent && !isDriver) {
      return res.status(403).json({ error: "Huwezi kutoa rating kwa kazi hii" });
    }

    const ratingRecord = {
      id: uuidv4(),
      jobId,
      fromUserId: req.user.id,
      fromName: req.user.name,
      fromRole: req.user.role,
      toUserId,
      toTruckId: toTruckId || null,
      rating: Number(rating),
      comment: comment || null,
      categories: categories || null,  // e.g. { onTime: true, safeDelivery: true, goodCommunication: true }
      createdAt: new Date().toISOString(),
    };

    db.data.ratings.push(ratingRecord);

    // Update user's average rating
    const userRatings = db.data.ratings.filter(r => r.toUserId === toUserId);
    const avg = userRatings.reduce((s, r) => s + r.rating, 0) / userRatings.length;
    const targetUser = db.data.users.find(u => u.id === toUserId);
    if (targetUser) targetUser.rating = parseFloat(avg.toFixed(1));

    // Update truck rating if applicable
    if (toTruckId) {
      const truckRatings = db.data.ratings.filter(r => r.toTruckId === toTruckId);
      const truckAvg = truckRatings.reduce((s, r) => s + r.rating, 0) / truckRatings.length;
      const truck = db.data.trucks.find(t => t.id === toTruckId);
      if (truck) truck.rating = parseFloat(truckAvg.toFixed(1));
    }

    await db.write();
    res.status(201).json({ message: "Rating imesajiliwa. Asante!", rating: ratingRecord });
  } catch (err) {
    console.error("Rating error:", err);
    res.status(500).json({ error: "Hitilafu ya seva" });
  }
});

// GET /api/ratings/user/:userId
ratingsRouter.get("/user/:userId", authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const ratings = db.data.ratings
      .filter(r => r.toUserId === req.params.userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const avg = ratings.length
      ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
      : null;

    res.json({ average: avg, count: ratings.length, ratings });
  } catch (err) {
    res.status(500).json({ error: "Hitilafu ya seva" });
  }
});

// ============================================================
// PRICING ROUTES
// ============================================================
const pricingRouter = express.Router();

function getDemandInfo() {
  const hour = new Date().getHours();
  if (hour >= 7 && hour <= 10) return { level: "JUU", factor: 1.15, color: "red" };
  if (hour >= 14 && hour <= 17) return { level: "WASTANI", factor: 1.05, color: "yellow" };
  return { level: "KAWAIDA", factor: 1.0, color: "green" };
}

// GET /api/pricing — all routes with current prices
pricingRouter.get("/", authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const demand = getDemandInfo();

    const routes = db.data.pricing.map(route => ({
      ...route,
      currentPriceMin: Math.round(route.basePrice * demand.factor),
      currentPriceMax: Math.round(route.maxPrice * demand.factor),
      demandFactor: demand.factor,
    }));

    res.json({
      demand,
      note: demand.level === "JUU"
        ? "Bei zimepanda kwa sababu ya msongamano wa asubuhi"
        : demand.level === "WASTANI"
        ? "Bei ziko wastani — alasiri"
        : "Bei za kawaida",
      routes,
    });
  } catch (err) {
    res.status(500).json({ error: "Hitilafu ya seva" });
  }
});

// GET /api/pricing/:destinationId — price for specific route
// Query: ?containerType=20ft&clientType=KUBWA
pricingRouter.get("/:destinationId", authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const route = db.data.pricing.find(r => r.id === Number(req.params.destinationId));
    if (!route) return res.status(404).json({ error: "Destination haipatikani" });

    const demand = getDemandInfo();
    const { containerType = "20ft", clientType = "MPYA" } = req.query;

    const demandAdd = Math.round(route.basePrice * (demand.factor - 1));
    const clientPremium = clientType === "KUBWA" ? 150000 : clientType === "KATI" ? 75000 : 0;
    const containerAdd = containerType === "40ft" && route.km <= 30 ? 100000 : 0;

    const kariakooTime = new Date().getHours();
    const kariakooAvailable = kariakooTime >= 20 || kariakooTime < 5;

    res.json({
      route,
      demand,
      containerType,
      clientType,
      pricing: {
        min: route.basePrice,
        suggested: route.basePrice + demandAdd + Math.round(clientPremium * 0.5),
        max: route.maxPrice + demandAdd + clientPremium + containerAdd,
        breakdown: {
          base: route.basePrice,
          demandAdd: `+${demandAdd} (demand ${demand.level})`,
          clientPremium: clientPremium > 0 ? `+${clientPremium} (${clientType})` : null,
          containerAdd: containerAdd > 0 ? `+${containerAdd} (40ft)` : null,
        },
      },
      restrictions: route.timeRestriction === "USIKU_TU" ? {
        type: "USIKU_TU",
        message: "Delivery inaruhusiwa 8:00PM – 5:00AM tu",
        availableNow: kariakooAvailable,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ error: "Hitilafu ya seva" });
  }
});

module.exports = { ratingsRouter, pricingRouter };
