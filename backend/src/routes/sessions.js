// src/routes/sessions.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/sessions/patient/:patientId
router.get("/patient/:patientId", authMiddleware, async (req, res) => {
  try {
    const notes = await prisma.sessionNote.findMany({
      where: { patientId: req.params.patientId },
      include: { therapist: { select: { id:true, name:true, color:true } } },
      orderBy: { date: "desc" },
    });
    res.json(notes);
  } catch (e) { res.status(500).json({ error: "Erro ao buscar sessões." }); }
});

// POST /api/sessions — criar ou atualizar nota de sessão
router.post("/", authMiddleware, async (req, res) => {
  const { appointmentId, patientId, observations, mood, techniques, plan, report, absent } = req.body;
  if (!appointmentId || !patientId)
    return res.status(400).json({ error: "Agendamento e paciente são obrigatórios." });

  try {
    // Conta quantas sessões o paciente já tem para numerar corretamente
    const count = await prisma.sessionNote.count({ where: { patientId } });
    const existing = await prisma.sessionNote.findUnique({ where: { appointmentId } });

    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) return res.status(404).json({ error: "Agendamento não encontrado." });

    const data = {
      absent: Boolean(absent),
      observations: observations || "",
      mood: mood || "neutro",
      techniques: techniques || [],
      plan: plan || "",
      report: report || "",
    };

    let note;
    if (existing) {
      note = await prisma.sessionNote.update({ where: { appointmentId }, data });
    } else {
      note = await prisma.sessionNote.create({
        data: {
          ...data,
          appointmentId,
          patientId,
          therapistId: req.user.id,
          sessionNumber: count + 1,
          date: appointment.date,
        },
      });
    }

    // Atualiza status da ausência no agendamento
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { absent: Boolean(absent), status: "COMPLETED" },
    });

    res.json(note);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao salvar sessão." });
  }
});

module.exports = router;
