// src/server.js
require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes           = require("./routes/auth");
const userRoutes           = require("./routes/users");
const patientRoutes        = require("./routes/patients");
const appointmentRoutes    = require("./routes/appointments");
const sessionRoutes        = require("./routes/sessions");
const billingRoutes        = require("./routes/billing");
const roomRoutes           = require("./routes/rooms");
const clinicPaymentRoutes  = require("./routes/clinic_payments");

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "10mb" }));

const limiter = rateLimit({ windowMs: 15*60*1000, max: 300,
  message: { error: "Muitas requisições. Tente em 15 minutos." } });
const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 10,
  message: { error: "Muitas tentativas de login. Aguarde 15 minutos." } });
app.use("/api/", limiter);
app.use("/api/auth/login", loginLimiter);

app.use("/api/auth",            authRoutes);
app.use("/api/users",           userRoutes);
app.use("/api/patients",        patientRoutes);
app.use("/api/appointments",    appointmentRoutes);
app.use("/api/sessions",        sessionRoutes);
app.use("/api/billing",         billingRoutes);
app.use("/api/rooms",           roomRoutes);
app.use("/api/clinic-payments", clinicPaymentRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok", app: "Clínica Conecte", version: "1.1.0" }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Erro interno do servidor." });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Clínica Conecte API rodando na porta ${PORT}`));
