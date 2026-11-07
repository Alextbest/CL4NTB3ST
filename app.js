import { supabase } from "./supabaseClient.js";
import { initClanFeatures } from "./features.js?v=43";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { App } from "@capacitor/app";
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { FilePicker } from "@capawesome/capacitor-file-picker";

const ApkUpdater = registerPlugin("ApkUpdater");

const isNativeApp = Capacitor.isNativePlatform();
const authRedirectUrl = isNativeApp ? "com.clantb3st.app://auth-callback" : window.location.origin;
let passwordRecoveryPending = false;

async function handleNativeAuthUrl(rawUrl) {
  try {
    const callback = new URL(rawUrl);
    const tokens = new URLSearchParams(callback.hash.replace(/^#/, ""));
    if (callback.searchParams.get("type") === "recovery" || tokens.get("type") === "recovery") {
      passwordRecoveryPending = true;
    }
    const code = callback.searchParams.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return;
    }
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
const authGate=$("#auth-gate"), appRoot=$("#app"), sessionMessage=$("#session-message"), accessStep=$("#access-step"), authForm=$("#auth-form"), profileForm=$("#profile-form"), profileSubmit=$("#profile-submit"), passwordRecoveryStep=$("#password-recovery-step"), passwordRecoveryForm=$("#password-recovery-form");
const authTitle=$("#auth-title"), authDescription=$("#auth-description"), authSubmit=$("#auth-submit"), authToggle=$("#auth-mode-toggle"), authForgot=$("#auth-forgot"), signOutButton=$("#app-signout");
let currentProfile=null, role="Miembro", authMode="signin", authBusy=false;
function hideLoadingScreen(){const screen=$("#loading-screen");if(screen)screen.classList.add("is-hidden")}
function animateUiEntrance(element){if(!element)return;element.classList.remove("ui-entering");void element.offsetWidth;element.classList.add("ui-entering");element.addEventListener("animationend",()=>element.classList.remove("ui-entering"),{once:true});setTimeout(()=>element.classList.remove("ui-entering"),360)}
function showAccess(){document.body.classList.remove("authenticated");authGate.classList.remove("hidden");appRoot.classList.add("hidden");accessStep.classList.remove("hidden");profileForm.classList.add("hidden");passwordRecoveryStep.classList.add("hidden");animateUiEntrance(authGate)}
function showRegistration(){document.body.classList.remove("authenticated");authGate.classList.remove("hidden");appRoot.classList.add("hidden");accessStep.classList.add("hidden");profileForm.classList.remove("hidden");passwordRecoveryStep.classList.add("hidden");animateUiEntrance(profileForm)}
function showPasswordRecovery(){document.body.classList.remove("authenticated");authGate.classList.remove("hidden");appRoot.classList.add("hidden");accessStep.classList.add("hidden");profileForm.classList.add("hidden");passwordRecoveryStep.classList.remove("hidden");hideLoadingScreen();sessionMessage.textContent="Escribe y confirma tu nueva contraseña para CL4NTB3ST.";animateUiEntrance(passwordRecoveryStep)}
function showApp(profile,session){document.body.classList.add("authenticated");currentProfile=profile;role=profile.role||"Miembro";authGate.classList.add("hidden");appRoot.classList.remove("hidden");animateUiEntrance(appRoot);$("#signed-in-email").textContent=session?.user?.email||"";render();loadClanRules();loadCloudMembers();loadCloudActivities();subscribeCloudActivities();loadClanSite();subscribeClanSite();initClanFeatures(supabase,profile,role,FilePicker,isNativeApp);initLobbyMusic();subscribeMemberStatus();subscribeClanPresence()}
async function loadProfile(session){if(!session?.user){showAccess();return}const {data,error}=await supabase.from("profiles").select("id,display_name,ff_nick,ff_id,role,membership_status").eq("id",session.user.id).maybeSingle();if(error){showAccess();sessionMessage.textContent="No se pudo comprobar tu perfil: "+error.message;return}if(data&&data.membership_status!=="active"){currentProfile=null;role="Miembro";showAccess();sessionMessage.textContent=data.membership_status==="banned"?"Tu cuenta está vetada y no puede acceder a CL4NTB3ST. Contacta al líder si necesitas solicitar una revisión.":"Tu acceso al clan fue retirado. Contacta al líder si necesitas solicitar tu reincorporación.";await supabase.auth.signOut();return}if(data)showApp(data,session);else showRegistration()}
async function restoreSession(){if(passwordRecoveryPending){showPasswordRecovery();return}const {data,error}=await supabase.auth.getSession();if(error){showAccess();sessionMessage.textContent="No se pudo comprobar la sesión: "+error.message;return}if(data.session)await loadProfile(data.session);else showAccess()}
function passwordChecks(value){return {length:value.length>=8,lower:/[a-z]/.test(value),upper:/[A-Z]/.test(value),number:/[0-9]/.test(value),symbol:/[^A-Za-z0-9\s]/.test(value)}}
function updatePasswordRules(){const input=$("#auth-password"),checks=passwordChecks(input.value);for(const [key,ok] of Object.entries(checks)){const item=$("#pw-"+key);if(item){item.textContent=(ok?"✓ ":"○ ")+({length:"Al menos 8 caracteres",lower:"Una letra minúscula",upper:"Una letra mayúscula",number:"Un número",symbol:"Un símbolo (por ejemplo: !, @, # o $)"}[key]);item.classList.toggle("password-rule-met",ok)}}return Object.values(checks).every(Boolean)}
function updateRecoveryPasswordRules(){const input=$("#recovery-password"),checks=passwordChecks(input.value);for(const [key,ok] of Object.entries(checks)){const item=$("#recovery-pw-"+key);if(item){item.textContent=(ok?"✓ ":"○ ")+({length:"Al menos 8 caracteres",lower:"Una letra minúscula",upper:"Una letra mayúscula",number:"Un número",symbol:"Un símbolo (por ejemplo: !, @, # o $)"}[key]);item.classList.toggle("password-rule-met",ok)}}return Object.values(checks).every(Boolean)}
$("#recovery-password").addEventListener("input",updateRecoveryPasswordRules);
passwordRecoveryForm.onsubmit=async e=>{e.preventDefault();if(authBusy)return;const password=$("#recovery-password").value,confirm=$("#recovery-password-confirm").value;if(!updateRecoveryPasswordRules()){sessionMessage.textContent="La nueva contraseña no cumple todos los requisitos.";return}if(password!==confirm){sessionMessage.textContent="Las contraseñas no coinciden.";return}authBusy=true;$("#password-recovery-submit").disabled=true;sessionMessage.textContent="Actualizando contraseña…";try{const {error}=await supabase.auth.updateUser({password});if(error)throw error;passwordRecoveryPending=false;await supabase.auth.signOut();showAccess();setAuthMode("signin");sessionMessage.textContent="Contraseña actualizada correctamente. Inicia sesión con tu nueva contraseña."}catch(error){sessionMessage.textContent="No se pudo actualizar la contraseña: "+(error.message||"Error desconocido")}finally{authBusy=false;$("#password-recovery-submit").disabled=false}};
$("#password-recovery-cancel").onclick=async()=>{passwordRecoveryPending=false;await supabase.auth.signOut();showAccess();setAuthMode("signin")};
$("#auth-password").addEventListener("input",()=>{if(authMode==="signup")updatePasswordRules()});
function setAuthMode(mode){authMode=mode;const signup=mode==="signup";authTitle.textContent=signup?"Crear cuenta en CL4N TB3ST":"Entrar a CL4N TB3ST";authDescription.textContent=signup?"Regístrate con un correo y una contraseña exclusiva para esta aplicación.":"Inicia sesión con el correo y la contraseña de tu cuenta del clan.";authSubmit.textContent=signup?"Crear cuenta":"Iniciar sesión";authToggle.textContent=signup?"Ya tengo cuenta":"Crear cuenta nueva";$("#auth-password").autocomplete=signup?"new-password":"current-password";$("#auth-password").value="";$("#password-rules").classList.toggle("hidden",!signup);if(signup)updatePasswordRules();authForgot.classList.toggle("hidden",signup);sessionMessage.textContent="";if(accessStep&&!accessStep.classList.contains("hidden"))animateUiEntrance(accessStep)}
authToggle.onclick=()=>setAuthMode(authMode==="signin"?"signup":"signin");
authForm.onsubmit=async e=>{e.preventDefault();if(authBusy)return;const email=$("#auth-email").value.trim().toLowerCase(),password=$("#auth-password").value;if(!email){sessionMessage.textContent="Escribe un correo electrónico válido.";return}if(authMode==="signup"&&!updatePasswordRules()){sessionMessage.textContent="La contraseña no cumple todos los requisitos de seguridad.";$("#auth-password").focus();return}if(authMode==="signin"&&password.length<1){sessionMessage.textContent="Escribe la contraseña de tu cuenta.";return}authBusy=true;authSubmit.disabled=true;sessionMessage.textContent=authMode==="signup"?"Creando tu cuenta…":"Iniciando sesión…";try{if(authMode==="signup"){const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:authRedirectUrl}});if(error)throw error;if(data.session){await loadProfile(data.session)}else{sessionMessage.textContent="Cuenta creada. Revisa tu correo y confirma la dirección antes de iniciar sesión."}}else{const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;if(!data.session)throw new Error("No se recibió una sesión. Confirma tu correo e inténtalo de nuevo.");await loadProfile(data.session)}}catch(error){sessionMessage.textContent="No se pudo completar la operación: "+(error.message||"Error desconocido")}finally{authBusy=false;authSubmit.disabled=false}};
authForgot.onclick=async()=>{const email=$("#auth-email").value.trim().toLowerCase();if(!email){sessionMessage.textContent="Escribe primero el correo de tu cuenta.";return}authForgot.disabled=true;try{const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:authRedirectUrl});if(error)throw error;sessionMessage.textContent="Si el correo está registrado, recibirás instrucciones para restablecer la contraseña."}catch(error){sessionMessage.textContent="No se pudo solicitar el restablecimiento: "+error.message}finally{authForgot.disabled=false}};
if(signOutButton)signOutButton.onclick=async()=>{signOutButton.disabled=true;const {error}=await supabase.auth.signOut();if(error){sessionMessage.textContent="No se pudo cerrar sesión: "+error.message;signOutButton.disabled=false;return}stopLobbyMusic();currentProfile=null;role="Miembro";stopClanPresence();showAccess();setAuthMode("signin");signOutButton.disabled=false};
const ffIdInput=$("#profile-ffid");ffIdInput.addEventListener("input",()=>{ffIdInput.value=ffIdInput.value.replace(/\D/g,"").slice(0,11)});
profileForm.onsubmit=async e=>{e.preventDefault();const ffId=ffIdInput.value.trim();if(!/^[0-9]{1,11}$/.test(ffId)){sessionMessage.textContent="El ID de Free Fire debe contener solo números y tener como máximo 11 dígitos.";ffIdInput.focus();return}const phone=$("#profile-phone").value.trim().replace(/[\s()-]/g,"");const phonePattern=/^\+[1-9][0-9]{7,14}$/;if(!phonePattern.test(phone)){sessionMessage.textContent="Escribe el número con código internacional. Ejemplo: +50761234567.";return}profileSubmit.disabled=true;sessionMessage.textContent="Guardando tus datos…";try{const {data:{session},error:sessionError}=await supabase.auth.getSession();if(sessionError||!session)throw sessionError||new Error("La sesión expiró. Inicia sesión otra vez.");const payload={id:session.user.id,display_name:$("#profile-name").value.trim(),ff_nick:$("#profile-nick").value.trim(),ff_id:ffId,phone_e164:phone};const {data,error}=await supabase.from("profiles").insert(payload).select("id,display_name,ff_nick,ff_id,role").single();if(error)throw error;showApp(data,session)}catch(error){const duplicateFfId=error.code==="23505"&&/profiles_ff_id_unique_idx|ff_id/i.test((error.message||"")+" "+(error.details||""));const duplicatePhone=error.code==="23505"&&/phone_e164/i.test((error.message||"")+" "+(error.details||""));sessionMessage.textContent=duplicateFfId?"Ese ID de Free Fire ya está registrado. No puedes usar el ID de otra cuenta.":duplicatePhone?"Ese número ya está registrado. Usa otro número.":"No se pudo guardar el registro: "+(error.message||"Error desconocido")}finally{profileSubmit.disabled=false}};
supabase.auth.onAuthStateChange((event,session)=>{if(event==="SIGNED_OUT"){stopClanPresence();showAccess();return}if(event==="PASSWORD_RECOVERY"){passwordRecoveryPending=true;showPasswordRecovery();return}if(event==="SIGNED_IN"&&session){if(passwordRecoveryPending)showPasswordRecovery();else loadProfile(session)}});
setAuthMode("signin");
const PATCH_MANIFEST_URL = "https://raw.githubusercontent.com/Alextbest/CL4NTB3ST/feature/android-apk-capacitor/patch-manifest.json";
const PATCH_BUILTIN_VERSION = "ota-315";
const PATCH_RETIRED_THROUGH = 326;
const PATCH_NATIVE_API = 1;
const mandatoryUpdateScreen = $("#mandatory-update-screen");
const mandatoryUpdateVersion = $("#mandatory-update-version");
const mandatoryUpdateNotes = $("#mandatory-update-notes");
const mandatoryUpdateChanges = $("#mandatory-update-changes");
const mandatoryUpdateStatus = $("#mandatory-update-status");
const mandatoryUpdateButton = $("#mandatory-update-button");
let otaPatchManifest = null;
let patchCheckRunning = false;
let otaPatchBusy = false;

