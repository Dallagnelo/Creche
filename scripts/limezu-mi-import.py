"""Traz para o projeto TUDO do Modern Interiors (LimeZu) que dá para usar no jogo, na versão 16x16.

Uso (Python 3 + Pillow), apontando para a pasta raiz do pacote descompactado:
    python scripts/limezu-mi-import.py "C:/caminho/moderninteriors-win"

Resultado em public/limezu/mi/ (licença: repositório privado, nunca redistribuir o pacote):
  moveis/            todos os móveis soltos, juntos numa imagem por tema (com sombra)
  moveis-sem-sombra/ os mesmos, sem sombra
  moveis/index.json  onde cada móvel ficou: tema → número → [x, y, largura, altura]
  folhas/            as folhas originais por tema (como no pacote) e o Interiors_16x16 inteiro
  construcao/        Room Builder: paredes, pisos, bordas, rodapés, arcos, sombras de chão
  animados/          objetos animados (quadros lado a lado)
  personagens/       gerador de bonecos: corpos, olhos, roupas, cabelos, acessórios, celular, livros,
                     versões de criança e os 20 bonecos prontos
  interface/         UI do pacote e os emotes animados (gif → folha de quadros)
  salas/             salas prontas (6_Home_Designs): camada 1, camada 2 e prévia
  index.json         lista de tudo acima (para o jogo achar os arquivos)
Ficam de fora: as versões 32x32/48x48 (o jogo é 16 px), os arquivos .ase (fonte do Aseprite),
os gifs repetidos das folhas animadas, "Old stuff" e os bonecos antigos (Legacy).
"""
import json
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parent.parent
pack = Path(sys.argv[1])
out = root / 'public/limezu/mi'
if out.exists():
    shutil.rmtree(out)
out.mkdir(parents=True)
interiors = pack / '1_Interiors/16x16'
index = {}


def slug(text):
    text = re.sub(r'[^A-Za-z0-9]+', '_', text).strip('_').lower()
    return text


def save(img, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)


def copy_png(src, dst):
    save(Image.open(src), dst)


# ------------------------------------------------------------------ móveis soltos → uma imagem por tema
def pack_singles(folder, dest):
    themes = {}
    for theme_dir in sorted(folder.iterdir(), key=lambda p: int(re.match(r'\d+', p.name).group())):
        if not theme_dir.is_dir():
            continue
        # "18_Jail_Singles_Shadowless" → "jail" (o mesmo código nas duas versões)
        code = slug(re.sub(r'(_singles|_shadowless|^\d+_)', '', theme_dir.name, flags=re.I))
        sprites = []
        for f in theme_dir.glob('*.png'):
            n = int(re.search(r'(\d+)\.png$', f.name).group(1))
            img = Image.open(f).convert('RGBA')
            box = img.getbbox()
            if not box:
                continue
            sprites.append((n, img.crop(box), box))
        sprites.sort(key=lambda s: -s[1].height)
        W, x, y, shelf = 1024, 0, 0, 0
        place = {}
        for n, img, box in sprites:
            if x + img.width > W:
                x, y, shelf = 0, y + shelf + 1, 0
            place[n] = (x, y)
            x += img.width + 1
            shelf = max(shelf, img.height)
        atlas = Image.new('RGBA', (W, y + shelf + 1))
        rects = {}
        for n, img, box in sprites:
            px, py = place[n]
            atlas.paste(img, (px, py))
            # [x, y, w, h, dx, dy]: dx/dy = quanto o desenho estava deslocado no quadro original
            rects[n] = [px, py, img.width, img.height, box[0], box[1]]
        save(atlas, dest / f'{code}.png')
        themes[code] = {'file': f'{dest.name}/{code}.png', 'count': len(rects), 'sprites': {str(k): rects[k] for k in sorted(rects)}}
        print(dest.name, code, len(rects))
    return themes


moveis = pack_singles(interiors / 'Theme_Sorter_Singles', out / 'moveis')
sem_sombra = pack_singles(interiors / 'Theme_Sorter_Shadowless_Singles', out / 'moveis-sem-sombra')
(out / 'moveis/index.json').write_text(json.dumps({'com_sombra': moveis, 'sem_sombra': sem_sombra}, separators=(',', ':')))
# (o tema 1, "Generic", só vem como folha inteira: está em folhas/1_generic.png)
index['moveis'] = {k: {'file': v['file'], 'count': v['count'], 'sem_sombra': sem_sombra.get(k, {}).get('file')} for k, v in moveis.items()}

# ------------------------------------------------------------------ folhas originais por tema
index['folhas'] = {}
for f in sorted((interiors / 'Theme_Sorter').glob('*.png')):
    name = slug(re.sub(r'_16x16$', '', f.stem))
    copy_png(f, out / 'folhas' / f'{name}.png')
    index['folhas'][name] = f'folhas/{name}.png'
copy_png(interiors / 'Interiors_16x16.png', out / 'folhas/interiors_completo.png')
index['folhas']['interiors_completo'] = 'folhas/interiors_completo.png'

