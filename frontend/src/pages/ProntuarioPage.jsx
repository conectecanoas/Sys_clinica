// src/pages/ProntuarioPage.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { fmtDate, fmtMoney, calcAge, MOODS } from "../hooks/useUtils";
import PatientModal from "../components/PatientModal";

function initials(name){return(name||"").split(" ").filter(Boolean).map(n=>n[0]).slice(0,2).join("").toUpperCase();}

export default function ProntuarioPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient,  setPatient]  = useState(null);
  const [notes,    setNotes]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(false);
  const [reportModal, setReportModal] = useState(null);

  useEffect(()=>{ load(); },[id]);

  async function load(){
    try{
      const [pRes, nRes] = await Promise.all([
        api.get(`/patients/${id}`),
        api.get(`/sessions/patient/${id}`),
      ]);
      setPatient(pRes.data);
      setNotes(nRes.data);
    }catch(e){ navigate("/pacientes"); }
    finally{ setLoading(false); }
  }

  function handlePatientSaved(saved){
    setPatient(p=>({...p,...saved}));
    setEditing(false);
  }

  if(loading) return <div className="text-muted">Carregando...</div>;
  if(!patient) return null;

  const tColor = patient.therapist?.color||"#4A8FC4";
  const age    = patient.birthDate ? calcAge(patient.birthDate) : patient.age || "?";
  const upcoming = (patient.appointments||[]).filter(a=>a.date>=new Date().toISOString().split("T")[0]&&a.status!=="CANCELLED").slice(0,4);

  return (
    <div>
      <div className="flex-center gap12 mb16">
        <button className="btn btn-ghost btn-sm" onClick={()=>navigate("/pacientes")}>← Voltar</button>
        <button className="btn btn-ghost btn-sm" onClick={()=>setEditing(true)}>✏️ Editar Paciente</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:20}}>
        {/* Sidebar */}
        <div>
          <div className="card mb16" style={{borderTop:`4px solid ${tColor}`}}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div className="avatar" style={{width:60,height:60,fontSize:20,background:tColor,margin:"0 auto 10px"}}>
                {initials(patient.name)}
              </div>
              <div style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700}}>{patient.name}</div>
              <div className="text-muted" style={{fontSize:13}}>{age} anos</div>
            </div>
            <div className="divider"/>
            {[
              ["Data de nasc.", patient.birthDate ? `${fmtDate(patient.birthDate)} (${calcAge(patient.birthDate)} anos)` : `${age} anos`],
              ["CPF", patient.cpf||"—"],
              ["Responsável", patient.guardianName||"—"],
              ["Celular", patient.guardianPhone||"—"],
              ["Diagnóstico", patient.diagnosis||"—"],
              ["Terapeuta", patient.therapist?.name||"—"],
              ["Valor/sessão", fmtMoney(patient.sessionValue||0)],
              ["Total sessões", `${notes.length} realizadas`],
            ].map(([l,v])=>(
              <div key={l} style={{marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:800,color:"var(--muted)",textTransform:"uppercase",letterSpacing:0.8}}>{l}</div>
                <div style={{fontSize:14,marginTop:2}}>{v}</div>
              </div>
            ))}
            {(patient.addressRua||patient.addressCidade) && (
              <>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:800,color:"var(--muted)",textTransform:"uppercase",letterSpacing:0.8}}>Endereço</div>
                  <div style={{fontSize:13,marginTop:2,lineHeight:1.5}}>
                    {patient.addressRua&&<>{patient.addressRua}{patient.addressNumero&&`, ${patient.addressNumero}`}<br/></>}
                    {patient.addressBairro&&<>{patient.addressBairro}<br/></>}
                    {patient.addressCidade&&<>{patient.addressCidade}{patient.addressEstado&&` — ${patient.addressEstado}`}<br/></>}
                    {patient.addressCep&&`CEP: ${patient.addressCep}`}
                  </div>
                </div>
              </>
            )}
            {patient.notes && (
              <><div className="divider"/><div style={{fontSize:12,color:"var(--muted)",fontStyle:"italic",lineHeight:1.5}}>"{patient.notes}"</div></>
            )}
          </div>

          <div className="card">
            <div style={{fontFamily:"var(--font-display)",fontSize:16,fontWeight:700,marginBottom:12}}>Próximas Sessões</div>
            {upcoming.length===0
              ? <div className="text-sm text-muted">Nenhuma sessão agendada</div>
              : upcoming.map(a=>(
                <div key={a.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--border)",fontSize:13}}>
                  <span>{fmtDate(a.date)}</span><span style={{color:"var(--blue)",fontWeight:700}}>{a.hour}</span>
                </div>
              ))
            }
          </div>
        </div>

        {/* Histórico */}
        <div>
          <div style={{fontFamily:"var(--font-display)",fontSize:24,fontWeight:700,marginBottom:16}}>Histórico de Sessões</div>
          {notes.length===0 ? (
            <div className="card" style={{textAlign:"center",color:"var(--muted)",padding:32}}>Nenhuma sessão registrada ainda.</div>
          ) : notes.map(note=>{
            const mood=MOODS.find(m=>m.id===note.mood)||MOODS[2];
            return(
              <div key={note.id} className="card mb12" style={{borderLeft:note.absent?"4px solid var(--pink)":"none",opacity:note.absent?0.65:1}}>
                <div className="flex-between mb8">
                  <div>
                    <span style={{fontFamily:"var(--font-display)",fontSize:17,fontWeight:700}}>Sessão #{note.sessionNumber}</span>
                    <span className="text-sm text-muted" style={{marginLeft:10}}>{fmtDate(note.date)}</span>
                    {note.absent&&<span className="tag tag-red" style={{marginLeft:8}}>Faltou</span>}
                  </div>
                  <div className="flex-center gap8">
                    {!note.absent&&<span className="tag" style={{background:mood.color}}>{mood.emoji} {mood.label}</span>}
                    {note.report&&!note.absent&&<button className="btn btn-ghost btn-sm" onClick={()=>setReportModal(note)}>Ver relatório</button>}
                  </div>
                </div>
                {note.absent
                  ? <p style={{fontSize:13,color:"var(--muted)",fontStyle:"italic"}}>Paciente não compareceu à sessão.</p>
                  : <>
                      <p style={{fontSize:14,lineHeight:1.6,marginBottom:10}}>{note.observations}</p>
                      {note.techniques?.length>0&&(
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                          {note.techniques.map(t=><span key={t} className="tag tag-blue">{t}</span>)}
                        </div>
                      )}
                      {note.plan&&<div style={{fontSize:13,color:"var(--muted)",borderTop:"1px solid var(--border)",paddingTop:8,fontStyle:"italic"}}>📋 {note.plan}</div>}
                    </>
                }
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <PatientModal patient={patient} onClose={()=>setEditing(false)} onSaved={handlePatientSaved}/>
      )}

      {/* Report Modal */}
      {reportModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setReportModal(null)}>
          <div className="modal modal-wide">
            <div className="modal-header">
              <div className="flex-between">
                <div><div className="modal-title">Relatório — Sessão #{reportModal.sessionNumber}</div>
                  <div className="modal-subtitle">{patient.name} • {fmtDate(reportModal.date)}</div></div>
                <button className="modal-close" onClick={()=>setReportModal(null)}>✕</button>
              </div>
              <div className="divider"/>
            </div>
            <div className="modal-body">
              <div style={{background:"var(--bg)",borderRadius:14,padding:20,borderLeft:"4px solid var(--blue)",marginBottom:16}}>
                <p style={{fontSize:14,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{reportModal.report}</p>
              </div>
              {reportModal.plan&&(
                <div style={{background:"var(--yellow-pale)",borderRadius:12,padding:14}}>
                  <div style={{fontSize:11,fontWeight:800,color:"var(--yellow-dark)",textTransform:"uppercase",letterSpacing:0.8,marginBottom:6}}>Plano para próxima sessão</div>
                  <p style={{fontSize:13}}>{reportModal.plan}</p>
                </div>
              )}
              <div className="flex-between mt16">
                <button className="btn btn-ghost" onClick={()=>setReportModal(null)}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
