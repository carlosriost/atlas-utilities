// Motor de búsqueda de Atlas.
// 1) Registros verificados: ranking tipo BM25 sobre los campos de cada registro + su evidencia.
// 2) Texto completo de los documentos: índice invertido por página (data/index) con ranking por IDF.
// Las consultas en lenguaje natural se reducen a "conceptos" (sin palabras vacías) y cada concepto
// se expande con variantes (singular/plural, español↔inglés, códigos con o sin guion).
import { D, norm, postings, prefijos, textoPagina } from './datos.js';

const CAMPOS = {
  materiales: ['equipo', 'componente', 'material', 'norma_grado', 'fluido_servicio'],
  repuestos: ['equipo', 'parte', 'numero_parte', 'fabricante', 'cantidad', 'intervalo_reemplazo', 'criterio_reemplazo'],
  compatibilidad: ['material', 'quimico_fluido', 'concentracion_condicion', 'calificacion', 'equipo'],
  mantenimiento: ['equipo', 'tarea', 'frecuencia', 'criterio_aceptacion'],
  condiciones: ['equipo', 'parametro', 'valor', 'unidad'],
  reglas_homologacion: ['equipo_o_fabricante', 'tipo', 'regla'],
  contradicciones: ['tema', 'equipo', 'version_a', 'version_b'],
  seguridad: ['equipo', 'riesgo_o_requisito', 'detalle'],
  preguntas: ['pregunta', 'respuesta'],
  equipos: ['nombre', 'fabricante', 'modelo', 'serie', 'capacidad', 'servicio_fluido'],
};
export const NOMBRE_TABLA = {
  materiales: 'Materiales', repuestos: 'Repuestos', compatibilidad: 'Compatibilidad', mantenimiento: 'Mantenimiento', condiciones: 'Condiciones',
  reglas_homologacion: 'Reglas', contradicciones: 'Contradicciones', seguridad: 'Seguridad', preguntas: 'Banco de pruebas', equipos: 'Equipos',
};

const VACIAS = new Set(('a al algo algun alguna algunas alguno algunos ante antes aqui asi cada como con cual cuales cuando cuanto cuantos cuanta cuantas de del desde donde dos el ella ellas ellos en entre es esa ese eso esta estan este esto estos fue ha hay hace hacer la las le les lo los mas me mi mismo muy no nos o otra otro para pero poco por porque puede pueden que quien se segun ser si sin sobre son su sus tambien tan tanto te tiene tienen todo todos tu un una uno unos usa usar usan va y ya debo debe deben hay cual cuales llevan lleva tengo tiene pido pedir sirve sirven dice dicen indica segun usa queda quedan entre ' +
  'the of and or to in on for with by is are be as at an it this that from which what how when where').split(' '));

// Equivalencias español ↔ inglés para manuales en inglés (el concepto queda satisfecho con cualquiera de sus variantes).
const SIN = [
  ['empaque', 'empaquetadura', 'junta', 'gasket', 'packing'], ['sello', 'seal', 'sellos', 'seals'], ['tornillo', 'perno', 'bolt', 'screw', 'pernos', 'bolts', 'tornillos'],
  ['esparrago', 'esparragos', 'stud', 'studs', 'prisionero'], ['tuerca', 'tuercas', 'nut', 'nuts'], ['rodamiento', 'cojinete', 'bearing', 'bearings', 'rodamientos', 'cojinetes'],
  ['valvula', 'valvulas', 'valve', 'valves'], ['bomba', 'bombas', 'pump', 'pumps'], ['presion', 'pressure', 'presiones'], ['temperatura', 'temperature', 'temperaturas'],
  ['aceite', 'oil', 'lubricante', 'lubricant'], ['filtro', 'filter', 'filtros', 'filters'], ['cuerpo', 'body', 'carcasa', 'housing', 'casing', 'carcaza'], ['eje', 'shaft', 'vastago', 'stem'],
  ['diafragma', 'diaphragm', 'membrana', 'membrane'], ['resorte', 'muelle', 'spring'], ['torque', 'par', 'apriete', 'tightening'], ['material', 'materiales', 'materials'],
  ['repuesto', 'repuestos', 'spare', 'parts', 'part', 'parte', 'partes'], ['codigo', 'code', 'numero', 'number'], ['intervalo', 'frecuencia', 'interval', 'every', 'cada'],
  ['reemplazo', 'reemplazar', 'cambio', 'cambiar', 'replace', 'replacement', 'sustituir'], ['brida', 'bridas', 'flange', 'flanges', 'contrabrida'],
  ['tuberia', 'tubo', 'pipe', 'piping', 'tubing'], ['acero', 'steel'], ['inoxidable', 'inox', 'stainless', 'aisi', 'ss'], ['hierro', 'iron', 'fundicion', 'cast'],
  ['laton', 'brass'], ['amoniaco', 'nh3', 'ammonia'], ['soda', 'naoh', 'caustica', 'hidroxido'], ['acido', 'hcl', 'clorhidrico'], ['certificado', 'certificate', 'certificados', 'mtr'],
  ['prueba', 'test', 'pruebas', 'ensayo'], ['hidrostatica', 'hydrostatic', 'hidraulica'], ['garantia', 'warranty'], ['original', 'genuino', 'genuine', 'originales'],
  ['quemador', 'burner'], ['caldera', 'boiler'], ['compresor', 'compressor'], ['secador', 'dryer'], ['sonda', 'probe', 'sensor'], ['actuador', 'actuator', 'servo'],
  ['refractario', 'refractory'], ['aislamiento', 'insulation'], ['soldadura', 'welding', 'weld'], ['espesor', 'thickness'], ['diametro', 'diameter'],
];
const MAPA_SIN = new Map();
for (const g of SIN) for (const w of g) MAPA_SIN.set(w, g);

