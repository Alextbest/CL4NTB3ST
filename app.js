const initialMembers = [
  {id:1,name:"Líder",role:"Liderazgo",present:false},
  {id:2,name:"Lideresa",role:"Liderazgo",present:false},
  {id:3,name:"Integrante 01",role:"Miembro",present:false},
  {id:4,name:"Integrante 02",role:"Miembro",present:false}
];
let members;
try { members = JSON.parse(localStorage.getItem("clanhub-members")) || initialMembers; } catch { members = initialMembers; }
let challengeAccepted = localStorage.getItem("clanhub-challenge") === "true";
const $ = s => document.querySelector(s);
function save(){ localStorage.setItem("clanhub-members",JSON.stringify(members)); render(); }
function render(){
  $("#member-count").textContent=members.length;
  $("#member-pill").textContent=`${members.length} miembros`;
  const present=members.filter(m=>m.present).length;
  $("#attendance-count").textContent=members.length?Math.round(present/members.length*100)+"%":"0%";
  $("#member-list").innerHTML=members.map(m=>`<div class="member-row"><div class="avatar">${escapeHtml(m.name.slice(0,1).toUpperCase())}</div><div class="member-info"><b>${escapeHtml(m.name)}</b><small>${escapeHtml(m.role)}</small></div><label title="Asistencia"><input class="attendance" type="checkbox" data-present="${m.id}" ${m.present?"checked":""}></label><button class="remove" data-remove="${m.id}" aria-label="Eliminar ${escapeHtml(m.name)}">×</button></div>`).join("");
  $("#challenge-count").textContent=challengeAccepted?"1":"0";
  $("#challenge-btn").textContent=challengeAccepted?"Cancelar aceptación":"Aceptar desafío";
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function navigate(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${page}`));
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.page===page));
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-page]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));
$("#member-form").addEventListener("submit",e=>{
  e.preventDefault();const input=$("#member-name"),name=input.value.trim();if(!name)return;
  members.push({id:Date.now(),name,role:"Miembro",present:false});input.value="";save();
});
$("#member-list").addEventListener("change",e=>{
  const id=Number(e.target.dataset.present);if(!id)return;
  members=members.map(m=>m.id===id?{...m,present:e.target.checked}:m);save();
});
$("#member-list").addEventListener("click",e=>{
  const id=Number(e.target.dataset.remove);if(!id)return;
  if(confirm("¿Eliminar este integrante?")){members=members.filter(m=>m.id!==id);save();}
});
$("#challenge-btn").addEventListener("click",()=>{
  challengeAccepted=!challengeAccepted;localStorage.setItem("clanhub-challenge",String(challengeAccepted));render();
});
render();
