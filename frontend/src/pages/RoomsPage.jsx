// src/pages/RoomsPage.jsx
import { useState, useEffect } from "react";
import api from "../services/api";

const ROOM_COLORS = ["#5BBD7A","#4A8FC4","#F5C842","#E8719A","#9B6FC8","#E87A42","#4ABFBF","#C4774A"];

function initials(name) {
  return (name||"").split(" ").filter(Boolean).map(n=>n[0]).slice(0,2).join("").toUpperCase();
}

export default function RoomsPage() {
  const [rooms, setRooms]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | "new" | room object (edit)
  const [form, setForm]       = useState({ name:"", description:"", color:"#5BBD7A" });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data } = await api.get("/rooms");
      setRooms(data);
    } catch(e) { setError("Erro ao carregar salas."); }
    finally { setLoading(false); }
  }

  function openNew() {
    setForm({ name:"", description:"", color:"#5BBD7A" });
    setModal("new");
    setError("");
  }

  function openEdit(room) {
    setForm({ name: room.name, description: room.description||"", color: room.color });
    setModal(room);
    setError("");
  }

  async function handleSave() {
    if (!form.name.trim()) { setError("Nome da sala é obrigatório."); return; }
    setSaving(true); setError("");
    try {
      if (modal === "new") {
        const { data } = await api.post("/rooms", form);
        setRooms(prev => [...prev, { ...data, _count: { appointments: 0 } }]);
      } else {
        const { data } = await api.put(`/rooms/${modal.id}`, form);
        setRooms(prev => prev.map(r => r.id === modal.id ? { ...r, ...data } : r));
      }
      setModal(null);
    } catch(e) {
      setError(e.response?.data?.error || "Erro ao salvar sala.");
    } finally { setSaving(false); }
  }

  async function handleDelete(room) {
    if (!confirm(`Remover "${room.name}"?\n\nAgendamentos futuros vinculados a ela serão verificados.`)) return;
    try {
      await api.delete(`/rooms/${room.id}`);
      setRooms(prev => prev.filter(r => r.id !== room.id));
    } catch(e) {
      alert(e.response?.data?.error || "Erro ao remover sala.");
    }
  }

  return (
    <div>
      <div className="flex-between mb16">
        <div>
          <h2 style={{fontSize:28}}>Salas</h2>
          <p className="text-muted">{rooms.length} sala(s) cadastrada(s)</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ Nova Sala</button>
      </div>

      {loading ? (
        <div className="text-muted">Carregando...</div>
      ) : rooms.length === 0 ? (
        <div className="card" style={{textAlign:"center",padding:40,color:"var(--muted)"}}>
          <div style={{fontSize:40,marginBottom:12}}>🚪</div>
          <div style={{fontSize:16,fontWeight:700,marginBottom:6}}>Nenhuma sala cadastrada</div>
          <div style={{fontSize:13}}>Cadastre salas para controlar conflitos de agendamento.</div>
          <button className="btn btn-primary" style={{marginTop:16}} onClick={openNew}>+ Cadastrar primeira sala</button>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
          {rooms.map(room => (
            <div key={room.id} className="card" style={{borderLeft:`4px solid ${room.color}`}}>
              <div className="flex-between mb12">
                <div className="flex-center gap12">
                  <div className="avatar" style={{width:46,height:46,fontSize:16,background:room.color}}>
                    {initials(room.name)}
                  </div>
                  <div>
                    <div style={{fontFamily:"var(--font-display)",fontSize:18,fontWeight:700}}>{room.name}</div>
                    {room.description && <div className="text-sm text-muted">{room.description}</div>}
                  </div>
                </div>
                <div className="flex-center gap8">
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(room)}>✏️</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(room)}>🗑</button>
                </div>
              </div>
              <div style={{background:"var(--bg)",borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span className="text-sm text-muted">Total de agendamentos</span>
                <span style={{fontFamily:"var(--font-display)",fontSize:22,fontWeight:700,color:room.color}}>
                  {room._count?.appointments || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="flex-between">
                <div>
                  <div className="modal-title">{modal==="new" ? "Nova Sala" : "Editar Sala"}</div>
                  <div className="modal-subtitle">Cadastro de espaço de atendimento</div>
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
              <div className="field">
                <label>Nome da sala *</label>
                <input type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                  placeholder="Ex: Sala 1, Sala Azul, Sala de Arteterapia..." autoFocus/>
              </div>
              <div className="field">
                <label>Descrição (opcional)</label>
                <input type="text" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                  placeholder="Ex: Equipada com brinquedos, Sala ampla..."/>
              </div>
              <div className="field">
                <label>Cor de identificação</label>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:4}}>
                  {ROOM_COLORS.map(c => (
                    <button key={c} onClick={()=>setForm(f=>({...f,color:c}))}
                      style={{width:36,height:36,borderRadius:"50%",background:c,border:`3px solid ${form.color===c?"var(--ink)":"transparent"}`,cursor:"pointer",transition:"border 0.1s"}}
                    />
                  ))}
                </div>
              </div>
              {/* Preview */}
              <div style={{background:"var(--bg)",borderRadius:12,padding:14,display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                <div className="avatar" style={{width:44,height:44,fontSize:16,background:form.color}}>
                  {initials(form.name)||"?"}
                </div>
                <div>
                  <div style={{fontWeight:700}}>{form.name||"Nome da sala"}</div>
                  <div className="text-sm text-muted">{form.description||"Sem descrição"}</div>
                </div>
              </div>
              <div className="flex-between">
                <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <><span className="spinner"/>Salvando...</> : (modal==="new" ? "Cadastrar Sala" : "Salvar Alterações")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
