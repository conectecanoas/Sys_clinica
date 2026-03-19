// src/routes/rooms.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware, adminOnly } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/rooms
router.get("/", authMiddleware, async (req, res) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { active: true },
      include: { _count: { select: { appointments: true } } },
      orderBy: { name: "asc" },
    });
    res.json(rooms);
  } catch (e) { res.status(500).json({ error: "Erro ao buscar salas." }); }
});

// POST /api/rooms
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  const { name, description, color } = req.body;
  if (!name) return res.status(400).json({ error: "Nome da sala é obrigatório." });
  try {
    const room = await prisma.room.create({ data: { name, description, color: color || "#5BBD7A" } });
    res.status(201).json(room);
  } catch (e) { res.status(500).json({ error: "Erro ao criar sala." }); }
});

// PUT /api/rooms/:id
router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
  const { name, description, color } = req.body;
  try {
    const room = await prisma.room.update({ where: { id: req.params.id }, data: { name, description, color } });
    res.json(room);
  } catch (e) { res.status(500).json({ error: "Erro ao atualizar sala." }); }
});

// DELETE /api/rooms/:id — soft delete
router.delete("/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    // Verifica agendamentos futuros vinculados
    const future = await prisma.appointment.count({
      where: { roomId: req.params.id, date: { gte: new Date() }, status: { not: "CANCELLED" } },
    });
    if (future > 0)
      return res.status(400).json({ error: `Existem ${future} agendamentos futuros nesta sala. Cancele-os antes de remover.` });
    await prisma.room.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ message: "Sala removida com sucesso." });
  } catch (e) { res.status(500).json({ error: "Erro ao remover sala." }); }
});

// GET /api/rooms/:id/availability?date=2025-03-05
router.get("/:id/availability", authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "Data obrigatória." });
    const start = new Date(date + "T00:00:00.000Z");
    const end   = new Date(date + "T23:59:59.999Z");
    const booked = await prisma.appointment.findMany({
      where: { roomId: req.params.id, date: { gte: start, lte: end }, status: { not: "CANCELLED" } },
      select: { id: true, hour: true, duration: true, patient: { select: { name: true } }, therapist: { select: { name: true } } },
    });
    res.json(booked);
  } catch (e) { res.status(500).json({ error: "Erro ao verificar disponibilidade." }); }
});

module.exports = router;
