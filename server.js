require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Routes
const authRoutes = require("./routes/auth");
const jobRoutes = require("./routes/jobs");
const truckRoutes = require("./routes/trucks");
const { ratingsRouter, pricingRouter } = require("./routes/ratings-pricing");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARE ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Request logger (MVP mode)
app.use((req, res, next) => {
  const time = new Date().toLocaleTimeString("sw-TZ", { timeZone: "Africa/Dar_es_Salaam" });
  console.log(`[${time}] ${req.method} ${req.path}`);
  next();
});

// ─── ROUTES ───────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/trucks", truckRoutes);
app.use("/api/ratings", ratingsRouter);
app.use("/api/pricing", pricingRouter);

// ─── ROOT ─────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    name: "Smart Logistics Log API",
    version: "1.0.0",
    status: "Inafanya kazi ✓",
    location: "Dar es Salaam, Tanzania",
    endpoints: {
      auth: {
        "POST /api/auth/register": "Sajili akaunti mpya",
        "POST /api/auth/login": "Ingia kwenye mfumo",
        "GET /api/auth/me": "Tazama taarifa zako",
      },
      jobs: {
        "POST /api/jobs": "Tuma kazi mpya (agent)",
        "GET /api/jobs/open": "Tazama kazi zinazopatikana (driver)",
        "GET /api/jobs/mine": "Kazi zangu",
        "POST /api/jobs/:id/accept": "Kubali kazi (driver)",
        "PATCH /api/jobs/:id/status": "Sasisha hali ya kazi",
        "DELETE /api/jobs/:id": "Futa kazi (agent)",
      },
      trucks: {
        "POST /api/trucks": "Sajili gari",
        "GET /api/trucks/available": "Magari yaliyopo",
        "GET /api/trucks/mine": "Magari yangu",
        "PATCH /api/trucks/:id/status": "Badilisha hali ya gari",
        "PATCH /api/trucks/:id/location": "Sasisha mahali pa gari (GPS)",
      },
      pricing: {
        "GET /api/pricing": "Bei zote za sasa",
        "GET /api/pricing/:destinationId": "Bei ya destination maalum",
      },
      ratings: {
        "POST /api/ratings": "Toa rating baada ya safari",
        "GET /api/ratings/user/:userId": "Tazama ratings za mtumiaji",
      },
    },
  });
});

// ─── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Njia hii haipatikani", path: req.path });
});

// ─── ERROR HANDLER ────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Hitilafu ya seva — jaribu tena" });
});

// ─── START ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SMART LOGISTICS LOG — SERVER IMEANZA");
  console.log(`  Port: ${PORT}`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
});

module.exports = app;
