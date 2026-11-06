// Cliente público de Supabase para CL4N TB3ST.
// La Publishable Key está diseñada para el navegador; la seguridad real depende
// de RLS y de las políticas configuradas en Supabase. Nunca pongas aquí una Secret Key.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ezqmfwgyqqwvrgrkjvyi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ApuLU_E0DPm1n5oIYbAF8A_jkAQxd_w";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

// Disponible para los siguientes módulos de la aplicación.
window.supabaseClient = supabase;