# ------------------------------------------------------------------ construção (Room Builder)
index['construcao'] = {}
for f in sorted((interiors / 'Room_Builder_subfiles').glob('*.png')):
    name = slug(f.stem.replace('Room_Builder_', '').replace('_16x16', ''))
    copy_png(f, out / 'construcao' / f'{name}.png')
    index['construcao'][name] = f'construcao/{name}.png'
copy_png(interiors / 'Room_Builder_16x16.png', out / 'construcao/completo.png')
index['construcao']['completo'] = 'construcao/completo.png'

# ------------------------------------------------------------------ objetos animados
def gif_frames(path):
    gif = Image.open(path)
    frames = []
    try:
        while True:
            frames.append(gif.convert('RGBA').copy())
            gif.seek(gif.tell() + 1)
    except EOFError:
        pass
    sheet = Image.new('RGBA', (frames[0].width * len(frames), frames[0].height))
    for i, fr in enumerate(frames):
        sheet.paste(fr, (i * fr.width, 0))
    return sheet, len(frames), frames[0].width, frames[0].height


index['animados'] = {}
sheets = pack / '3_Animated_objects/16x16/spritesheets'
for f in sorted(sheets.glob('*.png')) + sorted(sheets.glob('*.gif')):
    name = slug(f.stem.replace('aniamted_', 'animated_').replace('animated_', ''))
    if f.suffix == '.gif' and (sheets / f'{f.stem}.png').exists():
        continue
    while name in index['animados']:  # o pacote tem nomes quase iguais ("..._left" e "..._left_")
        name += '_b'
    if f.suffix == '.gif':
        img, frames, fw, fh = gif_frames(f)  # só veio em gif: vira folha de quadros
        save(img, out / 'animados' / f'{name}.png')
        index['animados'][name] = {'file': f'animados/{name}.png', 'w': img.width, 'h': img.height, 'frames': frames, 'fw': fw}
        continue
    img = Image.open(f)
    copy_png(f, out / 'animados' / f'{name}.png')
    index['animados'][name] = {'file': f'animados/{name}.png', 'w': img.width, 'h': img.height}

# ------------------------------------------------------------------ personagens (gerador)
gen = pack / '2_Characters/Character_Generator'
index['personagens'] = {}
for part, dest in [('Bodies', 'corpos'), ('Eyes', 'olhos'), ('Outfits', 'roupas'), ('Hairstyles', 'cabelos'),
                   ('Accessories', 'acessorios'), ('Smartphones', 'celulares'), ('Books', 'livros'),
                   ('Bodies_kids', 'corpos_criancas'), ('Eyes_kids', 'olhos_criancas'), ('Outfits_kids', 'roupas_criancas'),
                   ('Hairstyles_kids', 'cabelos_criancas'), ('0_Premade_Characters', 'prontos')]:
    files = []
    for f in sorted((gen / part / '16x16').glob('*.png')):
        name = slug(f.stem.replace('_16x16', ''))
        copy_png(f, out / 'personagens' / dest / f'{name}.png')
        files.append(f'personagens/{dest}/{name}.png')
    index['personagens'][dest] = files
    print('personagens', dest, len(files))
copy_png(gen / 'Spritesheet_animations_GUIDE.png', out / 'personagens/guia_animacoes.png')
index['personagens']['guia'] = 'personagens/guia_animacoes.png'

# ------------------------------------------------------------------ interface
ui = pack / '4_User_Interface_Elements'
index['interface'] = {}
for f in ['UI_16x16.png', 'UI_thinking_emotes_animation_16x16.png']:
    name = slug(f.replace('_16x16.png', ''))
    copy_png(ui / f, out / 'interface' / f'{name}.png')
    index['interface'][name] = f'interface/{name}.png'
for f in sorted((ui / 'Animated_Spritesheets').glob('*_16x16.gif')):
    sheet, frames, fw, fh = gif_frames(f)
    name = slug(f.stem.replace('UI_', '').replace('_16x16', ''))
    save(sheet, out / 'interface' / f'{name}.png')
    index['interface'][name] = {'file': f'interface/{name}.png', 'frames': frames, 'w': fw, 'h': fh}

# ------------------------------------------------------------------ salas prontas
index['salas'] = {}
for theme in sorted((pack / '6_Home_Designs').iterdir()):
    folder = theme / '16x16'
    if not folder.is_dir():
        continue
    tname = slug(theme.name.replace('_Designs', '').replace('_Home', ''))
    rooms = {}
    for f in sorted(folder.glob('*.png')):
        # o pacote escreve de vários jeitos: "_layer_1", "_Layer_1_16x16", "_Layer_2_", "_preview_16x16"
        m = re.match(r'(.+?)_(layer_[123]|preview)$', f.stem.lower().replace('_16x16', '').rstrip('_'))
        if not m:
            continue
        room = slug(m.group(1))
        layer = {'layer_1': 'chao', 'layer_2': 'objetos', 'layer_3': 'objetos_2', 'preview': 'previa'}[m.group(2)]
        copy_png(f, out / 'salas' / tname / f'{room}_{layer}.png')
        rooms.setdefault(room, {})[layer] = f'salas/{tname}/{room}_{layer}.png'
    index['salas'][tname] = rooms
    print('salas', tname, len(rooms))

(out / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=1))
print('ok')
