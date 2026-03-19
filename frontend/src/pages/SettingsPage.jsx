// src/pages/SettingsPage.jsx
import { useState } from "react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const [current, setCurrent]   = useState("");
  const [newPass, setNewPass]   = useState("");
  const [confirm, setConfirm]   = useState("");
  const [msg, setMsg]           = useState(null);
  const [loading, setLoading]   = useState(false);

  async function handleChangePassword(e) {
    e.preventDefault();
    if (newPass !== confirm) { setMsg({type:"error",text:"As senhas não coincidem."}); return; }
    if (newPass.length < 8)  { setMsg({type:"error",text:"A senha deve ter pelo menos 8 caracteres."}); return; }
    setLoading(true); setMsg(null);
    try {
      await api.put("/auth/password", { currentPassword: current, newPassword: newPass });
      setMsg({type:"success",text:"Senha alterada com sucesso!"});
      setCurrent(""); setNewPass(""); setConfirm("");
    } catch (err) {
      setMsg({type:"error",text:err.response?.data?.error||"Erro ao alterar senha."});
    } finally { setLoading(false); }
  }

  return (
    <div>
      <h2 style={{fontSize:28,marginBottom:4}}>Configurações</h2>
      <p className="text-muted mb16">Gerencie suas preferências e segurança</p>

      <div style={{maxWidth:480}}>
        <div className="card">
          <div className="section-title">👤 Meu perfil</div>
          <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,padding:14,background:"var(--bg)",borderRadius:12}}>
            <div className="avatar" style={{width:48,height:48,fontSize:16,background:user?.color||"#4A8FC4"}}>
              {user?.name?.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase()}
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:16}}>{user?.name}</div>
              <div className="text-muted">{user?.email}</div>
              <div style={{marginTop:4}}><span className="tag tag-blue">{user?.role==="ADMIN"?"Administrador":"Terapeuta"}</span></div>
            </div>
          </div>

          <div className="divider"/>
          <div className="section-title">🔒 Alterar senha</div>

          {msg && (
            <div style={{background:msg.type==="success"?"var(--green-pale)":"var(--pink-pale)",color:msg.type==="success"?"var(--green-dark)":"var(--pink-dark)",borderRadius:10,padding:"10px 14px",fontSize:13,marginBottom:16}}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleChangePassword}>
            <div className="field">
              <label>Senha atual</label>
              <input type="password" value={current} onChange={e=>setCurrent(e.target.value)} placeholder="••••••••" required/>
            </div>
            <div className="field">
              <label>Nova senha</label>
              <input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Mínimo 8 caracteres" required/>
            </div>
            <div className="field">
              <label>Confirmar nova senha</label>
              <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repita a nova senha" required/>
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner"/>Salvando...</> : "Alterar Senha"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