function showMandatoryUpdateStatus(message) {
  if (mandatoryUpdateStatus) mandatoryUpdateStatus.textContent = message;
}

function showMandatoryUpdate(manifest) {
  if (!mandatoryUpdateScreen) return;
  mandatoryUpdateScreen.classList.remove("hidden");
  hideLoadingScreen();
  if (mandatoryUpdateVersion) mandatoryUpdateVersion.textContent = "Versión " + manifest.version;
  if (mandatoryUpdateNotes) mandatoryUpdateNotes.textContent =
    typeof manifest.notes === "string" && manifest.notes.trim()
      ? manifest.notes
      : "Esta actualización contiene mejoras y correcciones para CL4N TB3ST.";
  if (mandatoryUpdateChanges) {
    mandatoryUpdateChanges.replaceChildren();
    const changes = Array.isArray(manifest.changes) && manifest.changes.length
      ? manifest.changes
      : ["Mejoras y correcciones de la aplicación."];
    changes.slice(0, 8).forEach(change => {
      const item = document.createElement("li");
      item.textContent = String(change);
      mandatoryUpdateChanges.appendChild(item);
    });
  }
}

async function checkForRemotePatch() {
  if (!isNativeApp || patchCheckRunning) return "skip";
  patchCheckRunning = true;
  if (mandatoryUpdateScreen) mandatoryUpdateScreen.classList.remove("hidden");
  hideLoadingScreen();
  if (mandatoryUpdateButton) {
    mandatoryUpdateButton.disabled = true;
    mandatoryUpdateButton.textContent = "Comprobando…";
  }
  showMandatoryUpdateStatus("Buscando actualizaciones obligatorias…");
  try {
    const response = await fetch(PATCH_MANIFEST_URL, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error("El servidor respondió con HTTP " + response.status + ".");
    const manifest = await response.json();
    if (
      manifest.nativeApi !== PATCH_NATIVE_API ||
      typeof manifest.version !== "string" ||
      !/^ota-[0-9]+$/.test(manifest.version) ||
      typeof manifest.url !== "string" ||
      typeof manifest.checksum !== "string" ||
      !/^[a-f0-9]{64}$/i.test(manifest.checksum)
    ) throw new Error("El manifiesto de actualización no tiene un formato válido.");

    const patchUrl = new URL(manifest.url);
    if (
      patchUrl.protocol !== "https:" ||
      patchUrl.hostname !== "github.com" ||
      !patchUrl.pathname.startsWith("/Alextbest/CL4NTB3ST/releases/download/")
    ) throw new Error("El enlace del parche no es válido.");

    const manifestPatchNumber = Number(manifest.version.slice(4));
    if (manifestPatchNumber <= PATCH_RETIRED_THROUGH) {
      otaPatchManifest = null;
      if (mandatoryUpdateScreen) mandatoryUpdateScreen.classList.add("hidden");
      return "current";
    }

    const current = await CapacitorUpdater.current();
    const installedVersion = current?.bundle?.id === "builtin"
      ? PATCH_BUILTIN_VERSION
      : (current?.bundle?.version || current?.bundle?.id || PATCH_BUILTIN_VERSION);

    if (installedVersion === manifest.version) {
      otaPatchManifest = null;
      if (mandatoryUpdateScreen) mandatoryUpdateScreen.classList.add("hidden");
      return "current";
    }

    otaPatchManifest = manifest;
    showMandatoryUpdate(manifest);
    showMandatoryUpdateStatus("Hay una actualización pendiente. Debes instalarla para entrar a CL4N TB3ST.");
    if (mandatoryUpdateButton) {
      mandatoryUpdateButton.disabled = false;
      mandatoryUpdateButton.textContent = "Descargar e instalar";
    }
    return "available";
  } catch (error) {
    otaPatchManifest = null;
    if (mandatoryUpdateScreen) mandatoryUpdateScreen.classList.add("hidden");
    if (mandatoryUpdateVersion) mandatoryUpdateVersion.textContent = "Comprobación aplazada";
    if (mandatoryUpdateNotes) mandatoryUpdateNotes.textContent = "No se pudo consultar el servidor de parches. Puedes seguir usando la versión instalada y volver a comprobar más tarde.";
    if (mandatoryUpdateChanges) {
      mandatoryUpdateChanges.replaceChildren();
      const item = document.createElement("li");
      item.textContent = "Conecta el teléfono a internet y vuelve a intentarlo.";
      mandatoryUpdateChanges.appendChild(item);
    }
    showMandatoryUpdateStatus("No se pudo comprobar el parche. Se continuará con la versión instalada: " + (error.message || "Error desconocido"));
    if (mandatoryUpdateButton) {
      mandatoryUpdateButton.disabled = false;
      mandatoryUpdateButton.textContent = "Reintentar comprobación";
    }
    console.warn("No se pudo comprobar el parche obligatorio:", error);
    return "current";
  } finally {
    patchCheckRunning = false;
  }
}

const mandatoryUpdateProgressWrap = $("#mandatory-update-progress-wrap");
const mandatoryUpdateProgress = $("#mandatory-update-progress");
const mandatoryUpdateProgressLabel = $("#mandatory-update-progress-label");
const mandatoryUpdateFinishButton = $("#mandatory-update-finish");

function setMandatoryUpdateProgress(percent, label) {
  const value = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  if (mandatoryUpdateProgress) mandatoryUpdateProgress.value = value;
  if (mandatoryUpdateProgress) mandatoryUpdateProgress.setAttribute("aria-valuenow", String(value));
  if (mandatoryUpdateProgressLabel) mandatoryUpdateProgressLabel.textContent = label || (value + "%");
}

async function finishMandatoryUpdate() {
  if (!otaPatchManifest || !mandatoryUpdateFinishButton) return;
  mandatoryUpdateFinishButton.disabled = true;
  mandatoryUpdateFinishButton.textContent = "Abriendo CL4N TB3ST…";
  showMandatoryUpdateStatus("Aplicando el parche y abriendo la aplicación…");
  try {
    await CapacitorUpdater.reload();
  } catch (error) {
    mandatoryUpdateFinishButton.disabled = false;
    mandatoryUpdateFinishButton.textContent = "Finalizar";
    showMandatoryUpdateStatus("No se pudo abrir la nueva versión: " + (error.message || "Error desconocido"));
  }
}

async function downloadRemotePatch() {
  if (otaPatchBusy) return;
  if (!otaPatchManifest) {
    await checkForRemotePatch();
    return;
  }
  otaPatchBusy = true;
  if (mandatoryUpdateProgressWrap) mandatoryUpdateProgressWrap.classList.remove("hidden");
  if (mandatoryUpdateFinishButton) mandatoryUpdateFinishButton.classList.add("hidden");
  setMandatoryUpdateProgress(0, "0%");
  if (mandatoryUpdateButton) {
    mandatoryUpdateButton.disabled = true;
    mandatoryUpdateButton.textContent = "Descargando…";
  }
  let progressListener = null;
  try {
    showMandatoryUpdateStatus("Descargando el parche. El porcentaje refleja la descarga real…");
    progressListener = await CapacitorUpdater.addListener("download", event => {
      const percent = Math.max(0, Math.min(100, Number(event?.percent) || 0));
      setMandatoryUpdateProgress(percent, percent + "%");
      showMandatoryUpdateStatus("Descargando parche… " + percent + "%");
    });
    const downloaded = await CapacitorUpdater.download({
      version: otaPatchManifest.version,
      url: otaPatchManifest.url,
      checksum: otaPatchManifest.checksum
    });
    if (!downloaded?.id) throw new Error("La descarga no devolvió un identificador válido.");
    setMandatoryUpdateProgress(100, "100%");
    showMandatoryUpdateStatus("Descarga verificada. Preparando instalación…");
    if (mandatoryUpdateButton) mandatoryUpdateButton.textContent = "Preparando…";
    await CapacitorUpdater.next({ id: downloaded.id });
    showMandatoryUpdateStatus("¡Parche instalado correctamente! Pulsa Finalizar para entrar a CL4N TB3ST.");
    if (mandatoryUpdateButton) mandatoryUpdateButton.classList.add("hidden");
    if (mandatoryUpdateFinishButton) {
      mandatoryUpdateFinishButton.classList.remove("hidden");
      mandatoryUpdateFinishButton.disabled = false;
      mandatoryUpdateFinishButton.textContent = "Finalizar";
    }
    if (mandatoryUpdateProgressLabel) mandatoryUpdateProgressLabel.textContent = "Instalación lista · 100%";
  } catch (error) {
    showMandatoryUpdateStatus("No se pudo descargar o preparar el parche: " + (error.message || "Error desconocido"));
    console.warn("No se pudo aplicar el parche obligatorio:", error);
    if (mandatoryUpdateButton) {
      mandatoryUpdateButton.classList.remove("hidden");
      mandatoryUpdateButton.disabled = false;
      mandatoryUpdateButton.textContent = "Reintentar descarga";
    }
  } finally {
    if (progressListener?.remove) await progressListener.remove();
    otaPatchBusy = false;
  }
}

if (mandatoryUpdateButton) mandatoryUpdateButton.addEventListener("click", downloadRemotePatch);
if (mandatoryUpdateFinishButton) mandatoryUpdateFinishButton.addEventListener("click", finishMandatoryUpdate);

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
    if (error.message === "No se pudo consultar el servidor de versiones.") {
      showApkUpdateMessage("Todavía no hay una versión APK publicada para actualizar. Puedes seguir usando esta aplicación.");
    }
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

async function startApplication() {
  if (isNativeApp) {
    try {
      await CapacitorUpdater.notifyAppReady();
    } catch (error) {
      console.warn("No se pudo confirmar que la versión instalada está lista:", error);
    }
    const patchState = await checkForRemotePatch();
    if (patchState !== "current") return;
  }
  await restoreSession();
  hideLoadingScreen();
  if (isNativeApp) await checkForApkUpdate();
}
startApplication();
async function refreshSignedInProfile(){
  if(document.hidden)return;
  const {data:{session}}=await supabase.auth.getSession();
  if(session)await loadProfile(session);
}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshSignedInProfile()});
if(isNativeApp)App.addListener("appStateChange",({isActive})=>{if(isActive){refreshSignedInProfile();if(currentProfile)initLobbyMusic()}else stopLobbyMusic()});

