// src/routes/patients.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Admin vê todos; terapeuta vê só os seus
function patientFilter(user) {
  return user.role === "ADMIN" ? { active: true } : { therapistId: user.id, active: true };
}

// GET /api/patients
router.get("/", authMiddleware, async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      where: patientFilter(req.user),
      include: {
        therapist: { select: { id:true, name:true, color:true, specialty:true } },
        _count: { select: { sessionNotes: true, appointments: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json(patients);
  } catch (e) { res.status(500).json({ error: "Erro ao buscar pacientes." }); }
});

// GET /api/patients/:id
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { id: req.params.id, ...patientFilter(req.user) },
      include: {
        therapist: { select: { id:true, name:true, color:true, specialty:true } },
        sessionNotes: { orderBy: { date: "desc" } },
        appointments: { orderBy: { date: "desc" }, take: 20 },
      },
    });
    if (!patient) return res.status(404).json({ error: "Paciente não encontrado." });
    res.json(patient);
  } catch (e) { res.status(500).json({ error: "Erro ao buscar paciente." }); }
});

// POST /api/patients
router.post("/", authMiddleware, async (req, res) => {
  const { name, birthDate, cpf, diagnosis, sessionValue, notes,
          guardianName, guardianPhone, therapistId,
          addressCep, addressRua, addressNumero, addressBairro, addressCidade, addressEstado } = req.body;

  if (!name || !therapistId)
    return res.status(400).json({ error: "Nome e terapeuta são obrigatórios." });

  // Terapeuta só pode cadastrar para si mesmo
  const assignedTherapist = req.user.role === "ADMIN" ? therapistId : req.user.id;

  try {
    const patient = await prisma.patient.create({
      data: {
        name, cpf, diagnosis, notes,
        birthDate: birthDate ? new Date(birthDate) : null,
        sessionValue: Number(sessionValue) || 0,
        guardianName, guardianPhone,
        addressCep, addressRua, addressNumero, addressBairro, addressCidade, addressEstado,
        therapistId: assignedTherapist,
      },
      include: { therapist: { select: { id:true, name:true, color:true } } },
    });
    res.status(201).json(patient);
  } catch (e) { res.status(500).json({ error: "Erro ao cadastrar paciente." }); }
});

// PUT /api/patients/:id
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const existing = await prisma.patient.findFirst({
      where: { id: req.params.id, ...patientFilter(req.user) },
    });
    if (!existing) return res.status(404).json({ error: "Paciente não encontrado." });

    const { name, birthDate, cpf, diagnosis, sessionValue, notes,
            guardianName, guardianPhone, therapistId,
            addressCep, addressRua, addressNumero, addressBairro, addressCidade, addressEstado } = req.body;

    const patient = await prisma.patient.update({
      where: { id: req.params.id },
      data: {
        name, cpf, diagnosis, notes,
        birthDate: birthDate ? new Date(birthDate) : null,
        sessionValue: Number(sessionValue) || 0,
        guardianName, guardianPhone,
        addressCep, addressRua, addressNumero, addressBairro, addressCidade, addressEstado,
        ...(req.user.role === "ADMIN" && therapistId ? { therapistId } : {}),
      },
      include: { therapist: { select: { id:true, name:true, color:true } } },
    });
    res.json(patient);
  } catch (e) { res.status(500).json({ error: "Erro ao atualizar paciente." }); }
});

// DELETE /api/patients/:id — soft delete
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const existing = await prisma.patient.findFirst({
      where: { id: req.params.id, ...patientFilter(req.user) },
    });
    if (!existing) return res.status(404).json({ error: "Paciente não encontrado." });
    await prisma.patient.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ message: "Paciente removido com sucesso." });
  } catch (e) { res.status(500).json({ error: "Erro ao remover paciente." }); }
});

module.exports = router;
