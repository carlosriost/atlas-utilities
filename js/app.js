// Atlas Utilities — enrutador, paleta de búsqueda y arranque.
import { cargarTodo, D, esc } from './datos.js';
import { instalarDelegacion, cerrarFuente } from './ui.js';
import { buscarRegistros, buscarCorpus, NOMBRE_TABLA, resaltar } from './busqueda.js';
import * as V from './vistas.js';

const app = document.getElementById('app');

const RUTAS = {
  '': V.inicio, equipos: V.equipos, equipo: V.equipo, sistema: V.equipo, materiales: V.materiales, repuestos: V.repuestos,
  mantenimiento: V.mantenimiento, condiciones: V.condiciones, seguridad: V.seguridad, reglas: V.reglas,
  compatibilidad: V.compatibilidad, contradicciones: V.contradicciones, expediente: V.expediente,
  banco: V.banco, documentos: V.documentos, doc: V.documento, verificacion: V.verificacion, buscar: V.buscar,
};
const TITULOS = { '': 'Inicio', equipos: 'Equipos', equipo: 'Equipo', sistema: 'Sistema', materiales: 'Materiales', repuestos: 'Repuestos', mantenimiento: 'Mantenimiento', condiciones: 'Condiciones', seguridad: 'Seguridad', reglas: 'Reglas', compatibilidad: 'Compatibilidad', contradicciones: 'Contradicciones', expediente: 'Expediente', banco: 'Banco de pruebas', documentos: 'Documentos', doc: 'Documento', verificacion: 'Verificación', buscar: 'Buscar' };

function ruta() {
  const h = location.hash.replace(/^#\/?/, '');
  const [camino, qs] = h.split('?');
  const partes = camino.split('/').map(decodeURIComponent);
  return { vista: partes[0] || '', id: partes[1], params: new URLSearchParams(qs || '') };
}

async function render() {
  const { vista, id, params } = ruta();
  const fn = RUTAS[vista] || V.inicio;
  cerrarFuente();
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('activo', a.getAttribute('href') === '#/' + vista));
  document.title = `${TITULOS[vista] || 'Atlas'} · Atlas Utilities`;
  app.innerHTML = '';
  try { await fn(app, params, id); }
  catch (e) { console.error(e); app.innerHTML = `<div class="vacio">No se pudo mostrar esta vista: ${esc(e.message)}</div>`; }
  if (!params.has('keep')) window.scrollTo(0, 0);
}

