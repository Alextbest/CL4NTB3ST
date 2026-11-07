import { supabase } from "./supabaseClient.js";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { App } from "@capacitor/app";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { FilePicker } from "@capawesome/capacitor-file-picker";

const ApkUpdater = registerPlugin("ApkUpdater");

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
function showApp(profile,session){currentProfile=profile;role=profile.role||"Miembro";authGate.classList.add("hidden");appRoot.classList.remove("hidden");$("#signed-in-email").textContent=session?.user?.email||"";render();loadClanRules();loadCloudMembers()}
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
const PATCH_MANIFEST_URL = "https://github.com/Alextbest/CL4NTB3ST/releases/latest/download/patch-manifest.json";
const PATCH_BUILTIN_VERSION = "__CL4NTB3ST_PATCH_VERSION__";
const PATCH_NATIVE_API = 1;
let patchCheckRunning = false;

async function checkForRemotePatch() {
  if (!isNativeApp || patchCheckRunning) return;
  patchCheckRunning = true;
  let userAccepted = false;
  try {
    const response = await fetch(PATCH_MANIFEST_URL, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return;
    const manifest = await response.json();
    if (
      manifest.nativeApi !== PATCH_NATIVE_API ||
      typeof manifest.version !== "string" ||
      !/^ota-[0-9]+$/.test(manifest.version) ||
      typeof manifest.url !== "string" ||
      typeof manifest.checksum !== "string" ||
      !/^[a-f0-9]{64}$/i.test(manifest.checksum)
    ) return;

    const patchUrl = new URL(manifest.url);
    if (
      patchUrl.protocol !== "https:" ||
      patchUrl.hostname !== "github.com" ||
      !patchUrl.pathname.startsWith("/Alextbest/CL4NTB3ST/releases/download/")
    ) return;

    const current = await CapacitorUpdater.current();
    const installedVersion = current?.bundle?.id === "builtin" ? PATCH_BUILTIN_VERSION : (current?.bundle?.version || current?.bundle?.id || PATCH_BUILTIN_VERSION);
    if (installedVersion === manifest.version) return;

    userAccepted = confirm(
      "Hay una actualización de CL4N TB3ST disponible (" + manifest.version +
      ").\n\nSe descargará el parche y la aplicación se reiniciará para aplicarlo. ¿Actualizar ahora?"
    );
    if (!userAccepted) return;

    const downloaded = await CapacitorUpdater.download({
      version: manifest.version,
      url: manifest.url,
      checksum: manifest.checksum
    });
    if (!downloaded?.id) throw new Error("El paquete descargado no devolvió un identificador válido.");
    await CapacitorUpdater.set({ id: downloaded.id });
  } catch (error) {
    console.warn("No se pudo aplicar el parche remoto:", error);
    if (userAccepted) {
      alert("No se pudo instalar el parche. La aplicación seguirá funcionando con la versión actual.");
    }
  } finally {
    patchCheckRunning = false;
  }
}


const APK_MANIFEST_URL = "https://github.com/Alextbest/CL4NTB3ST/releases/latest/download/apk-manifest.json";
const apkUpdatePanel = $("#apk-update-panel");
const apkUpdateMessage = $("#apk-update-message");
const apkUpdateButton = $("#apk-update-button");
let apkUpdateManifest = null;
let apkDownloadId = null;
let apkUpdateState = "checking";
let apkUpdateBusy = false;

function showApkUpdateMessage(message) {
  if (apkUpdateMessage) apkUpdateMessage.textContent = message;
}

async function checkForApkUpdate() {
  if (!isNativeApp || !apkUpdatePanel || apkUpdateBusy) return;
  apkUpdatePanel.classList.remove("hidden");
  apkUpdateState = "checking";
  if (apkUpdateButton) {
    apkUpdateButton.disabled = true;
    apkUpdateButton.textContent = "Comprobando…";
  }
  showApkUpdateMessage("Buscando una versión nueva de CL4N TB3ST…");
  try {
    const response = await fetch(APK_MANIFEST_URL, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("No se pudo consultar el servidor de versiones.");
    const manifest = await response.json();
    if (
      manifest.packageId !== "com.clantb3st.app" ||
      !Number.isSafeInteger(manifest.versionCode) ||
      manifest.versionCode < 1 ||
      typeof manifest.versionName !== "string" ||
      typeof manifest.url !== "string" ||
      typeof manifest.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/i.test(manifest.sha256)
    ) throw new Error("El manifiesto de actualización no es válido.");
    const apkUrl = new URL(manifest.url);
    if (
      apkUrl.protocol !== "https:" ||
      apkUrl.hostname !== "github.com" ||
      !/^\/Alextbest\/CL4NTB3ST\/releases\/download\/apk-[0-9]+\/app-release\.apk$/.test(apkUrl.pathname)
    ) throw new Error("El enlace del APK no es válido.");

    const installed = await ApkUpdater.getInstalledVersion();
    if (manifest.versionCode <= Number(installed.versionCode)) {
      apkUpdateManifest = null;
      apkUpdateState = "current";
      showApkUpdateMessage("Tu aplicación está actualizada (versión " + (installed.versionName || "instalada") + ").");
      if (apkUpdateButton) {
        apkUpdateButton.disabled = false;
        apkUpdateButton.textContent = "Buscar actualizaciones";
      }
      return;
    }
    apkUpdateManifest = manifest;
    apkUpdateState = "available";
    showApkUpdateMessage("Nueva versión " + manifest.versionName + " disponible. " + (manifest.notes || "Incluye mejoras de CL4N TB3ST."));
    if (apkUpdateButton) {
      apkUpdateButton.disabled = false;
      apkUpdateButton.textContent = "Descargar actualización";
    }
  } catch (error) {
    apkUpdateState = "error";
    showApkUpdateMessage(error.message || "No se pudo comprobar si hay actualizaciones.");
    if (apkUpdateButton) {
      apkUpdateButton.disabled = false;
      apkUpdateButton.textContent = "Reintentar";
    }
    console.warn("Comprobación de APK:", error);
  }
}

async function downloadApkUpdate() {
  if (apkUpdateBusy) return;
  if (!apkUpdateManifest && (apkUpdateState === "current" || apkUpdateState === "error")) {
    await checkForApkUpdate();
    return;
  }
  if (!apkUpdateManifest) return;
  apkUpdateBusy = true;
  apkUpdateButton.disabled = true;
  try {
    if (apkUpdateState === "available") {
      showApkUpdateMessage("Preparando descarga segura…");
      const started = await ApkUpdater.startDownload({
        url: apkUpdateManifest.url,
        sha256: apkUpdateManifest.sha256
      });
      apkDownloadId = started.downloadId;
      apkUpdateState = "downloading";
      apkUpdateButton.textContent = "Descargando…";
      const deadline = Date.now() + 20 * 60 * 1000;
      while (Date.now() < deadline) {
        const status = await ApkUpdater.getDownloadStatus({ downloadId: apkDownloadId });
        if (status.status === "successful") {
          apkUpdateState = "downloaded";
          showApkUpdateMessage("Descarga completa. Pulsa «Instalar actualización» para abrir el instalador de Android.");
          apkUpdateButton.textContent = "Instalar actualización";
          apkUpdateButton.disabled = false;
          return;
        }
        if (status.status === "failed") throw new Error("La descarga no se completó. Comprueba tu conexión e inténtalo otra vez.");
        const percent = status.totalBytes > 0 ? Math.floor(status.bytesDownloaded * 100 / status.totalBytes) : 0;
        showApkUpdateMessage("Descargando actualización… " + percent + "%");
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
      throw new Error("La descarga tardó demasiado. Puedes volver a intentarlo.");
    }
    if (apkUpdateState === "downloaded") {
      const result = await ApkUpdater.installDownloaded({
        downloadId: apkDownloadId,
        sha256: apkUpdateManifest.sha256
      });
      if (result.needsPermission) {
        showApkUpdateMessage("Android abrió Ajustes. Permite a CL4N TB3ST instalar aplicaciones y vuelve a pulsar el botón.");
        apkUpdateButton.textContent = "Continuar instalación";
        apkUpdateButton.disabled = false;
        return;
      }
      showApkUpdateMessage("Se abrió el instalador de Android. Confirma la actualización para conservar tus datos.");
      apkUpdateButton.textContent = "Instalador abierto";
      return;
    }
    if (apkUpdateState === "current" || apkUpdateState === "error") {
      await checkForApkUpdate();
      return;
    }
  } catch (error) {
    showApkUpdateMessage(error.message || "No se pudo instalar la actualización.");
    apkUpdateButton.textContent = "Reintentar";
    apkUpdateButton.disabled = false;
    if (apkUpdateState !== "downloaded") apkUpdateState = "available";
    console.warn("Actualizador de APK:", error);
  } finally {
    apkUpdateBusy = false;
    if (apkUpdateState === "downloading") apkUpdateButton.disabled = false;
  }
}

if (apkUpdateButton) apkUpdateButton.addEventListener("click", downloadApkUpdate);

restoreSession().finally(async () => {
  hideLoadingScreen();
  if (isNativeApp) {
    try {
      await CapacitorUpdater.notifyAppReady();
      await checkForRemotePatch();
      await checkForApkUpdate();
    } catch (error) {
      console.warn("El sistema de parches remotos no pudo iniciarse:", error);
    }
  }
});
async function refreshSignedInProfile(){
  if(document.hidden)return;
  const {data:{session}}=await supabase.auth.getSession();
  if(session)await loadProfile(session);
}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshSignedInProfile()});
if(isNativeApp)App.addListener("appStateChange",({isActive})=>{if(isActive)refreshSignedInProfile()});

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
function renderRulesEditor() {
  if (!rulesEditor) return;
  rulesEditor.innerHTML = clanRules.map((rule, i) => `<div class="rule-edit-row"><span>${String(i+1).padStart(2,"0")}</span><input type="text" maxlength="240" data-rule-index="${i}" aria-label="Norma ${i+1}" value="${esc(rule)}"><button type="button" class="rule-remove" data-rule-remove="${i}" aria-label="Eliminar norma ${i+1}" title="Eliminar norma">×</button></div>`).join("");
  const add = $("#rules-add");
  if (add) add.disabled = clanRules.length >= 20;
}
function renderRules() {
  const list = $("#rules-list");
  if (!list) return;
  list.innerHTML = clanRules.map((rule, i) => `<article><span>${String(i+1).padStart(2,"0")}</span><p>${esc(rule)}</p></article>`).join("") || '<p class="muted">Todavía no hay normas publicadas.</p>';
  if (rulesForm) rulesForm.classList.toggle("hidden", !isLeader());
  if (rulesEditor && document.activeElement?.dataset?.ruleIndex === undefined) renderRulesEditor();
  const updated = $("#rules-updated");
  if (updated) updated.textContent = clanRulesUpdatedAt ? "Última actualización: " + new Date(clanRulesUpdatedAt).toLocaleString("es-PA") : "Normas oficiales del clan.";
}
let cloudMembers=[];
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
  renderRulesEditor();
}
if (rulesEditor) {
  rulesEditor.addEventListener("input", e => {
    const index = Number(e.target.dataset.ruleIndex);
    if (Number.isInteger(index) && index >= 0 && index < clanRules.length) clanRules[index] = e.target.value;
  });
  rulesEditor.addEventListener("click", e => {
    const index = Number(e.target.dataset.ruleRemove);
    if (!Number.isInteger(index) || index < 0 || index >= clanRules.length) return;
    clanRules.splice(index, 1);
    renderRulesEditor();
  });
}
const rulesAdd = $("#rules-add");
if (rulesAdd) rulesAdd.onclick = () => {
  if (!isLeader() || clanRules.length >= 20) return;
  clanRules.push("");
  renderRulesEditor();
  const last = rulesEditor.querySelector("input:last-of-type");
  last?.focus();
};
if (rulesForm) rulesForm.onsubmit = async e => {
  e.preventDefault();
  if (!isLeader()) return;
  const nextRules = [...rulesEditor.querySelectorAll("[data-rule-index]")].map(input => input.value.trim()).filter(Boolean);
  if (!nextRules.length || nextRules.length > 20) {
    rulesStatus.textContent = "Debe haber entre 1 y 20 normas. Completa o elimina las filas vacías.";
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
    renderRulesEditor();
  } catch (error) {
    rulesStatus.textContent = "No se pudieron guardar las normas: " + (error.message || "Error desconocido");
  } finally {
    save.disabled = false;
  }
};

