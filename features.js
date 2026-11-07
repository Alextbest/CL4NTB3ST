const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateText = (v) => v ? new Date(v).toLocaleString("es-PA",{dateStyle:"medium",timeStyle:"short"}) : "—";
let featureUserId = null;
let featureChannels = [];
let featureContext = null;

export function initClanFeatures(supabase, profile, role) {
  featureContext = { supabase, profile, role };
  if (featureUserId !== profile.id) {
    featureChannels.forEach(ch => supabase.removeChannel(ch));
    featureChannels = [];
    featureUserId = profile.id;
  }
  const isLeader = () => featureContext?.role === "Líder";
  const isModerator = () => ["Líder","Decano"].includes(featureContext?.role);
  const userId = () => featureContext.profile.id;

  const presenceForm = $("#presence-form");
  if (presenceForm) {
    const saved = localStorage.getItem("tb3st-presence-status");
    if (saved && presenceForm.elements.status) presenceForm.elements.status.value = saved;
    presenceForm.onsubmit = async e => {
      e.preventDefault();
      const status = presenceForm.elements.status.value;
      const message = presenceForm.elements.message.value.trim();
      const button = presenceForm.querySelector('button[type="submit"]');
      button.disabled = true;
      $("#presence-status-message").textContent = "Actualizando tu presencia…";
      try {
        const { error } = await supabase.from("member_presence").upsert({
          user_id:userId(), status, message, updated_at:new Date().toISOString()
        }, { onConflict:"user_id" });
        if (error) throw error;
        localStorage.setItem("tb3st-presence-status",status);
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
    const { data, error } = await supabase.from("member_presence")
      .select("user_id,status,message,updated_at,profiles(display_name,ff_nick,role)")
      .order("updated_at",{ascending:false});
    if (error) { host.innerHTML = '<p class="muted">No se pudo cargar la presencia: '+esc(error.message)+'</p>'; return; }
    const rows = data || [];
    host.innerHTML = rows.map(row => {
      const labels = {available:"Disponible",busy:"Ocupado",looking_for_squad:"Buscando escuadra"};
      const stale = Date.now() - new Date(row.updated_at).getTime() > 30*60*1000;
      return `<article class="feature-row"><span class="presence-indicator ${stale?"stale":esc(row.status)}"></span><div class="feature-row-main"><b>${esc(row.profiles?.display_name || "Integrante")}</b><small>${esc(row.profiles?.ff_nick || "Sin nick")} · ${esc(row.profiles?.role || "Miembro")}</small><p>${esc(row.message || labels[row.status] || "Sin mensaje")}</p></div><small class="muted">${stale?"Hace rato":dateText(row.updated_at)}</small></article>`;
    }).join("") || '<p class="muted">Todavía no hay estados publicados. Actualiza el tuyo.</p>';
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
          points:Number(missionForm.elements.points.value),
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
      .select("id,title,description,instructions,points,cadence,starts_at,ends_at,is_active,created_at")
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
        .select("id,mission_id,user_id,evidence_path,note,submitted_at,profiles(display_name,ff_nick),clan_missions(title,points)")
        .eq("status","pending").order("submitted_at",{ascending:true});
      if (!reviewResult.error) pending = reviewResult.data || [];
    }
    host.innerHTML = (missions || []).map(m => {
      const submission = own.find(s=>s.mission_id===m.id);
      const state = submission ? (submission.status==="pending"?"En revisión":submission.status==="approved"?"Aprobada":"Rechazada") : "Sin entregar";
      const statusClass = submission ? submission.status : "none";
      const active = m.is_active && new Date(m.starts_at)<=new Date() && (!m.ends_at || new Date(m.ends_at)>=new Date());
      return `<article class="panel mission-card"><div class="panel-title"><h3>${esc(m.title)}</h3><span class="tag">${m.points} pts</span></div><p>${esc(m.description || "Sin descripción.")}</p>${m.instructions?`<div class="feature-note"><b>Instrucciones</b><p>${esc(m.instructions)}</p></div>`:""}<div class="feature-meta"><span>${m.cadence==="daily"?"Diaria":m.cadence==="weekly"?"Semanal":"Única"}</span><span>Finaliza: ${m.ends_at?dateText(m.ends_at):"Sin fecha límite"}</span><span class="submission-state ${statusClass}">${state}</span></div>${submission?.review_note?`<p class="footnote">Observación: ${esc(submission.review_note)}</p>`:""}${!submission && active?`<form class="mission-submit-form" data-mission-submit="${m.id}"><label>Captura de evidencia (JPG, PNG o WEBP, máximo 10 MB)</label><input type="file" name="evidence" accept="image/jpeg,image/png,image/webp" required><textarea name="note" rows="2" maxlength="500" placeholder="Explica brevemente tu resultado (opcional)"></textarea><button class="primary-btn" type="submit">Enviar evidencia</button><small class="footnote" data-submit-status></small></form>`:!active?'<p class="footnote">Esta misión no está disponible actualmente.</p>':""}${isLeader()?`<button class="secondary-btn" type="button" data-mission-delete="${m.id}">Eliminar misión</button>`:""}</article>`;
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
        reviewHost.innerHTML = items.map(s=>`<article class="panel review-card"><div class="panel-title"><h3>${esc(s.clan_missions?.title || "Misión")}</h3><span class="tag">${s.clan_missions?.points || 0} pts</span></div><b>${esc(s.profiles?.display_name || "Integrante")}</b><small>${esc(s.profiles?.ff_nick || "")} · ${dateText(s.submitted_at)}</small><p>${esc(s.note || "Sin comentario.")}</p>${s.evidenceUrl?`<a href="${esc(s.evidenceUrl)}" target="_blank" rel="noopener">Ver evidencia ↗</a>`:'<small>No se pudo generar el enlace de evidencia.</small>'}<textarea data-review-note="${s.id}" rows="2" maxlength="500" placeholder="Observación opcional"></textarea><div class="inline-actions"><button class="primary-btn" type="button" data-review-submission="${s.id}" data-decision="approved">Aprobar</button><button class="secondary-btn" type="button" data-review-submission="${s.id}" data-decision="rejected">Rechazar</button></div></article>`).join("") || '<p class="muted">No hay evidencias pendientes de revisión.</p>';
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
        status.textContent = "Evidencia enviada. Espera la revisión de un Líder o Decano.";
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
      if (!button || !isModerator()) return;
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
    const {data,error}=await supabase.from("clan_global_ranking").select("user_id,display_name,ff_nick,role,points,position").order("position",{ascending:true});
    if(error){host.innerHTML='<p class="muted">No se pudo cargar el ranking: '+esc(error.message)+'</p>';return}
    host.innerHTML=(data||[]).map(row=>`<article class="ranking-row ${row.user_id===userId()?"is-self":""}"><strong class="ranking-position">#${row.position}</strong><div class="feature-row-main"><b>${esc(row.display_name)}</b><small>${esc(row.ff_nick||"Sin nick")} · ${esc(row.role)}</small></div><strong class="ranking-points">${Number(row.points).toLocaleString("es-PA")} pts</strong></article>`).join("")||'<p class="muted">El ranking aparecerá cuando se registren puntos.</p>';
  }

  async function loadBadges() {
    const catalogHost=$("#badge-catalog"), earnedHost=$("#badge-earned");
    if(!catalogHost || !earnedHost)return;
    const [{data:badges,error:bError},{data:earned,error:eError}] = await Promise.all([
      supabase.from("clan_badges").select("id,slug,name,description,icon,rarity,is_active").eq("is_active",true).order("name"),
      supabase.from("member_badges").select("id,user_id,note,awarded_at,profiles(display_name),clan_badges(name,description,icon,rarity)").order("awarded_at",{ascending:false}).limit(60)
    ]);
    if(bError){catalogHost.innerHTML='<p class="muted">'+esc(bError.message)+'</p>';return}
    catalogHost.innerHTML=(badges||[]).map(b=>`<article class="badge-card rarity-${b.rarity}"><span class="badge-icon">${esc(b.icon)}</span><b>${esc(b.name)}</b><small>${esc(b.description)}</small><span class="tag">${b.rarity==="legendary"?"Legendaria":b.rarity==="epic"?"Épica":b.rarity==="rare"?"Rara":"Común"}</span></article>`).join("")||'<p class="muted">No hay insignias activas.</p>';
    earnedHost.innerHTML=(earned||[]).map(e=>`<article class="feature-row"><span class="badge-icon small">${esc(e.clan_badges?.icon||"🏅")}</span><div class="feature-row-main"><b>${esc(e.profiles?.display_name||"Integrante")} · ${esc(e.clan_badges?.name||"Insignia")}</b><small>${dateText(e.awarded_at)} ${e.note?"· "+esc(e.note):""}</small></div></article>`).join("")||'<p class="muted">Todavía no se han otorgado insignias.</p>';
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
    button.disabled=false;if(!error)await loadBadges();
  };

  const pointsForm=$("#points-award-form");
  if(pointsForm){
    pointsForm.classList.toggle("hidden",!isModerator());
    const {data:members}=await supabase.from("profiles").select("id,display_name").order("display_name");
    pointsForm.elements.user_id.innerHTML=(members||[]).map(m=>`<option value="${m.id}">${esc(m.display_name)}</option>`).join("");
    pointsForm.onsubmit=async e=>{
      e.preventDefault();if(!isModerator())return;
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
  if(postForm)postForm.onsubmit=async e=>{
    e.preventDefault();
    const button=postForm.querySelector('button[type="submit"]');button.disabled=true;
    $("#social-post-status").textContent="Publicando…";
    const {error}=await supabase.from("social_posts").insert({user_id:userId(),content:postForm.elements.content.value.trim()});
    $("#social-post-status").textContent=error?"No se pudo publicar: "+error.message:"Publicación compartida con el clan.";
    button.disabled=false;if(!error){postForm.reset();await loadWall();}
  };

  async function loadWall(){
    const host=$("#social-wall");if(!host)return;
    const {data,error}=await supabase.from("social_posts")
      .select("id,user_id,content,created_at,is_hidden,profiles(display_name,role),social_comments(id,user_id,content,created_at,is_hidden,profiles(display_name,role)),social_reactions(id,user_id,reaction)")
      .order("created_at",{ascending:false}).limit(40);
    if(error){host.innerHTML='<p class="muted">No se pudo cargar el muro: '+esc(error.message)+'</p>';return}
    host.innerHTML=(data||[]).map(post=>{
      const comments=post.social_comments||[], reactions=post.social_reactions||[];
      const counts={like:0,fire:0,gg:0,clap:0};reactions.forEach(r=>counts[r.reaction]=(counts[r.reaction]||0)+1);
      return `<article class="panel social-post" data-post-id="${post.id}"><div class="panel-title"><div><b>${esc(post.profiles?.display_name||"Integrante")}</b><small>${esc(post.profiles?.role||"Miembro")} · ${dateText(post.created_at)}</small></div>${isModerator()? `<button class="secondary-btn" type="button" data-moderate-post="${post.id}" data-hide="${post.is_hidden?"false":"true"}">${post.is_hidden?"Restaurar":"Ocultar"}</button>`:""}</div><p class="social-content">${esc(post.content)}</p><div class="social-reactions">${["like","fire","gg","clap"].map((r,i)=>`<button type="button" class="secondary-btn" data-react-post="${post.id}" data-reaction="${r}">${["👍","🔥","GG","👏"][i]} ${counts[r]||0}</button>`).join("")}</div><div class="social-comments">${comments.map(c=>`<div class="social-comment"><div><b>${esc(c.profiles?.display_name||"Integrante")}</b> <small>${dateText(c.created_at)}</small></div><p>${esc(c.content)}</p>${isModerator()? `<button class="text-action" type="button" data-moderate-comment="${c.id}" data-hide="${c.is_hidden?"false":"true"}">${c.is_hidden?"Restaurar comentario":"Ocultar comentario"}</button>`:""}</div>`).join("")}<form class="comment-form" data-comment-post="${post.id}"><input name="content" maxlength="500" placeholder="Escribe un comentario…" required><button class="secondary-btn" type="submit">Comentar</button></form></div></article>`;
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

  const refreshAll = async () => {
    await Promise.all([loadPresence(),loadMissions(),loadRanking(),loadBadges(),loadWall()]);
  };
  if (featureChannels.length === 0) {
    featureChannels.push(
      supabase.channel("tb3st-presence-live")
        .on("postgres_changes",{event:"*",schema:"public",table:"member_presence"},loadPresence).subscribe(),
      supabase.channel("tb3st-social-live")
        .on("postgres_changes",{event:"*",schema:"public",table:"social_posts"},loadWall).subscribe()
    );
  }
  refreshAll();
}
