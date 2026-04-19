const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../db/database");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// ─── REGISTER ───────────────────────────────────────────────
// POST /api/auth/register
// Body: { name, phone, password, role, truckDetails? }
router.post("/register", async (req, res) => {
  try {
    const db = await getDb();
    const { name, phone, password, role, truckDetails } = req.body;

    // Validate
    if (!name || !phone || !password || !role) {
      return res.status(400).json({ error: "Jaza sehemu zote: jina, simu, neno siri, aina" });
    }
    if (!["agent", "truck_owner"].includes(role)) {
      return res.status(400).json({ error: "Aina lazima iwe: agent au truck_owner" });
    }

    // Check phone uniqueness
    const exists = db.data.users.find(u => u.phone === phone);
    if (exists) {
      return res.status(409).json({ error: "Namba hii ya simu tayari imesajiliwa" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const newUser = {
      id: userId,
      name,
      phone,
      password: hashedPassword,
      role,
      clientType: "MPYA", // MPYA | KATI | KUBWA
      rating: null,
      totalTrips: 0,
      isVerified: false,
      createdAt: new Date().toISOString(),
    };

    db.data.users.push(newUser);

    // If truck_owner — add truck details
    if (role === "truck_owner" && truckDetails) {
      const truck = {
        id: uuidv4(),
        ownerId: userId,
        plate: truckDetails.plate,
        type: truckDetails.type || ["20ft"],
        status: "WAZI",
        location: null,
        lat: null,
        lng: null,
        driverName: truckDetails.driverName || name,
        phone: truckDetails.phone || phone,
        insuranceExpiry: truckDetails.insuranceExpiry || null,
        rating: null,
        trips: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      db.data.trucks.push(truck);
    }

    await db.write();

    // Generate token
    const token = jwt.sign(
      { id: userId, name, phone, role },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    const { password: _p, ...userSafe } = newUser;
    res.status(201).json({ message: "Umesajiliwa", token, user: userSafe });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Hitilafu ya seva — jaribu tena" });
  }
});

// ─── LOGIN ───────────────────────────────────────────────────
// POST /api/auth/login
// Body: { phone, password }
router.post("/login", async (req, res) => {
  try {
    const db = await getDb();
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: "Weka namba ya simu na neno siri" });
    }

    const user = db.data.users.find(u => u.phone === phone);
    if (!user) {
      return res.status(404).json({ error: "Namba hii haijasajiliwa" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Neno siri si sahihi" });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    const { password: _p, ...userSafe } = user;
    res.json({ message: "Umeingia", token, user: userSafe });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Hitilafu ya seva — jaribu tena" });
  }
});

// ─── GET PROFILE ─────────────────────────────────────────────
// GET /api/auth/me
const { authMiddleware } = require("../middleware/auth");
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const db = await getDb();
    const user = db.data.users.find(u => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "Mtumiaji hapatikani" });

    const { password: _p, ...userSafe } = user;

    // If truck owner, include their trucks
    if (user.role === "truck_owner") {
      userSafe.trucks = db.data.trucks.filter(t => t.ownerId === user.id);
    }

    res.json(userSafe);
  } catch (err) {
    res.status(500).json({ error: "Hitilafu ya seva" });
  }
});

module.exports = router;
