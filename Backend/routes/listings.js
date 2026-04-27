// routes/listings.js
const express = require("express");
const { Listings, Extensions } = require("../db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// ─── PUBLIC ───────────────────────────────────────────────────────────────────

// GET /api/listings — tous les listings actifs
router.get("/", (req, res) => {
    const listings = Listings.active();
    // Met à jour le statut des enchères expirées à la volée
    const now = Date.now();
    const result = listings.map(l => {
        if (l.mode === "auction" && l.endTime && now > l.endTime && l.status === "active") {
            Listings.update(l.id, { status: "ended" });
            return { ...l, status: "ended" };
        }
        return l;
    });
    res.json(result);
});

// GET /api/listings/:id — un listing
router.get("/:id", (req, res) => {
    const listing = Listings.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Listing introuvable" });
    res.json(listing);
});

// GET /api/extensions — liste des extensions avec leurs cartes (pour les menus déroulants)
router.get("/extensions/all", (req, res) => {
    res.json(Extensions.all());
});

// ─── AUTHENTIFIÉ ─────────────────────────────────────────────────────────────

// POST /api/listings — mettre en vente
// body: { extensionId, cardId, price, currency, mode, endTime? }
router.post("/", authMiddleware, (req, res) => {
    const { extensionId, cardId, price, currency, mode, endTime } = req.body;

    if (!extensionId || !cardId || !price || !mode)
        return res.status(400).json({ error: "Champs requis : extensionId, cardId, price, mode" });

    if (!["immediate", "auction"].includes(mode))
        return res.status(400).json({ error: "Mode doit être 'immediate' ou 'auction'" });

    if (mode === "auction" && !endTime)
        return res.status(400).json({ error: "Une enchère nécessite une date de fin" });

    if (endTime && new Date(endTime).getTime() < Date.now())
        return res.status(400).json({ error: "La date de fin est dans le passé" });

    // Récupère les infos de l'extension et de la carte
    const ext = Extensions.findById(extensionId);
    if (!ext) return res.status(404).json({ error: "Extension introuvable" });

    const card = ext.cards.find(c => c.id === cardId);
    if (!card) return res.status(404).json({ error: "Carte introuvable dans cette extension" });

    const listing = Listings.create({
        sellerId: req.user.id,
        sellerEmail: req.user.email,
        extensionId,
        extensionName: ext.name,
        cardId,
        cardName: card.name,
        cardImage: card.image,
        cardRarity: card.rarity,
        price: parseFloat(price),
        currency: currency || "€",
        mode,
        endTime: endTime ? new Date(endTime).getTime() : null
    });

    res.status(201).json(listing);
});

// DELETE /api/listings/:id — annuler sa vente
router.delete("/:id", authMiddleware, (req, res) => {
    const listing = Listings.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Listing introuvable" });
    if (listing.sellerId !== req.user.id && req.user.role !== "admin")
        return res.status(403).json({ error: "Non autorisé" });

    Listings.update(req.params.id, { status: "cancelled" });
    res.json({ ok: true });
});

// ─── ENCHÈRES ────────────────────────────────────────────────────────────────

// POST /api/listings/:id/bid — placer une offre
// body: { amount }
router.post("/:id/bid", authMiddleware, (req, res) => {
    const listing = Listings.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Listing introuvable" });
    if (listing.mode !== "auction") return res.status(400).json({ error: "Ce listing n'est pas une enchère" });
    if (listing.status !== "active") return res.status(400).json({ error: "Enchère terminée ou annulée" });
    if (listing.endTime && Date.now() > listing.endTime)
        return res.status(400).json({ error: "L'enchère est expirée" });
    if (listing.sellerId === req.user.id)
        return res.status(403).json({ error: "Vous ne pouvez pas enchérir sur votre propre vente" });

    const { amount } = req.body;
    if (!amount || isNaN(amount)) return res.status(400).json({ error: "Montant invalide" });

    // Vérifie que l'offre est supérieure à la dernière
    const highestBid = listing.bids.length > 0 ? Math.max(...listing.bids.map(b => b.amount)) : listing.price - 0.01;
    if (parseFloat(amount) <= highestBid)
        return res.status(400).json({ error: `L'offre doit dépasser ${highestBid} ${listing.currency}` });

    const bid = Listings.addBid(listing.id, {
        bidderId: req.user.id,
        bidderEmail: req.user.email,
        amount: parseFloat(amount)
    });

    res.status(201).json(bid);
});

// GET /api/listings/:id/bids — voir toutes les offres (vendeur ou admin)
router.get("/:id/bids", authMiddleware, (req, res) => {
    const listing = Listings.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Listing introuvable" });
    if (listing.sellerId !== req.user.id && req.user.role !== "admin")
        return res.status(403).json({ error: "Non autorisé" });

    const sorted = [...listing.bids].sort((a, b) => b.amount - a.amount);
    res.json({ bids: sorted, highestBid: sorted[0] || null });
});

// POST /api/listings/:id/accept-bid — vendeur accepte la meilleure offre
router.post("/:id/accept-bid", authMiddleware, (req, res) => {
    const listing = Listings.findById(req.params.id);
    if (!listing) return res.status(404).json({ error: "Listing introuvable" });
    if (listing.sellerId !== req.user.id) return res.status(403).json({ error: "Non autorisé" });
    if (listing.mode !== "auction") return res.status(400).json({ error: "Pas une enchère" });
    if (listing.bids.length === 0) return res.status(400).json({ error: "Aucune offre reçue" });

    const best = [...listing.bids].sort((a, b) => b.amount - a.amount)[0];
    const updated = Listings.update(listing.id, { status: "sold", winner: best });

    res.json({ ok: true, winner: best, listing: updated });
});

// ─── MES VENTES ──────────────────────────────────────────────────────────────

// GET /api/listings/my/sales — listings du vendeur connecté
router.get("/my/sales", authMiddleware, (req, res) => {
    const all = Listings.all().filter(l => l.sellerId === req.user.id);
    res.json(all);
});

// GET /api/listings/my/bids — enchères placées par l'acheteur connecté
router.get("/my/bids", authMiddleware, (req, res) => {
    const all = Listings.all();
    const myBids = [];
    for (const listing of all) {
        const bid = listing.bids.find(b => b.bidderId === req.user.id);
        if (bid) {
            const highestBid = Math.max(...listing.bids.map(b => b.amount));
            myBids.push({
                listing,
                myBid: bid,
                isWinning: bid.amount === highestBid
            });
        }
    }
    res.json(myBids);
});

module.exports = router;
