// src/routes/users.js
const express = require("express");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware, adminOnly } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/users
router.get("/", authMiddleware, async (req, res) => {
  try {
    const where = req.user.role === "ADMIN" ? {} : { id: req.user.id };
    const users = await prisma.user.findMany({
      where: { ...where, active: true },
      select: {
        id: true, name: true, email: true, role: true,
        specialty: true, color: true, commissionPercent: true, createdAt: true,
        _count: { select: { patients: true, appointments: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json(users);
  } catch (e) { res.status(500).json({ error: "Erro ao buscar terapeutas." }); }
});

// POST /api/users — criar terapeuta (admin only)
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  const { name, email, password, specialty, color, role, commissionPercent } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: "Nome, email e senha são obrigatórios." });
  try {
    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(400).json({ error: "Este email já está cadastrado." });
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name, email: email.toLowerCase().trim(), password: hashed,
        specialty, color: color || "#4A8FC4",
        role: role || "THERAPIST",
        commissionPercent: Number(commissionPercent) || 0,
      },
      select: { id: true, name: true, email: true, role: true, specialty: true, color: true, commissionPercent: true },
    });
    res.status(201).json(user);
  } catch (e) { res.status(500).json({ error: "Erro ao criar terapeuta." }); }
});

// PUT /api/users/:id
router.put("/:id", authMiddleware, async (req, res) => {
  if (req.user.role !== "ADMIN" && req.user.id !== req.params.id)
    return res.status(403).json({ error: "Sem permissão." });
  const { name, specialty, color, commissionPercent } = req.body;
  try {
    const data = { name, specialty, color };
    if (req.user.role === "ADMIN" && commissionPercent !== undefined)
      data.commissionPercent = Number(commissionPercent);
    const user = await prisma.user.update({
      where: { id: req.params.id }, data,
      select: { id: true, name: true, email: true, role: true, specialty: true, color: true, commissionPercent: true },
    });
    res.json(user);
  } catch (e) { res.status(500).json({ error: "Erro ao atualizar." }); }
});

// DELETE /api/users/:id — soft delete
router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
  if (req.params.id === req.user.id)
    return res.status(400).json({ error: "Você não pode remover a si mesmo." });
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ message: "Terapeuta desativado com sucesso." });
  } catch (e) { res.status(500).json({ error: "Erro ao remover terapeuta." }); }
});

module.exports = router;
