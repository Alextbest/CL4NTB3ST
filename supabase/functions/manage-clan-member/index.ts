import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "Método no permitido." });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json(500, { ok: false, error: "Falta configuración administrativa en el servidor." });

  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return json(401, { ok: false, error: "Debes iniciar sesión." });
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: { user }, error: authError } = await caller.auth.getUser(token);
    if (authError || !user) return json(401, { ok: false, error: "La sesión no es válida." });

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: actor, error: actorError } = await admin.from("profiles")
      .select("role,membership_status").eq("id", user.id).maybeSingle();
    if (actorError) throw actorError;
    if (!actor || actor.role !== "Líder" || actor.membership_status !== "active") {
      return json(403, { ok: false, error: "Solo un líder activo puede administrar integrantes." });
    }

    const body = await req.json();
    const targetId = String(body.target_user_id || "");
    const action = String(body.action || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
      return json(400, { ok: false, error: "La cuenta seleccionada no es válida." });
    }
    if (!["remove", "ban", "restore"].includes(action)) return json(400, { ok: false, error: "Acción no válida." });
    if (targetId === user.id) return json(403, { ok: false, error: "No puedes expulsarte ni bloquear tu propia cuenta." });

    const { data: target, error: targetError } = await admin.from("profiles")
      .select("id,display_name,role,membership_status").eq("id", targetId).maybeSingle();
    if (targetError) throw targetError;
    if (!target) return json(404, { ok: false, error: "No se encontró esa cuenta." });
    if (target.role === "Líder") return json(403, { ok: false, error: "Las cuentas de líder están protegidas." });

    if (action === "restore") {
      const { error } = await admin.auth.admin.updateUserById(targetId, { ban_duration: "none" });
      if (error) throw error;
      const { error: updateError } = await admin.from("profiles").update({ membership_status: "active" }).eq("id", targetId);
      if (updateError) throw updateError;
      return json(200, { ok: true, action, display_name: target.display_name, membership_status: "active" });
    }

    const nextStatus = action === "ban" ? "banned" : "removed";
    const { error: statusError } = await admin.from("profiles").update({ membership_status: nextStatus }).eq("id", targetId);
    if (statusError) throw statusError;

    const { error: authStatusError } = await admin.auth.admin.updateUserById(
      targetId, { ban_duration: action === "ban" ? "876000h" : "none" }
    );
    if (authStatusError) {
      console.error("No se pudo sincronizar el estado de Auth:", authStatusError);
      return json(502, { ok: false, error: "El acceso al clan quedó bloqueado, pero no se pudo actualizar el inicio de sesión de la cuenta." });
    }
    return json(200, { ok: true, action, display_name: target.display_name, membership_status: nextStatus });
  } catch (error) {
    console.error("manage-clan-member error:", error);
    return json(500, { ok: false, error: "No se pudo completar la administración de la cuenta." });
  }
});
