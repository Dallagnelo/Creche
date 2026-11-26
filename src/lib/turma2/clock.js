// Relógio da Turma 2.0: o mesmo para todo mundo, ligado à hora de verdade.
// 1 dia do jogo = 1 hora real. O dia começa às 6:00 (na virada de cada hora real) e vai até 5:59.
// 28 dias = uma estação (Primavera, Verão, Outono, Inverno), como no Stardew Valley.

export const DAY_MS = 60 * 60 * 1000
const EPOCH = Date.UTC(2026, 10, 1) // 1/11/2026: dia 1 da primeira primavera
export const SEASONS = ['Primavera', 'Verão', 'Outono', 'Inverno']
export const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

/** que dia e que horas são no jogo agora */
export function gameTime(now = Date.now()) {
  const t = now - EPOCH
  const day = Math.floor(t / DAY_MS) // conta desde o começo (0, 1, 2…)
  const frac = (t - day * DAY_MS) / DAY_MS // 0 a 1 dentro do dia
  const minutes = (360 + Math.floor(frac * 1440)) % 1440 // 6:00 → 5:59
  const hour = Math.floor(minutes / 60)
  return {
    day,
    frac,
    minutes,
    hour,
    min: minutes % 60,
    season: SEASONS[Math.floor(day / 28) % 4],
    dayOfSeason: (day % 28) + 1,
    weekday: WEEKDAYS[day % 7],
    year: Math.floor(day / 112) + 1,
  }
}

/** "9:30" (de 10 em 10 minutos, como no Stardew) */
export const clockText = (g) => `${g.hour}:${String(Math.floor(g.min / 10) * 10).padStart(2, '0')}`

/** quanto falta (ms reais) para a próxima manhã */
export const msToMorning = (now = Date.now()) => DAY_MS - ((now - EPOCH) % DAY_MS)

/**
 * Luz do céu: escuridão de 0 (dia) a ~0,8 (noite) e a cor do fim de tarde.
 * 6h-7h amanhece · 7h-17h dia · 17h-19h fim de tarde · 19h-21h anoitece · 21h-5h noite · 5h-6h clareando.
 */
export function skyLight(g) {
  const h = g.hour + g.min / 60
  const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t))
  if (h >= 7 && h < 17) return { dark: 0, dusk: 0, mode: 'dia' }
  if (h >= 6 && h < 7) return { dark: lerp(0.55, 0, h - 6), dusk: lerp(0.25, 0, h - 6), mode: 'dia' }
  if (h >= 17 && h < 19) return { dark: lerp(0, 0.25, (h - 17) / 2), dusk: lerp(0, 0.35, (h - 17) / 2), mode: 'tarde' }
  if (h >= 19 && h < 21) return { dark: lerp(0.25, 0.78, (h - 19) / 2), dusk: lerp(0.35, 0, (h - 19) / 2), mode: 'noite' }
  if (h >= 5 && h < 6) return { dark: lerp(0.78, 0.55, h - 5), dusk: lerp(0, 0.25, h - 5), mode: 'noite' }
  return { dark: 0.78, dusk: 0, mode: 'noite' }
}
