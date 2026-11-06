// Configurações de aparência. Ficam salvas no navegador (localStorage), então valem
// para este aparelho; cada pessoa da turma pode ter as suas.

const STORAGE_KEY = 'memorias-da-turma:settings'

export const DEFAULT_SETTINGS = {
  theme: 'dark', // 'dark' | 'light' | 'auto' (auto segue o tema do aparelho)
  textSize: 'normal', // 'normal' | 'large'
  pixelFont: true, // false = títulos em fonte simples, mais fácil de ler
  reduceMotion: false, // true = sem animações
  eventsView: 'calendar', // página de Eventos: 'calendar' (calendário do mês) | 'cards' (destaque + cards)
}

// Cor da barra do navegador (celular) combinando com o tema.
const THEME_COLORS = { dark: '#0c1626', light: '#eaf0f9' }

export function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return { ...DEFAULT_SETTINGS, ...saved }
  } catch {
    return { ...DEFAULT_SETTINGS } // storage bloqueado ou JSON quebrado: usa o padrão
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // sem storage (aba anônima, por exemplo): a configuração vale só até fechar a página
  }
}

/** 'auto' vira 'dark' ou 'light', conforme o tema do aparelho. */
export function resolveTheme(theme) {
  if (theme !== 'auto') return theme
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/**
 * Aplica as configurações no <html> como atributos (data-theme, data-text...).
 * O CSS enxerga esses atributos e troca as variáveis de cor, tamanho e fonte.
 */
export function applySettings(settings) {
  const root = document.documentElement
  const theme = resolveTheme(settings.theme)

  root.dataset.theme = theme
  root.dataset.text = settings.textSize
  root.dataset.font = settings.pixelFont ? 'pixel' : 'plain'
  root.dataset.motion = settings.reduceMotion ? 'reduced' : 'normal'

  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
}
