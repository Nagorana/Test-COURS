const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Users } = require("../db");

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "tcg_secret_dev";

router.post("/register", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: "Email et mot de passe requis" });
    if (Users.findByEmail(email))
        return res.status(409).json({ error: "Email déjà utilisé" });
    const hashed = await bcrypt.hash(password, 10);
    const user = Users.create({ email, password: hashed });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = Users.findByEmail(email);
    if (!user) return res.status(401).json({ error: "Identifiants incorrects" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Identifiants incorrects" });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

router.get("/me", (req, res) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: "Non authentifié" });
    try {
        const user = jwt.verify(header.slice(7), SECRET);
        res.json({ user });
    } catch {
        res.status(401).json({ error: "Token invalide" });
    }
});

module.exports = router;
