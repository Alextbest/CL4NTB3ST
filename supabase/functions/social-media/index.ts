import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { S3Client, PutObjectCommand, GetObjectCommand, GetBucketCorsCommand, PutBucketCorsCommand } from "npm:@aws-sdk/client-s3@3.750.0";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner@3.750.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};
const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const endpoint = Deno.env.get("B2_ENDPOINT");
const bucket = Deno.env.get("B2_BUCKET");
const keyId = Deno.env.get("B2_KEY_ID");
const applicationKey = Deno.env.get("B2_APPLICATION_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

const s3 = endpoint && keyId && applicationKey
  ? new S3Client({
      region: "us-east-005",
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: keyId, secretAccessKey: applicationKey }
    })
  : null;

let corsSetup: Promise<void> | null = null;
async function ensureBucketCors() {
  if (!corsSetup) {
    corsSetup = (async () => {
      let rules: Array<Record<string, unknown>> = [];
      try {
        const current = await s3!.send(new GetBucketCorsCommand({ Bucket: bucket }));
        rules = (current.CORSRules || []) as Array<Record<string, unknown>>;
      } catch (error) {
        const code = String((error as { name?: string })?.name || "");
        if (code !== "NoSuchCORSConfiguration" && code !== "NotFound") throw error;
      }
      const hasMediaRule = rules.some((rule) => {
        const origins = (rule.AllowedOrigins || []) as string[];
        const methods = (rule.AllowedMethods || []) as string[];
        const headers = (rule.AllowedHeaders || []) as string[];
        return origins.includes("*") && ["GET", "PUT", "HEAD"].every((method) => methods.includes(method)) && headers.includes("*");
      });
      if (!hasMediaRule) {
        rules.push({
          AllowedOrigins: ["*"],
          AllowedMethods: ["GET", "PUT", "HEAD"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3600
        });
        await s3!.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: rules as never[] } }));
      }
    })().catch((error) => {
      corsSetup = null;
      throw error;
    });
  }
  await corsSetup;
}

const allowedTypes = new Set([
  "image/jpeg", "image/png", "image/webp",
  "video/mp4", "video/webm", "video/quicktime"
]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "Método no permitido." });
  if (!s3 || !bucket || !supabaseUrl || !supabaseAnonKey) {
    return json(500, { ok: false, error: "La función no tiene toda la configuración necesaria." });
  }

  try {
    const authorization = req.headers.get("Authorization") || "";
    const token = authorization.replace(/^Bearer\s+/i, "");
    if (!token) return json(401, { ok: false, error: "Sesión requerida." });

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json(401, { ok: false, error: "Sesión no válida." });

    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("membership_status").eq("id", user.id).maybeSingle();
    if (profileError || profile?.membership_status !== "active") {
      return json(403, { ok: false, error: "Tu acceso al clan no está activo." });
    }

    await ensureBucketCors();
    const body = await req.json();
    if (body.action === "create-upload") {
      const contentType = String(body.contentType || "").toLowerCase();
      const size = Number(body.size);
      if (!allowedTypes.has(contentType)) return json(415, { ok: false, error: "Formato no permitido." });
      const maxSize = contentType.startsWith("video/") ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      if (!Number.isFinite(size) || size <= 0 || size > maxSize) {
        return json(413, { ok: false, error: "El archivo supera el límite permitido." });
      }
      const extension: Record<string, string> = {
        "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
        "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov"
      };
      const path = `${user.id}/${crypto.randomUUID()}.${extension[contentType]}`;
      const command = new PutObjectCommand({ Bucket: bucket, Key: path, ContentType: contentType });
      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
      return json(200, { ok: true, path, uploadUrl });
    }

    if (body.action === "create-downloads") {
      const paths = Array.isArray(body.paths) ? body.paths : [];
      if (paths.length > 40) return json(400, { ok: false, error: "Demasiados archivos solicitados." });
      const safePaths = [...new Set(paths)].filter((path) =>
        typeof path === "string" && path.length <= 500 &&
        /^[0-9a-f-]{36}\/[a-zA-Z0-9-]{36}\.(jpg|png|webp|mp4|webm|mov)$/i.test(path)
      );
      const files = await Promise.all(safePaths.map(async (path) => ({
        path,
        url: await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: path }), { expiresIn: 3600 })
      })));
      return json(200, { ok: true, files });
    }

    return json(400, { ok: false, error: "Acción no reconocida." });
  } catch (error) {
    console.error("social-media error:", error);
    return json(500, { ok: false, error: "No se pudo procesar el archivo." });
  }
});
