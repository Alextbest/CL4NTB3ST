import { supabase } from "./supabaseClient.js";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

const isNativeApp = Capacitor.isNativePlatform();
const authRedirectUrl = isNativeApp ? "com.clantb3st.app://auth-callback" : window.location.origin;

async function handleNativeAuthUrl(rawUrl) {
  try {
    const callback = new URL(rawUrl);
    const code = callback.searchParams.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return;
    }
    const tokens = new URLSearchParams(callback.hash.replace(/^#/, ""));
    const access_token = tokens.get("access_token");
    const refresh_token = tokens.get("refresh_token");
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw error;
    }
  } catch (error) {
    console.error("No se pudo completar el retorno de autenticación:", error);
  }
}

if (isNativeApp) {
  App.addListener("appUrlOpen", ({ url }) => handleNativeAuthUrl(url));
  const launch = await App.getLaunchUrl();
  if (launch?.url) await handleNativeAuthUrl(launch.url);
}

console.info("Supabase preparado para CL4N TB3ST", Boolean(supabase));
const $=s=>document.querySelector(s), esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const authGate=$("#auth-gate"), appRoot=$("#app"), sessionMessage=$("#session-message"), accessStep=$("#access-step"), authForm=$("#auth-form"), profileForm=$("#profile-form"), profileSubmit=$("#profile-submit");
const authTitle=$("#auth-title"), authDescription=$("#auth-description"), authSubmit=$("#auth-submit"), authToggle=$("#auth-mode-toggle"), authForgot=$("#auth-forgot"), signOutButton=$("#app-signout");
let currentProfile=null, role="Miembro", authMode="signin", authBusy=false;
function hideLoadingScreen(){const screen=$("#loading-screen");if(screen)screen.classList.add("is-hidden")}
function showAccess(){authGate.classList.remove("hidden");appRoot.classList.add("hidden");accessStep.classList.remove("hidden");profileForm.classList.add("hidden")}
function showRegistration(){authGate.classList.remove("hidden");appRoot.classList.add("hidden");accessStep.classList.add("hidden");profileForm.classList.remove("hidden")}
function showApp(profile,session){currentProfile=profile;role=profile.role||"Miembro";authGate.classList.add("hidden");appRoot.classList.remove("hidden");$("#signed-in-email").textContent=session?.user?.email||"";render();loadClanRules()}
async function loadProfile(session){if(!session?.user){showAccess();return}const {data,error}=await supabase.from("profiles").select("id,display_name,ff_nick,ff_id,phone_e164,role").eq("id",session.user.id).maybeSingle();if(error){showAccess();sessionMessage.textContent="No se pudo comprobar tu perfil: "+error.message;return}if(data)showApp(data,session);else showRegistration()}
async function restoreSession(){const {data,error}=await supabase.auth.getSession();if(error){showAccess();sessionMessage.textContent="No se pudo comprobar la sesión: "+error.message;return}if(data.session)await loadProfile(data.session);else showAccess()}
function setAuthMode(mode){authMode=mode;const signup=mode==="signup";authTitle.textContent=signup?"Crear cuenta en CL4N TB3ST":"Entrar a CL4N TB3ST";authDescription.textContent=signup?"Regístrate con un correo y una contraseña exclusiva para esta aplicación.":"Inicia sesión con el correo y la contraseña de tu cuenta del clan.";authSubmit.textContent=signup?"Crear cuenta":"Iniciar sesión";authToggle.textContent=signup?"Ya tengo cuenta":"Crear cuenta nueva";$("#auth-password").autocomplete=signup?"new-password":"current-password";$("#auth-password").value="";authForgot.classList.toggle("hidden",signup);sessionMessage.textContent=""}
authToggle.onclick=()=>setAuthMode(authMode==="signin"?"signup":"signin");
authForm.onsubmit=async e=>{e.preventDefault();if(authBusy)return;const email=$("#auth-email").value.trim().toLowerCase(),password=$("#auth-password").value;if(!email||password.length<8){sessionMessage.textContent="Escribe un correo válido y una contraseña de al menos 8 caracteres.";return}authBusy=true;authSubmit.disabled=true;sessionMessage.textContent=authMode==="signup"?"Creando tu cuenta…":"Iniciando sesión…";try{if(authMode==="signup"){const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:authRedirectUrl}});if(error)throw error;if(data.session){await loadProfile(data.session)}else{sessionMessage.textContent="Cuenta creada. Revisa tu correo y confirma la dirección antes de iniciar sesión."}}else{const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;if(!data.session)throw new Error("No se recibió una sesión. Confirma tu correo e inténtalo de nuevo.");await loadProfile(data.session)}}catch(error){sessionMessage.textContent="No se pudo completar la operación: "+(error.message||"Error desconocido")}finally{authBusy=false;authSubmit.disabled=false}};
authForgot.onclick=async()=>{const email=$("#auth-email").value.trim().toLowerCase();if(!email){sessionMessage.textContent="Escribe primero el correo de tu cuenta.";return}authForgot.disabled=true;try{const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:authRedirectUrl});if(error)throw error;sessionMessage.textContent="Si el correo está registrado, recibirás instrucciones para restablecer la contraseña."}catch(error){sessionMessage.textContent="No se pudo solicitar el restablecimiento: "+error.message}finally{authForgot.disabled=false}};
if(signOutButton)signOutButton.onclick=async()=>{signOutButton.disabled=true;const {error}=await supabase.auth.signOut();if(error){sessionMessage.textContent="No se pudo cerrar sesión: "+error.message;signOutButton.disabled=false;return}currentProfile=null;role="Miembro";showAccess();setAuthMode("signin");signOutButton.disabled=false};
profileForm.onsubmit=async e=>{e.preventDefault();const phone=$("#profile-phone").value.trim().replace(/[\s()-]/g,"");const phonePattern=/^\+[1-9][0-9]{7,14}$/;if(!phonePattern.test(phone)){sessionMessage.textContent="Escribe el número con código internacional. Ejemplo: +50761234567.";return}profileSubmit.disabled=true;sessionMessage.textContent="Guardando tus datos…";try{const {data:{session},error:sessionError}=await supabase.auth.getSession();if(sessionError||!session)throw sessionError||new Error("La sesión expiró. Inicia sesión otra vez.");const payload={id:session.user.id,display_name:$("#profile-name").value.trim(),ff_nick:$("#profile-nick").value.trim(),ff_id:$("#profile-ffid").value.trim()||null,phone_e164:phone,role:"Miembro"};const {data,error}=await supabase.from("profiles").insert(payload).select("id,display_name,ff_nick,ff_id,phone_e164,role").single();if(error)throw error;showApp(data,session)}catch(error){sessionMessage.textContent=error.message?.includes("phone_e164")||error.code==="23505"?"Ese número ya está registrado o no tiene un formato válido. Revisa los datos.":"No se pudo guardar el registro: "+(error.message||"Error desconocido")}finally{profileSubmit.disabled=false}};
supabase.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"){showAccess();return}if(event==="SIGNED_IN"&&session){loadProfile(session)}});
setAuthMode("signin");
restoreSession().finally(hideLoadingScreen);
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}}, write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
let members=read("tb3st-members",[{id:1,name:"Líder",nick:"",role:"Líder"},{id:2,name:"Lideresa",nick:"",role:"Líder"},{id:3,name:"Integrante 01",nick:"",role:"Miembro"},{id:4,name:"Integrante 02",nick:"",role:"Miembro"}]);
let activities=read("tb3st-activities",[]), editing=null;
const isLeader=()=>role==="Líder", canManageMembers=()=>isLeader()||role==="Decano";
function nav(p){document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id==="page-"+p));document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.page===p));window.scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>nav(b.dataset.page));document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>nav(b.dataset.go));
let clanRules = [
  "Respetar las decisiones del líder y la lideresa.",
  "Los miembros masculinos presentan sus quejas al líder.",
  "Las miembros femeninas presentan sus quejas a la lideresa.",
  "Los desafíos oficiales se realizan bajo las reglas establecidas.",
  "Mantener el respeto y la actividad dentro del clan."
];
let clanRulesUpdatedAt = null;
const rulesForm = $("#rules-form");
const rulesEditor = $("#rules-editor");
const rulesStatus = $("#rules-status");
function renderRules() {
  const list = $("#rules-list");
  if (!list) return;
  list.innerHTML = clanRules.map((rule, i) => `<article><span>${String(i+1).padStart(2,"0")}</span><p>${esc(rule)}</p></article>`).join("") || '<p class="muted">Todavía no hay normas publicadas.</p>';
  if (rulesForm) rulesForm.classList.toggle("hidden", !isLeader());
  if (rulesEditor && document.activeElement !== rulesEditor) rulesEditor.value = clanRules.join("\n");
  const updated = $("#rules-updated");
  if (updated) updated.textContent = clanRulesUpdatedAt ? "Última actualización: " + new Date(clanRulesUpdatedAt).toLocaleString("es-PA") : "Normas oficiales del clan.";
}
async function loadClanRules() {
  const { data, error } = await supabase.from("clan_rules").select("rules,updated_at").eq("id", 1).maybeSingle();
  if (error) {
    if (rulesStatus) rulesStatus.textContent = "No se pudieron cargar las normas compartidas: " + error.message;
    renderRules();
    return;
  }
  if (data) {
    clanRules = Array.isArray(data.rules) ? data.rules.filter(x => typeof x === "string") : clanRules;
    clanRulesUpdatedAt = data.updated_at;
  }
  renderRules();
}
if (rulesForm) rulesForm.onsubmit = async e => {
  e.preventDefault();
  if (!isLeader()) return;
  const nextRules = rulesEditor.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  if (!nextRules.length || nextRules.length > 20) {
    rulesStatus.textContent = "Escribe entre 1 y 20 normas, una por línea.";
    return;
  }
  const save = $("#rules-save");
  save.disabled = true;
  rulesStatus.textContent = "Guardando normas en la nube…";
  try {
    const { data, error } = await supabase.from("clan_rules")
      .update({ rules: nextRules, updated_by: currentProfile.id, updated_at: new Date().toISOString() })
      .eq("id", 1).select("rules,updated_at").single();
    if (error) throw error;
    clanRules = data.rules;
    clanRulesUpdatedAt = data.updated_at;
    rulesStatus.textContent = "Normas guardadas. Ya están disponibles para todos los integrantes.";
    renderRules();
  } catch (error) {
    rulesStatus.textContent = "No se pudieron guardar las normas: " + (error.message || "Error desconocido");
  } finally {
    save.disabled = false;
  }
};

