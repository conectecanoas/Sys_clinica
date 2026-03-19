// src/routes/appointments.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/appointments?date=2025-03-05&therapistId=xxx&roomId=xxx
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { date, therapistId, roomId, patientId } = req.query;
    const where = {};
    if (date) {
      const start = new Date(date + "T00:00:00.000Z");
      const end   = new Date(date + "T23:59:59.999Z");
      where.date  = { gte: start, lte: end };
    }
    if (therapistId) where.therapistId = therapistId;
    else if (req.user.role !== "ADMIN") where.therapistId = req.user.id;
    if (roomId) where.roomId = roomId;
    if (patientId) where.patientId = patientId;

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient:  { select: { id: true, name: true, birthDate: true, diagnosis: true } },
        therapist:{ select: { id: true, name: true, color: true, specialty: true } },
        room:     { select: { id: true, name: true, color: true } },
        sessionNote: true,
      },
      orderBy: { hour: "asc" },
    });
    res.json(appointments);
  } catch (e) { res.status(500).json({ error: "Erro ao buscar agendamentos." }); }
});

// POST /api/appointments
router.post("/", authMiddleware, async (req, res) => {
  const { patientId, therapistId, roomId, date, hour, duration } = req.body;
  if (!patientId || !date || !hour)
    return res.status(400).json({ error: "Paciente, data e horário são obrigatórios." });

  const assignedTherapist = req.user.role === "ADMIN" && therapistId ? therapistId : req.user.id;

  try {
    const dateObj = new Date(date + "T12:00:00.000Z");

    // Conflito de terapeuta no mesmo horário
    const therapistConflict = await prisma.appointment.findFirst({
      where: { therapistId: assignedTherapist, date: dateObj, hour, status: { not: "CANCELLED" } },
    });
    if (therapistConflict)
      return res.status(400).json({ error: "Este terapeuta já possui um agendamento neste horário." });

    // Conflito de sala no mesmo horário
    if (roomId) {
      const roomConflict = await prisma.appointment.findFirst({
        where: { roomId, date: dateObj, hour, status: { not: "CANCELLED" } },
        include: { therapist: { select: { name: true } }, patient: { select: { name: true } } },
      });
      if (roomConflict)
        return res.status(400).json({
          error: `Esta sala já está ocupada às ${hour} por ${roomConflict.therapist.name} (paciente: ${roomConflict.patient.name}).`,
        });
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId, hour, roomId: roomId || null,
        therapistId: assignedTherapist,
        date: dateObj,
        duration: Number(duration) || 50,
      },
      include: {
        patient:  { select: { id: true, name: true, birthDate: true, diagnosis: true } },
        therapist:{ select: { id: true, name: true, color: true } },
        room:     { select: { id: true, name: true, color: true } },
      },
    });
    res.status(201).json(appointment);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao criar agendamento." });
  }
});

// PUT /api/appointments/:id
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { absent, status, roomId } = req.body;
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { absent, status, ...(roomId !== undefined ? { roomId } : {}) },
    });
    res.json(appointment);
  } catch (e) { res.status(500).json({ error: "Erro ao atualizar agendamento." }); }
});

// DELETE /api/appointments/:id — cancela
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await prisma.appointment.update({ where: { id: req.params.id }, data: { status: "CANCELLED" } });
    res.json({ message: "Agendamento cancelado." });
  } catch (e) { res.status(500).json({ error: "Erro ao cancelar agendamento." }); }
});

module.exports = router;
