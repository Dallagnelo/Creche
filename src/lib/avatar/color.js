// Cores de apoio do desenho do personagem.
export const DARK = '#1a1424'

export const shade = (hex, amount) => {
  if (!hex?.startsWith('#')) return hex
  const n = parseInt(hex.slice(1), 16)
  const ch = (shift) => Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * (1 + amount))))
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`
}
