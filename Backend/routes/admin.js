// routes/admin.js
const express = require("express");
const { Extensions } = require("../db");
const { adminMiddleware } = require("../middleware/auth");

const router = express.Router();
// Toutes les routes admin nécessitent le rôle "admin"
router.use(adminMiddleware);

// ─── EXTENSIONS ──────────────────────────────────────────────────────────────

// GET /api/admin/extensions — liste toutes les extensions
router.get("/extensions", (req, res) => {
    res.json(Extensions.all());
});

// POST /api/admin/extensions — créer une extension
// body: { name, description }
router.post("/extensions", (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Nom requis" });
    const ext = Extensions.create({ name, description: description || "" });
    res.status(201).json(ext);
});

// PUT /api/admin/extensions/:id — modifier une extension
router.put("/extensions/:id", (req, res) => {
    const ext = Extensions.update(req.params.id, req.body);
    if (!ext) return res.status(404).json({ error: "Extension introuvable" });
    res.json(ext);
});

// DELETE /api/admin/extensions/:id — supprimer une extension
router.delete("/extensions/:id", (req, res) => {
    Extensions.delete(req.params.id);
    res.json({ ok: true });
});

// ─── CARTES ──────────────────────────────────────────────────────────────────

// POST /api/admin/extensions/:extId/cards — ajouter une carte à une extension
// body: { name, image, rarity }
router.post("/extensions/:extId/cards", (req, res) => {
    const { name, image, rarity } = req.body;
    if (!name) return res.status(400).json({ error: "Nom de carte requis" });
    const card = Extensions.addCard(req.params.extId, { name, image: image || "", rarity: rarity || "commune" });
    if (!card) return res.status(404).json({ error: "Extension introuvable" });
    res.status(201).json(card);
});

// DELETE /api/admin/extensions/:extId/cards/:cardId — supprimer une carte
router.delete("/extensions/:extId/cards/:cardId", (req, res) => {
    const ext = Extensions.removeCard(req.params.extId, req.params.cardId);
    if (!ext) return res.status(404).json({ error: "Extension introuvable" });
    res.json({ ok: true });
});

module.exports = router;
