import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { checkAdmin } from '../services/admin'
import { setCacheScope } from '../lib/dataCache'
import { clearSignedUrls } from '../services/storage'

// Context = "variável global" do React. Qualquer componente dentro do
// <AuthProvider> pode saber quem está logado chamando useAuth().
const AuthContext = createContext(null)

// A pessoa só é deslogada se ficar 30 dias sem abrir o site neste aparelho.
// Cada vez que usa, o prazo recomeça (quem usa sempre nunca cai).
const IDLE_MAX_MS = 30 * 24 * 60 * 60 * 1000
const LAST_ACTIVE_KEY = 'memorias-da-turma:ultimo-uso'
const OLD_LOGIN_AT_KEY = 'memorias-da-turma:login-at' // regra antiga (12 h desde o login)

function readLastActive() {
  try {
    return Number(localStorage.getItem(LAST_ACTIVE_KEY)) || 0
  } catch {
    return 0
  }
}

function writeLastActive(value) {
  try {
    if (value) localStorage.setItem(LAST_ACTIVE_KEY, String(value))
    else localStorage.removeItem(LAST_ACTIVE_KEY)
    localStorage.removeItem(OLD_LOGIN_AT_KEY)
  } catch {
    /* sem localStorage: ignora */
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false) // admin pode editar e apagar qualquer coisa
  const [adminReady, setAdminReady] = useState(false) // true quando já sabemos se é admin
  const [loading, setLoading] = useState(true) // true até sabermos se há sessão

  // 1) Descobre a sessão atual e fica "ouvindo" login/logout.
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setCacheScope(data.session?.user?.id) // antes de qualquer tela pedir dados
        setSession(data.session)
      })
      .finally(() => setLoading(false))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setCacheScope(newSession?.user?.id)
      if (!newSession) clearSignedUrls() // saiu da conta: esquece os links das fotos
      setSession(newSession)
    })

    // Função de limpeza: roda quando o componente sai da tela.
    return () => subscription.unsubscribe()
  }, [])

  // Derruba o login só depois de 30 dias sem usar o site. Usar (abrir, voltar para a aba, ficar com ela aberta)
  // renova o prazo.
  const hasSession = Boolean(session)
  useEffect(() => {
    if (loading) return // ainda não sabemos se há sessão: não apaga nada
    if (!hasSession) {
      writeLastActive(0)
      return
    }
    const last = readLastActive()
    if (last && Date.now() - last > IDLE_MAX_MS) {
      writeLastActive(0)
      supabase.auth.signOut()
      return
    }
    // está usando: renova agora, ao voltar para a aba e a cada 10 min com o site aberto
    const touch = () => document.visibilityState === 'visible' && writeLastActive(Date.now())
    writeLastActive(Date.now())
    const timer = setInterval(touch, 10 * 60 * 1000)
    document.addEventListener('visibilitychange', touch)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', touch)
    }
  }, [hasSession, loading])

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

  // Descobre se é admin (a regra de verdade está no banco; isto só mostra os botões).
  useEffect(() => {
    if (!userId) {
      setIsAdmin(false)
      setAdminReady(false)
      return undefined
    }
    let cancelled = false
    setAdminReady(false)
    checkAdmin().then((value) => {
      if (cancelled) return
      setIsAdmin(value)
      setAdminReady(true)
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
      isAdmin,
      adminReady,
      loading,
      refreshProfile,
      signIn: async (email, password) => {
        const result = await supabase.auth.signInWithPassword({ email, password })
        if (!result.error) writeLoginAt(Date.now())
        return result
      },
      signOut: () => supabase.auth.signOut(),
    }),
    [session, profile, isAdmin, adminReady, loading, refreshProfile],
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
