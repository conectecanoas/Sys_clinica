// src/components/Layout.jsx
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const NEURON_SVG = (
  <svg width="40" height="40" viewBox="0 0 44 44" fill="none">
    <circle cx="22" cy="22" r="5" fill="#F5C842"/>
    <circle cx="22" cy="8"  r="3" fill="#4A8FC4"/>
    <circle cx="34" cy="14" r="3" fill="#5BBD7A"/>
    <circle cx="36" cy="28" r="3" fill="#E8719A"/>
    <circle cx="26" cy="38" r="3" fill="#F5C842"/>
    <circle cx="12" cy="36" r="3" fill="#4A8FC4"/>
    <circle cx="8"  cy="22" r="3" fill="#5BBD7A"/>
    <circle cx="12" cy="10" r="3" fill="#E8719A"/>
    <line x1="22" y1="17" x2="22" y2="11" stroke="#4A8FC4" strokeWidth="1.5" strokeOpacity="0.8"/>
    <line x1="26" y1="19" x2="32" y2="15" stroke="#5BBD7A" strokeWidth="1.5" strokeOpacity="0.8"/>
    <line x1="27" y1="24" x2="33" y2="27" stroke="#E8719A" strokeWidth="1.5" strokeOpacity="0.8"/>
    <line x1="24" y1="27" x2="25" y2="35" stroke="#F5C842" strokeWidth="1.5" strokeOpacity="0.8"/>
    <line x1="19" y1="27" x2="13" y2="34" stroke="#4A8FC4" strokeWidth="1.5" strokeOpacity="0.8"/>
    <line x1="17" y1="22" x2="11" y2="22" stroke="#5BBD7A" strokeWidth="1.5" strokeOpacity="0.8"/>
    <line x1="18" y1="18" x2="13" y2="12" stroke="#E8719A" strokeWidth="1.5" strokeOpacity="0.8"/>
  </svg>
);

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  function handleLogout() { logout(); navigate("/login"); }

  const ini = user?.name?.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          {NEURON_SVG}
          <div>
            <div className="brand-name">Clínica<br/>Conecte</div>
            <div className="brand-sub">Gestão</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({isActive})=>`nav-item${isActive?" active":""}`}>
            <span className="nav-icon">📅</span><span>Agenda</span>
          </NavLink>
          <NavLink to="/pacientes" className={({isActive})=>`nav-item${isActive?" active":""}`}>
            <span className="nav-icon">👶</span><span>Pacientes</span>
          </NavLink>
          {isAdmin && <>
            <NavLink to="/terapeutas" className={({isActive})=>`nav-item${isActive?" active":""}`}>
              <span className="nav-icon">🩺</span><span>Terapeutas</span>
            </NavLink>
            <NavLink to="/salas" className={({isActive})=>`nav-item${isActive?" active":""}`}>
              <span className="nav-icon">🚪</span><span>Salas</span>
            </NavLink>
          </>}
          <NavLink to="/faturamento" className={({isActive})=>`nav-item${isActive?" active":""}`}>
            <span className="nav-icon">💰</span><span>Faturamento</span>
          </NavLink>
          {isAdmin &&
            <NavLink to="/fatura-clinica" className={({isActive})=>`nav-item${isActive?" active":""}`}>
              <span className="nav-icon">🏦</span><span>Fatura Clínica</span>
            </NavLink>
          }
          <NavLink to="/configuracoes" className={({isActive})=>`nav-item${isActive?" active":""}`}>
            <span className="nav-icon">⚙️</span><span>Configurações</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <div className="avatar" style={{width:32,height:32,fontSize:12,background:user?.color||"#4A8FC4"}}>{ini}</div>
            <div>
              <div className="sidebar-user">{user?.name}</div>
              <div className="sidebar-role">{user?.role==="ADMIN"?"Administrador":"Terapeuta"}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Sair da conta</button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
