// Gera os ícones do RPG (public/rpg/icons/*.svg) a partir do pacote game-icons.net (CC BY 3.0).
// Uso: npm i --no-save @iconify-json/game-icons && node scripts/rpg-icons.mjs
// Grava a coleção inteira (um SVG por ícone, fundo transparente, cor trocada por CSS) e um index.json com os nomes.
// Os créditos por autor ficam em public/rpg/icons/CREDITOS.txt (exigência da licença CC BY 3.0).
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const set = require('@iconify-json/game-icons/icons.json')
const out = new URL('../public/rpg/icons/', import.meta.url)
mkdirSync(out, { recursive: true })
const names = Object.keys(set.icons).sort()
for (const name of names) {
  const icon = set.icons[name]
  const w = icon.width ?? set.width ?? 512
  const h = icon.height ?? set.height ?? 512
  writeFileSync(new URL(`${name}.svg`, out), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${icon.body.replace(/currentColor/g, '#000')}</svg>`)
}
writeFileSync(new URL('index.json', out), JSON.stringify(names))
console.log(`${names.length} ícones gravados em public/rpg/icons`)
