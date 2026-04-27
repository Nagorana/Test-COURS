// db.js — Couche de persistance SQLite (better-sqlite3)
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const db = new Database(path.join(DATA_DIR, "tcg.db"));

// Active les foreign keys et le mode WAL (performances)
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── CRÉATION DES TABLES ─────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    username    TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'user',
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS extensions (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cards (
    id           TEXT PRIMARY KEY,
    extension_id TEXT NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    image        TEXT DEFAULT '',
    rarity       TEXT DEFAULT 'commune'
  );

  CREATE TABLE IF NOT EXISTS listings (
    id             TEXT PRIMARY KEY,
    seller_id      TEXT NOT NULL REFERENCES users(id),
    seller_username TEXT NOT NULL,
    extension_id   TEXT NOT NULL,
    extension_name TEXT NOT NULL,
    card_id        TEXT NOT NULL,
    card_name      TEXT NOT NULL,
    card_image     TEXT DEFAULT '',
    card_rarity    TEXT DEFAULT 'commune',
    price          REAL NOT NULL,
    currency       TEXT DEFAULT '€',
    mode           TEXT NOT NULL CHECK(mode IN ('immediate','auction')),
    end_time       INTEGER,
    status         TEXT NOT NULL DEFAULT 'active',
    winner_id      TEXT,
    winner_username TEXT,
    winner_amount  REAL,
    created_at     INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bids (
    id          TEXT PRIMARY KEY,
    listing_id  TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    bidder_id   TEXT NOT NULL REFERENCES users(id),
    bidder_username TEXT NOT NULL,
    amount      REAL NOT NULL,
    placed_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES users(id),
    listing_id   TEXT NOT NULL,
    card_name    TEXT NOT NULL,
    card_image   TEXT DEFAULT '',
    extension_name TEXT NOT NULL,
    price        REAL NOT NULL,
    currency     TEXT DEFAULT '€',
    added_at     INTEGER NOT NULL,
    UNIQUE(user_id, listing_id)
  );
`);

// ─── UTILITAIRE ──────────────────────────────────────────────────────────────
function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── USERS ───────────────────────────────────────────────────────────────────
const Users = {
    all: () => db.prepare("SELECT * FROM users").all(),

    findByEmail: (email) =>
        db.prepare("SELECT * FROM users WHERE email = ?").get(email),

    findById: (id) =>
        db.prepare("SELECT * FROM users WHERE id = ?").get(id),

    findByUsername: (username) =>
        db.prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?)").get(username),

    create: (data) => {
        const user = {
            id: genId(),
            created_at: Date.now(),
            role: "user",
            ...data
        };
        db.prepare(`
            INSERT INTO users (id, email, username, password, role, created_at)
            VALUES (@id, @email, @username, @password, @role, @created_at)
        `).run(user);
        return user;
    },

    ensureAdmin: (email, hashedPassword) => {
        const exists = db.prepare("SELECT id FROM users WHERE role = 'admin'").get();
        if (!exists) {
            const admin = {
                id: genId(),
                email,
                username: "Admin",
                password: hashedPassword,
                role: "admin",
                created_at: Date.now()
            };
            db.prepare(`
                INSERT INTO users (id, email, username, password, role, created_at)
                VALUES (@id, @email, @username, @password, @role, @created_at)
            `).run(admin);
        }
    }
};

// ─── EXTENSIONS ──────────────────────────────────────────────────────────────
const Extensions = {
    all: () => {
        const exts = db.prepare("SELECT * FROM extensions ORDER BY created_at DESC").all();
        return exts.map(ext => ({
            ...ext,
            cards: db.prepare("SELECT * FROM cards WHERE extension_id = ?").all(ext.id)
        }));
    },

    findById: (id) => {
        const ext = db.prepare("SELECT * FROM extensions WHERE id = ?").get(id);
        if (!ext) return null;
        ext.cards = db.prepare("SELECT * FROM cards WHERE extension_id = ?").all(id);
        return ext;
    },

    create: (data) => {
        const ext = { id: genId(), created_at: Date.now(), description: "", ...data };
        db.prepare(`
            INSERT INTO extensions (id, name, description, created_at)
            VALUES (@id, @name, @description, @created_at)
        `).run(ext);
        return { ...ext, cards: [] };
    },

    update: (id, data) => {
        const fields = Object.keys(data).map(k => `${k} = @${k}`).join(", ");
        db.prepare(`UPDATE extensions SET ${fields} WHERE id = @id`).run({ ...data, id });
        return Extensions.findById(id);
    },

    delete: (id) => {
        db.prepare("DELETE FROM extensions WHERE id = ?").run(id);
    },

    addCard: (extId, cardData) => {
        const card = { id: genId(), extension_id: extId, rarity: "commune", image: "", ...cardData };
        db.prepare(`
            INSERT INTO cards (id, extension_id, name, image, rarity)
            VALUES (@id, @extension_id, @name, @image, @rarity)
        `).run(card);
        return card;
    },

    removeCard: (extId, cardId) => {
        db.prepare("DELETE FROM cards WHERE id = ? AND extension_id = ?").run(cardId, extId);
        return Extensions.findById(extId);
    }
};

// ─── LISTINGS ────────────────────────────────────────────────────────────────
const Listings = {
    all: () => {
        const listings = db.prepare("SELECT * FROM listings ORDER BY created_at DESC").all();
        return listings.map(l => ({
            ...l,
            bids: db.prepare("SELECT * FROM bids WHERE listing_id = ? ORDER BY amount DESC").all(l.id)
        }));
    },

    active: () => {
        const listings = db.prepare("SELECT * FROM listings WHERE status = 'active' ORDER BY created_at DESC").all();
        return listings.map(l => ({
            ...l,
            bids: db.prepare("SELECT * FROM bids WHERE listing_id = ? ORDER BY amount DESC").all(l.id)
        }));
    },

    findById: (id) => {
        const listing = db.prepare("SELECT * FROM listings WHERE id = ?").get(id);
        if (!listing) return null;
        listing.bids = db.prepare("SELECT * FROM bids WHERE listing_id = ? ORDER BY amount DESC").all(id);
        return listing;
    },

    create: (data) => {
        const listing = {
            id: genId(),
            bids: [],
            status: "active",
            created_at: Date.now(),
            end_time: null,
            winner_id: null,
            winner_username: null,
            winner_amount: null,
            card_image: "",
            card_rarity: "commune",
            currency: "€",
            ...data
        };
        db.prepare(`
            INSERT INTO listings
            (id, seller_id, seller_username, extension_id, extension_name,
             card_id, card_name, card_image, card_rarity,
             price, currency, mode, end_time, status, created_at)
            VALUES
            (@id, @seller_id, @seller_username, @extension_id, @extension_name,
             @card_id, @card_name, @card_image, @card_rarity,
             @price, @currency, @mode, @end_time, @status, @created_at)
        `).run(listing);
        return { ...listing, bids: [] };
    },

    update: (id, data) => {
        const allowed = ["status", "winner_id", "winner_username", "winner_amount"];
        const fields = Object.keys(data)
            .filter(k => allowed.includes(k))
            .map(k => `${k} = @${k}`)
            .join(", ");
        if (!fields) return Listings.findById(id);
        db.prepare(`UPDATE listings SET ${fields} WHERE id = @id`).run({ ...data, id });
        return Listings.findById(id);
    },

    addBid: (listingId, bid) => {
        const bidObj = { id: genId(), listing_id: listingId, placed_at: Date.now(), ...bid };
        db.prepare(`
            INSERT INTO bids (id, listing_id, bidder_id, bidder_username, amount, placed_at)
            VALUES (@id, @listing_id, @bidder_id, @bidder_username, @amount, @placed_at)
        `).run(bidObj);
        return bidObj;
    }
};

// ─── CART ─────────────────────────────────────────────────────────────────────
const Cart = {
    getByUser: (userId) => {
        const items = db.prepare("SELECT * FROM cart_items WHERE user_id = ? ORDER BY added_at DESC").all(userId);
        return { userId, items };
    },

    addItem: (userId, item) => {
        const cartItem = { id: genId(), user_id: userId, added_at: Date.now(), ...item };
        db.prepare(`
            INSERT OR IGNORE INTO cart_items
            (id, user_id, listing_id, card_name, card_image, extension_name, price, currency, added_at)
            VALUES (@id, @user_id, @listing_id, @card_name, @card_image, @extension_name, @price, @currency, @added_at)
        `).run(cartItem);
        return Cart.getByUser(userId);
    },

    removeItem: (userId, listingId) => {
        db.prepare("DELETE FROM cart_items WHERE user_id = ? AND listing_id = ?").run(userId, listingId);
    },

    clear: (userId) => {
        db.prepare("DELETE FROM cart_items WHERE user_id = ?").run(userId);
    }
};

module.exports = { Users, Extensions, Listings, Cart, genId, db };