// ---------------- paleta de búsqueda (Ctrl/⌘ K) ----------------
const paleta = document.getElementById('paleta'), velo = document.getElementById('velo'), inp = document.getElementById('paleta-input'), res = document.getElementById('paleta-res'), estado = document.getElementById('paleta-estado');
let sel = 0, items = [], turno = 0;
function abrirPaleta() { paleta.classList.add('abierta'); velo.classList.add('abierto'); inp.value = ''; res.innerHTML = sugerencias(); items = [...res.querySelectorAll('.res')]; sel = 0; marcar(); inp.focus(); }
function cerrarPaleta() { paleta.classList.remove('abierta'); velo.classList.remove('abierto'); }
function sugerencias() {
  const ej = ['A193 B7', 'NBR amoníaco', 'Derakane', '74915792', 'ASME VIII', 'sello mecánico', 'EPDM HCl', 'certificado 3.1'];
  return `<div class="grupo">Prueba con</div>` + ej.map(q => `<a class="res" href="#/buscar?q=${encodeURIComponent(q)}"><span class="t">${esc(q)}</span></a>`).join('') +
    `<div class="grupo">Ir a</div>` + [['#/expediente', 'Armar un expediente de pieza'], ['#/contradicciones', 'Ver contradicciones'], ['#/banco', 'Correr el banco de pruebas']].map(([h, t]) => `<a class="res" href="${h}"><span class="t">${t}</span></a>`).join('');
}
function marcar() { items.forEach((x, i) => x.classList.toggle('activo', i === sel)); items[sel]?.scrollIntoView({ block: 'nearest' }); }
async function buscarPaleta() {
  const q = inp.value.trim(); const t = ++turno;
  if (q.length < 2) { res.innerHTML = sugerencias(); items = [...res.querySelectorAll('.res')]; sel = 0; marcar(); estado.textContent = ''; return; }
  const regs = buscarRegistros(q, 14);
  const eqs = D.equiposIdx.filter(e => e.nombre.toLowerCase().includes(q.toLowerCase())).slice(0, 4);
  let html = `<a class="res" href="#/buscar?q=${encodeURIComponent(q)}"><span class="t">Buscar «${esc(q)}» en todo</span><div class="d">${D.textoCompleto ? 'Registros verificados y texto completo de los documentos' : 'Todos los registros verificados'}</div></a>`;
  if (eqs.length) html += `<div class="grupo">Equipos</div>` + eqs.map(e => `<a class="res" href="#/sistema/${e.sistema}?eq=${encodeURIComponent(e.clave)}"><span class="t">${resaltar(esc(e.nombre), q)}</span></a>`).join('');
  if (regs.length) html += `<div class="grupo">Registros verificados</div>` + regs.map(x => `<a class="res" href="${hrefRegistro(x.t, x.r, q)}"><span class="t">${resaltar(esc(titulo(x.t, x.r)), q)}</span><div class="d">${esc(NOMBRE_TABLA[x.t])} · ${resaltar(esc(detalle(x.t, x.r)), q)}</div></a>`).join('');
  res.innerHTML = html; items = [...res.querySelectorAll('.res')]; sel = 0; marcar();
  if (!D.textoCompleto) { estado.textContent = `${regs.length} registros`; return; }
  estado.textContent = 'buscando en documentos…';
  const cor = await buscarCorpus(q, 6);
  if (t !== turno) return;
  estado.textContent = cor.total ? `${cor.total} páginas contienen todos los términos` : 'sin coincidencias en el texto completo';
  if (cor.paginas.length) {
    res.insertAdjacentHTML('beforeend', `<div class="grupo">Páginas de documentos</div>` + cor.paginas.map(p => `<a class="res" href="#/doc/${p.id}?p=${p.pagina}&q=${encodeURIComponent(q)}"><span class="t">${esc(p.doc.nombre)}</span><div class="d">${p.pagina ? 'pág. ' + p.pagina : 'archivo'} · ${esc(p.doc.sistema)}</div></a>`).join(''));
    items = [...res.querySelectorAll('.res')]; marcar();
  }
}
function titulo(t, r) { return ({ materiales: `${r.componente}: ${r.material}`, repuestos: `${r.parte} ${r.numero_parte || ''}`, compatibilidad: `${r.material} + ${r.quimico_fluido}: ${r.calificacion}`, mantenimiento: r.tarea, condiciones: `${r.parametro}: ${r.valor} ${r.unidad || ''}`, reglas_homologacion: r.regla, contradicciones: r.tema, seguridad: r.riesgo_o_requisito, preguntas: r.pregunta, equipos: r.nombre })[t] || ''; }
function detalle(t, r) { return t === 'materiales' ? [r.norma_grado, r.equipo].filter(Boolean).join(' · ') : (r.equipo || r.equipo_o_fabricante || r.respuesta || ''); }
function hrefRegistro(t, r, q) { const c = r.cita || r.cita_a; return D.textoCompleto ? `#/doc/${c.id}?p=${c.pagina}&q=${encodeURIComponent(q)}` : `#/buscar?q=${encodeURIComponent(q)}`; }

document.getElementById('abrir-buscar').onclick = abrirPaleta;
velo.onclick = cerrarPaleta;
let deb;
inp.oninput = () => { clearTimeout(deb); deb = setTimeout(buscarPaleta, 120); };
inp.onkeydown = e => {
  if (e.key === 'ArrowDown') { sel = Math.min(sel + 1, items.length - 1); marcar(); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { sel = Math.max(sel - 1, 0); marcar(); e.preventDefault(); }
  else if (e.key === 'Enter') { const a = items[sel]; if (a) { location.hash = a.getAttribute('href'); cerrarPaleta(); } e.preventDefault(); }
  else if (e.key === 'Escape') cerrarPaleta();
};
res.onclick = e => { if (e.target.closest('.res')) cerrarPaleta(); };
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); paleta.classList.contains('abierta') ? cerrarPaleta() : abrirPaleta(); }
  else if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); abrirPaleta(); }
});

// ---------------- tema ----------------
const raiz = document.documentElement;
try { const t = localStorage.getItem('atlas-tema'); if (t) raiz.dataset.theme = t; } catch (e) { }
document.getElementById('tema').onclick = () => {
  const oscuro = raiz.dataset.theme ? raiz.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  raiz.dataset.theme = oscuro ? 'light' : 'dark';
  try { localStorage.setItem('atlas-tema', raiz.dataset.theme); } catch (e) { }
};

// ---------------- arranque ----------------
app.innerHTML = '<div class="vacio">Cargando la base verificada…</div>';
instalarDelegacion();
cargarTodo().then(() => { window.addEventListener('hashchange', render); render(); })
  .catch(e => { app.innerHTML = `<div class="vacio">No se pudieron cargar los datos (${esc(e.message)}). Si abriste el archivo directamente, sirve la carpeta con un servidor web (GitHub Pages, o <code>python -m http.server</code>).</div>`; });
