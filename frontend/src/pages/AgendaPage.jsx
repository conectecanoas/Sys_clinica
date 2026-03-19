// src/pages/AgendaPage.jsx
import { useState, useEffect } from "react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { getToday, addDays, weekdayName, fmtDate, HOURS, MOODS, TECHNIQUES } from "../hooks/useUtils";

function initials(name) {
  return (name||"").split(" ").filter(Boolean).map(n=>n[0]).slice(0,2).join("").toUpperCase();
}

export default function AgendaPage() {
  const { user, isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [filterTherapist, setFilterTherapist] = useState("all");
  const [filterRoom, setFilterRoom]           = useState("all");
  const [appointments, setAppointments]       = useState([]);
  const [therapists, setTherapists]           = useState([]);
  const [rooms, setRooms]                     = useState([]);
  const [patients, setPatients]               = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [modal, setModal]                     = useState(null); // null | "new" | appt obj (session)
  const [sessionForm, setSessionForm]         = useState({});
  const [apptForm, setApptForm]               = useState({ patientId:"", therapistId:"", roomId:"", hour:"09:00", duration:50 });
  const [apptError, setApptError]             = useState("");
  const [savingSession, setSavingSession]     = useState(false);
  const [aiLoading, setAiLoading]             = useState(false);
  const [aiError, setAiError]                 = useState("");
  const [voiceField, setVoiceField]           = useState(null); // "obs" | "plan"
  const [voiceStatus, setVoiceStatus]         = useState("");
  const [recognition, setRecognition]         = useState(null);

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { loadAppointments(); }, [selectedDate, filterTherapist, filterRoom]);

  async function loadMeta() {
    try {
      const [tRes, rRes, pRes] = await Promise.all([
        api.get("/users"),
        api.get("/rooms"),
        api.get("/patients"),
      ]);
      setTherapists(tRes.data.filter(u=>u.role==="THERAPIST"||u.role==="ADMIN"));
      setRooms(rRes.data);
      setPatients(pRes.data);
    } catch(e) { console.error(e); }
  }

  async function loadAppointments() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (filterTherapist !== "all") params.set("therapistId", filterTherapist);
      if (filterRoom !== "all") params.set("roomId", filterRoom);
      const { data } = await api.get(`/appointments?${params}`);
      setAppointments(data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  // ── Agendar ─────────────────────────────────────────────
  function openApptModal() {
    setApptForm({ patientId:"", therapistId: isAdmin?"":user.id, roomId:"", hour:"09:00", duration:50 });
    setApptError(""); setModal("new");
  }

  async function saveAppt() {
    if (!apptForm.patientId) { setApptError("Selecione o paciente."); return; }
    try {
      const { data } = await api.post("/appointments", { ...apptForm, date: selectedDate });
      setAppointments(prev => [...prev, data].sort((a,b)=>a.hour.localeCompare(b.hour)));
      setModal(null);
    } catch(e) { setApptError(e.response?.data?.error || "Erro ao agendar."); }
  }

  // ── Sessão ──────────────────────────────────────────────
  function openSession(appt) {
    const existing = appt.sessionNote;
    setSessionForm({
      absent: existing?.absent || appt.absent || false,
      observations: existing?.observations || "",
      mood: existing?.mood || "bem",
      techniques: existing?.techniques || [],
      plan: existing?.plan || "",
      report: existing?.report || "",
    });
    setAiError(""); setVoiceStatus(""); setModal(appt);
  }

  async function saveSession() {
    if (!modal || modal === "new") return;
    setSavingSession(true);
    try {
      await api.post("/sessions", {
        appointmentId: modal.id,
        patientId: modal.patientId,
        ...sessionForm,
      });
      setAppointments(prev => prev.map(a => a.id === modal.id
        ? { ...a, absent: sessionForm.absent, sessionNote: { ...sessionForm } }
        : a
      ));
      setModal(null);
    } catch(e) { console.error(e); }
    finally { setSavingSession(false); }
  }

  async function generateReport() {
    if (!sessionForm.observations?.trim()) { setAiError("Preencha as observações antes de gerar."); return; }
    setAiLoading(true); setAiError("");
    try {
      const patient = patients.find(p=>p.id===modal.patientId);
      const therapist = therapists.find(t=>t.id===modal.therapistId);
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1000,
          system:"Você é especialista em psicologia clínica infantojuvenil. Gere relatórios clínicos profissionais em português brasileiro. Prosa corrida, sem bullets, ~200 palavras.",
          messages:[{role:"user",content:`Paciente: ${patient?.name}, ${patient?.birthDate ? new Date().getFullYear()-new Date(patient.birthDate).getFullYear() : "?"} anos. Diagnóstico: ${patient?.diagnosis}. Terapeuta: ${therapist?.name}. Observações: ${sessionForm.observations}. Humor: ${sessionForm.mood}. Técnicas: ${sessionForm.techniques?.join(", ")||"nenhuma"}. Plano: ${sessionForm.plan||"não definido"}.`}]
        })
      });
      const d = await res.json();
      const text = d.content?.map(i=>i.text||"").join("\n")||"";
      if (!text) throw new Error();
      setSessionForm(f=>({...f,report:text}));
    } catch(e) { setAiError("Não foi possível gerar. Tente novamente."); }
    finally { setAiLoading(false); }
  }

  // ── Voz ─────────────────────────────────────────────────
  function toggleVoice(field) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceStatus("⚠️ Use o Google Chrome para reconhecimento de voz."); return; }
    if (recognition) { recognition.stop(); setRecognition(null); setVoiceField(null); return; }
    const rec = new SR(); rec.lang="pt-BR"; rec.continuous=true; rec.interimResults=true;
    let final="";
    rec.onstart = ()=>{ setVoiceField(field); setVoiceStatus("🔴 Gravando… clique novamente para parar."); };
    rec.onresult = e=>{
      final=""; let interim="";
      for(let i=0;i<e.results.length;i++){
        if(e.results[i].isFinal) final+=e.results[i][0].transcript+" ";
        else interim+=e.results[i][0].transcript;
      }
      setVoiceStatus(`🔴 Ouvindo: "${interim||final.trim()}"`);
    };
    rec.onend = ()=>{
      if(final.trim()){
        setSessionForm(f=>({...f,[field==="+obs"?"observations":"plan"]: (f[field==="obs"?"observations":"plan"]||"")+" "+final.trim()}));
        setVoiceStatus("✅ Texto adicionado!");
      } else { setVoiceStatus(""); }
      setRecognition(null); setVoiceField(null);
    };
    rec.onerror = ()=>{ setVoiceStatus("❌ Erro no microfone."); setRecognition(null); setVoiceField(null); };
    rec.start(); setRecognition(rec);
  }

  // ── Render ───────────────────────────────────────────────
  const dayAppts = appointments.filter(a=>a.status!=="CANCELLED");
  const confirmed = dayAppts.filter(a=>!a.absent).length;
  const absent    = dayAppts.filter(a=>a.absent).length;

  return (
    <div>
      {/* Header */}
      <div className="flex-between mb16" style={{flexWrap:"wrap",gap:12}}>
        <div className="flex-center gap12">
          <div style={{display:"flex",alignItems:"center",gap:8,background:"var(--surface)",borderRadius:12,padding:"6px 12px",border:"1px solid var(--border)"}}>
            <button onClick={()=>setSelectedDate(addDays(selectedDate,-1))}
              style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"var(--blue)",lineHeight:1}}>‹</button>
            <div style={{textAlign:"center",minWidth:150}}>
              <div style={{fontFamily:"var(--font-display)",fontSize:19,fontWeight:700}}>{weekdayName(selectedDate)}</div>
              <div className="text-sm text-muted">{fmtDate(selectedDate)}</div>
            </div>
            <button onClick={()=>setSelectedDate(addDays(selectedDate,1))}
              style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:"var(--blue)",lineHeight:1}}>›</button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>setSelectedDate(getToday())}>Hoje</button>
        </div>
        <div className="flex-center gap8" style={{flexWrap:"wrap"}}>
          {isAdmin && (
            <select value={filterTherapist} onChange={e=>setFilterTherapist(e.target.value)}
              style={{padding:"8px 12px",borderRadius:10,border:"1.5px solid var(--border)",fontFamily:"var(--font-body)",fontSize:13,background:"var(--surface)"}}>
              <option value="all">Todos os terapeutas</option>
              {therapists.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <select value={filterRoom} onChange={e=>setFilterRoom(e.target.value)}
            style={{padding:"8px 12px",borderRadius:10,border:"1.5px solid var(--border)",fontFamily:"var(--font-body)",fontSize:13,background:"var(--surface)"}}>
            <option value="all">Todas as salas</option>
            {rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openApptModal}>+ Agendar Sessão</button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        {[
          {label:"Agendadas",val:dayAppts.length,color:"var(--blue)"},
          {label:"Realizadas",val:confirmed,color:"var(--green)"},
          {label:"Faltas",val:absent,color:"var(--pink)"},
          {label:"Salas em uso",val:[...new Set(dayAppts.filter(a=>a.roomId).map(a=>a.roomId))].length,color:"var(--yellow-dark)"},
        ].map(s=>(
          <div key={s.label} className="stat-card">
            <div className="stat-value" style={{color:s.color}}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="card" style={{padding:0,overflow:"hidden"}}>
        {HOURS.map(hour=>{
          const appts = dayAppts.filter(a=>a.hour===hour);
          const nowH  = new Date().getHours();
          const isNow = nowH===parseInt(hour)&&selectedDate===getToday();
          return (
            <div key={hour} className={`timeline-row${isNow?" now-row":""}`}>
              <div className={`timeline-hour${isNow?" now":""}`}><span>{hour}</span></div>
              <div className="timeline-slots">
                {appts.map(appt=>{
                  const tColor = appt.therapist?.color||"#4A8FC4";
                  const hasNote = Boolean(appt.sessionNote);
                  return (
                    <div key={appt.id} className={`appt-card${appt.absent?" absent":""}`}
                      style={{background:tColor+"18",borderLeftColor:tColor}}
                      onClick={()=>openSession(appt)}>
                      <div className="flex-center gap8 mb8">
                        <div className="avatar" style={{width:30,height:30,fontSize:11,background:tColor}}>
                          {initials(appt.patient?.name)}
                        </div>
                        <div style={{flex:1}}>
                          <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:14}}>{appt.patient?.name}</div>
                          {appt.room && (
                            <div style={{fontSize:10,display:"flex",alignItems:"center",gap:3}}>
                              <span style={{width:8,height:8,borderRadius:"50%",background:appt.room.color,display:"inline-block"}}/>
                              <span style={{color:"var(--muted)"}}>{appt.room.name}</span>
                            </div>
                          )}
                        </div>
                        {hasNote&&!appt.absent && <span title="Registrada" style={{fontSize:14}}>✅</span>}
                        {appt.absent && <span className="tag tag-red" style={{fontSize:10}}>Faltou</span>}
                      </div>
                      <div style={{fontSize:11,fontWeight:700,color:tColor}}>{appt.therapist?.name}</div>
                      <div className="text-sm text-muted mt8">{appt.duration}min</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal: Nova Sessão ── */}
      {modal === "new" && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="flex-between">
                <div><div className="modal-title">Agendar Sessão</div><div className="modal-subtitle">{fmtDate(selectedDate)}</div></div>
                <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
              </div>
              <div className="divider"/>
            </div>
            <div className="modal-body">
              {apptError && <div style={{background:"var(--pink-pale)",color:"var(--pink-dark)",borderRadius:10,padding:"10px 14px",fontSize:13,marginBottom:12}}>{apptError}</div>}
              <div className="field">
                <label>Paciente *</label>
                <select value={apptForm.patientId} onChange={e=>setApptForm(f=>({...f,patientId:e.target.value}))}>
                  <option value="">Selecione...</option>
                  {patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {isAdmin && (
                <div className="field">
                  <label>Terapeuta *</label>
                  <select value={apptForm.therapistId} onChange={e=>setApptForm(f=>({...f,therapistId:e.target.value}))}>
                    <option value="">Selecione...</option>
                    {therapists.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
              <div className="field">
                <label>Sala</label>
                <select value={apptForm.roomId} onChange={e=>setApptForm(f=>({...f,roomId:e.target.value}))}>
                  <option value="">Sem sala específica</option>
                  {rooms.map(r=><option key={r.id} value={r.id}>{r.name}{r.description?` — ${r.description}`:""}</option>)}
                </select>
              </div>
              <div className="grid3">
                <div className="field">
                  <label>Horário</label>
                  <select value={apptForm.hour} onChange={e=>setApptForm(f=>({...f,hour:e.target.value}))}>
                    {HOURS.map(h=><option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Duração</label>
                  <select value={apptForm.duration} onChange={e=>setApptForm(f=>({...f,duration:Number(e.target.value)}))}>
                    {[30,45,50,60,90].map(d=><option key={d} value={d}>{d} min</option>)}
                  </select>
                </div>
              </div>
              <div className="flex-between mt8">
                <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={saveAppt}>Agendar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Registrar Sessão ── */}
      {modal && modal !== "new" && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="flex-between">
                <div><div className="modal-title">Registrar Sessão</div>
                  <div className="modal-subtitle">{modal.patient?.name} • {modal.hour} • {fmtDate(selectedDate)}</div></div>
                <button className="modal-close" onClick={()=>setModal(null)}>✕</button>
              </div>
              <div className="divider"/>
            </div>
            <div className="modal-body">
              {/* Info header */}
              <div className="flex-center gap12 mb16" style={{background:"var(--bg)",borderRadius:12,padding:14}}>
                <div className="avatar" style={{width:44,height:44,fontSize:15,background:modal.therapist?.color||"#4A8FC4"}}>
                  {initials(modal.patient?.name)}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:17}}>{modal.patient?.name}</div>
                  <div className="text-sm text-muted">{modal.patient?.diagnosis}</div>
                  {modal.room && (
                    <div style={{fontSize:12,marginTop:3,display:"flex",alignItems:"center",gap:4}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:modal.room.color,display:"inline-block"}}/>
                      <span style={{color:"var(--muted)"}}>{modal.room.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Ausência toggle */}
              <div style={{background:"var(--bg)",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontWeight:700,fontSize:14}}>Paciente não compareceu</div>
                  <div className="text-sm text-muted">Marcar como falta</div>
                </div>
                <label style={{position:"relative",display:"inline-block",width:46,height:26,cursor:"pointer"}}>
                  <input type="checkbox" checked={sessionForm.absent||false}
                    onChange={e=>setSessionForm(f=>({...f,absent:e.target.checked}))}
                    style={{opacity:0,width:0,height:0}}/>
                  <span style={{position:"absolute",cursor:"pointer",inset:0,background:sessionForm.absent?"var(--pink)":"var(--border)",borderRadius:26,transition:"0.2s"}}>
                    <span style={{position:"absolute",height:20,width:20,left:sessionForm.absent?22:3,bottom:3,background:"white",borderRadius:"50%",transition:"0.2s"}}/>
                  </span>
                </label>
              </div>

              {!sessionForm.absent && (
                <>
                  {/* Observações + voz */}
                  <div className="field">
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                      <label style={{margin:0}}>Observações da sessão</label>
                      <button className={`voice-btn${voiceField==="obs"?" recording":""}`}
                        onClick={()=>toggleVoice("obs")}>
                        <span style={{width:8,height:8,borderRadius:"50%",background:"currentColor"}}/>
                        {voiceField==="obs" ? "⏹ Parar" : "🎙 Falar"}
                      </button>
                    </div>
                    <textarea rows={4} value={sessionForm.observations||""} placeholder="Descreva comportamento, evolução..."
                      onChange={e=>setSessionForm(f=>({...f,observations:e.target.value}))}/>
                    {voiceField==="obs" && <div className="voice-status">{voiceStatus}</div>}
                  </div>

                  {/* Humor */}
                  <div className="field">
                    <label>Humor observado</label>
                    <div className="mood-grid">
                      {MOODS.map(m=>(
                        <button key={m.id} className={`mood-btn${sessionForm.mood===m.id?" selected":""}`}
                          onClick={()=>setSessionForm(f=>({...f,mood:m.id}))}>
                          <span className="emoji">{m.emoji}</span><span className="label">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Técnicas */}
                  <div className="field">
                    <label>Técnicas utilizadas</label>
                    <div className="chip-grid">
                      {TECHNIQUES.map(t=>(
                        <button key={t} className={`chip${(sessionForm.techniques||[]).includes(t)?" selected":""}`}
                          onClick={()=>setSessionForm(f=>({...f,techniques:(f.techniques||[]).includes(t)?f.techniques.filter(x=>x!==t):[...(f.techniques||[]),t]}))}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Plano + voz */}
                  <div className="field">
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                      <label style={{margin:0}}>Plano para próxima sessão</label>
                      <button className={`voice-btn${voiceField==="plan"?" recording":""}`}
                        onClick={()=>toggleVoice("plan")}>
                        <span style={{width:8,height:8,borderRadius:"50%",background:"currentColor"}}/>
                        {voiceField==="plan" ? "⏹ Parar" : "🎙 Falar"}
                      </button>
                    </div>
                    <input type="text" value={sessionForm.plan||""} placeholder="Objetivos para a próxima sessão..."
                      onChange={e=>setSessionForm(f=>({...f,plan:e.target.value}))}/>
                    {voiceField==="plan" && <div className="voice-status">{voiceStatus}</div>}
                  </div>

                  {/* Relatório IA */}
                  <div className="field">
                    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:6}}>
                      <button className="ai-btn" onClick={generateReport} disabled={aiLoading}>
                        {aiLoading ? <><span className="spinner"/>Gerando...</> : "✨ Gerar com IA"}
                      </button>
                    </div>
                    <textarea rows={6} value={sessionForm.report||""} placeholder="Relatório clínico da sessão..."
                      onChange={e=>setSessionForm(f=>({...f,report:e.target.value}))}/>
                    {aiError && <div style={{fontSize:12,color:"var(--pink-dark)",marginTop:4}}>{aiError}</div>}
                  </div>
                </>
              )}

              <div className="flex-between mt8">
                <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={saveSession} disabled={savingSession}>
                  {savingSession ? <><span className="spinner"/>Salvando...</> : "Salvar Sessão"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
