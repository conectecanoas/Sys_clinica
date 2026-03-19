// src/components/PatientModal.jsx
import { useState, useEffect } from "react";
import api from "../services/api";
import { fmtCPF, fmtPhone, fmtCEP, validaCPF, calcAge } from "../hooks/useUtils";

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

export default function PatientModal({ patient, onClose, onSaved }) {
  const isEdit = Boolean(patient?.id);
  const [therapists, setTherapists] = useState([]);
  const [form, setForm] = useState({
    name:"", birthDate:"", cpf:"", diagnosis:"", therapistId:"",
    sessionValue:"", guardianName:"", guardianPhone:"",
    addressCep:"", addressRua:"", addressNumero:"", addressBairro:"", addressCidade:"", addressEstado:"",
    notes:"",
  });
  const [cpfStatus, setCpfStatus] = useState(null); // null | "valid" | "invalid"
  const [agePreview, setAgePreview] = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    api.get("/users").then(r => setTherapists(r.data)).catch(()=>{});
    if (patient) {
      setForm({
        name:          patient.name || "",
        birthDate:     patient.birthDate ? patient.birthDate.split("T")[0] : "",
        cpf:           patient.cpf || "",
        diagnosis:     patient.diagnosis || "",
        therapistId:   patient.therapistId || "",
        sessionValue:  String(patient.sessionValue || ""),
        guardianName:  patient.guardianName || "",
        guardianPhone: patient.guardianPhone || "",
        addressCep:    patient.addressCep || "",
        addressRua:    patient.addressRua || "",
        addressNumero: patient.addressNumero || "",
        addressBairro: patient.addressBairro || "",
        addressCidade: patient.addressCidade || "",
        addressEstado: patient.addressEstado || "",
        notes:         patient.notes || "",
      });
      if (patient.birthDate) setAgePreview(`${calcAge(patient.birthDate)} anos`);
      if (patient.cpf) setCpfStatus(validaCPF(patient.cpf) ? "valid" : "invalid");
    }
  }, []);

  function set(field, value) { setForm(f => ({...f, [field]: value})); }

  function handleCPF(v) {
    const masked = fmtCPF(v);
    set("cpf", masked);
    const raw = masked.replace(/\D/g,"");
    if (raw.length === 0) setCpfStatus(null);
    else if (raw.length < 11) setCpfStatus(null);
    else setCpfStatus(validaCPF(masked) ? "valid" : "invalid");
  }

  function handleBirth(v) {
    set("birthDate", v);
    if (v) setAgePreview(`${calcAge(v)} anos`);
    else setAgePreview("");
  }

  async function handleCEP(v) {
    const masked = fmtCEP(v);
    set("addressCep", masked);
    const raw = masked.replace(/\D/g,"");
    if (raw.length === 8) {
      try {
        const r = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
        const d = await r.json();
        if (!d.erro) {
          setForm(f => ({...f,
            addressRua:    d.logradouro || f.addressRua,
            addressBairro: d.bairro     || f.addressBairro,
            addressCidade: d.localidade || f.addressCidade,
            addressEstado: d.uf         || f.addressEstado,
          }));
        }
      } catch(e){}
    }
  }

  async function handleSave() {
    if (!form.name.trim())     { setError("Nome é obrigatório."); return; }
    if (!form.therapistId)     { setError("Selecione um terapeuta."); return; }
    if (form.cpf && cpfStatus === "invalid") { setError("CPF inválido. Corrija ou deixe em branco."); return; }
    setSaving(true); setError("");
    try {
      const payload = { ...form, sessionValue: Number(form.sessionValue)||0 };
      let saved;
      if (isEdit) {
        const { data } = await api.put(`/patients/${patient.id}`, payload);
        saved = data;
      } else {
        const { data } = await api.post("/patients", payload);
        saved = data;
      }
      onSaved(saved);
    } catch(e) {
      setError(e.response?.data?.error || "Erro ao salvar paciente.");
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-wide" style={{maxWidth:720}}>
        <div className="modal-header">
          <div className="flex-between">
            <div>
              <div className="modal-title">{isEdit ? "Editar Paciente" : "Novo Paciente"}</div>
              <div className="modal-subtitle">{isEdit ? `Editando: ${patient.name}` : "Cadastrar no sistema"}</div>
            </div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <div className="divider"/>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{background:"var(--pink-pale)",color:"var(--pink-dark)",borderRadius:10,padding:"10px 14px",fontSize:13,marginBottom:14}}>
              {error}
            </div>
          )}

          {/* Dados do Paciente */}
          <div style={{fontSize:11,fontWeight:800,color:"var(--blue)",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>
            👤 Dados do Paciente
          </div>
          <div className="grid2">
            <div className="field span2">
              <label>Nome completo *</label>
              <input type="text" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Nome do paciente" autoFocus/>
            </div>
            <div className="field">
              <label>Data de nascimento</label>
              <input type="date" value={form.birthDate} onChange={e=>handleBirth(e.target.value)}/>
              {agePreview && <div style={{fontSize:12,color:"var(--green-dark)",marginTop:4}}>🎂 {agePreview}</div>}
            </div>
            <div className="field">
              <label>Diagnóstico / Motivo</label>
              <input type="text" value={form.diagnosis} onChange={e=>set("diagnosis",e.target.value)} placeholder="Ex: Ansiedade, TDAH, TEA..."/>
            </div>
            <div className="field">
              <label>Terapeuta responsável *</label>
              <select value={form.therapistId} onChange={e=>set("therapistId",e.target.value)}>
                <option value="">Selecione...</option>
                {therapists.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Valor por sessão (R$)</label>
              <input type="number" value={form.sessionValue} onChange={e=>set("sessionValue",e.target.value)} placeholder="Ex: 200" min="0" step="10"/>
            </div>
          </div>

          <div className="divider"/>
          {/* Responsável */}
          <div style={{fontSize:11,fontWeight:800,color:"var(--blue)",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>
            👪 Responsável
          </div>
          <div className="grid2">
            <div className="field">
              <label>Nome do responsável</label>
              <input type="text" value={form.guardianName} onChange={e=>set("guardianName",e.target.value)} placeholder="Pai / Mãe / Responsável"/>
            </div>
            <div className="field">
              <label>CPF do responsável</label>
              <div style={{position:"relative"}}>
                <input type="text" value={form.cpf} onChange={e=>handleCPF(e.target.value)}
                  maxLength={14} placeholder="000.000.000-00" style={{paddingRight:36}}/>
                {cpfStatus && (
                  <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:16}}>
                    {cpfStatus==="valid" ? "✅" : "❌"}
                  </span>
                )}
              </div>
              {cpfStatus === "invalid" && <div style={{fontSize:11,color:"var(--pink-dark)",marginTop:3}}>CPF inválido</div>}
              {cpfStatus === "valid"   && <div style={{fontSize:11,color:"var(--green-dark)",marginTop:3}}>CPF válido</div>}
            </div>
            <div className="field span2">
              <label>Celular / WhatsApp</label>
              <input type="text" value={form.guardianPhone}
                onChange={e=>set("guardianPhone", fmtPhone(e.target.value))}
                maxLength={15} placeholder="(11) 99999-9999"/>
            </div>
          </div>

          <div className="divider"/>
          {/* Endereço */}
          <div style={{fontSize:11,fontWeight:800,color:"var(--blue)",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>
            📍 Endereço
          </div>
          <div className="grid2">
            <div className="field">
              <label>CEP</label>
              <input type="text" value={form.addressCep} maxLength={9} placeholder="00000-000"
                onChange={e=>handleCEP(e.target.value)}/>
            </div>
            <div className="field">
              <label>Número</label>
              <input type="text" value={form.addressNumero} onChange={e=>set("addressNumero",e.target.value)} placeholder="123, Apto 4"/>
            </div>
            <div className="field span2">
              <label>Rua / Logradouro</label>
              <input type="text" value={form.addressRua} onChange={e=>set("addressRua",e.target.value)} placeholder="Nome da rua..."/>
            </div>
            <div className="field span2">
              <label>Bairro</label>
              <input type="text" value={form.addressBairro} onChange={e=>set("addressBairro",e.target.value)} placeholder="Bairro"/>
            </div>
            <div className="field">
              <label>Cidade</label>
              <input type="text" value={form.addressCidade} onChange={e=>set("addressCidade",e.target.value)} placeholder="Cidade"/>
            </div>
            <div className="field">
              <label>Estado</label>
              <select value={form.addressEstado} onChange={e=>set("addressEstado",e.target.value)}>
                <option value="">UF</option>
                {ESTADOS.map(e=><option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          <div className="divider"/>
          <div className="field">
            <label>Observações gerais</label>
            <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={2}
              placeholder="Características importantes, preferências..."/>
          </div>

          <div className="flex-between mt8">
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner"/>Salvando...</> : (isEdit ? "Salvar Alterações" : "Cadastrar Paciente")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
