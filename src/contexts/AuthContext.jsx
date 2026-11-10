import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { checkAdmin } from '../services/admin'
import { setCacheScope } from '../lib/dataCache'
import { clearSignedUrls } from '../services/storage'

// Context = "variável global" do React. Qualquer componente dentro do
// <AuthProvider> pode saber quem está logado chamando useAuth().
const AuthContext = createContext(null)

// Depois de 12 horas desde o login, a pessoa precisa entrar de novo.
const SESSION_MAX_MS = 12 * 60 * 60 * 1000
const LOGIN_AT_KEY = 'memorias-da-turma:login-at'

function readLoginAt() {
  try {
    return Number(localStorage.getItem(LOGIN_AT_KEY)) || 0
  } catch {
    return 0
  }
}

function writeLoginAt(value) {
  try {
    if (value) localStorage.setItem(LOGIN_AT_KEY, String(value))
    else localStorage.removeItem(LOGIN_AT_KEY)
  } catch {
    /* sem localStorage: ignora */
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false) // admin pode editar e apagar qualquer coisa
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

  // Derruba o login quando passam 12 h (confere ao abrir o site e a cada minuto).
  const hasSession = Boolean(session)
  useEffect(() => {
    if (loading) return // ainda não sabemos se há sessão: não apaga nada
    if (!hasSession) {
      writeLoginAt(0)
      return
    }
    if (!readLoginAt()) writeLoginAt(Date.now()) // sessão que já existia antes desta regra
    function check() {
      if (Date.now() - readLoginAt() > SESSION_MAX_MS) {
        writeLoginAt(0)
        supabase.auth.signOut()
      }
    }
    check()
    const timer = setInterval(check, 60 * 1000)
    return () => clearInterval(timer)
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
      return undefined
    }
    let cancelled = false
    checkAdmin().then((value) => {
      if (!cancelled) setIsAdmin(value)
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
      loading,
      refreshProfile,
      signIn: async (email, password) => {
        const result = await supabase.auth.signInWithPassword({ email, password })
        if (!result.error) writeLoginAt(Date.now())
        return result
      },
      signOut: () => supabase.auth.signOut(),
    }),
    [session, profile, isAdmin, loading, refreshProfile],
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
