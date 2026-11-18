// Gera os ícones do RPG (public/rpg/icons/*.svg) a partir do pacote game-icons.net (CC BY 3.0).
// Uso: npm i --no-save @iconify-json/game-icons && node scripts/rpg-icons.mjs
// Pega todos os ícones citados em src/lib/rpg/data.js (e alguns da interface) e grava um SVG por ícone.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const set = require('@iconify-json/game-icons/icons.json')
const source = readFileSync(new URL('../src/lib/rpg/data.js', import.meta.url), 'utf8')
const names = new Set(['coins', 'knapsack', 'dice-twenty-faces-twenty', 'crossed-swords', 'heart-plus', 'checked-shield', 'crown', 'lightning-helix', 'trophy-cup', 'quill-ink', 'scroll-quill', 'open-treasure-chest', 'skull-crossed-bones'])
for (const match of source.matchAll(/'([a-z0-9-]+)'/g)) if (set.icons[match[1]]) names.add(match[1])
const out = new URL('../public/rpg/icons/', import.meta.url)
mkdirSync(out, { recursive: true })
for (const name of names) {
  const icon = set.icons[name]
  const w = icon.width ?? set.width ?? 512
  const h = icon.height ?? set.height ?? 512
  writeFileSync(new URL(`${name}.svg`, out), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${icon.body.replace(/currentColor/g, '#000')}</svg>`)
}
console.log(`${names.size} ícones gravados em public/rpg/icons`)
