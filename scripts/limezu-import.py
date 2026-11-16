"""Importa o pacote Modern Interiors (LimeZu) inteiro para a "Turma (nova)".

Uso (Python 3 + Pillow), apontando para a pasta 16x16 do pacote (1_Interiors/16x16):
    python scripts/limezu-import.py "C:/caminho/Modern_Interiors/1_Interiors/16x16"

Para cada tema (pasta "2_Living_Room_Singles_Shadowless", ...):
  - recorta cada desenho (tira a borda transparente);
  - junta numa imagem só por tema: public/limezu/<código>.png (carregada só quando alguém usa o tema);
  - agrupa desenhos com o mesmo formato que só mudam de cor (viram as "bolinhas de cor" do catálogo).
O tema 1 (Básico) só vem como folha inteira (Theme_Sorter_Shadowless/1_Generic_Shadowless.png):
os móveis dele são separados pelos pedaços desenhados (cada mancha de pixels = um móvel).
Paredes e pisos: Room_Builder_subfiles/Room_Builder_Walls_16x16.png e ..._Floors_16x16.png
(copiados para public/limezu/walls.png e floors.png; cada estilo é um bloco de 3x2 quadradinhos).
Gera também src/lib/limezuCatalog.json (temas, grupos, onde cada desenho ficou, cores, paredes e pisos).
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

from PIL import Image

# número da pasta → (código, nome no catálogo)
THEMES = {
    1: ('GE', 'Básico'), 2: ('L', 'Sala'), 3: ('BA', 'Banheiro'), 4: ('B', 'Quarto'), 5: ('C', 'Escola e biblioteca'),
    6: ('M', 'Música e esporte'), 7: ('A', 'Arte'), 8: ('G', 'Academia'), 9: ('F', 'Pesca'), 10: ('P', 'Festa'),
    11: ('H', 'Halloween'), 12: ('K', 'Cozinha'), 13: ('CH', 'Auditório'), 14: ('BS', 'Porão'), 15: ('X', 'Natal'),
    16: ('GS', 'Mercado'), 17: ('T17', 'Tema 17'), 18: ('J', 'Prisão'), 19: ('HO', 'Hospital'), 20: ('JP', 'Japonês'),
    21: ('CS', 'Loja de roupas'), 22: ('MU', 'Museu'), 23: ('TV', 'Estúdio de TV'), 24: ('IC', 'Sorveteria'),
    25: ('SR', 'Estande de tiro'), 26: ('CO', 'Condomínio'),
}
ATLAS_W = 1024

root = Path(__file__).resolve().parent.parent
base = Path(sys.argv[1])
if base.name.startswith('Theme_Sorter_Shadowless_Singles'):
    base = base.parent
src = base / 'Theme_Sorter_Shadowless_Singles'
out_dir = root / 'public/limezu'
out_dir.mkdir(parents=True, exist_ok=True)
for old in out_dir.glob('*.png'):
    old.unlink()


def main_color(im):
    """Cor que mais aparece (sem contorno escuro e sem transparente), em #rrggbb."""
    count = Counter()
    for r, g, b, a in im.getdata():
        if a < 128 or r * 0.3 + g * 0.59 + b * 0.11 < 72:
            continue
        count[(r // 8 * 8, g // 8 * 8, b // 8 * 8)] += 1
    if not count:
        return '#444444'
    r, g, b = count.most_common(1)[0][0]
    return f'#{r:02x}{g:02x}{b:02x}'


def sheet_pieces(path):
    """Separa uma folha inteira em móveis: cada mancha de pixels ligados (vizinhos, inclusive na diagonal) = um móvel."""
    sheet = Image.open(path).convert('RGBA')
    w, h = sheet.size
    alpha = sheet.getchannel('A').load()
    seen = [[False] * w for _ in range(h)]
    boxes = []
    for y in range(h):
        for x in range(w):
            if seen[y][x] or alpha[x, y] < 128:
                continue
            stack = [(x, y)]
            seen[y][x] = True
            x0 = x1 = x
            y0 = y1 = y
            size = 0
            while stack:
                cx, cy = stack.pop()
                size += 1
                x0, x1, y0, y1 = min(x0, cx), max(x1, cx), min(y0, cy), max(y1, cy)
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and alpha[nx, ny] >= 128:
                            seen[ny][nx] = True
                            stack.append((nx, ny))
            boxes.append([x0, y0, x1 + 1, y1 + 1, size])
    # pedacinhos soltos (ex.: pé de mesa separado) entram no móvel que encosta neles
    big = [b for b in boxes if b[4] >= 24]
    for b in boxes:
        if b[4] >= 24:
            continue
        for g in big:
            if b[0] >= g[0] - 2 and b[2] <= g[2] + 2 and b[1] >= g[1] - 2 and b[3] <= g[3] + 2:
                g[0], g[1], g[2], g[3] = min(g[0], b[0]), min(g[1], b[1]), max(g[2], b[2]), max(g[3], b[3])
                break
    big.sort(key=lambda b: (b[1] // 16, b[0]))
    return [sheet.crop(tuple(b[:4])) for b in big]


def load_folder(folder):
    files = sorted(folder.glob('*.png'), key=lambda p: int(re.search(r'_(\d+)\.png$', p.name).group(1)))
    out = []
    for f in files:
        n = int(re.search(r'_(\d+)\.png$', f.name).group(1))
        im = Image.open(f).convert('RGBA')
        box = im.getbbox()
        if box:
            out.append((n, im.crop(box)))
    return out


# temas: pastas de desenhos soltos + o tema 1 (só existe como folha)
sources = []
for folder in src.iterdir():
    if folder.is_dir() and re.match(r'\d+', folder.name):
        sources.append((int(re.match(r'(\d+)', folder.name).group(1)), folder.name, lambda folder=folder: load_folder(folder)))
nums = {num for num, _, _ in sources}
generic = next((base / 'Theme_Sorter_Shadowless').glob('1_*.png'), None) if (base / 'Theme_Sorter_Shadowless').exists() else None
if 1 not in nums and generic:
    sources.append((1, generic.name, lambda: [(i + 1, im) for i, im in enumerate(sheet_pieces(generic))]))

catalog = {'themes': {}, 'groups': []}
total = 0
for num, name, loader in sorted(sources, key=lambda t: t[0]):
    code, label = THEMES.get(num, (f'T{num}', name.split('_', 1)[1].replace('_', ' ')))
    sprites = []
    for n, im in loader():
        mask = im.getchannel('A').point(lambda a: 255 if a >= 128 else 0).tobytes()
        sprites.append((n, im, (im.size, mask)))
    if not sprites:
        continue
    # atlas do tema (prateleiras, do mais alto para o mais baixo)
    order = sorted(sprites, key=lambda s: -s[1].height)
    x = y = shelf = 0
    rect = {}
    for n, im, _ in order:
        if x + im.width > ATLAS_W:
            x, y, shelf = 0, y + shelf + 1, 0
        rect[n] = (x, y, im.width, im.height)
        x += im.width + 1
        shelf = max(shelf, im.height)
    atlas = Image.new('RGBA', (ATLAS_W, y + shelf + 1), (0, 0, 0, 0))
    for n, im, _ in order:
        atlas.paste(im, rect[n][:2])
    atlas.save(out_dir / f'{code}.png', optimize=True)
    # grupos: mesmo formato (tamanho + silhueta) = mesmo móvel em outra cor
    groups = {}
    for n, im, sig in sprites:
        groups.setdefault(sig, []).append([n, *rect[n], main_color(im)])
    for variants in groups.values():
        catalog['groups'].append([code, variants])
    catalog['themes'][code] = {'label': label, 'size': [ATLAS_W, atlas.height]}
    total += len(sprites)
    print(f'{code:3} {label:22} {len(sprites):4} desenhos, {len(groups):4} móveis, atlas {ATLAS_W}x{atlas.height}')

# ---- objetos animados (3_Animated_objects/16x16): tamanho do quadro e tempo vêm do .gif; os quadros, do spritesheet
WORDS = {
    'door': 'porta', 'big': 'grande', 'locked': 'trancada', 'fridge': 'geladeira', 'bathtub': 'banheira', 'sink': 'pia',
    'candle': 'vela', 'butterfly': 'borboleta', 'idle': 'parada', 'cat': 'gato', 'chimney': 'lareira', 'oven': 'forno',
    'kitchen': 'cozinha', 'cabinet': 'armário', 'bathroom': 'banheiro', 'empty': 'vazio', 'full': 'cheio', 'full1': 'cheio',
    'full2': 'cheio 2', 'full3': 'cheio 3', 'shopping': '', 'cart': 'carrinho', 'carts': 'carrinhos', 'blue': 'azul',
    'green': 'verde', 'red': 'vermelho', 'yellow': 'amarelo', 'white': 'branco', 'grey': 'cinza', 'orange': 'laranja',
    'left': 'esquerda', 'right': 'direita', 'up': 'cima', 'down': 'baixo', 'vertical': 'de lado', 'glass': 'de vidro',
    'double': 'dupla', 'both': 'dupla', 'tv': 'TV', 'old': 'antiga', 'clock': 'relógio', 'pendulum': 'de pêndulo',
    'cuckoo': 'cuco', 'haunted': 'assombrado', 'mirror': 'espelho', 'painting': 'quadro', 'doll': 'boneca',
    'christmas': 'Natal', 'tree': 'árvore', 'lights': 'pisca-pisca', 'snowball': 'globo de neve', 'globe': '',
    'carousel': 'carrossel', 'jack': 'caixa surpresa', 'in': '', 'the': '', 'box': '', 'party': '', 'balloon': 'balão',
    'amplifier': 'amplificador', 'coffee': 'café', 'fishtank': 'aquário', 'frog': 'sapo', 'pumpkin': 'abóbora',
    'glowing': 'brilhante', 'safe': 'cofre', 'gold': 'com ouro', 'bucks': 'com dinheiro', 'security': '',
    'camera': 'câmera', 'wall': 'de parede', 'escalator': 'escada rolante', 'elevator': 'elevador', 'entrance': 'entrada',
    'exit': 'saída', 'punching': 'saco de', 'bag': 'pancada', 'receptionist': 'recepcionista', 'with': 'com',
    'textbox': 'balão', 'japanese': 'japonês', 'shrine': 'altar', 'sliding': 'de correr', 'iron': 'de ferro',
    'cage': 'jaula', 'hospital': 'hospital', 'prison': 'prisão', 'cell': 'cela', 'museum': 'museu', 'laser': 'laser',
    'turnstile': 'catraca', 'ticket': 'bilhete', 'office': 'bilheteria', 'front': 'frente', 'back': 'fundo',
    'horizontal': 'deitado', 'modular': 'modular', 'drawer': 'gaveta', 'pan': 'frigideira', 'omelette': 'omelete',
    'bbq': 'churrasqueira', 'kneader': 'batedeira', 'cookers': 'bocas', 'cake': 'bolo', 'canteen': 'cantina',
    'counter': 'balcão', 'cauldron': 'caldeirão', 'blood': 'sangue', 'altar': 'altar', 'pentacle': 'pentagrama',
    'incense': 'incenso', 'burner': '', 'emergency': 'emergência', 'floating': 'flutuante', 'floor': 'piso',
    'middle': 'meio', 'generic': '', 'store': '', 'grocery': 'mercado', 'bakery': 'padaria', 'industrial': 'industrial',
    'butchershop': 'açougue', 'carcass': 'carcaça', 'stale': 'velha', 'cool': 'frigorífico', 'room': 'sala',
    'checkout': 'caixa', 'roller': 'esteira', 'machine': 'máquina', 'bookcase': 'estante', 'resonance': 'ressonância',
    'screen': 'tela', 'color': 'colorida', 'surgery': 'cirurgia', 'xraycabin': 'raio-x', 'xraymachine': 'raio-x',
    'xrayscreen': 'raio-x', 'arm': 'braço', 'head': 'cabeça', 'locker': 'armário', 'shower': 'chuveiro', 'person': 'pessoa',
    'approaching': 'chegando', 'moldy': 'mofada', 'fruit': 'fruta', 'basket': 'cesta', 'morgue': 'necrotério',
    'freezer': 'gaveta fria', 'corpse': 'corpo', 'no': 'sem', 'public': 'público', 'toilet': 'banheiro',
    'reportage': 'reportagem', 'control': 'sala de', 'server': 'servidor', 'screens': 'telas', 'facebook': 'rede social',
    'scrolling': 'rolando', 'advertising': 'anúncio', 'monitor': 'monitor', 'clothing': 'loja', 'fitting': 'provador',
    'curtain': 'cortina', 'fishmonger': 'peixaria', 'fish': 'peixe', 'tank': 'tanque', 'fishcuttingtable': 'mesa de peixe',
    'condominium': 'condomínio', 'wax': 'derretendo', 'duck': 'patinho', 'new': '', 'aniamted': '', 'animeted': '',
    'use': '', 'spritesheet': '', 'tapis': 'esteira', 'roulant': '', 'toytrain': 'trem de brinquedo', 'fridge2': 'geladeira',
    '1cookers': '1 boca', '2cookers': '2 bocas', '3cookers': '3 bocas', '4cookers': '4 bocas', 'trap': 'alçapão',
    'flipping': 'virando', 'piano': 'piano', 'toy': 'brinquedo', 'train': 'trem',
}


def nice_name(stem):
    stem = re.sub(r'^an[ia]+mated_', '', stem, flags=re.I)
    stem = re.sub(r'_?\d+[-_]\d+[ _]loop|_?16x16|\.gif', '', stem, flags=re.I)
    words = []
    for w in re.split(r'[_ ]+', stem):
        if not w:
            continue
        t = WORDS.get(w.lower(), w)
        if t:
            words.append(t)
    text = ' '.join(words).strip()
    return text[:1].upper() + text[1:] if text else stem


anim_dir = base.parent.parent / '3_Animated_objects' / '16x16'
if anim_dir.exists():
    items = []
    for gif in sorted((anim_dir / 'gif').glob('*.gif')):
        g = Image.open(gif)
        fw, fh = g.size
        durations = []
        for i in range(g.n_frames):
            g.seek(i)
            durations.append(int(g.info.get('duration', 100) or 100))
        sheet_path = anim_dir / 'spritesheets' / (gif.stem + '.png')
        frames = []
        if sheet_path.exists():
            sheet = Image.open(sheet_path).convert('RGBA')
            for i in range(sheet.width // fw):
                frames.append(sheet.crop((i * fw, 0, (i + 1) * fw, fh)))
        else:
            for i in range(g.n_frames):
                g.seek(i)
                frames.append(g.convert('RGBA').copy())
        if not frames:
            continue
        # recorte comum a todos os quadros (para não "pular")
        box = None
        for f in frames:
            b = f.getbbox()
            if b:
                box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
        if not box:
            continue
        frames = [f.crop(box) for f in frames]
        while len(durations) < len(frames):
            durations.append(durations[-1] if durations else 100)
        items.append((nice_name(gif.stem), frames, durations[: len(frames)]))
    # atlas: cada objeto é uma tira com os quadros lado a lado
    AW = 2048
    order = sorted(range(len(items)), key=lambda i: -items[i][1][0].height)
    x = y = shelf = 0
    place = {}
    for i in order:
        fw, fh = items[i][1][0].size
        w = fw * len(items[i][1])
        if x + w > AW:
            x, y, shelf = 0, y + shelf + 1, 0
        place[i] = (x, y)
        x += w + 1
        shelf = max(shelf, fh)
    atlas = Image.new('RGBA', (AW, y + shelf + 1), (0, 0, 0, 0))
    anims = []
    for i, (name, frames, durations) in enumerate(items):
        px, py = place[i]
        fw, fh = frames[0].size
        for k, f in enumerate(frames):
            atlas.paste(f, (px + k * fw, py))
        same = len(set(durations)) == 1
        anims.append([i + 1, px, py, fw, fh, len(frames), durations[0] if same else durations, name])
    atlas.save(out_dir / 'AN.png', optimize=True)
    catalog['anims'] = anims
    catalog['themes']['AN'] = {'label': 'Animados', 'size': [AW, atlas.height]}
    print(f'AN  Animados                {len(anims)} objetos, atlas {AW}x{atlas.height}')

# ---- personagens (2_Characters/Character_Generator, 16x16): uma camada por arquivo, desenhadas nessa ordem:
# corpo → olhos → roupa → cabelo → acessório. Só as 6 primeiras linhas da folha (parado, andando, dormindo e sentado)
# e as 24 primeiras colunas (6 quadros x 4 direções) vão para o site.
gen = base.parent.parent / '2_Characters' / 'Character_Generator'
if gen.exists():
    char_dir = out_dir / 'char'
    if char_dir.exists():
        for old in char_dir.rglob('*.png'):
            old.unlink()
    chars = {}
    for kind, folder in [('body', 'Bodies'), ('eyes', 'Eyes'), ('outfit', 'Outfits'), ('hair', 'Hairstyles'), ('acc', 'Accessories')]:
        src_dir = gen / folder / '16x16'
        if not src_dir.exists():
            continue
        (char_dir / kind).mkdir(parents=True, exist_ok=True)
        stems = []
        for f in sorted(src_dir.glob('*.png')):
            im = Image.open(f).convert('RGBA').crop((0, 0, 384, 192))
            if not im.getbbox():
                continue
            im.save(char_dir / kind / f.name, optimize=True)
            stems.append(f.stem)
        chars[kind] = stems
    catalog['chars'] = chars
    print('personagens:', {k: len(v) for k, v in chars.items()})

# ---- balões de emoção (4_User_Interface_Elements): ícones 16x16 em pares (2 quadros)
emotes = base.parent.parent / '4_User_Interface_Elements' / 'UI_thinking_emotes_animation_16x16.png'
if emotes.exists():
    Image.open(emotes).save(out_dir / 'emotes.png', optimize=True)
    print('balões de emoção: ok')

# ---- paredes e pisos (blocos de 3x2 quadradinhos)
rb = base / 'Room_Builder_subfiles'


def blocks(path, xs, ys):
    sheet = Image.open(path).convert('RGBA')
    found = []
    for y in ys:
        for x in xs:
            piece = sheet.crop((x, y, x + 48, y + 32))
            if piece.getbbox() and sum(1 for p in piece.getdata() if p[3] >= 128) > 48 * 32 * 0.9:
                found.append([x, y, main_color(piece)])
    return sheet, found


if rb.exists():
    walls_png, walls = blocks(rb / 'Room_Builder_Walls_16x16.png', [0, 176, 352], range(0, 640, 32))
    floors_png, floors = blocks(rb / 'Room_Builder_Floors_16x16.png', [0, 64, 128, 192], range(32, 640, 32))
    walls_png.save(out_dir / 'walls.png', optimize=True)
    floors_png.save(out_dir / 'floors.png', optimize=True)
    catalog['walls'] = walls
    catalog['floors'] = floors
    print(f'paredes: {len(walls)}  pisos: {len(floors)}')

(root / 'src/lib/limezuCatalog.json').write_text(json.dumps(catalog, separators=(',', ':')), encoding='utf-8')
print(f'total: {total} desenhos, {len(catalog["groups"])} móveis')
