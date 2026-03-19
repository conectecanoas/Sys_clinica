// src/pages/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const NEURON_SVG = (
  <svg width="48" height="48" viewBox="0 0 44 44" fill="none">
    <circle cx="22" cy="22" r="5" fill="#F5C842"/>
    <circle cx="22" cy="8"  r="3" fill="#4A8FC4"/>
    <circle cx="34" cy="14" r="3" fill="#5BBD7A"/>
    <circle cx="36" cy="28" r="3" fill="#E8719A"/>
    <line x1="22" y1="17" x2="22" y2="11" stroke="#4A8FC4" strokeWidth="1.5"/>
    <line x1="26" y1="19" x2="32" y2="15" stroke="#5BBD7A" strokeWidth="1.5"/>
    <line x1="27" y1="24" x2="33" y2="27" stroke="#E8719A" strokeWidth="1.5"/>
  </svg>
);

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const { login } = useAuth();
  const navigate  = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Erro ao fazer login. Verifique suas credenciais.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{textAlign:"center",marginBottom:28}}>
          {NEURON_SVG}
          <h1 style={{fontSize:28,fontWeight:700,marginTop:10,marginBottom:4}}>Clínica Conecte</h1>
          <p style={{color:"var(--muted)",fontSize:14}}>Sistema de Gestão Terapêutica</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="seu@email.com.br" required autoFocus />
          </div>
          <div className="field">
            <label>Senha</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
              placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{width:"100%",justifyContent:"center",marginTop:8}} disabled={loading}>
            {loading ? <><span className="spinner"/>Entrando...</> : "Entrar"}
          </button>
        </form>

        <p style={{textAlign:"center",marginTop:20,fontSize:12,color:"var(--muted)"}}>
          Clínica Conecte © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