// Tarjetas deslizable del boletín: el detalle se muestra dentro de la app.
const newsItems = {
  patch: { kicker: "ACTUALIZACIONES", title: "Notas del parche", body: "Las notas del parche reúnen los cambios oficiales de cada actualización: ajustes de armas, personajes, habilidades, mapas, modos y correcciones. Abre las publicaciones de Garena para revisar los cambios concretos de cada versión." },
  balance: { kicker: "CAMBIOS DEL JUEGO", title: "Balance y novedades", body: "Aquí puedes consultar información oficial sobre ajustes de equilibrio, cambios en habilidades, armas y mecánicas. Los detalles y valores exactos deben comprobarse en el comunicado correspondiente de Garena." },
  announcements: { kicker: "COMUNICADOS", title: "Anuncios de Garena", body: "Los comunicados oficiales pueden incluir avisos de mantenimiento, cambios importantes, novedades del juego y anuncios del equipo de Free Fire. Entra a la fuente oficial para leer cada publicación completa." },
  collabs: { kicker: "CONTENIDO", title: "Colaboraciones y novedades", body: "Consulta las publicaciones oficiales sobre colaboraciones, contenido temático y novedades que llegan al juego. La disponibilidad y las fechas pueden variar por región; revisa siempre el anuncio oficial." }
};
const newsCarousel = $("#news-carousel");
const newsDetail = $("#news-detail");
function openNewsDetail(key) {
  const item = newsItems[key];
  if (!item || !newsDetail) return;
  $("#news-detail-kicker").textContent = item.kicker;
  $("#news-detail-title").textContent = item.title;
  $("#news-detail-body").textContent = item.body;
  newsCarousel?.classList.add("hidden");
  $(".news-slide-hint")?.classList.add("hidden");
  newsDetail.classList.remove("hidden");
  newsDetail.scrollIntoView({ behavior: "smooth", block: "start" });
}
if (newsCarousel) newsCarousel.addEventListener("click", e => {
  const card = e.target.closest("[data-news]");
  if (card) openNewsDetail(card.dataset.news);
});
const newsBack = $("#news-back");
if (newsBack) newsBack.onclick = () => {
  newsDetail?.classList.add("hidden");
  newsCarousel?.classList.remove("hidden");
  $(".news-slide-hint")?.classList.remove("hidden");
};

