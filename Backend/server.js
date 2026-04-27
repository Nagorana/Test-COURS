// server.js — Point d'entrée principal
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { Users } = require("./db");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",     require("./routes/auth"));
app.use("/api/admin",    require("./routes/admin"));
app.use("/api/listings", require("./routes/listings"));
app.use("/api/cart",     require("./routes/cart"));

// Route santé
app.get("/api/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ─── Init admin par défaut ────────────────────────────────────────────────────
async function initAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@tcg.local";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin1234!";
    const hashed = await bcrypt.hash(adminPassword, 10);
    Users.ensureAdmin(adminEmail, hashed);
    console.log(`\n✅ Admin prêt : ${adminEmail} / ${adminPassword}`);
    console.log("   ⚠️  Changez le mot de passe en production via .env\n");
}

// ─── Démarrage ────────────────────────────────────────────────────────────────
initAdmin().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Backend TCG démarré sur http://localhost:${PORT}`);
        console.log(`\nEndpoints disponibles :`);
        console.log(`  POST   /api/auth/register`);
        console.log(`  POST   /api/auth/login`);
        console.log(`  GET    /api/auth/me`);
        console.log(`  GET    /api/listings          — marché public`);
        console.log(`  GET    /api/listings/extensions/all  — extensions+cartes`);
        console.log(`  POST   /api/listings          — mettre en vente [auth]`);
        console.log(`  POST   /api/listings/:id/bid  — enchérir [auth]`);
        console.log(`  POST   /api/listings/:id/accept-bid  — accepter offre [vendeur]`);
        console.log(`  GET    /api/listings/my/sales — mes ventes [auth]`);
        console.log(`  GET    /api/listings/my/bids  — mes enchères [auth]`);
        console.log(`  GET    /api/cart              — panier [auth]`);
        console.log(`  POST   /api/cart/add          — ajouter au panier [auth]`);
        console.log(`  POST   /api/cart/checkout     — payer [auth]`);
        console.log(`  GET    /api/admin/extensions  — gérer extensions [admin]`);
        console.log(`  POST   /api/admin/extensions  — créer extension [admin]`);
        console.log(`  POST   /api/admin/extensions/:id/cards — ajouter carte [admin]`);
    });
});
