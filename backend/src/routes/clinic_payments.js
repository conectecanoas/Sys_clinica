// src/routes/clinic_payments.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware, adminOnly } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/clinic-payments?year=2025&month=2
// Retorna resumo financeiro da clínica: faturamento por terapeuta + percentual + status de pagamento
router.get("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const y = Number(req.query.year)  || new Date().getFullYear();
    const m = Number(req.query.month) ?? new Date().getMonth(); // 0-based

    const start = new Date(y, m, 1);
    const end   = new Date(y, m + 1, 0, 23, 59, 59);

    // Busca todos os agendamentos do período não cancelados
    const appointments = await prisma.appointment.findMany({
      where: { date: { gte: start, lte: end }, status: { not: "CANCELLED" } },
      include: {
        patient:  { select: { sessionValue: true } },
        therapist:{ select: { id: true, name: true, color: true, specialty: true, commissionPercent: true } },
        sessionNote: { select: { absent: true } },
      },
    });

    // Busca todos os terapeutas ativos
    const therapists = await prisma.user.findMany({
      where: { active: true, role: "THERAPIST" },
      select: { id: true, name: true, color: true, specialty: true, commissionPercent: true },
    });

    // Agrega faturamento por terapeuta
    const byTherapist = {};
    for (const t of therapists) {
      byTherapist[t.id] = {
        therapist: t,
        sessionsCount: 0,
        absenceCount: 0,
        grossRevenue: 0,        // total bruto (o que o terapeuta fatura com pacientes)
        clinicShare: 0,         // valor devido à clínica (bruto × percentual)
        payment: null,          // registro de pagamento se existir
      };
    }

    for (const appt of appointments) {
      const tid = appt.therapistId;
      if (!byTherapist[tid]) continue;
      const isAbsent = appt.absent || appt.sessionNote?.absent;
      if (!isAbsent) {
        byTherapist[tid].sessionsCount++;
        const val = appt.patient?.sessionValue || 0;
        byTherapist[tid].grossRevenue += val;
      } else {
        byTherapist[tid].absenceCount++;
      }
    }

    // Calcula participação da clínica
    for (const tid of Object.keys(byTherapist)) {
      const row = byTherapist[tid];
      const pct = row.therapist.commissionPercent || 0;
      row.clinicShare = row.grossRevenue * (pct / 100);
    }

    // Busca registros de pagamento existentes para o período
    const payments = await prisma.clinicPayment.findMany({
      where: { year: y, month: m },
    });
    for (const pay of payments) {
      if (byTherapist[pay.therapistId]) {
        byTherapist[pay.therapistId].payment = pay;
      }
    }

    const totalClinicRevenue = Object.values(byTherapist).reduce((a, r) => a + r.clinicShare, 0);
    const totalPaid = payments.filter(p => p.status === "PAID").reduce((a, p) => a + (p.paidAmount || p.amount), 0);

    res.json({
      period: { year: y, month: m },
      rows: Object.values(byTherapist),
      totalClinicRevenue,
      totalPaid,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao gerar relatório da clínica." });
  }
});

// POST /api/clinic-payments — cria ou atualiza registro de pagamento
router.post("/", authMiddleware, adminOnly, async (req, res) => {
  const { therapistId, year, month, amount, paidAmount, paidAt, status, notes } = req.body;
  if (!therapistId || year === undefined || month === undefined || !amount)
    return res.status(400).json({ error: "Terapeuta, período e valor são obrigatórios." });

  try {
    const payment = await prisma.clinicPayment.upsert({
      where: { therapistId_year_month: { therapistId, year: Number(year), month: Number(month) } },
      update: {
        amount: Number(amount),
        paidAmount: paidAmount ? Number(paidAmount) : null,
        paidAt: paidAt ? new Date(paidAt) : null,
        status: status || "PENDING",
        notes,
      },
      create: {
        therapistId, year: Number(year), month: Number(month),
        amount: Number(amount),
        paidAmount: paidAmount ? Number(paidAmount) : null,
        paidAt: paidAt ? new Date(paidAt) : null,
        status: status || "PENDING",
        notes,
      },
      include: { therapist: { select: { name: true, color: true } } },
    });
    res.json(payment);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro ao registrar pagamento." });
  }
});

// PUT /api/clinic-payments/:id — marcar pagamento
router.put("/:id", authMiddleware, adminOnly, async (req, res) => {
  const { paidAmount, paidAt, status, notes } = req.body;
  try {
    const payment = await prisma.clinicPayment.update({
      where: { id: req.params.id },
      data: {
        paidAmount: paidAmount ? Number(paidAmount) : undefined,
        paidAt: paidAt ? new Date(paidAt) : undefined,
        status,
        notes,
      },
    });
    res.json(payment);
  } catch (e) { res.status(500).json({ error: "Erro ao atualizar pagamento." }); }
});

module.exports = router;
