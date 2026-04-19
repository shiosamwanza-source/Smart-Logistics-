const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../db/database");
const { authMiddleware, requireRole } = require("../middleware/auth");

const router = express.Router();

// ─── PRICING HELPERS ────────────────────────────────────────
function getDemandFactor() {
  const hour = new Date().getHours();
  if (hour >= 7 && hour <= 10) return 1.15;   // Asubuhi — demand JUU
  if (hour >= 14 && hour <= 17) return 1.05;  // Alasiri — WASTANI
  return 1.0;                                  // KAWAIDA
}

function getClientPremium(clientType) {
  if (clientType === "KUBWA") return 150000;
  if (clientType === "KATI") return 75000;
  return 0;
}

function isKariakooTime() {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 5;
}

function calculatePrice(route, containerType, clientType) {
  const demand = getDemandFactor();
  const demandAdd = Math.round(route.basePrice * (demand - 1));
  const clientAdd = getClientPremium(clientType);
  const containerAdd = containerType === "40ft" && route.km <= 30 ? 100000 : 0;

  return {
    min: route.basePrice,
    suggested: route.basePrice + demandAdd + Math.round(clientAdd * 0.5),
    max: route.maxPrice + demandAdd + clientAdd + containerAdd,
    breakdown: { base: route.basePrice, demandAdd, clientAdd, containerAdd },
  };
}

// ─── POST NEW JOB ─────────────────────────────────────────────
// POST /api/jobs
// Body: { origin, destinationId, containerType, timing, clientType?, notes? }
router.post("/", authMiddleware, requireRole("agent"), async (req, res) => {
  try {
    const db = await getDb();
    const { origin, destinationId, containerType, timing, clientType, notes } = req.body;

    if (!origin || !destinationId || !containerType || !timing) {
      return res.status(400).json({ error: "Chanzo, destination, kontena, na wakati vinahitajika" });
    }

    const route = db.data.pricing.find(r => r.id === Number(destinationId));
    if (!route) {
      return res.status(404).json({ error: "Destination haipatikani kwenye mfumo" });
    }

    // Kariakoo restriction
    if (route.timeRestriction === "USIKU_TU" && !isKariakooTime() && timing === "HARAKA") {
      return res.status(400).json({
        error: "Kariakoo — delivery inaanza 8:00PM tu. Chagua wakati wa usiku.",
        suggestion: "USIKU"
      });
    }

    const agent = db.data.users.find(u => u.id === req.user.id);
    const resolvedClientType = clientType || agent?.clientType || "MPYA";
    const pricing = calculatePrice(route, containerType, resolvedClientType);

    const job = {
      id: uuidv4(),
      agentId: req.user.id,
      agentName: req.user.name,
      origin,
      destination: route.destination,
      destinationId: route.id,
      km: route.km,
      containerType,
      timing,
      clientType: resolvedClientType,
      pricing,
      status: "WAZI",        // WAZI | IMEPEWA | NJIANI | IMEKAMILIKA | IMEFUTWA
      assignedTruckId: null,
      assignedDriverId: null,
      notes: notes || null,
      nightDelivery: route.timeRestriction === "USIKU_TU",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.data.jobs.push(job);
    await db.write();

    res.status(201).json({
      message: "Kazi imesajiliwa. Tunatafuta drivers...",
      job,
    });
  } catch (err) {
    console.error("Post job error:", err);
    res.status(500).json({ error: "Hitilafu ya seva" });
  }
});

// ─── GET ALL OPEN JOBS (for truck owners) ────────────────────
// GET /api/jobs/open?origin=&containerType=
router.get("/open", authMiddleware, requireRole("truck_owner"), async (req, res) => {
  try {
    const db = await getDb();
    const { origin, containerType } = req.query;

    let jobs = db.data.jobs.filter(j => j.status === "WAZI");

    if (origin) {
      jobs = jobs.filter(j => j.origin.toLowerCase().includes(origin.toLowerCase()));
    }
    if (containerType) {
      jobs = jobs.filter(j => j.containerType === containerType);
    }

    // Enrich with agent info (exclude private data)
    const enriched = jobs.map(job => {
      const agent = db.data.users.find(u => u.id === job.agentId);
      return {
        ...job,
        agent: agent ? {
          name: agent.name,
          rating: agent.rating,
          totalTrips: agent.totalTrips,
          clientType: agent.clientType,
        } : null,
      };
    });

    // Sort: pricing high to low by default (drivers prefer higher pay)
    enriched.sort((a, b) => b.pricing.suggested - a.pricing.suggested);

    res.json({ count: enriched.length, jobs: enriched });
  } catch (err) {
    res.status(500).json({ error: "Hitilafu ya seva" });
  }
});

// ─── GET MY JOBS (agent view) ─────────────────────────────────
// GET /api/jobs/mine
router.get("/mine", authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    let jobs;

    if (req.user.role === "agent") {
      jobs = db.data.jobs.filter(j => j.agentId === req.user.id);
    } else {
      // truck_owner — see jobs they're assigned to
      jobs = db.data.jobs.filter(j => j.assignedDriverId === req.user.id);
    }

    // Sort newest first
    jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ count: jobs.length, jobs });
  } catch (err) {
    res.status(500).json({ error: "Hitilafu ya seva" });
  }
});

