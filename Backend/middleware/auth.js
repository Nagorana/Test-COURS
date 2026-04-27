// middleware/auth.js
const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "tcg_secret_dev";

function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token manquant" });
    }
    try {
        const token = header.slice(7);
        req.user = jwt.verify(token, SECRET);
        next();
    } catch {
        return res.status(401).json({ error: "Token invalide" });
    }
}

function adminMiddleware(req, res, next) {
    authMiddleware(req, res, () => {
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Accès admin requis" });
        }
        next();
    });
}

module.exports = { authMiddleware, adminMiddleware };