const WEB_LINK_KEY="tb3st-web-link";
const webForm=$("#web-link-form"), webInput=$("#web-link-input"), webFrame=$("#web-frame"), webEmpty=$("#web-empty"), webOpen=$("#web-open"), webReload=$("#web-reload");
function validWebUrl(value){try{const u=new URL(value);return u.protocol==="https:"?u.href:null}catch{return null}}
function renderWeb(){const saved=localStorage.getItem(WEB_LINK_KEY)||"",url=validWebUrl(saved);if(webInput)webInput.value=isLeader()?saved:"";if(webForm)webForm.classList.toggle("hidden",!isLeader());webFrame.classList.add("hidden");webFrame.removeAttribute("src");webReload.classList.add("hidden");webOpen.classList.toggle("hidden",!url);webEmpty.classList.toggle("hidden",!!url);$("#web-view-title").textContent=url?"Sitio privado del clan":"Sitio privado del clan"}
if(webForm)webForm.onsubmit=e=>{e.preventDefault();if(!isLeader())return;const url=validWebUrl(webInput.value.trim());if(!url){alert("Introduce un enlace HTTPS válido.");return}localStorage.setItem(WEB_LINK_KEY,url);renderWeb();alert("Enlace guardado en este dispositivo.")};
if(webOpen)webOpen.onclick=()=>{const url=validWebUrl(localStorage.getItem(WEB_LINK_KEY)||"");if(!url)return;webFrame.src=url;webFrame.classList.remove("hidden");webOpen.classList.add("hidden");webReload.classList.remove("hidden")};
if(webOpen){["contextmenu","selectstart","dragstart"].forEach(type=>webOpen.addEventListener(type,e=>e.preventDefault()));}
if(webReload)webReload.onclick=()=>{if(webFrame.src)webFrame.src=webFrame.src};