let activities=[], editing=null, activityChannels=[];
const isLeader=()=>role==="Líder", canManageMembers=()=>isLeader()||role==="Decano";
function nav(p){const target=document.getElementById("page-"+p);if(!target)return;document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x===target));document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.page===p));window.scrollTo({top:0,behavior:"smooth"})}

// Microinteracciones globales: validación visual, estado de envío y confirmaciones.
(function initUiMicrointeractions(){
  const markField=field=>{if(!(field instanceof HTMLInputElement||field instanceof HTMLTextAreaElement||field instanceof HTMLSelectElement))return;if(field.type==="hidden"||field.disabled)return;const hasValue=String(field.value||"").trim().length>0;field.classList.toggle("field-valid",hasValue&&field.checkValidity());field.classList.toggle("field-invalid",hasValue&&!field.checkValidity())};
  document.addEventListener("input",event=>{const field=event.target;if(field?.matches?.("input,textarea,select")){field.classList.remove("field-invalid");markField(field)} });
  document.addEventListener("change",event=>markField(event.target));
  document.addEventListener("focusout",event=>{const field=event.target;if(field?.matches?.("input,textarea,select"))markField(field)});
  document.addEventListener("submit",event=>{const form=event.target;if(!(form instanceof HTMLFormElement)||!event.defaultPrevented)return;const button=event.submitter||form.querySelector('button[type="submit"],input[type="submit"]');if(!button)return;button.classList.add("is-submitting");button.setAttribute("aria-busy","true");const finish=()=>{button.classList.remove("is-submitting");button.removeAttribute("aria-busy")};if(button.disabled){const observer=new MutationObserver(()=>{if(!button.disabled){observer.disconnect();finish()}});observer.observe(button,{attributes:true,attributeFilter:["disabled"]});setTimeout(()=>{observer.disconnect();finish()},30000)}else setTimeout(finish,850);},{capture:false});
  document.querySelectorAll('[aria-live="polite"]').forEach(node=>{const observer=new MutationObserver(()=>{node.classList.remove("status-updated");void node.offsetWidth;node.classList.add("status-updated")});observer.observe(node,{childList:true,characterData:true,subtree:true})});
})();
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
let memberStatusChannel=null;
let clanPresenceChannel=null;
let onlineClanMembers=new Set();
let presenceLifecycleBound=false;
function updateConnectionBadges(){
 document.querySelectorAll("[data-connection-user]").forEach(node=>{
  const online=onlineClanMembers.has(node.dataset.connectionUser);
  node.textContent=online?"En línea":"Desconectado";
  node.classList.toggle("online",online);
  node.classList.toggle("offline",!online);
 });
}
async function setClanPresenceActive(active){
 if(!clanPresenceChannel||!currentProfile)return;
 try{
  if(active&&document.visibilityState==="visible"){
   await clanPresenceChannel.track({user_id:currentProfile.id,connected_at:new Date().toISOString()});
  }else{await clanPresenceChannel.untrack();}
 }catch(error){console.warn("No se pudo actualizar la presencia en línea:",error)}
}
function subscribeClanPresence(){
 if(clanPresenceChannel)supabase.removeChannel(clanPresenceChannel);
 if(!currentProfile)return;
 const memberId=currentProfile.id;
 clanPresenceChannel=supabase.channel("clan-online-presence");
 clanPresenceChannel.on("presence",{event:"sync"},()=>{
  const state=clanPresenceChannel.presenceState();
  onlineClanMembers=new Set(Object.values(state).flat().map(presence=>presence.user_id).filter(Boolean));
  updateConnectionBadges();
  document.dispatchEvent(new CustomEvent("clan-presence-updated"));
 });
 if(!presenceLifecycleBound){
  document.addEventListener("visibilitychange",()=>setClanPresenceActive(document.visibilityState==="visible"));
  document.addEventListener("clan-presence-updated",updateConnectionBadges);
  App.addListener("appStateChange",({isActive})=>setClanPresenceActive(Boolean(isActive)));
  presenceLifecycleBound=true;
 }
 clanPresenceChannel.subscribe(async status=>{if(status==="SUBSCRIBED")await setClanPresenceActive(document.visibilityState==="visible")});
}
function stopClanPresence(){
 if(clanPresenceChannel)supabase.removeChannel(clanPresenceChannel);
 clanPresenceChannel=null;onlineClanMembers=new Set();updateConnectionBadges();
}
function subscribeMemberStatus(){
 if(memberStatusChannel)supabase.removeChannel(memberStatusChannel);
 if(!currentProfile)return;
 const memberId=currentProfile.id;
 memberStatusChannel=supabase.channel("member-status-"+memberId)
  .on("postgres_changes",{event:"UPDATE",schema:"public",table:"profiles",filter:"id=eq."+memberId},async()=>{
   const {data:{session}}=await supabase.auth.getSession();
   if(session)await loadProfile(session);
  }).subscribe();
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

let cloudWebUrl = "";
let webFrameOpen = false;
let clanSiteChannel = null;
let cloudWebLoading = false;
const webForm=$("#web-link-form"), webInput=$("#web-link-input"), webFrame=$("#web-frame"), webEmpty=$("#web-empty"), webOpen=$("#web-open"), webReload=$("#web-reload"), webClear=$("#web-clear");
function validWebUrl(value){try{const u=new URL(value);return u.protocol==="https:"?u.href:null}catch{return null}}
function renderWeb(){
  const url=validWebUrl(cloudWebUrl);
  if(webInput && isLeader() && document.activeElement!==webInput) webInput.value=cloudWebUrl;
  if(webForm) webForm.classList.toggle("hidden",!isLeader());
  webOpen.classList.toggle("hidden",webFrameOpen || !url);
  webEmpty.classList.toggle("hidden",!!url);
  if(webEmpty) webEmpty.textContent="El líder todavía no ha configurado un sitio web.";
  if($("#web-view-title")) $("#web-view-title").textContent="Sitio privado del clan";
}
async function loadClanSite(){
  if(cloudWebLoading)return;
  cloudWebLoading=true;
  try{
    const {data,error}=await supabase.from("clan_site_settings").select("site_url").eq("id",1).maybeSingle();
    if(error)throw error;
    const nextUrl=validWebUrl(data?.site_url||"")||"";
    if(nextUrl!==cloudWebUrl){
      cloudWebUrl=nextUrl;
      webFrameOpen=false;
      if(webFrame){webFrame.removeAttribute("src");webFrame.classList.add("hidden")}
      if(webReload)webReload.classList.add("hidden");
      if(webOpen)webOpen.classList.remove("hidden");
      renderWeb();
    }else if(webInput && isLeader() && document.activeElement!==webInput){webInput.value=cloudWebUrl}
  }catch(error){
    console.warn("No se pudo cargar el sitio compartido:",error);
    if(webEmpty){webEmpty.classList.remove("hidden");webEmpty.textContent="No se pudo cargar el sitio compartido. Comprueba tu conexión e inténtalo de nuevo."}
  }finally{cloudWebLoading=false}
}
function subscribeClanSite(){
  if(clanSiteChannel)return;
  clanSiteChannel=supabase.channel("clan-site-settings-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"clan_site_settings"},()=>loadClanSite())
    .subscribe(status=>{if(status==="SUBSCRIBED")loadClanSite()});
}
if(webForm)webForm.onsubmit=async e=>{
  e.preventDefault();
  if(!isLeader())return;
  const url=validWebUrl(webInput.value.trim());
  if(!url){alert("Introduce un enlace HTTPS válido.");return}
  const submit=webForm.querySelector('button[type="submit"]');
  if(submit){submit.disabled=true;submit.textContent="Guardando…"}
  try{
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user)throw userError||new Error("Tu sesión expiró. Inicia sesión otra vez.");
    const {error}=await supabase.from("clan_site_settings").upsert({id:1,site_url:url,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:"id"});
    if(error)throw error;
    await loadClanSite();
    alert("Sitio web guardado y compartido con todo el clan.");
  }catch(error){alert("No se pudo guardar el sitio: "+(error.message||"Error desconocido"))}
  finally{if(submit){submit.disabled=false;submit.textContent="Guardar enlace"}}
};
if(webOpen)webOpen.onclick=()=>{
  const url=validWebUrl(cloudWebUrl);
  if(!url)return;
  webFrameOpen=true;webFrame.src=url;webFrame.classList.remove("hidden");webOpen.classList.add("hidden");webReload.classList.remove("hidden")
};
if(webOpen){["contextmenu","selectstart","dragstart"].forEach(type=>webOpen.addEventListener(type,e=>e.preventDefault()))}
if(webReload)webReload.onclick=()=>{if(webFrame.src)webFrame.src=webFrame.src};
if(webClear)webClear.onclick=async()=>{
  if(!isLeader())return;
  if(!cloudWebUrl){if(webInput)webInput.value="";return}
  if(!confirm("¿Eliminar el sitio web para TODOS los integrantes del clan?"))return;
  webClear.disabled=true;webClear.textContent="Eliminando…";
  try{
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user)throw userError||new Error("Tu sesión expiró. Inicia sesión otra vez.");
    const {error}=await supabase.from("clan_site_settings").upsert({id:1,site_url:null,updated_by:user.id,updated_at:new Date().toISOString()},{onConflict:"id"});
    if(error)throw error;
    await loadClanSite();
    if(webInput)webInput.value="";
    alert("Sitio eliminado. El apartado quedó vacío para todos los integrantes.");
  }catch(error){alert("No se pudo eliminar el sitio: "+(error.message||"Error desconocido"))}
  finally{webClear.disabled=false;webClear.textContent="Limpiar / eliminar sitio"}
};