// ─── ACCEPT JOB (truck owner) ─────────────────────────────────
// POST /api/jobs/:id/accept
// Body: { truckId }
router.post("/:id/accept", authMiddleware, requireRole("truck_owner"), async (req, res) => {
  try {
    const db = await getDb();
    const job = db.data.jobs.find(j => j.id === req.params.id);

    if (!job) return res.status(404).json({ error: "Kazi haipatikani" });
    if (job.status !== "WAZI") {
      return res.status(409).json({ error: "Kazi hii tayari imechukuliwa" });
    }

    const { truckId } = req.body;
    const truck = db.data.trucks.find(t => t.id === truckId && t.ownerId === req.user.id);
    if (!truck) return res.status(404).json({ error: "Gari hili halipo au si lako" });
    if (truck.status !== "WAZI") {
      return res.status(409).json({ error: `Gari lako liko ${truck.status} — haliwezi kuchukua kazi mpya` });
    }

    // Assign
    job.status = "IMEPEWA";
    job.assignedTruckId = truckId;
    job.assignedDriverId = req.user.id;
    job.assignedDriverName = req.user.name;
    job.acceptedAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();

    // Update truck status
    truck.status = "FOLENI";
    truck.currentJobId = job.id;

    // Log assignment
    db.data.job_assignments.push({
      id: uuidv4(),
      jobId: job.id,
      truckId,
      driverId: req.user.id,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    });

    await db.write();

    res.json({
      message: "Umekubali kazi. Nenda bandarini.",
      job,
      truck,
      instructions: job.nightDelivery
        ? "Kazi ya USIKU — fikia eneo la delivery baada ya 8:00PM"
        : "Nenda bandari / ICD mara moja",
    });
  } catch (err) {
    console.error("Accept job error:", err);
    res.status(500).json({ error: "Hitilafu ya seva" });
  }
});

