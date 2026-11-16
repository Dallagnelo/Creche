// Chaves para ligar/desligar partes do site enquanto estão em construção.

// Página da Turma (sala, corredor e quartos): por enquanto só admin vê.
// Para liberar para todo mundo, troque para false.
export const TURMA_SO_ADMIN = false

// Turma (nova): sala, corredor e quartos montados do zero com os móveis do pacote Modern Interiors (LimeZu).
// Enquanto está em construção só o admin vê, em /turma-nova. Troca definitiva (docs/turma-nova.md):
//   1) TURMA_NOVA_PARA_TODOS = true  → a página /turma de todo mundo vira a nova;
//   2) TURMA_NOVA_ADMIN = false      → some o item "Turma (nova)" do menu.
export const TURMA_NOVA_PARA_TODOS = false
export const TURMA_NOVA_ADMIN = true
