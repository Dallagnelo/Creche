"""Turma 2.0: recorta do Modern User Interface (16x16) as peças da interface do jogo (HUD).

Saída em public/limezu/editor/hud/: molduras (usadas com border-image no CSS), a folha de botões
e alguns ícones soltos. Uso: python3 scripts/turma2-hud.py
"""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public', 'limezu')
SHEET = Image.open(os.path.join(ROOT, 'ui', '16x16', 'Modern_UI_Style_1.png')).convert('RGBA')
OUT = os.path.join(ROOT, 'editor', 'hud')
os.makedirs(OUT, exist_ok=True)

PIECES = {
    # molduras
    'painel': (58, 169, 28, 29),      # janela de madeira arredondada
    'card': (60, 251, 24, 25),        # cartão claro
    'slot': (12, 251, 24, 25),        # espaço vazio da mochila
    'slot_on': (13, 300, 22, 24),     # espaço escolhido
    'titulo': (1, 209, 45, 18),       # faixa do título
    'escuro': (268, 386, 25, 13),     # campo escuro (contadores)
    'dialogo': (8, 8, 32, 31),        # caixa de conversa (madeira com pinos)
    # botões: 9 colunas x 5 fileiras de 16x16 a partir de y=16; normal (x 0), em cima (x 160),
    # apertado (x 160, y +192); o quadrado vazio fica em (48, 0)
    'botoes': (384, 0, 304, 288),
    # ícones
    'i_moeda': (208, 386, 15, 13),
    'i_moeda_grande': (148, 390, 24, 22),
    'i_moeda_p': (210, 371, 12, 11),
    'i_coracao': (216, 160, 16, 15),
    'i_mochila': (169, 70, 18, 18),
    'i_engrenagem': (160, 185, 15, 15),
    'i_livro': (128, 183, 16, 18),
    'i_relogio': (226, 67, 11, 11),
    'i_estrela': (193, 18, 14, 12),
    'i_presente': (145, 0, 14, 16),
    'i_pergunta': (130, 0, 12, 16),
    # status do personagem
    'i_coracao_p': (179, 164, 11, 10),
    'i_coxa': (194, 163, 11, 12),
    'i_raio': (164, 162, 9, 13),
    'i_cerebro': (145, 162, 14, 13),
    # barras: fundo vazio e as cores (esticadas pelo CSS)
    'barra_vazia': (336, 133, 16, 8),
    'barra_verde': (336, 149, 17, 8),
    'barra_amarela': (336, 197, 17, 8),
    'barra_vermelha': (336, 245, 17, 8),
    'barra_azul': (336, 293, 17, 8),
    # HUD v4: seleção da barra rápida, tela cheia, emotes e relógio grande
    'sel': (201, 296, 14, 16),        # cantinhos de seleção
    'i_cheia': (139, 330, 10, 12),    # tela cheia
    'i_sorriso': (147, 213, 10, 8),   # carinha (emotes)
}
for name, (x, y, w, h) in PIECES.items():
    SHEET.crop((x, y, x + w, y + h)).save(os.path.join(OUT, f'{name}.png'), optimize=True)
print(len(PIECES), 'peças em', OUT)