const roleAssignForm=$("#role-assign-form");
const roleAssignStatus=$("#role-assign-status");
let memberBadgesByUser=new Map();
function memberBadgeMarkup(userId){
 const badges=memberBadgesByUser.get(userId)||[];
 if(!badges.length)return "";
 return '<span class="member-name-badges" aria-label="Insignias">'+badges.map(b=>'<span class="member-name-badge rarity-'+esc(b.rarity||"common")+'" title="'+esc(b.name||"Insignia")+'" aria-label="'+esc(b.name||"Insignia")+'">'+esc(b.icon||"🏅")+'</span>').join("")+'</span>';
}
async function loadCloudMembers(){
  const [{data,error},{data:earned,error:badgeError}]=await Promise.all([
   supabase.from("profiles").select("id,display_name,ff_nick,ff_id,role,membership_status,created_at").order("created_at",{ascending:true}),
   supabase.from("member_badges").select("user_id,clan_badges(name,icon,rarity)")
  ]);
  if(error){if(roleAssignStatus)roleAssignStatus.textContent="No se pudieron cargar las cuentas: "+error.message;return}
  if(!badgeError){
   memberBadgesByUser=new Map();
   (earned||[]).forEach(row=>{if(!row.clan_badges)return;const list=memberBadgesByUser.get(row.user_id)||[];list.push(row.clan_badges);memberBadgesByUser.set(row.user_id,list)});
  }
  cloudMembers=data||[];
  render();
}
window.addEventListener("clan-badges-updated",()=>{loadCloudMembers()});
const membersStatus=$("#members-status");
$("#member-list").onclick=async e=>{
  const actionButton=e.target.closest("[data-member-action]");
  if(actionButton){
    if(!isLeader())return;
    const target=cloudMembers.find(m=>m.id===actionButton.dataset.memberId);
    const action=actionButton.dataset.memberAction;
    if(!target||target.role==="Líder"||!["remove","ban","restore"].includes(action))return;
    const prompts={
      remove:"¿Expulsar a "+target.display_name+" del clan? Su cuenta seguirá existiendo, pero perderá el acceso a CL4NTB3ST.",
      ban:"¿VETAR a "+target.display_name+"? Se bloqueará su acceso al clan y también el inicio de sesión en esta aplicación.",
      restore:"¿Restaurar el acceso de "+target.display_name+" a CL4NTB3ST?"
    };
    if(!confirm(prompts[action]))return;
    actionButton.disabled=true;
    if(membersStatus)membersStatus.textContent="Aplicando la medida de administración…";
    try{
      const {data,error}=await supabase.functions.invoke("manage-clan-member",{body:{target_user_id:target.id,action}});
      if(error)throw error;
      if(!data?.ok)throw new Error(data?.error||"No se pudo completar la acción.");
      if(membersStatus)membersStatus.textContent=action==="remove"?target.display_name+" fue expulsado del clan.":action==="ban"?target.display_name+" quedó vetado.":target.display_name+" recuperó el acceso.";
      await loadCloudMembers();
    }catch(error){if(membersStatus)membersStatus.textContent=error.message||"No se pudo administrar la cuenta."}
    finally{actionButton.disabled=false}
    return;
  }
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


let legacyActivityMigrationDone=false;
async function migrateLegacyActivities(){
 if(legacyActivityMigrationDone||!currentProfile||!isLeader())return;
 const raw=localStorage.getItem("tb3st-activities");
 if(!raw){legacyActivityMigrationDone=true;return}
 let legacy=[];
 try{legacy=JSON.parse(raw)}catch(error){console.warn("Se conserva la lista local de actividades porque no se pudo leer:",error);return}
 if(!Array.isArray(legacy)||!legacy.length){localStorage.removeItem("tb3st-activities");legacyActivityMigrationDone=true;return}
 const existing=await supabase.from("activities").select("id,title,starts_at");
 if(existing.error)throw existing.error;
 const known=existing.data||[];
 const invalid=[];
 for(const old of legacy){
  if(!old?.name||!old?.date){invalid.push(old);continue}
  const startsAt=new Date(old.date);
  if(Number.isNaN(startsAt.getTime())){invalid.push(old);continue}
  const title=String(old.name).slice(0,60), iso=startsAt.toISOString();
  let match=known.find(item=>item.title===title&&new Date(item.starts_at).getTime()===startsAt.getTime());
  let activityId=match?.id;
  if(!activityId){
   const created=await supabase.from("activities").insert({title,starts_at:iso,description:String(old.desc||""),rules:String(old.rules||""),created_by:currentProfile.id}).select("id").single();
   if(created.error)throw created.error;
   activityId=created.data.id;
   known.push({id:activityId,title,starts_at:iso});
  }
  if(old.pollQuestion&&Array.isArray(old.options)&&old.options.filter(x=>typeof x==="string"&&x.trim()).length>=2){
   const existingPoll=await supabase.from("activity_polls").select("id").eq("activity_id",activityId).maybeSingle();
   if(existingPoll.error)throw existingPoll.error;
   if(!existingPoll.data){
    const poll=await supabase.from("activity_polls").insert({activity_id:activityId,question:String(old.pollQuestion).slice(0,100)}).select("id").single();
    if(poll.error)throw poll.error;
    const labels=old.options.filter(x=>typeof x==="string"&&x.trim()).slice(0,6);
    const opts=await supabase.from("activity_poll_options").insert(labels.map((label,index)=>({poll_id:poll.data.id,label:label.slice(0,50),position:index})));
    if(opts.error)throw opts.error;
   }
  }
 }
 if(invalid.length)localStorage.setItem("tb3st-activities",JSON.stringify(invalid));
 else localStorage.removeItem("tb3st-activities");
 legacyActivityMigrationDone=true;
}

async function loadCloudActivities(){
 if(!currentProfile)return;
 await migrateLegacyActivities();
 const results=await Promise.all([
  supabase.from("activities").select("id,title,starts_at,description,rules").order("starts_at",{ascending:true}),
  supabase.from("activity_participants").select("activity_id,user_id,attending"),
  supabase.from("activity_polls").select("id,activity_id,question"),
  supabase.from("activity_poll_options").select("id,poll_id,label,position").order("position"),
  supabase.from("activity_poll_votes").select("poll_id,option_id,user_id")
 ]);
 const failed=results.find(x=>x.error);
 if(failed){$("#activities-list").innerHTML='<div class="panel muted">No se pudieron sincronizar las actividades: '+esc(failed.error.message)+'</div>';return}
 const rows=results[0].data||[], participants=results[1].data||[], polls=results[2].data||[], options=results[3].data||[], votes=results[4].data||[];
 activities=rows.map(row=>{
  const poll=polls.find(x=>x.activity_id===row.id), pollOptions=poll?options.filter(x=>x.poll_id===poll.id):[], partMap={}, voteMap={};
  participants.filter(x=>x.activity_id===row.id).forEach(x=>partMap[x.user_id]=x.attending);
  if(poll)votes.filter(x=>x.poll_id===poll.id).forEach(x=>voteMap[x.user_id]=x.option_id);
  return {id:row.id,name:row.title,date:row.starts_at,desc:row.description,rules:row.rules,pollId:poll?.id||null,pollQuestion:poll?.question||"",options:pollOptions.map(x=>({id:x.id,label:x.label})),participants:partMap,votes:voteMap};
 });
 render();
}
function subscribeCloudActivities(){
 activityChannels.forEach(ch=>supabase.removeChannel(ch));activityChannels=[];
 ["activities","activity_participants","activity_polls","activity_poll_options","activity_poll_votes"].forEach(table=>{
  activityChannels.push(supabase.channel("clan-"+table+"-"+currentProfile.id).on("postgres_changes",{event:"*",schema:"public",table},()=>loadCloudActivities()).subscribe());
 });
}
async function saveCloudActivity(item){
 const payload={title:item.name,starts_at:new Date(item.date).toISOString(),description:item.desc||"",rules:item.rules||""};
 let id=editing;
 if(id){
  const result=await supabase.from("activities").update({...payload,updated_at:new Date().toISOString()}).eq("id",id);
  if(result.error)throw result.error;
  const removed=await supabase.from("activity_polls").delete().eq("activity_id",id);
  if(removed.error)throw removed.error;
 }else{
  const result=await supabase.from("activities").insert({...payload,created_by:currentProfile.id}).select("id").single();
  if(result.error)throw result.error;id=result.data.id;
 }
 if(item.pollQuestion&&item.options.length>=2){
  const poll=await supabase.from("activity_polls").insert({activity_id:id,question:item.pollQuestion}).select("id").single();
  if(poll.error)throw poll.error;
  const inserted=await supabase.from("activity_poll_options").insert(item.options.map((label,index)=>({poll_id:poll.data.id,label,position:index})));
  if(inserted.error)throw inserted.error;
 }
 editing=null;resetActivityForm();await loadCloudActivities();
}
$("#add-poll-option").onclick=()=>{const n=document.querySelectorAll(".poll-option").length;if(n<6){const input=document.createElement("input");input.className="poll-option";input.maxLength=50;input.placeholder="Opción "+(n+1);$("#poll-options").append(input)}};
$("#activity-form").onsubmit=async e=>{
 e.preventDefault();if(!isLeader())return;
 const options=[...document.querySelectorAll(".poll-option")].map(x=>x.value.trim()).filter(Boolean);
 const item={name:$("#activity-name").value.trim(),date:$("#activity-date").value,desc:$("#activity-desc").value.trim(),rules:$("#activity-rules").value.trim(),pollQuestion:$("#poll-question").value.trim(),options:options.length>=2?options:[]};
 const button=$("#activity-submit");button.disabled=true;button.textContent="Guardando en la nube…";
 try{await saveCloudActivity(item)}catch(error){alert("No se pudo guardar la actividad: "+(error.message||"Error desconocido"))}
 finally{button.disabled=false;button.textContent=editing?"Guardar cambios":"Publicar actividad"}
};
function resetActivityForm(){editing=null;$("#activity-form").reset();$("#activity-form-title").textContent="Crear actividad";$("#activity-submit").textContent="Publicar actividad";$("#cancel-edit").classList.add("hidden")}
$("#cancel-edit").onclick=resetActivityForm;
$("#activities-list").onclick=async e=>{
 const action=e.target.closest("[data-action]"), voteButton=e.target.closest("[data-vote]"), card=e.target.closest("[data-id]");
 if(!card)return;const activity=activities.find(x=>x.id===card.dataset.id);if(!activity)return;
 try{
  if(action?.dataset.action==="edit"&&isLeader()){
   editing=activity.id;$("#activity-name").value=activity.name;$("#activity-date").value=new Date(activity.date).toISOString().slice(0,16);$("#activity-desc").value=activity.desc;$("#activity-rules").value=activity.rules;$("#poll-question").value=activity.pollQuestion||"";
   $("#poll-options").innerHTML=(activity.options.length?activity.options.map(x=>x.label):["",""]).map((label,index)=>'<input class="poll-option" maxlength="50" placeholder="Opción '+(index+1)+'" value="'+esc(label)+'">').join("");
   $("#activity-form-title").textContent="Editar actividad";$("#activity-submit").textContent="Guardar cambios";$("#cancel-edit").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});return;
  }
  if(action?.dataset.action==="delete"&&isLeader()&&confirm("¿Eliminar esta actividad para todos?")){
   const result=await supabase.from("activities").delete().eq("id",activity.id);if(result.error)throw result.error;await loadCloudActivities();return;
  }
  if(action?.dataset.action==="join"||action?.dataset.action==="leave"){
   const attending=action.dataset.action==="join";
   if(!attending&&Date.now()>=new Date(activity.date).getTime()-3600000){alert("Ya no puedes cancelar: el límite es una hora antes.");return}
   const result=await supabase.from("activity_participants").upsert({activity_id:activity.id,user_id:currentProfile.id,attending,updated_at:new Date().toISOString()},{onConflict:"activity_id,user_id"});
   if(result.error)throw result.error;await loadCloudActivities();return;
  }
  if(voteButton){
   const result=await supabase.from("activity_poll_votes").upsert({poll_id:activity.pollId,option_id:voteButton.dataset.vote,user_id:currentProfile.id},{onConflict:"poll_id,user_id"});
   if(result.error)throw result.error;await loadCloudActivities();return;
  }
 }catch(error){alert("No se pudo sincronizar el cambio: "+(error.message||"Error desconocido"))}
};
function render(){renderWeb();renderRules();const activeMembers=cloudMembers.filter(m=>(m.membership_status||"active")==="active").length;$("#member-count").textContent=activeMembers;$("#clan-member-count").textContent=activeMembers;$("#member-pill").textContent=activeMembers+" integrantes activos";$("#activity-count").textContent=activities.length;const active=activities.reduce((n,a)=>n+Object.values(a.participants||{}).filter(Boolean).length,0);$("#attendance-count").textContent=cloudMembers.length?Math.round(active/cloudMembers.length*100)+"%":"0%";if(roleAssignForm)roleAssignForm.classList.toggle("hidden",!isLeader());$("#member-list").innerHTML=cloudMembers.map(m=>{
 const status=m.membership_status||"active";
 const statusLabel=status==="banned"?"VETADO":status==="removed"?"EXPULSADO":"ACTIVO";
 const statusClass=status==="banned"?"banned":status==="removed"?"removed":"active";
 const edit=canManageMembers()&&m.role==="Miembro"?`<button class="secondary-btn" data-edit-profile="${esc(m.id)}" type="button">Editar</button>`:"";
 let moderation="";
 if(isLeader()&&m.role!=="Líder"){
  if(status==="active")moderation=`<button class="secondary-btn" data-member-action="remove" data-member-id="${esc(m.id)}" type="button">Expulsar</button><button class="danger-btn" data-member-action="ban" data-member-id="${esc(m.id)}" type="button">Banear</button>`;
  else moderation=`<button class="secondary-btn" data-member-action="restore" data-member-id="${esc(m.id)}" type="button">${status==="banned"?"Quitar veto":"Reintegrar"}</button>`;
 }
 return `<div class="member-row"><div class="avatar">${esc((m.display_name||"?").slice(0,1).toUpperCase())}</div><div class="member-info"><b class="member-name-line">${esc(m.display_name)}${m.ff_id?'<span class="member-ff-id">#'+esc(m.ff_id)+'</span>':''}${memberBadgeMarkup(m.id)}</b><small>${esc(m.role)} · ${esc(m.ff_nick||"Sin nick")} · <span class="member-status ${statusClass}">${statusLabel}</span></small><small class="connection-status ${onlineClanMembers.has(m.id)?"online":"offline"}" data-connection-user="${esc(m.id)}">${onlineClanMembers.has(m.id)?"En línea":"Desconectado"}</small></div><div class="member-actions">${edit}${moderation}</div></div>`;
}).join("")||'<p class="muted">Todavía no hay cuentas registradas.</p>';$("#activity-form").classList.toggle("hidden",!isLeader());$("#activity-pill").textContent=activities.length+" actividades";$("#recent-activity").textContent=activities[0]?activities[0].name:"Todavía no hay actividades.";
$("#activities-list").innerHTML=activities.map(a=>{
 const start=new Date(a.date),locked=Date.now()>=start.getTime()-3600000,going=!!a.participants?.[currentProfile?.id],voted=a.votes?.[currentProfile?.id];
 const displayNames=ids=>ids.map(id=>{const member=cloudMembers.find(m=>m.id===id);return member?esc(member.display_name)+memberBadgeMarkup(id):"Integrante"}).join(", ")||"Nadie todavía";
 const yes=Object.entries(a.participants||{}).filter(x=>x[1]).map(x=>x[0]),no=Object.entries(a.participants||{}).filter(x=>x[1]===false).map(x=>x[0]);
 return '<article class="panel activity-card" data-id="'+a.id+'"><div class="panel-title"><h3>'+esc(a.name)+'</h3><span class="tag">'+(isNaN(start)?"Fecha pendiente":start.toLocaleString("es-PA",{dateStyle:"medium",timeStyle:"short"}))+'</span></div><p>'+esc(a.desc||"Sin descripción.")+'</p>'+(a.rules?'<div class="activity-rules"><b>Reglas</b><p>'+esc(a.rules)+'</p></div>':"")+'<div class="attendance-actions"><button class="'+(going?"secondary-btn":"primary-btn")+'" data-action="'+(going?"leave":"join")+'" '+(!going&&locked?"disabled":"")+'>'+(going?"Cancelar participación":"Voy a participar")+'</button><span class="muted">'+(locked?"Cancelación cerrada (límite: 1 hora antes)":"Puedes cancelar hasta una hora antes")+'</span></div><div class="participant-grid"><div><b>Participan ('+yes.length+')</b><small>'+displayNames(yes)+'</small></div><div><b>No participan ('+no.length+')</b><small>'+displayNames(no)+'</small></div></div>'+(a.pollQuestion&&a.options.length?'<div class="poll"><b>Encuesta: '+esc(a.pollQuestion)+'</b>'+a.options.map(o=>'<button class="poll-choice '+(voted===o.id?"chosen":"")+'" data-vote="'+o.id+'">'+esc(o.label)+' <small>'+Object.values(a.votes||{}).filter(v=>v===o.id).length+' votos</small></button>').join("")+'<small>Tu voto: '+(voted?esc(a.options.find(o=>o.id===voted)?.label||"Voto registrado"):"Sin votar")+'</small></div>':"")+(isLeader()?'<div class="inline-actions"><button class="secondary-btn" data-action="edit">Editar</button><button class="danger-btn" data-action="delete">Eliminar</button></div>':"")+'</article>';
}).join("")||'<div class="panel muted">Todavía no hay actividades publicadas.</div>'}
render();


