// src/pages/PatientsPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { calcAge, fmtMoney } from "../hooks/useUtils";
import PatientModal from "../components/PatientModal";

function initials(name) {
  return (name||"").split(" ").filter(Boolean).map(n=>n[0]).slice(0,2).join("").toUpperCase();
}

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // null | "new" | patient obj (edit)
  const navigate = useNavigate();

  useEffect(() => { load(); }, []);

  async function load() {
    try { const { data } = await api.get("/patients"); setPatients(data); }
    catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  function handleSaved(saved) {
    setPatients(prev => {
      const exists = prev.find(p => p.id === saved.id);
      if (exists) return prev.map(p => p.id===saved.id ? {...p,...saved} : p);
      return [...prev, saved];
    });
    setModal(null);
  }

  async function handleDelete(patient, e) {
    e.stopPropagation();
    if (!confirm(`Remover "${patient.name}"?\n\nIsso também removerá todos os agendamentos e sessões deste paciente.`)) return;
    try {
      await api.delete(`/patients/${patient.id}`);
      setPatients(prev => prev.filter(p => p.id !== patient.id));
    } catch(e) { alert(e.response?.data?.error || "Erro ao remover paciente."); }
  }

  return (
    <div>
      <div className="flex-between mb16">
        <div>
          <h2 style={{fontSize:28}}>Pacientes</h2>
          <p className="text-muted">{patients.length} paciente(s) cadastrado(s)</p>
        </div>
        <button className="btn btn-primary" onClick={()=>setModal("new")}>+ Novo Paciente</button>
      </div>

      {loading ? <div className="text-muted">Carregando...</div> : patients.length === 0 ? (
        <div className="card" style={{textAlign:"center",padding:40,color:"var(--muted)"}}>
          <div style={{fontSize:40,marginBottom:12}}>👶</div>
          <div style={{fontSize:16,fontWeight:700,marginBottom:6}}>Nenhum paciente cadastrado</div>
          <button className="btn btn-primary" style={{marginTop:12}} onClick={()=>setModal("new")}>+ Cadastrar primeiro paciente</button>
        </div>
      ) : (
        <div className="patient-grid">
          {patients.map(p => {
            const tColor = p.therapist?.color || "#4A8FC4";
            const age = p.birthDate ? calcAge(p.birthDate) : p.age || "?";
            const sessions = p._count?.sessionNotes || 0;
            return (
              <div key={p.id} className="card patient-card" style={{borderTopColor:tColor}}
                onClick={()=>navigate(`/pacientes/${p.id}`)}>
                <div className="flex-between mb8">
                  <div className="flex-center gap12">
                    <div className="avatar" style={{width:44,height:44,fontSize:15,background:tColor}}>
                      {initials(p.name)}
                    </div>
                    <div>
                      <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:16}}>{p.name}</div>
                      <div className="text-sm text-muted">{age} anos • {p.guardianName||"—"}</div>
                    </div>
                  </div>
                  <div className="flex-center gap6" onClick={e=>e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={e=>{e.stopPropagation();setModal(p)}}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={e=>handleDelete(p,e)}>🗑</button>
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                  <span className="tag" style={{background:tColor+"22",color:tColor}}>{p.diagnosis||"Sem diagnóstico"}</span>
                  <span className="tag tag-yellow">{sessions} sessões</span>
                  {p.sessionValue>0 && <span className="tag tag-green">{fmtMoney(p.sessionValue)}/sessão</span>}
                </div>
                <div className="text-sm" style={{borderTop:"1px solid var(--border)",paddingTop:10,color:"var(--muted)"}}>
                  <span style={{fontWeight:700,color:tColor}}>{p.therapist?.name||"Sem terapeuta"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal !== null && (
        <PatientModal
          patient={modal==="new" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
