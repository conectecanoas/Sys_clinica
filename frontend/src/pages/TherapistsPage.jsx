// src/pages/TherapistsPage.jsx
import { useState, useEffect } from "react";
import api from "../services/api";
import { fmtMoney } from "../hooks/useUtils";

const COLORS = ["#4A8FC4","#E8719A","#5BBD7A","#F5C842","#9B6FC8","#E87A42","#4ABFBF","#C4774A"];

function initials(name) {
  return (name||"").split(" ").filter(Boolean).map(n=>n[0]).slice(0,2).join("").toUpperCase();
}

export default function TherapistsPage() {
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null); // null | "new" | therapist obj
  const [form, setForm]             = useState({ name:"",email:"",password:"",specialty:"",color:"#4A8FC4",commissionPercent:"" });
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    try { const { data } = await api.get("/users"); setTherapists(data.filter(u=>u.role==="THERAPIST")); }
    catch(e) { setError("Erro ao carregar terapeutas."); }
    finally { setLoading(false); }
  }

  function openNew() {
    setForm({ name:"",email:"",password:"",specialty:"",color:"#4A8FC4",commissionPercent:"" });
    setError(""); setModal("new");
  }

  function openEdit(t) {
    setForm({ name:t.name, email:t.email, password:"", specialty:t.specialty||"", color:t.color, commissionPercent:String(t.commissionPercent||"") });
    setError(""); setModal(t);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim()) { setError("Nome e email são obrigatórios."); return; }
    if (modal==="new" && !form.password) { setError("Senha é obrigatória para novo terapeuta."); return; }
    setSaving(true); setError("");
    try {
      const payload = { ...form, commissionPercent: Number(form.commissionPercent)||0 };
      if (!payload.password) delete payload.password;
      if (modal==="new") {
        const { data } = await api.post("/users", payload);
        setTherapists(prev => [...prev, data]);
      } else {
        const { data } = await api.put(`/users/${modal.id}`, payload);
        setTherapists(prev => prev.map(t => t.id===modal.id ? {...t,...data} : t));
      }
      setModal(null);
    } catch(e) { setError(e.response?.data?.error || "Erro ao salvar."); }
    finally { setSaving(false); }
  }

  async function handleDelete(t) {
    if (!confirm(`Desativar "${t.name}"?\nEle não conseguirá mais acessar o sistema.`)) return;
    try {
      await api.delete(`/users/${t.id}`);
      setTherapists(prev => prev.filter(x => x.id!==t.id));
    } catch(e) { alert(e.response?.data?.error||"Erro ao remover."); }
  }

  return (
    <div>
      <div className="flex-between mb16">
        <div>
          <h2 style={{fontSize:28}}>Terapeutas</h2>
          <p className="text-muted">{therapists.length} profissional(is)</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Novo Terapeuta</button>
      </div>

      {loading ? <div className="text-muted">Carregando...</div> : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
          {therapists.map(t => (
            <div key={t.id} className="card" style={{borderLeft:`4px solid ${t.color}`}}>
              <div className="flex-between mb16">
                <div className="flex-center gap12">
                  <div className="avatar" style={{width:48,height:48,fontSize:16,background:t.color}}>
                    {initials(t.name)}
                  </div>
                  <div>
                    <div style={{fontFamily:"var(--font-display)",fontSize:17,fontWeight:700}}>{t.name}</div>
                    <div className="text-sm text-muted">{t.specialty||"Sem especialidade"}</div>
                    <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{t.email}</div>
                  </div>
                </div>
                <div className="flex-center gap8">
                  <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(t)}>✏️ Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(t)}>🗑</button>
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <div style={{textAlign:"center",background:"var(--bg)",borderRadius:10,padding:"10px 6px"}}>
                  <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700,color:t.color}}>{t._count?.patients||0}</div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>pacientes</div>
                </div>
                <div style={{textAlign:"center",background:"var(--bg)",borderRadius:10,padding:"10px 6px"}}>
                  <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700,color:t.color}}>{t._count?.appointments||0}</div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>sessões</div>
                </div>
                <div style={{textAlign:"center",background: t.commissionPercent>0?"var(--yellow-pale)":"var(--bg)",borderRadius:10,padding:"10px 6px"}}>
                  <div style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700,color:t.commissionPercent>0?"var(--yellow-dark)":"var(--muted)"}}>
                    {t.commissionPercent||0}%
                  </div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>clínica</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="flex-between">
                <div>
                  <div className="modal-title">{modal==="new" ? "Novo Terapeuta" : "Editar Terapeuta"}</div>
                  <div className="modal-subtitle">Dados de acesso e configuração</div>
                </div>
                <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
              </div>
              <div className="divider"/>
            </div>
            <div className="modal-body">
              {error && (
                <div style={{background:"var(--pink-pale)",color:"var(--pink-dark)",borderRadius:10,padding:"10px 14px",fontSize:13,marginBottom:14}}>
                  {error}
                </div>
              )}

              <div style={{fontSize:11,fontWeight:800,color:"var(--blue)",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>
                🩺 Dados Profissionais
              </div>
              <div className="grid2">
                <div className="field span2">
                  <label>Nome completo *</label>
                  <input type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Dra. Maria Silva" autoFocus/>
                </div>
                <div className="field">
                  <label>Email (login) *</label>
                  <input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@clinica.com.br" disabled={modal!=="new"}
                    style={modal!=="new"?{background:"var(--border)",cursor:"not-allowed"}:{}}/>
                </div>
                <div className="field">
                  <label>{modal==="new" ? "Senha inicial *" : "Nova senha (deixe vazio para manter)"}</label>
                  <input type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                    placeholder={modal==="new" ? "Mínimo 8 caracteres" : "Deixe vazio para não alterar"}/>
                </div>
                <div className="field">
                  <label>Especialidade</label>
                  <input type="text" value={form.specialty} onChange={e=>setForm(f=>({...f,specialty:e.target.value}))} placeholder="Ex: Psicologia Infantil"/>
                </div>
                <div className="field">
                  <label>% de repasse à clínica</label>
                  <div style={{position:"relative"}}>
                    <input type="number" value={form.commissionPercent} min="0" max="100" step="0.5"
                      onChange={e=>setForm(f=>({...f,commissionPercent:e.target.value}))}
                      placeholder="Ex: 30" style={{paddingRight:30}}/>
                    <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:"var(--muted)",fontSize:14,fontWeight:700}}>%</span>
                  </div>
                  {form.commissionPercent>0 && (
                    <div style={{fontSize:11,color:"var(--muted)",marginTop:3}}>
                      A clínica ficará com {form.commissionPercent}% do faturamento deste terapeuta
                    </div>
                  )}
                </div>
              </div>

              <div className="divider"/>
              <div style={{fontSize:11,fontWeight:800,color:"var(--blue)",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>
                🎨 Cor de identificação
              </div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
                {COLORS.map(c => (
                  <button key={c} onClick={()=>setForm(f=>({...f,color:c}))}
                    style={{width:36,height:36,borderRadius:"50%",background:c,border:`3px solid ${form.color===c?"var(--ink)":"transparent"}`,cursor:"pointer"}}/>
                ))}
              </div>

              <div className="flex-between">
                <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <><span className="spinner"/>Salvando...</> : (modal==="new" ? "Cadastrar" : "Salvar Alterações")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