const lobbyAudio=$("#lobby-audio"),musicToggle=$("#music-toggle");
let musicFadeTimer=null;
function stopLobbyMusic(){if(musicFadeTimer)clearInterval(musicFadeTimer);musicFadeTimer=null;if(lobbyAudio){lobbyAudio.pause();lobbyAudio.currentTime=0;lobbyAudio.volume=0}}
async function playLobbyMusic(){
 if(!lobbyAudio||!currentProfile)return;
 if(musicFadeTimer)clearInterval(musicFadeTimer);lobbyAudio.loop=true;lobbyAudio.volume=0;
 try{await lobbyAudio.play();let volume=0;musicFadeTimer=setInterval(()=>{volume=Math.min(.55,volume+.025);lobbyAudio.volume=volume;if(volume>=.55){clearInterval(musicFadeTimer);musicFadeTimer=null}},180);musicToggle.textContent="Silenciar música";musicToggle.dataset.muted="false";musicToggle.setAttribute("aria-pressed","false")}
 catch(error){musicToggle.textContent="Activar música"}
}
async function initLobbyMusic(){
 if(!lobbyAudio||!currentProfile)return;
 const result=await supabase.from("member_preferences").select("music_muted").eq("user_id",currentProfile.id).maybeSingle();
 const muted=result.error?false:!!result.data?.music_muted;
 musicToggle.dataset.muted=String(muted);musicToggle.textContent=muted?"Activar música":"Silenciar música";musicToggle.setAttribute("aria-pressed",String(muted));
 if(!muted)await playLobbyMusic();else stopLobbyMusic();
}
if(musicToggle)musicToggle.onclick=async()=>{
 if(!currentProfile)return;const muted=musicToggle.dataset.muted!=="true";musicToggle.disabled=true;
 try{
  const result=await supabase.from("member_preferences").upsert({user_id:currentProfile.id,music_muted:muted,updated_at:new Date().toISOString()},{onConflict:"user_id"});
  if(result.error)throw result.error;
  if(muted){stopLobbyMusic();musicToggle.textContent="Activar música";musicToggle.dataset.muted="true";musicToggle.setAttribute("aria-pressed","true")}else await playLobbyMusic();
 }catch(error){alert("No se pudo guardar tu preferencia: "+(error.message||"Error desconocido"))}
 finally{musicToggle.disabled=false}
};

