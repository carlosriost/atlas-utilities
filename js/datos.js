// Carga y utilidades de datos. Todo es estático: JSON servidos junto a la página.
const BASE = new URL('.', import.meta.url).href.replace(/js\/$/, '');
const cache = new Map();

export async function cargar(ruta) {
  if (cache.has(ruta)) return cache.get(ruta);
  const p = fetch(BASE + ruta).then(r => { if (!r.ok) throw new Error(ruta + ' ' + r.status); return r.json(); }).catch(e => { cache.delete(ruta); throw e; });
  cache.set(ruta, p);
  return p;
}

export const D = {};   // datos cargados en memoria

export async function cargarTodo() {
  const nombres = ['sistemas', 'documentos', 'equipos', 'materiales', 'repuestos', 'compatibilidad', 'mantenimiento', 'condiciones', 'reglas_homologacion', 'contradicciones', 'seguridad', 'preguntas', 'verificacion'];
  const res = await Promise.all(nombres.map(n => cargar(`data/${n}.json`).catch(() => (n === 'verificacion' ? {} : []))));
  nombres.forEach((n, i) => D[n] = res[i]);
  D.docPorId = Object.fromEntries(D.documentos.map(d => [d.id, d]));
  D.docPorPath = Object.fromEntries(D.documentos.map(d => [d.path, d]));
  D.sistemaPorId = Object.fromEntries(D.sistemas.map(x => [x.id, x]));
  // Versión pública: sin texto completo de los documentos (solo registros con su evidencia)
  D.textoCompleto = D.verificacion.texto_completo !== false;
  // equipos (componentes nombrados) dentro de cada sistema, a partir del campo libre `equipo`
  const eq = new Map();
  const tablas = ['materiales', 'repuestos', 'mantenimiento', 'condiciones', 'reglas_homologacion', 'seguridad', 'compatibilidad', 'contradicciones'];
  for (const t of tablas) for (const r of D[t]) {
    const nombre = (r.equipo || r.equipo_o_fabricante || '').trim() || 'General';
    const k = r.sistema + '/' + clave(nombre);
    if (!eq.has(k)) eq.set(k, { clave: k, sistema: r.sistema, nombre, area: r.area, conteo: {}, registros: 0 });
    const e = eq.get(k); e.conteo[t] = (e.conteo[t] || 0) + 1; e.registros++;
  }
  D.equiposIdx = [...eq.values()].sort((a, b) => b.registros - a.registros);
  return D;
}

export function clave(s) {
  return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
export function norm(s) {
  return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ /g, ' ').replace(/[’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').toLowerCase();
}
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export const AREAS = {
  calderas: 'Calderas',
  maquinaria: 'Frío, CO₂ y aire comprimido',
  residuales: 'Aguas residuales',
  desmineralizador: 'Desmineralizador',
};

// Texto de una página citada (solo páginas citadas están exportadas en data/pages; el documento completo en data/doc)
export async function textoPagina(docId, pagina) {
  if (!D.textoCompleto) return null;
  try {
    const p = (await cargar(`data/pages/${docId[0]}.json`))[docId];
    if (p && p[String(pagina)] != null) return p[String(pagina)];
  } catch (e) { /* sin páginas citadas en este fragmento */ }
  const d = await documentoCompleto(docId);
  return d[String(pagina)] ?? (pagina === 0 ? Object.values(d).join('\n') : null);
}
export async function documentoCompleto(docId) { const s = await cargar(`data/doc/${docId[0]}.json`); if (!s[docId]) throw new Error('sin texto'); return s[docId]; }

// Índice de términos sobre todo el corpus: data/index/<2 letras>.json → { termino: ["docid:pag", ...] }
export async function postings(termino) {
  if (!D.textoCompleto) return [];
  const t = norm(termino).replace(/[^a-z0-9\-\./]/g, '');
  if (t.length < 3) return [];
  const shard = t.slice(0, 1).replace(/[^a-z0-9]/g, '_');
  try {
    const s = await cargar(`data/index/${shard}.json`);
    return s[t] || [];
  } catch (e) { return []; }
}
export async function prefijos(termino, max = 8) {
  const t = norm(termino).replace(/[^a-z0-9\-\./]/g, '');
  if (t.length < 3) return [];
  const shard = t.slice(0, 1).replace(/[^a-z0-9]/g, '_');
  try {
    const s = await cargar(`data/index/${shard}.json`);
    return Object.keys(s).filter(k => k.startsWith(t)).sort((a, b) => a.length - b.length).slice(0, max);
  } catch (e) { return []; }
}
