// src/hooks/useUtils.js
export function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d + (d.includes("T") ? "" : "T12:00:00"));
  return dt.toLocaleDateString("pt-BR");
}
export function fmtMoney(v) { return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
export function fmtPhone(v) {
  const d = v.replace(/\D/g,"").slice(0,11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/,"($1) $2").replace(/(\d{4})(\d)/,"$1-$2");
  return d.replace(/(\d{2})(\d)/,"($1) $2").replace(/(\d{5})(\d)/,"$1-$2");
}
export function fmtCPF(v) {
  const d = v.replace(/\D/g,"").slice(0,11);
  return d.replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2");
}
export function fmtCEP(v) { const d=v.replace(/\D/g,"").slice(0,8); return d.replace(/(\d{5})(\d)/,"$1-$2"); }
export function validaCPF(cpf) {
  const d = cpf.replace(/\D/g,"");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let s=0; for(let i=0;i<9;i++) s+=parseInt(d[i])*(10-i);
  let r=11-(s%11); if(r>=10) r=0; if(r!==parseInt(d[9])) return false;
  s=0; for(let i=0;i<10;i++) s+=parseInt(d[i])*(11-i);
  r=11-(s%11); if(r>=10) r=0; return r===parseInt(d[10]);
}
export function calcAge(birthDate) {
  if (!birthDate) return 0;
  const today=new Date(); const bd=new Date(birthDate);
  let age=today.getFullYear()-bd.getFullYear();
  const m=today.getMonth()-bd.getMonth();
  if (m<0||(m===0&&today.getDate()<bd.getDate())) age--;
  return age;
}
export function initials(name) {
  return (name||"").split(" ").filter(Boolean).map(n=>n[0]).slice(0,2).join("").toUpperCase();
}
export function getToday() { return new Date().toISOString().split("T")[0]; }
export function addDays(dateStr, n) {
  const d = new Date(dateStr+"T12:00:00"); d.setDate(d.getDate()+n);
  return d.toISOString().split("T")[0];
}
export function weekdayName(dateStr) {
  const names=["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
  return names[new Date(dateStr+"T12:00:00").getDay()];
}
export const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
export const HOURS  = ["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"];
export const MOODS  = [
  {id:"otimo",label:"Ótimo",emoji:"😄",color:"#DFFAEB"},
  {id:"bem",  label:"Bem",  emoji:"🙂",color:"#E8F4D4"},
  {id:"neutro",label:"Neutro",emoji:"😐",color:"#FEF8E0"},
  {id:"agitado",label:"Agitado",emoji:"😤",color:"#FFE5CC"},
  {id:"triste",label:"Triste",emoji:"😔",color:"#FFE4EF"},
];
export const TECHNIQUES = ["Respiração","Mindfulness","TCC","Arteterapia","Desenho","Roleplay","Sandplay","EMDR","Musicoterapia","Ludoterapia","ACT","DBT"];