function raiz(w) { // singular aproximado
  if (w.length > 5 && w.endsWith('es')) return w.slice(0, -2);
  if (w.length > 4 && w.endsWith('s')) return w.slice(0, -1);
  return w;
}
export function tokens(q) {
  return norm(q).split(/[\s,;:¿?¡!()"«»]+/).map(s => s.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')).filter(s => s.length >= 2);
}
// Conceptos: tokens útiles con sus variantes
export function conceptos(q) {
  const out = [];
  for (const t of tokens(q)) {
    if (VACIAS.has(t)) continue;
    if (t.length < 2) continue;
    const v = new Set([t, raiz(t)]);
    for (const s of (MAPA_SIN.get(t) || MAPA_SIN.get(raiz(t)) || [])) v.add(s);
    const m = t.match(/^([a-z]+)[\-.]?(\d[\w\-.]*)$/); // a193 ↔ a-193
    if (m) { v.add(m[1] + m[2]); v.add(m[1] + '-' + m[2]); }
    out.push({ t, v: [...v].filter(x => x.length >= 2) });
  }
  return out;
}

// ---------------------------------------------------------------- registros
let indice = null, df = null, N = 0;
function construir() {
  indice = []; df = new Map();
  for (const [t, campos] of Object.entries(CAMPOS)) {
    for (const r of (D[t] || [])) {
      const texto = norm(campos.map(c => r[c] || '').join(' | '));
      const ev = norm(r.evidencia || r.evidencia_a || '');
      const palabras = new Set((texto + ' ' + ev).split(/[^a-z0-9\-.\/]+/).filter(Boolean).map(w => w.replace(/[.\-\/]+$/, '')));
      const compacto = texto.replace(/[\s\-.\/]/g, '');
      indice.push({ t, r, texto, ev, palabras, compacto });
      for (const w of palabras) df.set(w, (df.get(w) || 0) + 1);
    }
  }
  N = indice.length;
}
const idf = w => Math.log(1 + N / (1 + (df.get(w) || 0)));
function contiene(it, v) {
  if (it.palabras.has(v)) return 2;          // palabra completa
  if (v.length >= 4 && (it.texto.includes(v) || it.ev.includes(v))) return 1; // subcadena
  if (/[a-z]/.test(v) && /\d/.test(v) && it.compacto.includes(v.replace(/[\-.\/]/g, ''))) return 2; // código con espacios
  return 0;
}
export function buscarRegistros(q, max = 40, { excluir = [] } = {}) {
  if (!indice) construir();
  const cs = conceptos(q);
  if (!cs.length) return [];
  const frase = norm(q).trim();
  const pesos = cs.map(c => Math.max(...c.v.map(idf)));
  const sumaPesos = pesos.reduce((a, b) => a + b, 0);
  const minimo = cs.length <= 2 ? sumaPesos * 0.99 : sumaPesos * 0.45; // consultas cortas: todos los conceptos; largas: ~la mitad del peso
  const out = [];
  for (const it of indice) {
    if (excluir.includes(it.t)) continue;
    let s = 0, enCampos = 0;
    cs.forEach((c, i) => {
      let mejor = 0;
      for (const v of c.v) { const k = contiene(it, v); if (k > mejor) mejor = k; if (mejor === 2) break; }
      if (mejor) { s += pesos[i] * (mejor === 2 ? 1 : 0.7); if (c.v.some(v => it.texto.includes(v))) enCampos++; }
    });
    if (s < minimo || !s) continue;
    s += enCampos * 0.4;
    if (frase.length > 5 && (it.texto.includes(frase) || it.ev.includes(frase))) s += 4;
    out.push({ ...it, score: s });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, max);
}

// ---------------------------------------------------------------- texto completo
const TOTAL_PAGINAS = () => (D.verificacion && D.verificacion.paginas) || 12000;
export async function buscarCorpus(q, max = 30) {
  const cs = conceptos(q).filter(c => c.t.length >= 3 || /\d/.test(c.t));
  if (!cs.length) return { paginas: [], total: 0, terminos: [] };
  const puntaje = new Map(), cubre = new Map();
  const usados = [];
  for (const [i, c] of cs.entries()) {
    const vistos = new Map();
    for (const v of c.v) {
      if (v.length < 3) continue;
      let p = await postings(v);
      if (!p.length && v === c.t && v.length >= 5) { // prefijo si la palabra exacta no existe
        for (const t2 of await prefijos(v, 4)) for (const x of await postings(t2)) vistos.set(x, Math.max(vistos.get(x) || 0, 0.8));
        continue;
      }
      for (const x of p) vistos.set(x, 1);
    }
    if (!vistos.size) continue;
    usados.push(c.t);
    const w = Math.log(1 + TOTAL_PAGINAS() / vistos.size);
    for (const [x, f] of vistos) { puntaje.set(x, (puntaje.get(x) || 0) + w * f); cubre.set(x, (cubre.get(x) || 0) + 1); }
  }
  if (!puntaje.size) return { paginas: [], total: 0, terminos: usados };
  const necesarios = usados.length <= 2 ? usados.length : Math.ceil(usados.length * 0.5);
  let lista = [...puntaje.entries()].filter(([x]) => cubre.get(x) >= necesarios);
  const total = lista.length;
  lista.sort((a, b) => b[1] - a[1]);
  const paginas = lista.slice(0, max * 2).map(([x, s]) => { const [id, pg] = x.split(':'); return { id, pagina: +pg, doc: D.docPorId[id], score: s, cubre: cubre.get(x) }; })
    .filter(x => x.doc).slice(0, max);
  return { paginas, total, terminos: usados };
}

export async function fragmento(id, pagina, q, largo = 180) {
  const txt = await textoPagina(id, pagina);
  if (!txt) return '';
  const vs = conceptos(q).flatMap(c => c.v).filter(t => t.length >= 3).sort((a, b) => b.length - a.length);
  const n = norm(txt);
  let pos = -1;
  for (const tk of vs) { const i = n.indexOf(tk); if (i >= 0) { pos = i; break; } }
  if (pos < 0) pos = 0;
  const ini = Math.max(0, pos - 60), fin = Math.min(txt.length, ini + largo);
  return (ini > 0 ? '…' : '') + txt.slice(ini, fin).replace(/\s+/g, ' ') + (fin < txt.length ? '…' : '');
}

export function resaltar(textoHtml, q) {
  const vs = [...new Set(conceptos(q).flatMap(c => c.v))].filter(t => t.length >= 2).sort((a, b) => b.length - a.length);
  if (!vs.length) return textoHtml;
  const patron = vs.map(tk => tk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').split('').map(c => {
    const m = { a: 'aáàAÁÀ', e: 'eéèEÉÈ', i: 'iíìIÍÌ', o: 'oóòOÓÒ', u: 'uúùüUÚÙÜ', n: 'nñNÑ' }[c];
    return m ? `[${m}]` : (/[a-z]/.test(c) ? `[${c}${c.toUpperCase()}]` : c);
  }).join('')).join('|');
  const re = new RegExp(`(?<![A-Za-z0-9])(${patron})(?![^<]*>)`, 'g');
  return textoHtml.replace(re, '<mark>$1</mark>');
}
