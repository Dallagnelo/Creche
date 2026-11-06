import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

// Context = "variável global" do React. Qualquer componente dentro do
// <AuthProvider> pode saber quem está logado chamando useAuth().
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true) // true até sabermos se há sessão

  // 1) Descobre a sessão atual e fica "ouvindo" login/logout.
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setLoading(false))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    // Função de limpeza: roda quando o componente sai da tela.
    return () => subscription.unsubscribe()
  }, [])

  // 2) Sempre que o usuário muda, busca o perfil dele (nome, avatar).
  const userId = session?.user?.id
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      return
    }

    let cancelled = false
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (!cancelled) setProfile(data)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  // Busca o perfil de novo (usado depois de editar o perfil, para o menu atualizar).
  const refreshProfile = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) setProfile(data)
  }, [userId])

  // useMemo evita recriar o objeto a cada render e re-renderizar todo mundo à toa.
  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      refreshProfile,
      signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      signOut: () => supabase.auth.signOut(),
    }),
    [session, profile, loading, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook personalizado: atalho para ler o contexto.
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de <AuthProvider>.')
  }
  return context
}
