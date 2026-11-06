import { createClient } from '@supabase/supabase-js'

// As chaves vêm do arquivo .env (veja .env.example).
// A "anon key" pode ficar no navegador: quem protege os dados é o RLS do banco.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// O App usa esta flag para mostrar um aviso amigável se o .env não foi preenchido.
export const isSupabaseConfigured = Boolean(url && anonKey)

// Valores de reserva evitam que o app quebre antes de mostrar o aviso.
export const supabase = createClient(
  url || 'http://localhost:54321',
  anonKey || 'chave-nao-configurada',
)
