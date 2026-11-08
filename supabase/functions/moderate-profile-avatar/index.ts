import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!openAiKey || !supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "El filtro de imágenes no está configurado. No se subió ninguna foto.", code: "moderation_unconfigured" }, 503);
  }

  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token || token === auth) return json({ error: "Inicia sesión para subir tu foto." }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "La sesión no es válida. Inicia sesión otra vez." }, 401);

  let payload: { action?: string; imageBase64?: string };
  try { payload = await req.json(); } catch { return json({ error: "La imagen enviada no es válida." }, 400); }
  const action = payload.action || "apply";
  if (action !== "scan" && action !== "apply") return json({ error: "Acción no válida." }, 400);
  const raw = payload.imageBase64 || "";
  const match = raw.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return json({ error: "La imagen debe estar procesada en formato JPG." }, 400);
  const encoded = match[1];
  if (encoded.length > 2_800_000) return json({ error: "La imagen supera el límite permitido." }, 413);

  let bytes: Uint8Array;
  try {
    const binary = atob(encoded);
    bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch { return json({ error: "No se pudo leer la imagen." }, 400); }
  if (bytes.length < 100 || bytes.length > 2 * 1024 * 1024) return json({ error: "La imagen debe pesar menos de 2 MB después de procesarla." }, 413);

  let moderationResponse: Response;
  try {
    moderationResponse = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: [{ type: "image_url", image_url: { url: raw } }],
      }),
    });
  } catch {
    return json({ error: "No se pudo completar el análisis de seguridad. Inténtalo de nuevo; la foto no se subió.", code: "moderation_unavailable" }, 503);
  }
  if (!moderationResponse.ok) {
    return json({ error: "El filtro de contenido no respondió correctamente. Inténtalo más tarde; la foto no se subió.", code: "moderation_failed" }, 503);
  }
  const moderation = await moderationResponse.json();
  const result = moderation?.results?.[0];
  if (!result || !result.categories || !result.category_scores) {
    return json({ error: "No se pudo verificar el contenido de la foto. No se subió.", code: "moderation_invalid_result" }, 503);
  }
  const categories = result.categories;
  const scores = result.category_scores;
  const explicit = categories.sexual === true ||
    categories["sexual/minors"] === true ||
    Number(scores.sexual || 0) >= 0.50 ||
    Number(scores["sexual/minors"] || 0) >= 0.10;
  if (explicit) {
    return json({ error: "Contenido explícito detectado, actualiza tu imagen.", code: "explicit_content" }, 422);
  }

  if (action === "scan") return json({ ok: true, approved: true, message: "Imagen aprobada por el filtro. Aún no se publicó." });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Validar en el servidor que el usuario conserva una membresía activa.
  // La clave de servicio evita depender de permisos de lectura del cliente.
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("membership_status")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError) {
    return json({ error: "No se pudo verificar el estado de tu cuenta. Inténtalo más tarde.", code: "profile_check_failed" }, 503);
  }
  if (!profile || profile.membership_status !== "active") {
    return json({ error: "Tu cuenta no tiene acceso activo al clan y no puede cambiar la foto de perfil.", code: "inactive_membership" }, 403);
  }

  const path = `${authData.user.id}/${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await admin.storage.from("clan-avatars").upload(path, bytes, {
    contentType: "image/jpeg",
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) return json({ error: "No se pudo guardar la foto. Inténtalo de nuevo.", code: "storage_upload_failed" }, 500);

  const { data: previous } = await admin.from("profiles").select("avatar_path").eq("id", authData.user.id).maybeSingle();
  const { error: profileUpdateError } = await admin.from("profiles").update({
    avatar_path: path,
    avatar_status: "approved",
    avatar_reviewed_at: null,
    avatar_reviewed_by: null,
  }).eq("id", authData.user.id);
  if (profileUpdateError) {
    await admin.storage.from("clan-avatars").remove([path]);
    return json({ error: "La foto pasó el filtro, pero no se pudo actualizar tu perfil. Inténtalo de nuevo.", code: "profile_update_failed" }, 500);
  }
  if (previous?.avatar_path && previous.avatar_path !== path) {
    await admin.storage.from("clan-avatars").remove([previous.avatar_path]);
  }
  return json({ ok: true, message: "Foto verificada y publicada en Integrantes." });
});