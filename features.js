const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateText = (v) => v ? new Date(v).toLocaleString("es-PA",{dateStyle:"medium",timeStyle:"short"}) : "—";
let featureUserId = null;
let featureChannels = [];
let featureContext = null;

export function initClanFeatures(supabase, profile, role, FilePicker, isNativeApp = false) {
  featureContext = { supabase, profile, role };
  if (featureUserId !== profile.id) {
    featureChannels.forEach(ch => supabase.removeChannel(ch));
    featureChannels = [];
    featureUserId = profile.id;
  }
  const isLeader = () => featureContext?.role === "Líder";
  const isModerator = () => ["Líder","Decano"].includes(featureContext?.role);
  const userId = () => featureContext.profile.id;
  let memberBadgesByUser = new Map();
  async function loadMemberBadgeMap(){
    const {data,error}=await supabase.from("member_badges").select("user_id,clan_badges(name,icon,rarity)");
    if(error)throw error;
    const next=new Map();
    (data||[]).forEach(row=>{
      if(!row.clan_badges)return;
      const list=next.get(row.user_id)||[];
      list.push(row.clan_badges);
      next.set(row.user_id,list);
    });
    memberBadgesByUser=next;
  }
  const memberBadgeMarkup = id => {
    const badges=memberBadgesByUser.get(id)||[];
    return badges.length?'<span class="member-name-badges" aria-label="Insignias">'+badges.map(b=>'<span class="member-name-badge rarity-'+esc(b.rarity||"common")+'" title="'+esc(b.name||"Insignia")+'" aria-label="'+esc(b.name||"Insignia")+'">'+esc(b.icon||"🏅")+'</span>').join("")+'</span>':"";
  };


  const presenceForm = $("#presence-form");
  if (presenceForm) {
    supabase.from("member_presence").select("status,message,gameplay_role").eq("user_id",userId()).maybeSingle().then(({data,error})=>{
      if(!error&&data){presenceForm.elements.status.value=data.status;presenceForm.elements.message.value=data.message||"";presenceForm.elements.gameplay_role.value=data.gameplay_role||"";}
    });
    presenceForm.onsubmit = async e => {
      e.preventDefault();
      const status = presenceForm.elements.status.value;
      const message = presenceForm.elements.message.value.trim();
      const gameplay_role = presenceForm.elements.gameplay_role.value || null;
      const button = presenceForm.querySelector('button[type="submit"]');
      button.disabled = true;
      $("#presence-status-message").textContent = "Actualizando tu presencia…";
      try {
        const { error } = await supabase.from("member_presence").upsert({
          user_id:userId(), status, message, gameplay_role, updated_at:new Date().toISOString()
        }, { onConflict:"user_id" });
        if (error) throw error;
        $("#presence-status-message").textContent = "Tu estado ya está actualizado.";
        await loadPresence();
      } catch (err) {
        $("#presence-status-message").textContent = "No se pudo actualizar: " + (err.message || "error");
      } finally { button.disabled = false; }
    };
  }

  async function loadPresence() {
    const host = $("#presence-list");
    if (!host) return;
    try { await loadMemberBadgeMap(); } catch(error) { host.innerHTML='<p class="muted">No se pudieron cargar las insignias: '+esc(error.message)+'</p>'; return; }
    const { data, error } = await supabase.from("member_presence")
      .select("user_id,status,message,gameplay_role,updated_at,profiles(display_name,ff_nick,role)")
      .order("updated_at",{ascending:false});
    if (error) { host.innerHTML = '<p class="muted">No se pudo cargar la presencia: '+esc(error.message)+'</p>'; return; }
    const rows = data || [];
    host.innerHTML = rows.map(row => {
      const labels = {available:"Disponible",do_not_disturb:"No molestar",invite_me:"Inviten"};
      return `<article class="feature-row"><span class="presence-indicator ${esc(row.status)}"></span><div class="feature-row-main"><b class="member-name-line">${esc(row.profiles?.display_name || "Integrante")}${memberBadgeMarkup(row.user_id)}</b><small>${esc(row.profiles?.ff_nick || "Sin nick")} · ${esc(row.profiles?.role || "Miembro")}</small><small class="gameplay-role-label">${esc(row.gameplay_role || "Rol de jugabilidad sin seleccionar")}</small><small class="connection-status offline" data-connection-user="${esc(row.user_id)}">Desconectado</small><p><b class="presence-label status-${esc(row.status)}">${labels[row.status] || "Disponible"}</b>${row.message ? " · "+esc(row.message):""}</p></div><small class="muted">${dateText(row.updated_at)}</small></article>`;
    }).join("") || '<p class="muted">Todavía no hay estados publicados. Actualiza el tuyo.</p>';
    document.dispatchEvent(new CustomEvent("clan-presence-updated"));
  }

  const missionForm = $("#mission-create-form");
  if (missionForm) {
    missionForm.classList.toggle("hidden", !isLeader());
    missionForm.onsubmit = async e => {
      e.preventDefault();
      if (!isLeader()) return;
      const button = missionForm.querySelector('button[type="submit"]');
      button.disabled = true;
      $("#mission-create-status").textContent = "Publicando misión…";
      try {
        const { error } = await supabase.from("clan_missions").insert({
          title:missionForm.elements.title.value.trim(),
          description:missionForm.elements.description.value.trim(),
          instructions:missionForm.elements.instructions.value.trim(),
          reward_type:missionForm.elements.reward_type.value,
          gold_reward:missionForm.elements.reward_type.value==="gold"?Number(missionForm.elements.reward_amount.value):0,
          points:missionForm.elements.reward_type.value==="points"?Number(missionForm.elements.reward_amount.value):0,
          cadence:missionForm.elements.cadence.value,
          starts_at:missionForm.elements.starts_at.value ? new Date(missionForm.elements.starts_at.value).toISOString() : new Date().toISOString(),
          ends_at:missionForm.elements.ends_at.value ? new Date(missionForm.elements.ends_at.value).toISOString() : null,
          created_by:userId()
        });
        if (error) throw error;
        missionForm.reset();
        $("#mission-create-status").textContent = "Misión publicada para todo el clan.";
        await loadMissions();
      } catch (err) { $("#mission-create-status").textContent = "No se pudo publicar: "+(err.message||"error"); }
      finally { button.disabled = false; }
    };
  }

  async function loadMissions() {
    const host = $("#missions-list");
    if (!host) return;
    const { data: missions, error } = await supabase.from("clan_missions")
      .select("id,title,description,instructions,reward_type,gold_reward,points,cadence,starts_at,ends_at,is_active,created_at")
      .order("created_at",{ascending:false});
    if (error) { host.innerHTML='<p class="muted">No se pudieron cargar las misiones: '+esc(error.message)+'</p>'; return; }
    const ids = (missions || []).map(m=>m.id);
    let own = [];
    let pending = [];
    if (ids.length) {
      const ownResult = await supabase.from("mission_submissions")
        .select("id,mission_id,status,review_note,submitted_at")
        .eq("user_id",userId()).in("mission_id",ids);
      if (!ownResult.error) own = ownResult.data || [];
    }
    if (isModerator()) {
      const reviewResult = await supabase.from("mission_submissions")
        .select("id,mission_id,user_id,evidence_path,note,submitted_at,profiles(display_name,ff_nick),clan_missions(title,gold_reward,points,reward_type)")
        .eq("status","pending").order("submitted_at",{ascending:true});
      if (!reviewResult.error) pending = reviewResult.data || [];
    }
    host.innerHTML = (missions || []).map(m => {
      const submission = own.find(s=>s.mission_id===m.id);
      const state = submission ? (submission.status==="pending"?"En revisión":submission.status==="approved"?"Aprobada":"Rechazada") : "Sin entregar";
      const statusClass = submission ? submission.status : "none";
      const active = m.is_active && new Date(m.starts_at)<=new Date() && (!m.ends_at || new Date(m.ends_at)>=new Date());
      const rewardLabel=m.reward_type==="points"?Number(m.points||0).toLocaleString("es-PA")+" pts":Number(m.gold_reward||0).toLocaleString("es-PA")+" oro";
      return `<article class="panel mission-card"><div class="panel-title"><h3>${esc(m.title)}</h3><span class="tag">${rewardLabel}</span></div><p>${esc(m.description || "Sin descripción.")}</p>${m.instructions?`<div class="feature-note"><b>Instrucciones</b><p>${esc(m.instructions)}</p></div>`:""}<div class="feature-meta"><span>${m.cadence==="daily"?"Diaria":m.cadence==="weekly"?"Semanal":"Única"}</span><span>Finaliza: ${m.ends_at?dateText(m.ends_at):"Sin fecha límite"}</span><span class="submission-state ${statusClass}">${state}</span></div>${submission?.review_note?`<p class="footnote">Observación: ${esc(submission.review_note)}</p>`:""}${!submission && active?`<form class="mission-submit-form" data-mission-submit="${m.id}"><label>Captura de evidencia (JPG, PNG o WEBP, máximo 10 MB)</label><input type="file" name="evidence" accept="image/jpeg,image/png,image/webp" required><textarea name="note" rows="2" maxlength="500" placeholder="Explica brevemente tu resultado (opcional)"></textarea><button class="primary-btn" type="submit">Enviar evidencia</button><small class="footnote" data-submit-status></small></form>`:!active?'<p class="footnote">Esta misión no está disponible actualmente.</p>':""}${isLeader()?`<button class="secondary-btn" type="button" data-mission-delete="${m.id}">Eliminar misión</button>`:""}</article>`;
    }).join("") || '<div class="panel muted">Todavía no hay misiones publicadas.</div>';

    const reviewHost = $("#mission-review-list");
    if (reviewHost) {
      if (!isModerator()) { reviewHost.closest(".feature-section")?.classList.add("hidden"); }
      else {
        reviewHost.closest(".feature-section")?.classList.remove("hidden");
        const items = await Promise.all(pending.map(async s => {
          const { data } = await supabase.storage.from("mission-evidence").createSignedUrl(s.evidence_path,1800);
          return {...s, evidenceUrl:data?.signedUrl || ""};
        }));
        reviewHost.innerHTML = items.map(s=>`<article class="panel review-card"><div class="panel-title"><h3>${esc(s.clan_missions?.title || "Misión")}</h3><span class="tag">${s.clan_missions?.reward_type==="points"?Number(s.clan_missions?.points||0).toLocaleString("es-PA")+" pts":Number(s.clan_missions?.gold_reward||0).toLocaleString("es-PA")+" oro"}</span></div><b>${esc(s.profiles?.display_name || "Integrante")}</b><small>${esc(s.profiles?.ff_nick || "")} · ${dateText(s.submitted_at)}</small><p>${esc(s.note || "Sin comentario.")}</p>${s.evidenceUrl?`<a href="${esc(s.evidenceUrl)}" target="_blank" rel="noopener">Ver evidencia ↗</a>`:'<small>No se pudo generar el enlace de evidencia.</small>'}<textarea data-review-note="${s.id}" rows="2" maxlength="500" placeholder="Observación opcional"></textarea><div class="inline-actions">${isLeader()?`<button class="primary-btn" type="button" data-review-submission="${s.id}" data-decision="approved">Aprobar</button>`:""}<button class="secondary-btn" type="button" data-review-submission="${s.id}" data-decision="rejected">Rechazar</button></div></article>`).join("") || '<p class="muted">No hay evidencias pendientes de revisión.</p>';
      }
    }
  }

  const missionsHost = $("#missions-list");
  if (missionsHost && !missionsHost.dataset.bound) {
    missionsHost.dataset.bound = "1";
    missionsHost.addEventListener("submit", async e => {
      const form = e.target.closest("[data-mission-submit]");
      if (!form) return;
      e.preventDefault();
      const status = form.querySelector("[data-submit-status]");
      const button = form.querySelector('button[type="submit"]');
      const file = form.elements.evidence.files?.[0];
      if (!file || !["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 10*1024*1024) {
        status.textContent = "Selecciona una imagen JPG, PNG o WEBP de máximo 10 MB."; return;
      }
      button.disabled = true; status.textContent = "Subiendo evidencia…";
      const ext = file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
      const path = userId()+"/"+crypto.randomUUID()+"."+ext;
      try {
        const upload = await supabase.storage.from("mission-evidence").upload(path,file,{contentType:file.type,upsert:false});
        if (upload.error) throw upload.error;
        const { error } = await supabase.from("mission_submissions").insert({
          mission_id:form.dataset.missionSubmit,user_id:userId(),evidence_path:path,note:form.elements.note.value.trim()
        });
        if (error) {
          await supabase.storage.from("mission-evidence").remove([path]);
          throw error;
        }
        status.textContent = "Evidencia enviada. Espera la revisión de un Líder.";
        await loadMissions();
      } catch (err) { status.textContent = "No se pudo enviar: "+(err.message||"error"); button.disabled=false; }
    });
    missionsHost.addEventListener("click", async e => {
      const button = e.target.closest("[data-mission-delete]");
      if (!button || !isLeader() || !confirm("¿Eliminar esta misión y sus entregas?")) return;
      button.disabled=true;
      const {error}=await supabase.from("clan_missions").delete().eq("id",button.dataset.missionDelete);
      if(error) alert("No se pudo eliminar: "+error.message);
      await loadMissions();
    });
  }

  const reviewHost = $("#mission-review-list");
  if (reviewHost && !reviewHost.dataset.bound) {
    reviewHost.dataset.bound = "1";
    reviewHost.addEventListener("click", async e => {
      const button = e.target.closest("[data-review-submission]");
      if (!button || !isModerator() || (button.dataset.decision==="approved" && !isLeader())) return;
      const id = button.dataset.reviewSubmission;
      const note = reviewHost.querySelector(`[data-review-note="${id}"]`)?.value.trim() || "";
      button.disabled = true;
      const {error}=await supabase.rpc("review_mission_submission",{
        p_submission_id:id,p_decision:button.dataset.decision,p_review_note:note
      });
      if(error) alert("No se pudo revisar: "+error.message);
      await loadMissions();
      await loadRanking();
      await loadBadges();
    });
  }

  async function loadRanking() {
    const host = $("#ranking-list");
    if (!host) return;
    try { await loadMemberBadgeMap(); } catch(error) { host.innerHTML='<p class="muted">No se pudieron cargar las insignias: '+esc(error.message)+'</p>'; return; }
    const {data,error}=await supabase.from("clan_global_ranking").select("user_id,display_name,ff_nick,role,points,position,gold").order("position",{ascending:true});
    if(error){host.innerHTML='<p class="muted">No se pudo cargar el ranking: '+esc(error.message)+'</p>';return}
    host.innerHTML=(data||[]).map(row=>`<article class="ranking-row ${row.user_id===userId()?"is-self":""}"><strong class="ranking-position">#${row.position}</strong><div class="feature-row-main"><b class="member-name-line">${esc(row.display_name)}${memberBadgeMarkup(row.user_id)}</b><small>${esc(row.ff_nick||"Sin nick")} · ${esc(row.role)}</small></div><div class="ranking-currency"><strong class="ranking-points">${Number(row.points).toLocaleString("es-PA")} pts</strong><small>${Number(row.gold||0).toLocaleString("es-PA")} oro</small></div></article>`).join("")||'<p class="muted">El ranking aparecerá cuando se registren puntos.</p>';
  }

  async function loadBadges() {
    const catalogHost=$("#badge-catalog"), earnedHost=$("#badge-earned");
    if(!catalogHost || !earnedHost)return;
    const [{data:badges,error:bError},{data:earned,error:eError}] = await Promise.all([
      supabase.from("clan_badges").select("id,slug,name,description,icon,rarity,is_active").eq("is_active",true).order("name"),
      supabase.from("member_badges").select("id,user_id,note,awarded_at,profiles(display_name),clan_badges(name,description,icon,rarity)").order("awarded_at",{ascending:false})
    ]);
    if(bError){catalogHost.innerHTML='<p class="muted">'+esc(bError.message)+'</p>';return}
    if(!eError){
      const next=new Map();
      (earned||[]).forEach(row=>{if(!row.clan_badges)return;const list=next.get(row.user_id)||[];list.push(row.clan_badges);next.set(row.user_id,list)});
      memberBadgesByUser=next;
    }
    catalogHost.innerHTML=(badges||[]).map(b=>`<article class="badge-card rarity-${b.rarity||"common"}"><span class="badge-icon rarity-${b.rarity||"common"}">${esc(b.icon)}</span><b>${esc(b.name)}</b><small>${esc(b.description)}</small><span class="tag">${b.rarity==="legendary"?"Legendaria":b.rarity==="epic"?"Épica":b.rarity==="rare"?"Rara":"Común"}</span></article>`).join("")||'<p class="muted">No hay insignias activas.</p>';
    earnedHost.innerHTML=(earned||[]).map(e=>`<article class="feature-row"><span class="badge-icon small rarity-${e.clan_badges?.rarity||"common"}">${esc(e.clan_badges?.icon||"🏅")}</span><div class="feature-row-main"><b>${esc(e.profiles?.display_name||"Integrante")} · ${esc(e.clan_badges?.name||"Insignia")}</b><small>${dateText(e.awarded_at)} ${e.note?"· "+esc(e.note):""}</small></div></article>`).join("")||'<p class="muted">Todavía no se han otorgado insignias.</p>';
    const badgeSelect=$("#badge-award-form select[name=badge_id]");
    if(badgeSelect) badgeSelect.innerHTML=(badges||[]).map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join("");
    const memberSelect=$("#badge-award-form select[name=user_id]");
    if(memberSelect){
      const {data:members}=await supabase.from("profiles").select("id,display_name").order("display_name");
      memberSelect.innerHTML=(members||[]).map(m=>`<option value="${m.id}">${esc(m.display_name)}</option>`).join("");
    }
    $("#badge-award-form")?.classList.toggle("hidden",!isLeader());
  }

  const badgeForm=$("#badge-award-form");
  if(badgeForm) badgeForm.onsubmit=async e=>{
    e.preventDefault(); if(!isLeader())return;
    const button=badgeForm.querySelector('button[type="submit"]');button.disabled=true;
    $("#badge-award-status").textContent="Otorgando insignia…";
    const {error}=await supabase.rpc("grant_clan_badge",{
      p_user_id:badgeForm.elements.user_id.value,p_badge_id:badgeForm.elements.badge_id.value,p_note:badgeForm.elements.note.value.trim()
    });
    $("#badge-award-status").textContent=error?"No se pudo otorgar: "+error.message:"Insignia otorgada.";
    button.disabled=false;if(!error){await loadBadges();window.dispatchEvent(new Event("clan-badges-updated"));}
  };

  const pointsForm=$("#points-award-form");
  if(pointsForm){
    pointsForm.classList.toggle("hidden",!isLeader());
    supabase.from("profiles").select("id,display_name").order("display_name").then(({data:members,error})=>{
      if(error){$("#points-award-status").textContent="No se pudo cargar la lista de integrantes: "+error.message;return;}
      pointsForm.elements.user_id.innerHTML=(members||[]).map(m=>`<option value="${m.id}">${esc(m.display_name)}</option>`).join("");
    });
    pointsForm.onsubmit=async e=>{
      e.preventDefault();if(!isLeader())return;
      const button=pointsForm.querySelector('button[type="submit"]');button.disabled=true;
      $("#points-award-status").textContent="Registrando puntos…";
      const {error}=await supabase.rpc("record_clan_points",{
        p_user_id:pointsForm.elements.user_id.value,p_amount:Number(pointsForm.elements.amount.value),
        p_source_type:pointsForm.elements.source_type.value,p_reason:pointsForm.elements.reason.value.trim(),p_source_id:null
      });
      $("#points-award-status").textContent=error?"No se pudieron registrar: "+error.message:"Puntos registrados en el ranking global.";
      button.disabled=false;if(!error){pointsForm.reset();await loadRanking();}
    };
  }

  const postForm=$("#social-post-form");
  const socialImageInput=$("#social-image-input");
  const socialImagePreview=$("#social-image-preview");
  const socialImageRemove=$("#social-image-remove");
  const socialImagePick=$("#social-image-pick");
  const socialPostStatus=$("#social-post-status");
  let selectedPostMedia=null, selectedPostPreviewUrl=null;

  function clearPostImage(){
    if(selectedPostPreviewUrl)URL.revokeObjectURL(selectedPostPreviewUrl);
    selectedPostPreviewUrl=null;selectedPostMedia=null;
    if(socialImagePreview){socialImagePreview.innerHTML="";socialImagePreview.classList.add("hidden")}
    socialImageRemove?.classList.add("hidden");
    if(socialImageInput)socialImageInput.value="";
  }
  function setPostImage(file){
    if(!file)return;
    const allowed=["image/jpeg","image/png","image/webp","video/mp4","video/webm","video/quicktime"];
    const isVideo=file.type.startsWith("video/");
    const maxBytes=isVideo?50*1024*1024:5*1024*1024;
    if(!allowed.includes(file.type)||file.size>maxBytes){
      if(socialPostStatus)socialPostStatus.textContent=isVideo?"El vídeo supera 50 MB o el formato no es compatible.":"Usa JPG, PNG o WEBP de máximo 5 MB.";
      return;
    }
    if(selectedPostPreviewUrl)URL.revokeObjectURL(selectedPostPreviewUrl);
    selectedPostMedia=file;selectedPostPreviewUrl=URL.createObjectURL(file);
    if(socialImagePreview){
      const preview=document.createElement(isVideo?"video":"img");
      preview.className="social-image-preview";
      preview.src=selectedPostPreviewUrl;
      if(isVideo){preview.controls=true;preview.playsInline=true}
      else preview.alt="Vista previa del archivo que se publicará";
      socialImagePreview.replaceChildren(preview);
      socialImagePreview.classList.remove("hidden");
    }
    socialImageRemove?.classList.remove("hidden");
    if(socialPostStatus)socialPostStatus.textContent=isVideo?"Vídeo listo para publicar.":"Imagen lista para publicar.";
  }
  if(socialImagePick)socialImagePick.onclick=async()=>{
    if(isNativeApp&&FilePicker?.pickMedia){
      socialImagePick.disabled=true;
      try{
        const result=await FilePicker.pickMedia({limit:1});
        const picked=result.files?.[0];
        if(picked?.webPath){
          const response=await fetch(picked.webPath);
          if(!response.ok)throw new Error("No se pudo leer el archivo seleccionado.");
          const blob=await response.blob();
          const inferred=picked.mimeType||blob.type||"";
          setPostImage(new File([blob],picked.name||"archivo",{type:inferred}));
        }
      }catch(error){if(socialPostStatus)socialPostStatus.textContent="No se pudo seleccionar el archivo: "+(error.message||"Error");}
      finally{socialImagePick.disabled=false;}
    }else socialImageInput?.click();
  };
  if(socialImageInput)socialImageInput.onchange=()=>setPostImage(socialImageInput.files?.[0]);
  if(socialImageRemove)socialImageRemove.onclick=clearPostImage;

  async function requestSocialMediaUrls(action,payload){
    const {data,error}=await supabase.functions.invoke("social-media",{body:{action,...payload}});
    if(error)throw error;
    if(!data?.ok)throw new Error(data?.error||"No se pudo preparar el archivo.");
    return data;
  }

  if(postForm)postForm.onsubmit=async e=>{
    e.preventDefault();
    const button=postForm.querySelector('button[type="submit"]');
    const content=postForm.elements.content.value.trim();
    if(!content&&!selectedPostMedia){socialPostStatus.textContent="Escribe algo o adjunta una foto o vídeo.";return;}
    button.disabled=true;socialPostStatus.textContent="Publicando…";
    let mediaPath=null;
    try{
      if(selectedPostMedia){
        const {uploadUrl,path}=await requestSocialMediaUrls("create-upload",{
          contentType:selectedPostMedia.type,size:selectedPostMedia.size
        });
        const upload=await fetch(uploadUrl,{method:"PUT",headers:{"Content-Type":selectedPostMedia.type},body:selectedPostMedia});
        if(!upload.ok)throw new Error("Backblaze no aceptó el archivo ("+upload.status+").");
        mediaPath=path;
      }
      const {error}=await supabase.from("social_posts").insert({
        user_id:userId(),content,media_path:mediaPath
      });
      if(error)throw error;
      postForm.reset();clearPostImage();socialPostStatus.textContent="Publicación compartida con el clan.";
      await loadWall();
    }catch(error){
      socialPostStatus.textContent="No se pudo publicar: "+(error.message||"Error desconocido");
    }finally{button.disabled=false;}
  };

  async function loadWall(){
    const host=$("#social-wall");if(!host)return;
    try { await loadMemberBadgeMap(); } catch(error) { host.innerHTML='<p class="muted">No se pudieron cargar las insignias: '+esc(error.message)+'</p>'; return; }
    const {data,error}=await supabase.from("social_posts")
      .select("id,user_id,content,media_path,created_at,is_hidden,pinned_order,profiles!social_posts_user_id_fkey(display_name,role),social_comments(id,user_id,content,created_at,is_hidden,profiles!social_comments_user_id_fkey(display_name,role)),social_reactions(id,user_id,reaction)")
      .order("pinned_order",{ascending:true,nullsFirst:false}).order("created_at",{ascending:false}).limit(40);
    if(error){host.innerHTML='<p class="muted">No se pudo cargar el muro: '+esc(error.message)+'</p>';return}
    const posts=data||[];
    const mediaPaths=posts.map(post=>post.media_path).filter(Boolean);
    const signedUrls=new Map();
    if(mediaPaths.length){
      try{
        const result=await requestSocialMediaUrls("create-downloads",{paths:mediaPaths});
        (result.files||[]).forEach(item=>signedUrls.set(item.path,item.url));
      }catch(urlError){console.error("No se pudieron firmar medios del muro:",urlError)}
    }
    host.innerHTML=posts.map(post=>{
      const comments=post.social_comments||[], reactions=post.social_reactions||[];
      const counts={like:0,fire:0,gg:0,clap:0};reactions.forEach(r=>counts[r.reaction]=(counts[r.reaction]||0)+1);
      const mediaUrl=post.media_path?signedUrls.get(post.media_path):null;
      const isVideo=!!post.media_path&&/\.(mp4|webm|mov)$/i.test(post.media_path);
      const mediaMarkup=mediaUrl?(isVideo?'<video class="social-media-image" src="'+esc(mediaUrl)+'" controls playsinline preload="metadata"></video>':'<img class="social-media-image" src="'+esc(mediaUrl)+'" alt="Imagen compartida en el muro" loading="lazy">'):'';
      const canManagePost=isLeader()||post.user_id===userId();
      const pinTools=isLeader()&&post.pinned_order?`<div class="social-pin-tools"><button class="text-action" type="button" data-pin-move="${post.id}" data-direction="up" ${post.pinned_order===1?"disabled":""}>Subir fijada</button><button class="text-action" type="button" data-pin-move="${post.id}" data-direction="down">Bajar fijada</button></div>`:"";
      const postTools=canManagePost?`<div class="social-post-tools"><button class="text-action" type="button" data-edit-post="${post.id}">Editar</button><button class="text-action danger-text" type="button" data-delete-post="${post.id}">Eliminar</button>${isLeader()?`<button class="text-action" type="button" data-pin-post="${post.id}" data-pinned="${post.pinned_order!=null}">${post.pinned_order!=null?"Desfijar":"Fijar"}</button>${pinTools}`:""}</div>`:"";
      return `<article class="panel social-post ${post.pinned_order?"social-post-pinned":""}" data-post-id="${post.id}"><div class="panel-title"><div><b class="member-name-line">${esc(post.profiles?.display_name||"Integrante")}${memberBadgeMarkup(post.user_id)}</b><small>${esc(post.profiles?.role||"Miembro")} · ${dateText(post.created_at)}</small></div><div class="social-post-head-actions">${post.pinned_order?`<span class="pinned-tag">FIJADA #${post.pinned_order}</span>`:""}${isModerator()? `<button class="secondary-btn" type="button" data-moderate-post="${post.id}" data-hide="${post.is_hidden?"false":"true"}">${post.is_hidden?"Restaurar":"Ocultar"}</button>`:""}</div></div>${post.content? `<p class="social-content">${esc(post.content)}</p>`:""}${mediaMarkup}${postTools}<div class="social-reactions">${["like","fire","gg","clap"].map((r,i)=>`<button type="button" class="secondary-btn" data-react-post="${post.id}" data-reaction="${r}">${["👍","🔥","GG","👏"][i]} ${counts[r]||0}</button>`).join("")}</div><div class="social-comments">${comments.map(c=>`<div class="social-comment"><div><b class="member-name-line">${esc(c.profiles?.display_name||"Integrante")}${memberBadgeMarkup(c.user_id)}</b> <small>${dateText(c.created_at)}</small></div><p>${esc(c.content)}</p>${isModerator()? `<button class="text-action" type="button" data-moderate-comment="${c.id}" data-hide="${c.is_hidden?"false":"true"}">${c.is_hidden?"Restaurar comentario":"Ocultar comentario"}</button>`:""}</div>`).join("")}<form class="comment-form" data-comment-post="${post.id}"><input name="content" maxlength="500" placeholder="Escribe un comentario…" required><button class="secondary-btn" type="submit">Comentar</button></form></div></article>`;
    }).join("")||'<div class="panel muted">El muro está vacío. Publica algo para iniciar la conversación.</div>';
  }

  const wall=$("#social-wall");
  if(wall && !wall.dataset.bound){
    wall.dataset.bound="1";
    wall.addEventListener("submit",async e=>{
      const form=e.target.closest("[data-comment-post]");if(!form)return;
      e.preventDefault();const button=form.querySelector("button");button.disabled=true;
      const {error}=await supabase.from("social_comments").insert({post_id:form.dataset.commentPost,user_id:userId(),content:form.elements.content.value.trim()});
      if(error)alert("No se pudo comentar: "+error.message);else await loadWall();
      button.disabled=false;
    });
    wall.addEventListener("click",async e=>{
      const reaction=e.target.closest("[data-react-post]");
      if(reaction){
        const postId=reaction.dataset.reactPost,type=reaction.dataset.reaction;
        const {data}=await supabase.from("social_reactions").select("id").eq("post_id",postId).eq("user_id",userId()).maybeSingle();
        if(data)await supabase.from("social_reactions").delete().eq("id",data.id);
        else {const {error}=await supabase.from("social_reactions").insert({post_id:postId,user_id:userId(),reaction:type});if(error)alert(error.message)}
        await loadWall();return;
      }
      const editPost=e.target.closest("[data-edit-post]");
      const deletePost=e.target.closest("[data-delete-post]");
      const pinPost=e.target.closest("[data-pin-post]");
      const movePin=e.target.closest("[data-pin-move]");
      if(editPost){
        const post=editPost.closest("[data-post-id]");
        const original=post?.querySelector(".social-content")?.textContent||"";
        if(!post||post.querySelector(".social-edit-form"))return;
        const editor=document.createElement("form");editor.className="social-edit-form form-grid";
        editor.innerHTML='<textarea name="content" rows="4" maxlength="800" aria-label="Editar publicación"></textarea><div class="inline-actions"><button class="primary-btn" type="submit">Guardar cambios</button><button class="secondary-btn" type="button">Cancelar</button></div><small class="footnote" aria-live="polite"></small>';
        editor.elements.content.value=original;post.querySelector(".social-content")?.replaceWith(editor);
        if(!post.querySelector(".social-content"))post.insertBefore(editor,post.querySelector(".social-media-image")||post.querySelector(".social-reactions"));
        editor.onsubmit=async ev=>{ev.preventDefault();const content=editor.elements.content.value.trim();if(!content&&!post.querySelector(".social-media-image")){editor.querySelector(".footnote").textContent="La publicación debe tener texto o un archivo adjunto.";return;}const save=editor.querySelector('[type="submit"]');save.disabled=true;const {error}=await supabase.from("social_posts").update({content,updated_at:new Date().toISOString()}).eq("id",editPost.dataset.editPost);if(error){editor.querySelector(".footnote").textContent="No se pudo editar: "+error.message;save.disabled=false;}else await loadWall();};
        editor.querySelector('[type="button"]').onclick=loadWall;
        return;
      }
      if(deletePost){
        if(!confirm("¿Eliminar esta publicación y sus comentarios?"))return;
        const {error}=await supabase.from("social_posts").delete().eq("id",deletePost.dataset.deletePost);
        if(error)alert("No se pudo eliminar: "+error.message);else await loadWall();
        return;
      }
      if(pinPost){
        const {error}=await supabase.rpc("set_social_post_pin",{p_post_id:pinPost.dataset.pinPost,p_pinned:pinPost.dataset.pinned!=="true"});
        if(error)alert("No se pudo cambiar la fijación: "+error.message);else await loadWall();
        return;
      }
      if(movePin){
        const {error}=await supabase.rpc("move_social_post_pin",{p_post_id:movePin.dataset.pinMove,p_direction:movePin.dataset.direction});
        if(error)alert("No se pudo reordenar: "+error.message);else await loadWall();
        return;
      }
      const postButton=e.target.closest("[data-moderate-post]");
      const commentButton=e.target.closest("[data-moderate-comment]");
      if(postButton||commentButton){
        if(!isModerator())return;
        const button=postButton||commentButton;
        const {error}=await supabase.rpc("moderate_social_content",{
          p_content_type:postButton?"post":"comment",p_content_id:button.dataset.moderatePost||button.dataset.moderateComment,
          p_hide:button.dataset.hide==="true",p_note:"Moderación del equipo"
        });
        if(error)alert("No se pudo moderar: "+error.message);else await loadWall();
      }
    });
  }


  async function loadWallet(){
    const host=$("#gold-ledger-list"); if(!host)return;
    const {data,error}=await supabase.from("clan_gold_ledger").select("id,amount,reason,source_type,created_at").eq("user_id",userId()).order("created_at",{ascending:false}).limit(50);
    if(error){host.innerHTML='<p class="muted">No se pudo cargar la cartera: '+esc(error.message)+'</p>';return}
    const rows=data||[];
    const [{data:balanceData,error:balanceError},{data:pointBalance,error:pointBalanceError},{data:pointRows,error:pointRowsError}]=await Promise.all([
      supabase.rpc("get_my_clan_gold_balance"),
      supabase.rpc("get_my_clan_points_balance"),
      supabase.from("clan_point_ledger").select("id,amount,reason,source_type,created_at").eq("user_id",userId()).order("created_at",{ascending:false}).limit(50)
    ]);
    if(balanceError||pointBalanceError||pointRowsError){host.innerHTML='<p class="muted">No se pudo calcular tu cartera: '+esc((balanceError||pointBalanceError||pointRowsError).message)+'</p>';return}
    $("#gold-balance").textContent=Number(balanceData||0).toLocaleString("es-PA")+" oro";
    const pointBalanceEl=$("#points-balance");if(pointBalanceEl)pointBalanceEl.textContent=Number(pointBalance||0).toLocaleString("es-PA")+" pts";
    const pointHost=$("#points-ledger-list");if(pointHost)pointHost.innerHTML=(pointRows||[]).map(row=>'<article class="feature-row"><div class="feature-row-main"><b>'+esc(row.reason)+'</b><small>'+dateText(row.created_at)+' · '+esc(row.source_type)+'</small></div><strong class="'+(row.amount>0?"gold-positive":"gold-negative")+'">'+(row.amount>0?"+":"")+Number(row.amount).toLocaleString("es-PA")+' pts</strong></article>').join("")||'<p class="muted">Todavía no tienes movimientos de puntos.</p>';
    host.innerHTML=rows.map(row=>'<article class="feature-row"><div class="feature-row-main"><b>'+esc(row.reason)+'</b><small>'+dateText(row.created_at)+' · '+esc(row.source_type)+'</small></div><strong class="'+(row.amount>0?"gold-positive":"gold-negative")+'">'+(row.amount>0?"+":"")+Number(row.amount).toLocaleString("es-PA")+' oro</strong></article>').join("")||'<p class="muted">Todavía no tienes movimientos de oro.</p>';
    const transferForm=$("#currency-transfer-form");
    if(transferForm)transferForm.classList.toggle("hidden",isLeader());
    const transferSelect=$("#currency-transfer-form select[name=recipient_id]");
    if(transferSelect&&!isLeader()){const {data:members}=await supabase.from("profiles").select("id,display_name,role").eq("membership_status","active").in("role",["Miembro","Decano"]).neq("id",userId()).order("display_name");transferSelect.innerHTML=(members||[]).map(m=>'<option value="'+m.id+'">'+esc(m.display_name)+'</option>').join("");}
    const select=$("#gold-award-form select[name=user_id]");
    if(isLeader()&&select){const {data:members}=await supabase.from("profiles").select("id,display_name").eq("membership_status","active").order("display_name");select.innerHTML=(members||[]).map(m=>'<option value="'+m.id+'">'+esc(m.display_name)+'</option>').join("");const missionSelect=$("#gold-award-form select[name=mission_id]");const {data:missions}=await supabase.from("clan_missions").select("id,title,gold_reward").eq("is_active",true).eq("reward_type","gold").order("created_at",{ascending:false});if(missionSelect)missionSelect.innerHTML='<option value="">Otorgamiento manual</option>'+(missions||[]).map(m=>'<option value="'+m.id+'" data-gold="'+m.gold_reward+'" data-title="'+esc(m.title)+'">'+esc(m.title)+' · '+Number(m.gold_reward).toLocaleString("es-PA")+' oro</option>').join("")}
    $("#gold-award-form")?.classList.toggle("hidden",!isLeader());
  }
  const goldAwardForm=$("#gold-award-form");
  const goldMissionSelect=goldAwardForm?.elements.mission_id;
  if(goldMissionSelect)goldMissionSelect.addEventListener("change",()=>{const option=goldMissionSelect.selectedOptions[0];if(!option?.value)return;goldAwardForm.elements.amount.value=option.dataset.gold||0;goldAwardForm.elements.reason.value="Recompensa por misión: "+(option.dataset.title||"");goldAwardForm.elements.source_type.value="mission"});
  if(goldAwardForm)goldAwardForm.onsubmit=async e=>{
    e.preventDefault();if(!isLeader())return;
    const button=goldAwardForm.querySelector('button[type="submit"]');button.disabled=true;
    $("#gold-award-status").textContent="Registrando oro…";
    const {error}=await supabase.rpc("grant_clan_gold",{p_user_id:goldAwardForm.elements.user_id.value,p_amount:Number(goldAwardForm.elements.amount.value),p_reason:goldAwardForm.elements.reason.value.trim(),p_source_type:goldAwardForm.elements.source_type.value,p_source_id:goldAwardForm.elements.mission_id.value||null});
    $("#gold-award-status").textContent=error?"No se pudo otorgar oro: "+error.message:"Oro otorgado correctamente.";
    button.disabled=false;if(!error){goldAwardForm.elements.amount.value="";goldAwardForm.elements.reason.value="";await loadWallet();}
  };
  const transferForm=$("#currency-transfer-form");
  if(transferForm)transferForm.onsubmit=async e=>{
    e.preventDefault();
    const button=transferForm.querySelector('button[type="submit"]');button.disabled=true;
    const status=$("#currency-transfer-status");status.textContent="Procesando transferencia…";
    const {error}=await supabase.rpc("transfer_clan_currency",{p_recipient_id:transferForm.elements.recipient_id.value,p_currency:transferForm.elements.currency.value,p_amount:Number(transferForm.elements.amount.value)});
    status.textContent=error?"Transferencia rechazada: "+error.message:"Transferencia realizada correctamente.";
    button.disabled=false;if(!error){transferForm.reset();await loadWallet();}
  };
  async function loadRewards(){
    const host=$("#rewards-list");if(!host)return;
    const {data,error}=await supabase.from("clan_rewards").select("id,title,description,gold_cost,is_active,created_at").order("created_at",{ascending:false});
    if(error){host.innerHTML='<p class="muted">No se pudieron cargar las recompensas: '+esc(error.message)+'</p>';return}
    host.innerHTML=(data||[]).map(r=>'<article class="panel reward-card" data-reward-card="'+r.id+'"><div class="panel-title"><h3>'+esc(r.title)+'</h3><strong>'+Number(r.gold_cost).toLocaleString("es-PA")+' oro</strong></div><p>'+esc(r.description||"Sin descripción.")+'</p>'+(!r.is_active?'<small class="muted">No disponible</small>':'<button class="primary-btn" type="button" data-redeem-reward="'+r.id+'">Canjear recompensa</button>')+(isLeader()?'<div class="inline-actions"><button class="secondary-btn" type="button" data-edit-reward="'+r.id+'">Editar</button><button class="text-action danger-text" type="button" data-delete-reward="'+r.id+'">Borrar</button></div>':'')+'</article>').join("")||'<div class="panel muted">Todavía no hay recompensas publicadas.</div>';
    $("#reward-create-form")?.classList.toggle("hidden",!isLeader());
  }
  const rewardForm=$("#reward-create-form");
  if(rewardForm)rewardForm.onsubmit=async e=>{
    e.preventDefault();if(!isLeader())return;
    const button=rewardForm.querySelector('button[type="submit"]');button.disabled=true;
    $("#reward-create-status").textContent="Publicando recompensa…";
    const {error}=await supabase.from("clan_rewards").insert({title:rewardForm.elements.title.value.trim(),description:rewardForm.elements.description.value.trim(),gold_cost:Number(rewardForm.elements.gold_cost.value),created_by:userId()});
    $("#reward-create-status").textContent=error?"No se pudo crear: "+error.message:"Recompensa publicada.";
    button.disabled=false;if(!error){rewardForm.reset();await loadRewards();}
  };
  const rewardsHost=$("#rewards-list");
  if(rewardsHost&&!rewardsHost.dataset.bound){
    rewardsHost.dataset.bound="1";
    rewardsHost.addEventListener("click",async e=>{
      const edit=e.target.closest("[data-edit-reward]");
      const remove=e.target.closest("[data-delete-reward]");
      if(edit&&isLeader()){
        const id=edit.dataset.editReward, card=edit.closest("[data-reward-card]");
        const {data:reward,error}=await supabase.from("clan_rewards").select("id,title,description,gold_cost").eq("id",id).single();
        if(error){alert("No se pudo abrir la recompensa: "+error.message);return;}
        card.innerHTML='<form class="reward-inline-edit form-grid"><label>Nombre del premio</label><input name="title" maxlength="80" required><label>Descripción</label><textarea name="description" rows="3" maxlength="1200"></textarea><label>Precio en oro</label><input name="gold_cost" type="number" min="1" max="1000000000" required><div class="inline-actions"><button class="primary-btn" type="submit">Confirmar cambios</button><button class="secondary-btn" type="button" data-cancel-reward>Cancelar</button></div><small class="footnote" data-edit-status></small></form>';
        const form=card.querySelector("form");form.elements.title.value=reward.title;form.elements.description.value=reward.description||"";form.elements.gold_cost.value=reward.gold_cost;
        form.onsubmit=async ev=>{ev.preventDefault();const submit=form.querySelector('[type="submit"]');submit.disabled=true;const {error:updateError}=await supabase.from("clan_rewards").update({title:form.elements.title.value.trim(),description:form.elements.description.value.trim(),gold_cost:Number(form.elements.gold_cost.value),updated_at:new Date().toISOString()}).eq("id",id);if(updateError){form.querySelector("[data-edit-status]").textContent="No se pudo guardar: "+updateError.message;submit.disabled=false;}else await loadRewards();};
        form.querySelector("[data-cancel-reward]").onclick=loadRewards;
        return;
      }
      if(remove&&isLeader()){
        if(!confirm("¿Borrar esta recompensa?"))return;
        const {error:deleteError}=await supabase.from("clan_rewards").delete().eq("id",remove.dataset.deleteReward);
        if(deleteError)alert("No se pudo borrar: "+deleteError.message);else await loadRewards();
        return;
      }
      const button=e.target.closest("[data-redeem-reward]");if(!button)return;
      if(!confirm("¿Confirmas el canje de esta recompensa?"))return;
      button.disabled=true;$("#rewards-status").textContent="Procesando canje…";
      const {error}=await supabase.rpc("redeem_clan_reward",{p_reward_id:button.dataset.redeemReward});
      if(error){const insufficient=(error.message||"").toLowerCase().includes("monedas insuficientes");$("#rewards-status").textContent=insufficient?"Monedas insuficientes. Necesitas más oro para canjear esta recompensa.":"No se pudo completar el canje: "+error.message;button.disabled=false;return}
      $("#rewards-status").textContent="Premio canjeado con éxito";
      await Promise.all([loadWallet(),loadRewards(),loadRedemptionNotifications()]);
    });
  }
  async function loadRedemptionNotifications(){
    const host=$("#redemption-notifications");if(!host)return;
    const {data,error}=await supabase.from("clan_reward_redemptions").select("id,gold_spent,created_at,profiles(display_name,ff_nick,ff_id,phone_e164),clan_rewards(title)").order("created_at",{ascending:false}).limit(100);
    if(error){host.innerHTML='<p class="muted">No se pudieron cargar los canjes: '+esc(error.message)+'</p>';return}
    host.innerHTML=(data||[]).map(r=>'<article class="feature-row"><div class="feature-row-main"><b>'+esc(r.profiles?.display_name||"Integrante")+' canjeó '+esc(r.clan_rewards?.title||"una recompensa")+'</b><small>Nick: '+esc(r.profiles?.ff_nick||"—")+' · ID Free Fire: '+esc(r.profiles?.ff_id||"—")+'</small><small>Teléfono: '+esc(r.profiles?.phone_e164||"—")+'</small><small>'+dateText(r.created_at)+' · '+Number(r.gold_spent).toLocaleString("es-PA")+' oro descontado</small></div></article>').join("")||'<p class="muted">Todavía no hay canjes registrados.</p>';
  }

  const refreshAll = async () => {
    await Promise.all([loadPresence(),loadMissions(),loadRanking(),loadBadges(),loadWall(),loadWallet(),loadRewards(),loadRedemptionNotifications()]);
  };
  if (featureChannels.length === 0) {
    featureChannels.push(
      supabase.channel("tb3st-presence-live")
        .on("postgres_changes",{event:"*",schema:"public",table:"member_presence"},loadPresence).subscribe(),
      supabase.channel("tb3st-social-live")
        .on("postgres_changes",{event:"*",schema:"public",table:"social_posts"},loadWall).subscribe(),
      supabase.channel("tb3st-gold-live").on("postgres_changes",{event:"*",schema:"public",table:"clan_gold_ledger"},()=>{loadWallet();loadRedemptionNotifications()}).subscribe(),
      supabase.channel("tb3st-points-live").on("postgres_changes",{event:"*",schema:"public",table:"clan_point_ledger"},()=>{loadWallet();loadRanking()}).subscribe(),
      supabase.channel("tb3st-rewards-live").on("postgres_changes",{event:"*",schema:"public",table:"clan_rewards"},loadRewards).subscribe(),
      supabase.channel("tb3st-redemptions-live").on("postgres_changes",{event:"*",schema:"public",table:"clan_reward_redemptions"},loadRedemptionNotifications).subscribe()
    );
  }
  refreshAll();
}