const roleAssignForm=$("#role-assign-form");
const roleAssignStatus=$("#role-assign-status");
async function loadCloudMembers(){
  const {data,error}=await supabase.from("profiles").select("id,display_name,ff_nick,ff_id,role,created_at").order("created_at",{ascending:true});
  if(error){if(roleAssignStatus)roleAssignStatus.textContent="No se pudieron cargar las cuentas: "+error.message;return}
  cloudMembers=data||[];
  members=cloudMembers.map((p,i)=>({id:p.id,name:p.display_name,nick:p.ff_nick,role:p.role}));
  render();
}
const membersStatus=$("#members-status");
$("#member-list").onclick=async e=>{
  const button=e.target.closest("[data-edit-profile]");
  if(!button||!canManageMembers())return;
  const target=cloudMembers.find(m=>m.id===button.dataset.editProfile);
  if(!target||target.role!=="Miembro")return;
  const name=prompt("Nombre visible:",target.display_name);
  if(name===null)return;
  const nick=prompt("Nick de Free Fire:",target.ff_nick||"");
  if(nick===null)return;
  button.disabled=true;
  if(membersStatus)membersStatus.textContent="Guardando datos del integrante…";
  try{
    const {data,error}=await supabase.rpc("update_clan_member_details",{p_member_id:target.id,p_display_name:name.trim(),p_ff_nick:nick.trim()});
    if(error)throw error;
    const updated=Array.isArray(data)?data[0]:data;
    if(!updated)throw new Error("No se pudo actualizar la cuenta.");
    if(membersStatus)membersStatus.textContent="Datos de "+updated.display_name+" actualizados en la nube.";
    await loadCloudMembers();
  }catch(error){if(membersStatus)membersStatus.textContent=error.message||"No se pudieron guardar los cambios."}
  finally{button.disabled=false}
};
if(roleAssignForm)roleAssignForm.onsubmit=async e=>{
  e.preventDefault();
  if(!isLeader()){roleAssignStatus.textContent="Solo los líderes pueden cambiar rangos.";return}
  const identifier=$("#role-member-id").value.trim(),nextRole=$("#role-member-role").value,button=$("#role-assign-submit");
  if(!identifier){roleAssignStatus.textContent="Escribe el ID de la cuenta.";return}
  button.disabled=true;roleAssignStatus.textContent="Actualizando el rango en la nube…";
  try{
    const {data,error}=await supabase.rpc("assign_clan_role",{p_identifier:identifier,p_role:nextRole});
    if(error)throw error;
    const updated=Array.isArray(data)?data[0]:data;
    if(!updated)throw new Error("No se encontró una cuenta para actualizar.");
    roleAssignStatus.textContent="Rango actualizado: "+updated.display_name+" ahora es "+updated.role+". El cambio quedó guardado en Supabase.";
    roleAssignForm.reset();
    await loadCloudMembers();
  }catch(error){roleAssignStatus.textContent=error.message||"No se pudo actualizar el rango."}
  finally{button.disabled=false}
};
$("#add-poll-option").onclick=()=>{const n=document.querySelectorAll(".poll-option").length;if(n<6){const i=document.createElement("input");i.className="poll-option";i.maxLength=50;i.placeholder="Opción "+(n+1);$("#poll-options").append(i)}};
$("#activity-form").onsubmit=e=>{e.preventDefault();if(!isLeader())return;const opts=[...document.querySelectorAll(".poll-option")].map(x=>x.value.trim()).filter(Boolean);const item={id:editing||Date.now(),name:$("#activity-name").value.trim(),date:$("#activity-date").value,desc:$("#activity-desc").value.trim(),rules:$("#activity-rules").value.trim(),pollQuestion:$("#poll-question").value.trim(),options:opts.length>=2?opts:[],votes:editing?(activities.find(a=>a.id===editing)?.votes||{}):{},participants:editing?(activities.find(a=>a.id===editing)?.participants||{}):{}};activities=editing?activities.map(a=>a.id===editing?item:a):[item,...activities];write("tb3st-activities",activities);resetActivityForm();render()};
function resetActivityForm(){editing=null;$("#activity-form").reset();$("#activity-form-title").textContent="Crear actividad";$("#activity-submit").textContent="Publicar actividad";$("#cancel-edit").classList.add("hidden")}
$("#cancel-edit").onclick=resetActivityForm;
$("#activities-list").onclick=e=>{const card=e.target.closest("[data-id]");if(!card)return;const id=Number(card.dataset.id),a=activities.find(x=>x.id===id);if(!a)return;const user=role; if(e.target.dataset.action==="edit"&&isLeader()){editing=id;$("#activity-name").value=a.name;$("#activity-date").value=a.date;$("#activity-desc").value=a.desc;$("#activity-rules").value=a.rules;$("#poll-question").value=a.pollQuestion||"";$("#poll-options").innerHTML=(a.options?.length?a.options:["",""]).map((o,i)=>`<input class="poll-option" maxlength="50" placeholder="Opción ${i+1}" value="${esc(o)}">`).join("");$("#activity-form-title").textContent="Editar actividad";$("#activity-submit").textContent="Guardar cambios";$("#cancel-edit").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"})}
if(e.target.dataset.action==="delete"&&isLeader()&&confirm("¿Eliminar esta actividad?"))activities=activities.filter(x=>x.id!==id);
if(e.target.dataset.action==="join"||e.target.dataset.action==="leave"){const going=e.target.dataset.action==="join";if(!going){const start=new Date(a.date).getTime();if(Date.now()>=start-60*60*1000){alert("Ya no puedes cancelar: el límite es una hora antes del inicio.");return}}a.participants[user]=going; }
if(e.target.dataset.vote){a.votes[user]=e.target.dataset.vote}
write("tb3st-activities",activities);render()};
function render(){renderWeb();renderRules();$("#member-count").textContent=cloudMembers.length;$("#member-pill").textContent=cloudMembers.length+" cuentas";$("#activity-count").textContent=activities.length;const active=activities.reduce((n,a)=>n+Object.values(a.participants||{}).filter(Boolean).length,0);$("#attendance-count").textContent=cloudMembers.length?Math.round(active/cloudMembers.length*100)+"%":"0%";if(roleAssignForm)roleAssignForm.classList.toggle("hidden",!isLeader());$("#member-list").innerHTML=cloudMembers.map(m=>`<div class="member-row"><div class="avatar">${esc((m.display_name||"?").slice(0,1).toUpperCase())}</div><div class="member-info"><b>${esc(m.display_name)}</b><small>${esc(m.role)} · ${esc(m.ff_nick||"Sin nick")}</small>${isLeader()?`<small class="role-account-id">ID cuenta: ${esc(m.id)} · ID Free Fire: ${esc(m.ff_id||"No registrado")}</small>`:(m.ff_id?`<small class="role-account-id">ID Free Fire: ${esc(m.ff_id)}</small>`:"")}</div>${canManageMembers()&&m.role==="Miembro"?`<button class="secondary-btn" data-edit-profile="${esc(m.id)}" type="button">Editar</button>`:""}</div>`).join("")||'<p class="muted">Todavía no hay cuentas registradas.</p>';$("#activity-form").classList.toggle("hidden",!isLeader());$("#activity-pill").textContent=activities.length+" actividades";$("#recent-activity").textContent=activities[0]?activities[0].name:"Todavía no hay actividades.";
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


// Acceso a archivos mediante los selectores nativos de Android.
// Android entrega acceso solo a los elementos elegidos; no se solicita acceso total al almacenamiento.
const pickMediaButton = $("#pick-media");
const pickDocumentsButton = $("#pick-documents");
const fileAccessStatus = $("#file-access-status");

if (pickMediaButton) pickMediaButton.addEventListener("click", async () => {
  pickMediaButton.disabled = true;
  fileAccessStatus.textContent = "Abriendo la galería del teléfono…";
  try {
    const result = await FilePicker.pickMedia({ limit: 0 });
    const count = result.files?.length || 0;
    fileAccessStatus.textContent = count
      ? count + " archivo(s) multimedia seleccionado(s): " + result.files.map(file => file.name || "Archivo").join(", ")
      : "No se seleccionaron archivos.";
  } catch (error) {
    fileAccessStatus.textContent = "No se pudo abrir la galería: " + (error.message || "Operación cancelada.");
  } finally {
    pickMediaButton.disabled = false;
  }
});

if (pickDocumentsButton) pickDocumentsButton.addEventListener("click", async () => {
  pickDocumentsButton.disabled = true;
  fileAccessStatus.textContent = "Abriendo el selector de documentos…";
  try {
    if (isNativeApp) {
      const permission = await FilePicker.requestPermissions({ permissions: ["readExternalStorage"] });
      if (permission.readExternalStorage === "denied") {
        fileAccessStatus.textContent = "El permiso de lectura fue denegado. El selector del sistema puede seguir permitiendo elegir archivos.";
      }
    }
    const result = await FilePicker.pickFiles({ multiple: true });
    const count = result.files?.length || 0;
    fileAccessStatus.textContent = count
      ? count + " documento(s) seleccionado(s): " + result.files.map(file => file.name || "Archivo").join(", ")
      : "No se seleccionaron documentos.";
  } catch (error) {
    fileAccessStatus.textContent = "No se pudo abrir el selector: " + (error.message || "Operación cancelada.");
  } finally {
    pickDocumentsButton.disabled = false;
  }
});


// Iconografía coherente para acciones y controles de toda la interfaz.
const interfaceIconPaths = {
 home:'<path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
 newspaper:'<path d="M4 4h16v17H4z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
 swords:'<path d="m14.5 5.5 4-4 4 4-4 4M5.5 14.5l-4 4 4 4 4-4M14 10 4 20M10 14 20 4"/>',
 'shield-check':'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
 cloud:'<path d="M20 16.2A4.5 4.5 0 0 0 18 7.5a6 6 0 0 0-11.6 1.8A4 4 0 0 0 7 17h12"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 save:'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
 download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>',
 upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
 file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
 lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>',
 login:'<path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/>',
 logout:'<path d="M14 17l5-5-5-5M19 12H7"/><path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5"/>',
 edit:'<path d="m16 4 4 4L8 20H4v-4z"/><path d="m14 6 4 4"/>',
 refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3"/>',
 back:'<path d="m15 18-6-6 6-6M9 12h12"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'
};
function iconSvg(name){
 const path=interfaceIconPaths[name]||interfaceIconPaths.info;
 return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+path+'</svg>';
}
function decorateInterfaceButtons(root=document){
 const candidates=[];
 if(root.matches?.("button"))candidates.push(root);
 candidates.push(...root.querySelectorAll("button"));
 const pageIcons={home:"home",members:"users",activities:"calendar",news:"newspaper",web:"globe",challenges:"swords",rules:"shield-check",backup:"cloud"};
 candidates.forEach(button=>{
  if(button.dataset.iconDecorated==="true")return;
  const page=button.dataset.page,go=button.dataset.go;
  let icon=button.dataset.icon||pageIcons[page]||pageIcons[go]||"";
  const id=button.id||"";
  const label=(button.textContent||"").trim().toLowerCase();
  if(button.classList.contains("quick-card")){
   const quickIcon=button.querySelector(".quick-icon");
   if(quickIcon&&icon&&interfaceIconPaths[icon]){quickIcon.innerHTML=iconSvg(icon);quickIcon.dataset.iconDecorated="true";button.dataset.iconDecorated="true";return;}
  }
  if(!icon){
   if(/signout|logout/.test(id)||label.includes("cerrar sesión"))icon="logout";
   else if(/auth-submit|login/.test(id)||label.includes("iniciar sesión"))icon="login";
   else if(/forgot/.test(id)||label.includes("contraseña"))icon="lock";
   else if(/poll-option/.test(id)||label.includes("añadir opción")||label.includes("agregar norma"))icon="plus";
   else if(/save|submit|guardar|publicar|completar registro/.test(id+" "+label))icon="save";
   else if(/upload/.test(id)||label.includes("subir copia"))icon="upload";
   else if(/download/.test(id)||label.includes("descargar"))icon="download";
   else if(/restore/.test(id)||label.includes("restaurar"))icon="refresh";
   else if(/media/.test(id)||label.includes("fotos")||label.includes("vídeos"))icon="image";
   else if(/document/.test(id)||label.includes("documentos"))icon="file";
   else if(/reload/.test(id)||label.includes("recargar"))icon="refresh";
   else if(/edit/.test(id)||label.includes("editar"))icon="edit";
   else if(/back/.test(id)||label.includes("volver"))icon="back";
   else if(/cancel/.test(id)||label.includes("cancelar"))icon="back";
   else if(/news/.test(id)||label.includes("información"))icon="newspaper";
   else if(/web-open/.test(id)||label.includes("entrar al sitio"))icon="globe";
   else if(/role-assign/.test(id)||label.includes("rango"))icon="shield-check";
   else if(label.includes("participación")||label.includes("participar"))icon="check";
  }
  if(!icon||!interfaceIconPaths[icon])return;
  let span=button.querySelector(":scope > .nav-icon[data-icon]");
  if(!span){
   span=document.createElement("span");
   span.className=button.classList.contains("tab")?"nav-icon":"ui-icon";
   span.setAttribute("aria-hidden","true");
   button.insertBefore(span,button.firstChild);
  }
  span.innerHTML=iconSvg(icon);
  button.dataset.iconDecorated="true";
 });
}
decorateInterfaceButtons();
const interfaceIconObserver=new MutationObserver(records=>{
 for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)decorateInterfaceButtons(node);
});
interfaceIconObserver.observe(document.body,{childList:true,subtree:true});
