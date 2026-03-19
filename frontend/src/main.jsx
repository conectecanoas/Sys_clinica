// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage        from "./pages/LoginPage";
import Layout           from "./components/Layout";
import AgendaPage       from "./pages/AgendaPage";
import PatientsPage     from "./pages/PatientsPage";
import ProntuarioPage   from "./pages/ProntuarioPage";
import TherapistsPage   from "./pages/TherapistsPage";
import RoomsPage        from "./pages/RoomsPage";
import BillingPage      from "./pages/BillingPage";
import ClinicBillingPage from "./pages/ClinicBillingPage";
import SettingsPage     from "./pages/SettingsPage";
import "./index.css";

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><span className="spinner" style={{borderTopColor:"var(--blue)",borderColor:"var(--border)"}}/>  Carregando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== "ADMIN") return <Navigate to="/" />;
  return children;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index                element={<AgendaPage />} />
            <Route path="pacientes"     element={<PatientsPage />} />
            <Route path="pacientes/:id" element={<ProntuarioPage />} />
            <Route path="terapeutas"    element={<PrivateRoute adminOnly><TherapistsPage /></PrivateRoute>} />
            <Route path="salas"         element={<PrivateRoute adminOnly><RoomsPage /></PrivateRoute>} />
            <Route path="faturamento"   element={<BillingPage />} />
            <Route path="fatura-clinica" element={<PrivateRoute adminOnly><ClinicBillingPage /></PrivateRoute>} />
            <Route path="configuracoes" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
