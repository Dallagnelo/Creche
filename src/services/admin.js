import { supabase } from '../lib/supabase'

/** Diz se quem está logado é admin (função is_admin do banco). Se der erro, não é. */
export async function checkAdmin() {
  const { data, error } = await supabase.rpc('is_admin')
  return !error && data === true
}
