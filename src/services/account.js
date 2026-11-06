import { supabase } from '../lib/supabase'

/** Troca a senha de quem está logado. */
export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}
