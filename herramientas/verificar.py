#!/usr/bin/env python3
"""Verificación independiente de la base de Atlas Utilities.

Comprueba, solo con los archivos publicados en data/, que cada registro:
  1. cita un documento que existe en data/documentos.json,
  2. cita una página que existe en el texto de ese documento (data/doc/<id>.json),
  3. tiene una frase de evidencia que aparece en esa página.

Uso:  python3 herramientas/verificar.py            (desde la raíz del repositorio)
Sale con código 1 si algún registro falla.
"""
import json, os, re, sys, unicodedata

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
DATA = os.path.join(RAIZ, 'data')
TABLAS = ['equipos', 'materiales', 'repuestos', 'compatibilidad', 'mantenimiento', 'condiciones',
          'reglas_homologacion', 'contradicciones', 'seguridad', 'preguntas']


def norm(s):
    s = unicodedata.normalize('NFKC', (s or '').replace('\ufffd', '\u25a1'))
    s = s.replace(' ', ' ').replace('’', "'").replace('“', '"').replace('”', '"').replace('–', '-').replace('—', '-')
    return re.sub(r'\s+', ' ', s).strip().lower()


_cache = {}
def paginas(doc_id):
    if doc_id not in _cache:
        p = os.path.join(DATA, 'doc', doc_id[0] + '.json')
        shard = json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}
        _cache[doc_id] = {int(k): norm(v) for k, v in shard[doc_id].items()} if doc_id in shard else None
    return _cache[doc_id]


def comprobar(cita, evidencia, docs):
    if not cita or cita.get('id') not in docs:
        return 'documento inexistente'
    pg = paginas(cita['id'])
    if pg is None:
        return 'sin texto publicado (build sin texto completo)'
    n = int(cita.get('pagina', 0))
    texto = pg.get(n) if n in pg else (' '.join(pg.values()) if n == 0 else None)
    if texto is None:
        return f'página {n} inexistente'
    ev = norm(evidencia)
    if len(ev) < 12:
        return 'evidencia muy corta'
    if ev in texto:
        return 'exacta'
    tok = [w for w in ev.split() if len(w) > 2]
    if len(tok) >= 4 and sum(w in texto for w in tok) / len(tok) >= 0.9:
        return 'aproximada'
    return 'evidencia no encontrada'


def main():
    if not os.path.isdir(os.path.join(DATA, 'doc')):
        print('Esta es la versión pública: no incluye el texto de los documentos (data/doc), así que la evidencia')
        print('no se puede comparar aquí. Corre este script sobre la versión interna completa.')
        return 0
    docs = {d['id']: d for d in json.load(open(os.path.join(DATA, 'documentos.json'), encoding='utf-8'))}
    total = fallos = 0
    resumen = {}
    for t in TABLAS:
        p = os.path.join(DATA, t + '.json')
        if not os.path.exists(p):
            continue
        filas = json.load(open(p, encoding='utf-8'))
        c = {'exacta': 0, 'aproximada': 0, 'falla': 0}
        for r in filas:
            total += 1
            pares = [(r.get('cita_a'), r.get('evidencia_a')), (r.get('cita_b'), r.get('evidencia_b'))] if 'cita_a' in r else [(r.get('cita'), r.get('evidencia'))]
            res = [comprobar(ci, ev, docs) for ci, ev in pares]
            if all(x == 'exacta' for x in res): c['exacta'] += 1
            elif all(x in ('exacta', 'aproximada') for x in res): c['aproximada'] += 1
            else:
                c['falla'] += 1; fallos += 1
                print(f'  FALLA {t} {r.get("id")}: {res}')
        resumen[t] = c
        print(f'{t:22s} {len(filas):5d} registros  exactos {c["exacta"]:5d}  aproximados {c["aproximada"]:3d}  fallas {c["falla"]}')
    print(f'\nTotal {total} registros, {fallos} fallas.')
    return 1 if fallos else 0


if __name__ == '__main__':
    sys.exit(main())
