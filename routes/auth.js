const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "smart-logistics-secret-2025";

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Hakuna ruhusa — tafadhali ingia kwanza" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token si sahihi au imekwisha — ingia tena" });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Sehemu hii ni kwa ${role} tu` });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole, JWT_SECRET };