// Iconografía coherente para acciones y controles de toda la interfaz.
const interfaceIconPaths = {
 home:'<path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
 trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/>',
 gift:'<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13h18M12 9H7.5a2.5 2.5 0 1 1 2.5-2.5V9Zm0 0h4.5a2.5 2.5 0 1 0-2.5-2.5V9Z"/>',
 newspaper:'<path d="M4 4h16v17H4z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
 swords:'<path d="m14.5 5.5 4-4 4 4-4 4M5.5 14.5l-4 4 4 4 4-4M14 10 4 20M10 14 20 4"/>',
 chart:'<path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-7"/>',
 award:'<circle cx="12" cy="8" r="6"/><path d="m8.2 13-1.2 9 5-3 5 3-1.2-9"/>',
 message:'<path d="M21 11.5a8.5 8.5 0 0 1-9 8.5 9.5 9.5 0 0 1-4-.9L3 21l1.9-4.4A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 11h8M8 15h5"/>',
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
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+path+'</svg>';
}
function decorateInterfaceButtons(root=document){
 const candidates=[];
 if(root.matches?.("button"))candidates.push(root);
 candidates.push(...root.querySelectorAll("button"));
 const pageIcons={home:"home",members:"users",activities:"calendar",presence:"users",missions:"swords",gold:"gift",rewards:"gift",notifications:"message",ranking:"chart",badges:"award",social:"message",news:"newspaper",web:"globe",rules:"shield-check"};
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
  let span=button.querySelector(":scope > .nav-icon");
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
