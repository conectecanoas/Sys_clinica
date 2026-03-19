// src/pages/ClinicBillingPage.jsx
import { useState, useEffect } from "react";
import api from "../services/api";
import { fmtMoney, MONTHS } from "../hooks/useUtils";

const STATUS_LABEL = { PENDING:"Pendente", PARTIAL:"Parcial", PAID:"Pago" };
const STATUS_COLOR = { PENDING:"var(--pink-dark)", PARTIAL:"var(--yellow-dark)", PAID:"var(--green-dark)" };
const STATUS_BG    = { PENDING:"var(--pink-pale)", PARTIAL:"var(--yellow-pale)", PAID:"var(--green-pale)" };

export default function ClinicBillingPage() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [data,  setData]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(null); // row object
  const [payForm, setPayForm]   = useState({ paidAmount:"", paidAt:"", status:"PAID", notes:"" });
  const [saving, setSaving]     = useState(false);

  useEffect(() => { load(); }, [year, month]);

  async function load() {
    setLoading(true);
    try {
      const { data: d } = await api.get(`/clinic-payments?year=${year}&month=${month}`);
      setData(d);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }

  function openPayModal(row) {
    setPayForm({
      paidAmount: row.payment?.paidAmount || String(row.clinicShare.toFixed(2)),
      paidAt: row.payment?.paidAt ? row.payment.paidAt.split("T")[0] : new Date().toISOString().split("T")[0],
      status: row.payment?.status || "PAID",
      notes: row.payment?.notes || "",
    });
    setPayModal(row);
  }

  async function handleSavePay() {
    if (!payModal) return;
    setSaving(true);
    try {
      const payload = {
        therapistId: payModal.therapist.id,
        year, month,
        amount: payModal.clinicShare,
        paidAmount: Number(payForm.paidAmount),
        paidAt: payForm.paidAt || null,
        status: payForm.status,
        notes: payForm.notes,
      };
      if (payModal.payment?.id) {
        await api.put(`/clinic-payments/${payModal.payment.id}`, payload);
      } else {
        await api.post("/clinic-payments", payload);
      }
      setPayModal(null);
      await load();
    } catch(e) {
      alert(e.response?.data?.error || "Erro ao salvar pagamento.");
    } finally { setSaving(false); }
  }

  function printClinicInvoice() {
    if (!data) return;
    const monthName = MONTHS[month];
    const rows = data.rows.filter(r => r.clinicShare > 0);
    const w = window.open("","_blank");
    w.document.write(`<!DOCTYPE html><html><head><title>Fatura Clínica — ${monthName} ${year}</title>
    <style>
      body{font-family:Georgia,serif;max-width:750px;margin:40px auto;color:#1a1a2e;line-height:1.6;padding:0 20px}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:16px;border-bottom:2px solid #4A8FC4}
      h2{font-size:18px;margin:20px 0 10px;color:#4A8FC4}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#DCF0FF;color:#2A5F8A;padding:9px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.6px}
      td{padding:9px 12px;border-bottom:1px solid #eee}
      .total-box{background:#1A1A2E;color:#fff;border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;margin-top:16px}
      .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700}
      .footer{margin-top:36px;border-top:1px solid #eee;padding-top:12px;font-size:11px;color:#aaa;text-align:center}
      @media print{body{margin:20px}}
    </style></head><body>
    <div class="header">
      <div>
        <div style="font-size:22px;font-weight:700">Clínica Conecte</div>
        <div style="font-size:13px;color:#7a7a9a">Fatura Interna — Repasse dos Terapeutas</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:20px;font-weight:700;color:#4A8FC4">FATURA CLÍNICA</div>
        <div style="color:#7a7a9a">${monthName} ${year}</div>
        <div style="font-size:12px;color:#aaa">Emitida em ${new Date().toLocaleDateString("pt-BR")}</div>
      </div>
    </div>
    <table>
      <thead><tr>
        <th>Terapeuta</th><th>Sessões</th><th>Faturamento Bruto</th><th>%</th><th>Valor Clínica</th><th>Status</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => `<tr>
          <td><strong>${r.therapist.name}</strong><br><span style="font-size:11px;color:#7a7a9a">${r.therapist.specialty||""}</span></td>
          <td style="text-align:center">${r.sessionsCount}</td>
          <td>${Number(r.grossRevenue).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</td>
          <td style="text-align:center">${r.therapist.commissionPercent}%</td>
          <td><strong>${Number(r.clinicShare).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</strong></td>
          <td><span class="badge" style="background:${STATUS_BG[r.payment?.status||"PENDING"]};color:${STATUS_COLOR[r.payment?.status||"PENDING"]}">${STATUS_LABEL[r.payment?.status||"PENDING"]}</span></td>
        </tr>`).join("")}
      </tbody>
    </table>
    <div class="total-box">
      <div>
        <div style="font-size:13px;opacity:0.7">Total a receber — ${monthName} ${year}</div>
        <div style="font-size:13px;opacity:0.7">Pago: ${Number(data.totalPaid).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
      </div>
      <div style="font-size:30px;font-weight:700">${Number(data.totalClinicRevenue).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
    </div>
    <div class="footer">Clínica Conecte • Documento interno • ${new Date().toLocaleDateString("pt-BR")}</div>
    </body></html>`);
    w.document.close(); w.print();
  }

  const years = [now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1];

  return (
    <div>
      <div className="flex-between mb16" style={{flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{fontSize:28}}>Fatura da Clínica</h2>
          <p className="text-muted">Repasse percentual dos terapeutas</p>
        </div>
        <button className="btn btn-yellow" onClick={printClinicInvoice} disabled={!data}>🖨️ Imprimir Fatura</button>
      </div>

      {/* Filtros */}
      <div className="card mb16">
        <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div className="field" style={{margin:0,minWidth:140}}>
            <label>Mês</label>
            <select value={month} onChange={e=>setMonth(Number(e.target.value))}>
              {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div className="field" style={{margin:0,minWidth:100}}>
            <label>Ano</label>
            <select value={year} onChange={e=>setYear(Number(e.target.value))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-muted">Carregando...</div>
      ) : !data ? null : (
        <>
          {/* Totais */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-value" style={{color:"var(--blue)"}}>{fmtMoney(data.totalClinicRevenue)}</div>
              <div className="stat-label">Total a receber da clínica</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{color:"var(--green)"}}>{fmtMoney(data.totalPaid)}</div>
              <div className="stat-label">Total pago</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{color:"var(--pink)"}}>
                {fmtMoney(data.totalClinicRevenue - data.totalPaid)}
              </div>
              <div className="stat-label">Pendente</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{color:"var(--ink)"}}>{data.rows.length}</div>
              <div className="stat-label">Terapeutas</div>
            </div>
          </div>

          {/* Tabela por terapeuta */}
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Terapeuta</th>
                  <th style={{textAlign:"center"}}>Sessões</th>
                  <th style={{textAlign:"center"}}>Faltas</th>
                  <th style={{textAlign:"right"}}>Faturamento bruto</th>
                  <th style={{textAlign:"center"}}>% Clínica</th>
                  <th style={{textAlign:"right"}}>Valor clínica</th>
                  <th style={{textAlign:"center"}}>Status</th>
                  <th style={{textAlign:"center"}}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map(row => {
                  const st = row.payment?.status || "PENDING";
                  return (
                    <tr key={row.therapist.id}>
                      <td>
                        <div className="flex-center gap8">
                          <div className="avatar" style={{width:32,height:32,fontSize:12,background:row.therapist.color}}>
                            {row.therapist.name.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase()}
                          </div>
                          <div>
                            <div style={{fontWeight:700,fontSize:13}}>{row.therapist.name}</div>
                            <div style={{fontSize:11,color:"var(--muted)"}}>{row.therapist.specialty||""}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{textAlign:"center"}}>
                        <span className="tag tag-green">{row.sessionsCount}</span>
                      </td>
                      <td style={{textAlign:"center"}}>
                        {row.absenceCount > 0
                          ? <span className="tag tag-red">{row.absenceCount}</span>
                          : <span style={{color:"var(--muted)"}}>—</span>}
                      </td>
                      <td style={{textAlign:"right",fontWeight:600}}>{fmtMoney(row.grossRevenue)}</td>
                      <td style={{textAlign:"center"}}>
                        <span className="tag tag-blue">{row.therapist.commissionPercent}%</span>
                      </td>
                      <td style={{textAlign:"right",fontFamily:"var(--font-display)",fontSize:17,fontWeight:700,color:"var(--blue-dark)"}}>
                        {fmtMoney(row.clinicShare)}
                      </td>
                      <td style={{textAlign:"center"}}>
                        <span className="tag" style={{background:STATUS_BG[st],color:STATUS_COLOR[st]}}>
                          {STATUS_LABEL[st]}
                        </span>
                        {row.payment?.paidAt && (
                          <div style={{fontSize:10,color:"var(--muted)",marginTop:2}}>
                            {new Date(row.payment.paidAt).toLocaleDateString("pt-BR")}
                          </div>
                        )}
                      </td>
                      <td style={{textAlign:"center"}}>
                        <button className="btn btn-primary btn-sm" onClick={()=>openPayModal(row)}
                          disabled={row.clinicShare===0}>
                          {row.payment ? "Atualizar" : "Registrar pagamento"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="invoice-total mt12">
            <div>
              <div style={{fontSize:13,opacity:0.8}}>{MONTHS[month]} {year} • Repasse total da clínica</div>
              <div style={{fontSize:13,opacity:0.7}}>Pago: {fmtMoney(data.totalPaid)}</div>
            </div>
            <div className="val">{fmtMoney(data.totalClinicRevenue)}</div>
          </div>
        </>
      )}

      {/* Modal de pagamento */}
      {payModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setPayModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="flex-between">
                <div>
                  <div className="modal-title">Registrar Pagamento</div>
                  <div className="modal-subtitle">{payModal.therapist.name} — {MONTHS[month]} {year}</div>
                </div>
                <button className="modal-close" onClick={()=>setPayModal(null)}>✕</button>
              </div>
              <div className="divider"/>
            </div>
            <div className="modal-body">
              {/* Resumo */}
              <div style={{background:"var(--bg)",borderRadius:12,padding:14,marginBottom:16}}>
                <div className="flex-between mb8">
                  <span className="text-muted">Faturamento bruto do terapeuta</span>
                  <span style={{fontWeight:700}}>{fmtMoney(payModal.grossRevenue)}</span>
                </div>
                <div className="flex-between mb8">
                  <span className="text-muted">Percentual da clínica</span>
                  <span className="tag tag-blue">{payModal.therapist.commissionPercent}%</span>
                </div>
                <div className="flex-between" style={{borderTop:"1px solid var(--border)",paddingTop:10}}>
                  <span style={{fontWeight:700}}>Valor devido à clínica</span>
                  <span style={{fontFamily:"var(--font-display)",fontSize:20,fontWeight:700,color:"var(--blue-dark)"}}>
                    {fmtMoney(payModal.clinicShare)}
                  </span>
                </div>
              </div>

              <div className="grid2">
                <div className="field">
                  <label>Valor pago (R$)</label>
                  <input type="number" step="0.01" value={payForm.paidAmount}
                    onChange={e=>setPayForm(f=>({...f,paidAmount:e.target.value}))}
                    placeholder="0,00"/>
                </div>
                <div className="field">
                  <label>Data do pagamento</label>
                  <input type="date" value={payForm.paidAt}
                    onChange={e=>setPayForm(f=>({...f,paidAt:e.target.value}))}/>
                </div>
                <div className="field">
                  <label>Status</label>
                  <select value={payForm.status} onChange={e=>setPayForm(f=>({...f,status:e.target.value}))}>
                    <option value="PENDING">Pendente</option>
                    <option value="PARTIAL">Pago parcialmente</option>
                    <option value="PAID">Pago integralmente</option>
                  </select>
                </div>
                <div className="field">
                  <label>Observações</label>
                  <input type="text" value={payForm.notes}
                    onChange={e=>setPayForm(f=>({...f,notes:e.target.value}))}
                    placeholder="Ex: Pix, dinheiro, transferência..."/>
                </div>
              </div>

              <div className="flex-between mt8">
                <button className="btn btn-ghost" onClick={()=>setPayModal(null)}>Cancelar</button>
                <button className="btn btn-green" onClick={handleSavePay} disabled={saving}>
                  {saving ? <><span className="spinner"/>Salvando...</> : "✅ Confirmar Pagamento"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
