#!/usr/bin/env python3
"""Genera la versión pública de Atlas (para GitHub Pages) en la carpeta indicada.

Copia la aplicación y los registros verificados, pero NO el texto completo de los documentos
(data/doc, data/pages, data/index) ni los scripts de construcción. Marca la versión como pública.

Uso:  python3 herramientas/preparar_publico.py ../atlas-publico
"""
import json, os, shutil, sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
EXCLUIR = {os.path.join('data', 'doc'), os.path.join('data', 'pages'), os.path.join('data', 'index'), 'build', '.git'}


def main():
    if len(sys.argv) < 2:
        print(__doc__); return 1
    dst = os.path.abspath(sys.argv[1])
    os.makedirs(dst, exist_ok=True)
    for base, dirs, files in os.walk(RAIZ):
        rel = os.path.relpath(base, RAIZ)
        dirs[:] = [d for d in dirs if os.path.normpath(os.path.join(rel, d)) not in EXCLUIR]
        for f in files:
            src = os.path.join(base, f)
            out = os.path.join(dst, rel, f)
            os.makedirs(os.path.dirname(out), exist_ok=True)
            shutil.copy2(src, out)
    p = os.path.join(dst, 'data', 'verificacion.json')
    v = json.load(open(p, encoding='utf-8'))
    v['texto_completo'] = False
    json.dump(v, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('Versión pública lista en', dst)
    return 0


if __name__ == '__main__':
    sys.exit(main())
