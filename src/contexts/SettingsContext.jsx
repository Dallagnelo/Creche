import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_SETTINGS, applySettings, loadSettings, saveSettings } from '../lib/settings'

// Mesma ideia do AuthContext: qualquer componente pode chamar useSettings().
const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings)

  // Sempre que mudar: salva e aplica na página.
  useEffect(() => {
    saveSettings(settings)
    applySettings(settings)
  }, [settings])

  const updateSetting = useCallback((key, value) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }, [])

  const resetSettings = useCallback(() => setSettings({ ...DEFAULT_SETTINGS }), [])

  const value = useMemo(() => ({ settings, updateSetting, resetSettings }), [settings, updateSetting, resetSettings])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings precisa estar dentro de <SettingsProvider>')
  return context
}
