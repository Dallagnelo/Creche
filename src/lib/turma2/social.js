// Emotes da Turma 2.0 (public/limezu/emotes.png: quadros de 16 px; cada emote tem 2 quadros lado a lado)
export const EMOTES_URL = '/limezu/emotes.png'
export const EMOTES = [
  { id: 'coracao', nome: 'Coração', x: 4, y: 2 },
  { id: 'exclama', nome: 'Opa!', x: 0, y: 4 },
  { id: 'duvida', nome: 'Hein?', x: 2, y: 5 },
  { id: 'nota', nome: 'Cantando', x: 6, y: 6 },
  { id: 'dinheiro', nome: 'Dinheiro', x: 2, y: 4 },
  { id: 'sono', nome: 'Sono', x: 6, y: 5 },
  { id: 'triste', nome: 'Coração partido', x: 4, y: 5 },
  { id: 'ideia', nome: 'Ideia', x: 4, y: 6 },
  { id: 'reticencias', nome: '…', x: 2, y: 9 },
  { id: 'suor', nome: 'Ufa', x: 8, y: 9 },
]
export const emoteById = Object.fromEntries(EMOTES.map((e) => [e.id, e]))
/** limpa uma mensagem do chat (sem quebras, no máximo 120 letras) */
export const cleanChat = (t) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, 120)
