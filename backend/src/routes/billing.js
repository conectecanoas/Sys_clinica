// src/routes/billing.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/billing?year=2025&month=2&patientId=xxx&therapistId=xxx
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { year, month, patientId, therapistId } = req.query;
    const y = Number(year) || new Date().getFullYear();
    const m = Number(month); // 0-based

    const start = new Date(y, m, 1);
    const end   = new Date(y, m + 1, 0, 23, 59, 59);

    const where = {
      date: { gte: start, lte: end },
      status: { not: "CANCELLED" },
    };

    if (patientId) where.patientId = patientId;
    if (therapistId) where.therapistId = therapistId;
    else if (req.user.role !== "ADMIN") where.therapistId = req.user.id;

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: { id:true, name:true, cpf:true, guardianName:true, guardianPhone:true,
                    birthDate:true, sessionValue:true, addressCidade:true, addressEstado:true }
        },
        therapist: { select: { id:true, name:true, specialty:true } },
        sessionNote: { select: { id:true, absent:true } },
      },
      orderBy: [{ patientId: "asc" }, { date: "asc" }],
    });

    // Agrupar por paciente
    const byPatient = {};
    for (const appt of appointments) {
      const pid = appt.patientId;
      if (!byPatient[pid]) {
        byPatient[pid] = {
          patient: appt.patient,
          therapist: appt.therapist,
          appointments: [],
          sessionsCount: 0,
          absenceCount: 0,
          total: 0,
        };
      }
      byPatient[pid].appointments.push(appt);
      const isAbsent = appt.absent || appt.sessionNote?.absent;
      if (!isAbsent) {
        byPatient[pid].sessionsCount++;
        byPatient[pid].total += appt.patient.sessionValue || 0;
      } else {
        byPatient[pid].absenceCount++;
      }
    }

    const grandTotal = Object.values(byPatient).reduce((acc, b) => acc + b.total, 0);
    res.json({ summary: Object.values(byPatient), grandTotal, period: { year: y, month: m } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao gerar faturamento." });
  }
});

module.exports = router;