const WEB_LINK_KEY="tb3st-web-link";
const webForm=$("#web-link-form"), webInput=$("#web-link-input"), webFrame=$("#web-frame"), webEmpty=$("#web-empty"), webOpen=$("#web-open"), webReload=$("#web-reload");
function validWebUrl(value){try{const u=new URL(value);return u.protocol==="https:"?u.href:null}catch{return null}}
function renderWeb(){const saved=localStorage.getItem(WEB_LINK_KEY)||"",url=validWebUrl(saved);if(webInput)webInput.value=isLeader()?saved:"";if(webForm)webForm.classList.toggle("hidden",!isLeader());webFrame.classList.add("hidden");webFrame.removeAttribute("src");webReload.classList.add("hidden");webOpen.classList.toggle("hidden",!url);webEmpty.classList.toggle("hidden",!!url);$("#web-view-title").textContent=url?"Sitio privado del clan":"Sitio privado del clan"}
if(webForm)webForm.onsubmit=e=>{e.preventDefault();if(!isLeader())return;const url=validWebUrl(webInput.value.trim());if(!url){alert("Introduce un enlace HTTPS válido.");return}localStorage.setItem(WEB_LINK_KEY,url);renderWeb();alert("Enlace guardado en este dispositivo.")};
if(webOpen)webOpen.onclick=()=>{const url=validWebUrl(localStorage.getItem(WEB_LINK_KEY)||"");if(!url)return;webFrame.src=url;webFrame.classList.remove("hidden");webOpen.classList.add("hidden");webReload.classList.remove("hidden")};
if(webOpen){["contextmenu","selectstart","dragstart"].forEach(type=>webOpen.addEventListener(type,e=>e.preventDefault()));}
if(webReload)webReload.onclick=()=>{if(webFrame.src)webFrame.src=webFrame.src};



