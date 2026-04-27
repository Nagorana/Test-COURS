// routes/cart.js
const express = require("express");
const { Cart, Listings } = require("../db");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// GET /api/cart — mon panier
router.get("/", (req, res) => {
    const cart = Cart.getByUser(req.user.id);
    res.json(cart);
});

// POST /api/cart/add — ajouter un listing (achat immédiat)
// body: { listingId }
router.post("/add", (req, res) => {
    const { listingId } = req.body;
    const listing = Listings.findById(listingId);
    if (!listing) return res.status(404).json({ error: "Listing introuvable" });
    if (listing.mode !== "immediate") return res.status(400).json({ error: "Seuls les achats immédiats vont au panier" });
    if (listing.status !== "active") return res.status(400).json({ error: "Ce listing n'est plus disponible" });
    if (listing.sellerId === req.user.id) return res.status(403).json({ error: "Vous ne pouvez pas acheter votre propre carte" });

    const cart = Cart.getByUser(req.user.id);
    if (cart.items.find(i => i.listingId === listingId))
        return res.status(409).json({ error: "Déjà dans le panier" });

    cart.items.push({
        listingId,
        cardName: listing.cardName,
        cardImage: listing.cardImage,
        extensionName: listing.extensionName,
        price: listing.price,
        currency: listing.currency,
        addedAt: Date.now()
    });
    Cart.setForUser(req.user.id, cart.items);
    res.json(cart);
});

// DELETE /api/cart/:listingId — retirer du panier
router.delete("/:listingId", (req, res) => {
    const cart = Cart.getByUser(req.user.id);
    const items = cart.items.filter(i => i.listingId !== req.params.listingId);
    Cart.setForUser(req.user.id, items);
    res.json({ ok: true });
});

// POST /api/cart/checkout — passer commande (simule le paiement)
router.post("/checkout", (req, res) => {
    const cart = Cart.getByUser(req.user.id);
    if (!cart.items.length) return res.status(400).json({ error: "Panier vide" });

    // Marque tous les listings comme vendus
    for (const item of cart.items) {
        Listings.update(item.listingId, { status: "sold", buyerId: req.user.id });
    }

    Cart.setForUser(req.user.id, []);
    res.json({ ok: true, message: "Commande validée !", itemCount: cart.items.length });
});

module.exports = router;
