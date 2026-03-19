// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // ── Admin ──────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("Admin@2025!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@clinicaconecte.com.br" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@clinicaconecte.com.br",
      password: adminPassword,
      role: "ADMIN",
      specialty: "Administração",
      color: "#1A1A2E",
    },
  });
  console.log("✅ Admin criado:", admin.email);

  // ── Terapeuta exemplo ──────────────────────────────────
  const t1Password = await bcrypt.hash("Terapeuta@2025!", 12);
  const t1 = await prisma.user.upsert({
    where: { email: "ana@clinicaconecte.com.br" },
    update: {},
    create: {
      name: "Dra. Ana Beatriz",
      email: "ana@clinicaconecte.com.br",
      password: t1Password,
      role: "THERAPIST",
      specialty: "Psicologia Infantil",
      color: "#4A8FC4",
    },
  });
  console.log("✅ Terapeuta criada:", t1.email);

  // ── Paciente exemplo ───────────────────────────────────
  const patient = await prisma.patient.upsert({
    where: { id: "exemplo-001" },
    update: {},
    create: {
      id: "exemplo-001",
      name: "Paciente Exemplo",
      birthDate: new Date("2015-06-15"),
      diagnosis: "Ansiedade",
      sessionValue: 200,
      guardianName: "Responsável Exemplo",
      guardianPhone: "(11) 99999-9999",
      therapistId: t1.id,
    },
  });
  console.log("✅ Paciente exemplo criado:", patient.name);

  console.log("\n🎉 Seed concluído com sucesso!");
  console.log("\n📋 Credenciais de acesso:");
  console.log("   Admin:     admin@clinicaconecte.com.br / Admin@2025!");
  console.log("   Terapeuta: ana@clinicaconecte.com.br  / Terapeuta@2025!");
  console.log("\n⚠️  TROQUE AS SENHAS após o primeiro login!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