$("#member-form").onsubmit=e=>{e.preventDefault();if(!isLeader())return;members.push({id:Date.now(),name:$("#member-name").value.trim(),nick:$("#member-nick").value.trim(),role:$("#member-role").value});write("tb3st-members",members);e.target.reset();render()};
$("#member-list").onclick=e=>{const id=Number(e.target.dataset.edit||e.target.dataset.delete);if(!id)return;const m=members.find(x=>x.id===id);if(e.target.dataset.delete){if(!isLeader()||!confirm("¿Eliminar integrante?"))return;members=members.filter(x=>x.id!==id)}else{if(!canManageMembers()||(!isLeader()&&m.role!=="Miembro"))return;const name=prompt("Nombre visible:",m.name);if(name===null)return;const nick=prompt("Nick de Free Fire:",m.nick||"");if(nick===null)return;m.name=name.trim()||m.name;m.nick=nick.trim();if(isLeader()){const next=prompt("Rango: Líder, Decano o Miembro",m.role);if(next&&["Líder","Decano","Miembro"].includes(next))m.role=next}}write("tb3st-members",members);render()};
$("#add-poll-option").onclick=()=>{const n=document.querySelectorAll(".poll-option").length;if(n<6){const i=document.createElement("input");i.className="poll-option";i.maxLength=50;i.placeholder="Opción "+(n+1);$("#poll-options").append(i)}};
$("#activity-form").onsubmit=e=>{e.preventDefault();if(!isLeader())return;const opts=[...document.querySelectorAll(".poll-option")].map(x=>x.value.trim()).filter(Boolean);const item={id:editing||Date.now(),name:$("#activity-name").value.trim(),date:$("#activity-date").value,desc:$("#activity-desc").value.trim(),rules:$("#activity-rules").value.trim(),pollQuestion:$("#poll-question").value.trim(),options:opts.length>=2?opts:[],votes:editing?(activities.find(a=>a.id===editing)?.votes||{}):{},participants:editing?(activities.find(a=>a.id===editing)?.participants||{}):{}};activities=editing?activities.map(a=>a.id===editing?item:a):[item,...activities];write("tb3st-activities",activities);resetActivityForm();render()};
function resetActivityForm(){editing=null;$("#activity-form").reset();$("#activity-form-title").textContent="Crear actividad";$("#activity-submit").textContent="Publicar actividad";$("#cancel-edit").classList.add("hidden")}
$("#cancel-edit").onclick=resetActivityForm;
$("#activities-list").onclick=e=>{const card=e.target.closest("[data-id]");if(!card)return;const id=Number(card.dataset.id),a=activities.find(x=>x.id===id);if(!a)return;const user=role; if(e.target.dataset.action==="edit"&&isLeader()){editing=id;$("#activity-name").value=a.name;$("#activity-date").value=a.date;$("#activity-desc").value=a.desc;$("#activity-rules").value=a.rules;$("#poll-question").value=a.pollQuestion||"";$("#poll-options").innerHTML=(a.options?.length?a.options:["",""]).map((o,i)=>`<input class="poll-option" maxlength="50" placeholder="Opción ${i+1}" value="${esc(o)}">`).join("");$("#activity-form-title").textContent="Editar actividad";$("#activity-submit").textContent="Guardar cambios";$("#cancel-edit").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"})}
if(e.target.dataset.action==="delete"&&isLeader()&&confirm("¿Eliminar esta actividad?"))activities=activities.filter(x=>x.id!==id);
if(e.target.dataset.action==="join"||e.target.dataset.action==="leave"){const going=e.target.dataset.action==="join";if(!going){const start=new Date(a.date).getTime();if(Date.now()>=start-60*60*1000){alert("Ya no puedes cancelar: el límite es una hora antes del inicio.");return}}a.participants[user]=going; }
if(e.target.dataset.vote){a.votes[user]=e.target.dataset.vote}
write("tb3st-activities",activities);render()};
function render(){renderWeb();renderRules();const leaders=members.filter(m=>m.role==="Líder").length;$("#member-count").textContent=members.length;$("#member-pill").textContent=members.length+" miembros";$("#activity-count").textContent=activities.length;const active=activities.reduce((n,a)=>n+Object.values(a.participants||{}).filter(Boolean).length,0);$("#attendance-count").textContent=members.length?Math.round(active/members.length*100)+"%":"0%";$("#member-form").classList.toggle("hidden",!isLeader());$("#member-list").innerHTML=members.map(m=>`<div class="member-row"><div class="avatar">${esc(m.name.slice(0,1).toUpperCase())}</div><div class="member-info"><b>${esc(m.name)}</b><small>${esc(m.role)} · ${esc(m.nick||"Sin nick")}</small></div>${canManageMembers()&&(isLeader()||m.role==="Miembro")?`<button class="secondary-btn" data-edit="${m.id}">Editar</button>`:""}${isLeader()?`<button class="remove" data-delete="${m.id}">×</button>`:""}</div>`).join("")||'<p class="muted">No hay integrantes.</p>';
$("#activity-form").classList.toggle("hidden",!isLeader());$("#activity-pill").textContent=activities.length+" actividades";$("#recent-activity").textContent=activities[0]?activities[0].name:"Todavía no hay actividades.";
$("#activities-list").innerHTML=activities.map(a=>{const start=new Date(a.date),locked=Date.now()>=start.getTime()-3600000,going=!!a.participants?.[role],voted=a.votes?.[role];const participants=Object.entries(a.participants||{}).filter(x=>x[1]).map(x=>x[0]);const no=Object.entries(a.participants||{}).filter(x=>x[1]===false).map(x=>x[0]);return `<article class="panel activity-card" data-id="${a.id}"><div class="panel-title"><h3>${esc(a.name)}</h3><span class="tag">${isNaN(start)? "Fecha pendiente":start.toLocaleString("es-PA",{dateStyle:"medium",timeStyle:"short"})}</span></div><p>${esc(a.desc||"Sin descripción.")}</p>${a.rules?`<div class="activity-rules"><b>Reglas</b><p>${esc(a.rules)}</p></div>`:""}<div class="attendance-actions"><button class="${going?"secondary-btn":"primary-btn"}" data-action="${going?"leave":"join"}" ${!going&&locked?"disabled":""}>${going?"Cancelar participación":"Voy a participar"}</button><span class="muted">${locked?"Cancelación cerrada (límite: 1 hora antes)":"Puedes cancelar hasta una hora antes"}</span></div><div class="participant-grid"><div><b>Participan (${participants.length})</b><small>${participants.map(esc).join(", ")||"Nadie todavía"}</small></div><div><b>No participan (${no.length})</b><small>${no.map(esc).join(", ")||"Sin respuestas"}</small></div></div>${a.pollQuestion&&a.options?.length?`<div class="poll"><b>Encuesta: ${esc(a.pollQuestion)}</b>${a.options.map(o=>`<button class="poll-choice ${voted===o?"chosen":""}" data-vote="${esc(o)}">${esc(o)} <small>${Object.values(a.votes||{}).filter(v=>v===o).length} votos</small></button>`).join("")}<small>Tu voto: ${esc(voted||"Sin votar")}</small><p class="muted">Votos registrados: ${Object.entries(a.votes||{}).map(([u,v])=>esc(u)+": "+esc(v)).join(" · ")||"Ninguno"}</p></div>`:""}${isLeader()?`<div class="inline-actions"><button class="secondary-btn" data-action="edit">Editar</button><button class="danger-btn" data-action="delete">Eliminar</button></div>`:""}</article>`}).join("")||'<div class="panel muted">Todavía no hay actividades publicadas.</div>'}
render();

// Copias personales en Supabase Storage: cada cuenta solo puede acceder a su propia carpeta.
const BACKUP_BUCKET = "user-backups";
const BACKUP_FILE = "backup.json";
const backupStatus = $("#backup-status");
const backupUploadButton = $("#backup-upload");
const backupDownloadButton = $("#backup-download");
const backupRestoreButton = $("#backup-restore");

function getBackupPayload() {
  return {
    format: "CL4NTB3ST_BACKUP",
    version: 1,
    createdAt: new Date().toISOString(),
    data: {
      members: read("tb3st-members", []),
      activities: read("tb3st-activities", []),
      webLink: localStorage.getItem(WEB_LINK_KEY) || ""
    }
  };
}

function validateBackup(payload) {
  if (!payload || payload.format !== "CL4NTB3ST_BACKUP" || payload.version !== 1 || !payload.data) {
    throw new Error("El archivo no es una copia válida de CL4N TB3ST.");
  }
  if (!Array.isArray(payload.data.members) || !Array.isArray(payload.data.activities) || typeof payload.data.webLink !== "string") {
    throw new Error("La copia está incompleta o dañada.");
  }
  return payload;
}

async function getBackupPath() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error("Inicia sesión para usar las copias de seguridad.");
  return user.id + "/" + BACKUP_FILE;
}

function downloadBackupFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function fetchCloudBackup() {
  const path = await getBackupPath();
  const { data, error } = await supabase.storage.from(BACKUP_BUCKET).download(path);
  if (error) throw error;
  const payload = validateBackup(JSON.parse(await data.text()));
  return { payload, blob: data };
}

if (backupUploadButton) backupUploadButton.onclick = async () => {
  backupUploadButton.disabled = true;
  backupStatus.textContent = "Subiendo tus datos de forma privada…";
  try {
    const path = await getBackupPath();
    const payload = getBackupPayload();
    const file = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const { error } = await supabase.storage.from(BACKUP_BUCKET).upload(path, file, {
      contentType: "application/json",
      upsert: true,
      cacheControl: "0"
    });
    if (error) throw error;
    backupStatus.textContent = "Copia guardada en la nube. Última copia: " + new Date(payload.createdAt).toLocaleString("es-PA");
  } catch (error) {
    backupStatus.textContent = "No se pudo subir la copia: " + (error.message || "Error desconocido");
  } finally {
    backupUploadButton.disabled = false;
  }
};

if (backupDownloadButton) backupDownloadButton.onclick = async () => {
  backupDownloadButton.disabled = true;
  backupStatus.textContent = "Buscando tu copia en la nube…";
  try {
    const { payload, blob } = await fetchCloudBackup();
    const date = new Date(payload.createdAt);
    const stamp = isNaN(date) ? "backup" : date.toISOString().slice(0, 10);
    downloadBackupFile(blob, "CL4NTB3ST-copia-" + stamp + ".json");
    backupStatus.textContent = "Descarga preparada. Copia guardada el " + (isNaN(date) ? "día desconocido" : date.toLocaleString("es-PA")) + ".";
  } catch (error) {
    backupStatus.textContent = "No se pudo descargar: " + (error.message || "Error desconocido");
  } finally {
    backupDownloadButton.disabled = false;
  }
};

if (backupRestoreButton) backupRestoreButton.onclick = async () => {
  if (!confirm("Esto reemplazará los integrantes, actividades y enlace web de este teléfono por los datos de tu copia en la nube. ¿Continuar?")) return;
  backupRestoreButton.disabled = true;
  backupStatus.textContent = "Descargando y comprobando la copia…";
  try {
    const { payload } = await fetchCloudBackup();
    localStorage.setItem("tb3st-members", JSON.stringify(payload.data.members));
    localStorage.setItem("tb3st-activities", JSON.stringify(payload.data.activities));
    localStorage.setItem(WEB_LINK_KEY, payload.data.webLink);
    members = payload.data.members;
    activities = payload.data.activities;
    render();
    backupStatus.textContent = "Restauración completada. Datos recuperados de la copia del " + new Date(payload.createdAt).toLocaleString("es-PA") + ".";
  } catch (error) {
    backupStatus.textContent = "No se pudo restaurar: " + (error.message || "Error desconocido");
  } finally {
    backupRestoreButton.disabled = false;
  }
};