// ─── UPDATE JOB STATUS (driver updates progress) ─────────────
// PATCH /api/jobs/:id/status
// Body: { status, lat?, lng?, note? }
// Status flow: IMEPEWA → BANDARINI → NJIANI → IMEKAMILIKA
router.patch("/:id/status", authMiddleware, requireRole("truck_owner"), async (req, res) => {
  try {
    const db = await getDb();
    const job = db.data.jobs.find(j => j.id === req.params.id);

    if (!job) return res.status(404).json({ error: "Kazi haipatikani" });
    if (job.assignedDriverId !== req.user.id) {
      return res.status(403).json({ error: "Si kazi yako hii" });
    }

    const { status, lat, lng, note } = req.body;
    const validTransitions = {
      IMEPEWA: ["BANDARINI"],
      BANDARINI: ["IMEPAKIWA"],
      IMEPAKIWA: ["NJIANI"],
      NJIANI: ["IMEKAMILIKA"],
    };

    if (!validTransitions[job.status]?.includes(status)) {
      return res.status(400).json({
        error: `Haiwezekani kwenda kutoka ${job.status} hadi ${status}`,
        allowedNext: validTransitions[job.status] || [],
      });
    }

    // Kariakoo check — can't deliver before 8PM
    if (job.nightDelivery && status === "NJIANI") {
      const hour = new Date().getHours();
      if (!isKariakooTime()) {
        return res.status(400).json({
          error: `Kariakoo delivery haijaanza bado. Subiri hadi 8:00PM. Sasa: ${hour}:00`
        });
      }
    }

    job.status = status;
    job.updatedAt = new Date().toISOString();
    if (note) job.lastNote = note;

    // Track location update
    if (lat && lng) {
      const truck = db.data.trucks.find(t => t.id === job.assignedTruckId);
      if (truck) {
        truck.lat = lat;
        truck.lng = lng;
        truck.lastSeen = new Date().toISOString();

        // Auto-update truck status
        if (status === "NJIANI") truck.status = "NJIANI";
        if (status === "BANDARINI") truck.status = "FOLENI";
      }

      db.data.tracking.push({
        id: uuidv4(),
        jobId: job.id,
        truckId: job.assignedTruckId,
        status,
        lat,
        lng,
        timestamp: new Date().toISOString(),
      });
    }

    // Job completed
    if (status === "IMEKAMILIKA") {
      job.completedAt = new Date().toISOString();
      const truck = db.data.trucks.find(t => t.id === job.assignedTruckId);
      if (truck) {
        truck.status = "WAZI";
        truck.currentJobId = null;
        truck.trips += 1;
      }
      const driver = db.data.users.find(u => u.id === req.user.id);
      if (driver) driver.totalTrips += 1;
      const agent = db.data.users.find(u => u.id === job.agentId);
      if (agent) agent.totalTrips += 1;

      // Update client type based on completed trips
      if (agent && agent.totalTrips >= 10) agent.clientType = "KATI";
      if (agent && agent.totalTrips >= 30) agent.clientType = "KUBWA";
    }

    await db.write();

    const statusMessages = {
      BANDARINI: "Mfumo umesajili: Umefika bandarini",
      IMEPAKIWA: "Mfumo umesajili: Kontena imepakiwa — tayari kwenda",
      NJIANI: "Mfumo umesajili: Uko njiani kuelekea mteja",
      IMEKAMILIKA: "Hongera! Kazi imekamilika. Tafadhali mpe rating mteja.",
    };

    res.json({
      message: statusMessages[status] || "Status imesasishwa",
      job,
      nextStep: validTransitions[status]?.[0] || null,
    });
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ error: "Hitilafu ya seva" });
  }
});

// ─── GET JOB DETAILS ─────────────────────────────────────────
// GET /api/jobs/:id
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const job = db.data.jobs.find(j => j.id === req.params.id);
    if (!job) return res.status(404).json({ error: "Kazi haipatikani" });

    // Include tracking history
    const tracking = db.data.tracking
      .filter(t => t.jobId === job.id)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json({ job, tracking });
  } catch (err) {
    res.status(500).json({ error: "Hitilafu ya seva" });
  }
});

// ─── CANCEL JOB (agent only, if not yet accepted) ────────────
// DELETE /api/jobs/:id
router.delete("/:id", authMiddleware, requireRole("agent"), async (req, res) => {
  try {
    const db = await getDb();
    const job = db.data.jobs.find(j => j.id === req.params.id);

    if (!job) return res.status(404).json({ error: "Kazi haipatikani" });
    if (job.agentId !== req.user.id) return res.status(403).json({ error: "Si kazi yako" });
    if (!["WAZI", "IMEPEWA"].includes(job.status)) {
      return res.status(409).json({ error: "Kazi iliyoanza haiwezi kufutwa" });
    }

    job.status = "IMEFUTWA";
    job.cancelledAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();

    // Release truck if assigned
    if (job.assignedTruckId) {
      const truck = db.data.trucks.find(t => t.id === job.assignedTruckId);
      if (truck) {
        truck.status = "WAZI";
        truck.currentJobId = null;
      }
    }

    await db.write();
    res.json({ message: "Kazi imefutwa", job });
  } catch (err) {
    res.status(500).json({ error: "Hitilafu ya seva" });
  }
});

module.exports = router;
      
