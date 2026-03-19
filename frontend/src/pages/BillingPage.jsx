// src/pages/BillingPage.jsx
import { useState, useEffect } from "react";
import api from "../services/api";
import { fmtMoney, fmtDate, MONTHS } from "../hooks/useUtils";

function initials(name){return(name||"").split(" ").filter(Boolean).map(n=>n[0]).slice(0,2).join("").toUpperCase();}

export default function BillingPage() {
  const now = new Date();
  const [year,  setYear]      = useState(now.getFullYear());
  const [month, setMonth]     = useState(now.getMonth());
  const [selPatient, setSelPatient] = useState("all");
  const [data,  setData]      = useState(null);
  const [patients, setPatients]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoiceModal, setInvoiceModal] = useState(null);

  useEffect(()=>{ api.get("/patients").then(r=>setPatients(r.data)).catch(()=>{}); },[]);
  useEffect(()=>{ load(); },[year,month,selPatient]);

  async function load(){
    setLoading(true);
    try{
      const params=new URLSearchParams({year,month});
      if(selPatient!=="all") params.set("patientId",selPatient);
      const {data:d}=await api.get(`/billing?${params}`);
      setData(d);
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  }

  function printInvoice(row){
    const p=row.patient; const t=row.therapist;
    const monthName=MONTHS[month];
    const w=window.open("","_blank");
    w.document.write(`<!DOCTYPE html><html><head><title>Fatura — ${p.name}</title>
    <style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;color:#1a1a2e;padding:0 20px}
    .header{display:flex;justify-content:space-between;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #4A8FC4}
    table{width:100%;border-collapse:collapse;font-size:13px}
    th{background:#DCF0FF;color:#2A5F8A;padding:9px 12px;text-align:left;font-size:11px;text-transform:uppercase}
    td{padding:9px 12px;border-bottom:1px solid #eee}
    .total-box{background:#4A8FC4;color:#fff;border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;margin-top:16px}
    .footer{margin-top:36px;border-top:1px solid #eee;padding-top:12px;font-size:11px;color:#aaa;text-align:center}
    </style></head><body>
    <div class="header">
      <div><div style="font-size:22px;font-weight:700">Clínica Conecte</div><div style="color:#7a7a9a">Fatura de Atendimento</div></div>
      <div style="text-align:right"><div style="font-size:20px;font-weight:700;color:#4A8FC4">FATURA</div>
      <div style="color:#7a7a9a">${monthName} ${year}</div><div style="font-size:12px;color:#aaa">${new Date().toLocaleDateString("pt-BR")}</div></div>
    </div>
    <div style="margin-bottom:20px;font-size:14px">
      <strong>${p.name}</strong> • Responsável: ${p.guardianName||"—"} • Tel: ${p.guardianPhone||"—"}<br>
      ${p.cpf?`CPF: ${p.cpf} • `:""}Terapeuta: ${t?.name||"—"}
    </div>
    <table>
      <thead><tr><th>#</th><th>Data</th><th>Horário</th><th>Status</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>
        ${row.appointments.map((a,i)=>`<tr style="${a.absent?"color:#aaa;text-decoration:line-through":""}">
          <td>${i+1}</td><td>${fmtDate(a.date)}</td><td>${a.hour}</td>
          <td>${a.absent?"Falta":"Realizada"}</td>
          <td style="text-align:right">${a.absent?"—":fmtMoney(p.sessionValue)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <div class="total-box">
      <div><div style="font-size:13px;opacity:0.8">${row.sessionsCount} sessão(ões) × ${fmtMoney(p.sessionValue)}</div></div>
      <div style="font-size:28px;font-weight:700">${fmtMoney(row.total)}</div>
    </div>
    <div class="footer">Clínica Conecte • ${t?.name||""} • ${new Date().toLocaleDateString("pt-BR")}</div>
    </body></html>`);
    w.document.close(); w.print();
  }

  const years=[now.getFullYear()-1,now.getFullYear(),now.getFullYear()+1];

  return (
    <div>
      <div className="flex-between mb16">
        <div><h2 style={{fontSize:28}}>Faturamento</h2><p className="text-muted">Fechamento de atendimentos por período</p></div>
      </div>

      {/* Filtros */}
      <div className="card mb16">
        <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div className="field" style={{margin:0,minWidth:140}}>
            <label>Mês</label>
            <select value={month} onChange={e=>setMonth(Number(e.target.value))}>
              {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div className="field" style={{margin:0,minWidth:100}}>
            <label>Ano</label>
            <select value={year} onChange={e=>setYear(Number(e.target.value))}>
              {years.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="field" style={{margin:0,minWidth:200}}>
            <label>Paciente</label>
            <select value={selPatient} onChange={e=>setSelPatient(e.target.value)}>
              <option value="all">Todos</option>
              {patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? <div className="text-muted">Carregando...</div> : !data ? null : data.summary.length===0 ? (
        <div className="card" style={{textAlign:"center",color:"var(--muted)",padding:40}}>
          <div style={{fontSize:40,marginBottom:12}}>📋</div>
          <div>Nenhum atendimento encontrado neste período.</div>
        </div>
      ) : (
        <>
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <table className="invoice-table">
              <thead><tr>
                <th>Paciente</th>
                <th style={{textAlign:"center"}}>Sessões</th>
                <th style={{textAlign:"center"}}>Faltas</th>
                <th style={{textAlign:"center"}}>Valor/sessão</th>
                <th style={{textAlign:"right"}}>Total</th>
                <th style={{textAlign:"center"}}>Fatura</th>
              </tr></thead>
              <tbody>
                {data.summary.map(row=>(
                  <tr key={row.patient.id}>
                    <td>
                      <div className="flex-center gap8">
                        <div className="avatar" style={{width:28,height:28,fontSize:10,background:row.therapist?.color||"#4A8FC4"}}>
                          {initials(row.patient.name)}
                        </div>
                        <div>
                          <div style={{fontWeight:700,fontSize:13}}>{row.patient.name}</div>
                          <div style={{fontSize:11,color:"var(--muted)"}}>{row.patient.cpf||"CPF não informado"}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{textAlign:"center"}}><span className="tag tag-green">{row.sessionsCount}</span></td>
                    <td style={{textAlign:"center"}}>{row.absenceCount>0?<span className="tag tag-red">{row.absenceCount}</span>:<span style={{color:"var(--muted)"}}>—</span>}</td>
                    <td style={{textAlign:"center"}}>{fmtMoney(row.patient.sessionValue)}</td>
                    <td style={{textAlign:"right",fontFamily:"var(--font-display)",fontSize:17,fontWeight:700,color:"var(--blue-dark)"}}>{fmtMoney(row.total)}</td>
                    <td style={{textAlign:"center"}}>
                      <button className="btn btn-primary btn-sm" onClick={()=>printInvoice(row)}>🖨️ Fatura</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="invoice-total mt12">
            <div>
              <div style={{fontSize:13,opacity:0.8}}>{MONTHS[month]} {year} • {data.summary.length} paciente(s)</div>
              <div style={{fontSize:14,fontWeight:700}}>Total do período</div>
            </div>
            <div className="val">{fmtMoney(data.grandTotal)}</div>
          </div>
        </>
      )}
    </div>
  );
}
