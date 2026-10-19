// Componentes de interfaz: chip de cita, panel de fuente, etiquetas, tablas con filtros.
import { D, esc, norm, textoPagina, AREAS } from './datos.js';

export function docDe(cita) { return D.docPorId[cita.id] || D.docPorPath[cita.doc]; }

export function chipCita(cita, evidencia, aprox) {
  if (!cita) return '';
  const d = docDe(cita);
  const nombre = d ? d.nombre : cita.doc.split('/').pop();
  const pg = +cita.pagina ? `pág. ${cita.pagina}` : 'archivo';
  const attr = `data-doc="${esc(d ? d.id : cita.id)}" data-pag="${esc(cita.pagina)}" data-ev="${esc(evidencia || '')}"`;
  return `<button type="button" class="cita${aprox ? ' aprox' : ''}" ${attr} title="${esc(cita.doc)} · ${pg}${aprox ? ' · evidencia verificada por aproximación' : ''}"><span class="nom">${esc(nombre)}</span> <span class="pg">${pg}</span></button>`;
}
export function evid(r) {
  const ev = r.evidencia || r.evidencia_a;
  return ev ? `<div class="evid">«${esc(ev)}»</div>` : '';
}
export function etqArea(a) { return `<span class="etq area">${esc(AREAS[a] || a)}</span>`; }
export function etqCalif(c) {
  const k = String(c || '').trim().toUpperCase();
  const cls = ['A', 'B', 'C', 'D', 'E'].includes(k) ? k.toLowerCase() : 'n';
  const txt = { A: 'A · excelente', B: 'B · bueno', C: 'C · regular', D: 'D · no recomendable', E: 'E · sin dato' }[k] || c;
  return `<span class="etq ${cls}">${esc(txt)}</span>`;
}
export function etqTipoRegla(t) {
  const m = { 'solo original': 'rojo', 'modificacion prohibida': 'rojo', 'certificado requerido': 'teal', 'norma de diseño': 'teal', 'prueba requerida': 'teal', 'procedimiento aprobacion': 'ambar', 'fabricable local': 'verde' };
  return `<span class="etq ${m[norm(t)] || m[t] || 'n'}">${esc(t)}</span>`;
}

// ---- panel lateral con el texto de la página y la evidencia resaltada ----
const panel = () => document.getElementById('panel');
export async function abrirFuente(docId, pagina, evidencia) {
  const d = D.docPorId[docId];
  const P = panel();
  P.classList.add('abierto');
  document.getElementById('panel-titulo').textContent = d ? d.nombre : docId;
  document.getElementById('panel-ruta').textContent = (d ? d.path : '') + (+pagina ? `  ·  página ${pagina}` : '');
  const T = document.getElementById('panel-texto');
  T.textContent = 'Cargando la página…';
  let txt = null;
  try { txt = await textoPagina(docId, +pagina || 0); } catch (e) { txt = null; }
  if (txt == null && !D.textoCompleto) {
    T.innerHTML = `<div style="font-family:var(--f-tex);font-size:14px;white-space:normal">${evidencia ? `<p><b>Frase del documento</b> (verificada contra el texto de esta página):</p><div class="evid" style="font-size:15px">«${esc(evidencia)}»</div>` : ''}<p style="margin-top:16px">Esta versión pública no incluye el texto completo de los manuales. Para leer la página entera, abre el archivo original en la carpeta de la planta:</p><p class="mono pequeno" style="word-break:break-all">${esc(d ? d.path : docId)}</p><p>Página <b>${+pagina || '(archivo sin páginas)'}</b>.</p></div>`;
  }
  else if (txt == null) { T.textContent = 'No se encontró el texto de esta página.'; }
  else {
    let html = esc(txt);
    if (evidencia) {
      const i = buscarAprox(txt, evidencia);
      if (i) html = esc(txt.slice(0, i[0])) + '<mark>' + esc(txt.slice(i[0], i[1])) + '</mark>' + esc(txt.slice(i[1]));
    }
    T.innerHTML = html;
    const m = T.querySelector('mark'); if (m) m.scrollIntoView({ block: 'center' });
    else T.scrollTop = 0;
  }
  const pie = document.getElementById('panel-pie');
  pie.innerHTML = (D.textoCompleto ? `<span>Texto extraído del documento${d && d.ocr_pages ? ' (puede incluir OCR)' : ''}.</span>` : '<span>Versión pública: solo la frase de evidencia.</span>') +
    (d && D.textoCompleto ? `<a href="#/doc/${d.id}?p=${+pagina || 0}" class="boton sec" style="padding:4px 9px;font-size:12.5px">Abrir documento completo</a>` : '') +
    (evidencia ? `<button type="button" id="copiar-cita">Copiar cita</button>` : '');
  const b = document.getElementById('copiar-cita');
  if (b) b.onclick = () => { navigator.clipboard?.writeText(`«${evidencia}» — ${d ? d.path : docId}, pág. ${pagina}`); b.textContent = 'Copiada'; };
}
export function cerrarFuente() { panel().classList.remove('abierto'); }

// Encuentra la evidencia en el texto ignorando acentos, mayúsculas y espacios múltiples; devuelve [ini, fin] en el texto original.
export function buscarAprox(texto, ev) {
  const mapa = []; let n = '';
  const src = texto.normalize('NFKD');
  // construir texto normalizado con mapa de posiciones (sobre texto original, no el NFKD; aproximación suficiente)
  let prevSpace = false;
  for (let i = 0; i < texto.length; i++) {
    let ch = texto[i].normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
    ch = ch.replace(/ /g, ' ').replace(/[’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-');
    if (/\s/.test(ch)) { if (prevSpace) continue; ch = ' '; prevSpace = true; } else prevSpace = false;
    for (const c of ch) { n += c; mapa.push(i); }
  }
  const e = norm(ev).replace(/\s+/g, ' ').trim();
  let k = n.indexOf(e);
  if (k < 0) {
    // intento con las primeras 6 palabras
    const parte = e.split(' ').slice(0, 6).join(' ');
    if (parte.length >= 12) k = n.indexOf(parte);
    if (k < 0) return null;
    return [mapa[k], mapa[Math.min(k + parte.length, mapa.length) - 1] + 1];
  }
  return [mapa[k], mapa[Math.min(k + e.length, mapa.length) - 1] + 1];
}

// delegación global: cualquier .cita abre el panel
export function instalarDelegacion() {
  document.addEventListener('click', e => {
    const c = e.target.closest('.cita');
    if (c) { e.preventDefault(); abrirFuente(c.dataset.doc, c.dataset.pag, c.dataset.ev); }
  });
  document.getElementById('panel-cerrar').onclick = cerrarFuente;
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarFuente(); });
}

// ---- tabla filtrable genérica ----
export function tablaFiltrable({ cont, filas, columnas, filtros = [], texto = true, vacio = 'Sin registros.', nombreCSV }) {
  const estado = { q: '', f: {} };
  const tools = document.createElement('div'); tools.className = 'filtros';
  if (texto) {
    const inp = document.createElement('input'); inp.type = 'search'; inp.placeholder = 'Filtrar…';
    inp.oninput = () => { estado.q = norm(inp.value); pintar(); }; tools.appendChild(inp);
  }
  for (const f of filtros) {
    const sel = document.createElement('select');
    const vals = [...new Set(filas.map(r => f.valor(r)).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
    sel.innerHTML = `<option value="">${esc(f.etiqueta)}: todos</option>` + vals.map(v => `<option value="${esc(v)}">${esc(f.mostrar ? f.mostrar(v) : v)}</option>`).join('');
    sel.onchange = () => { estado.f[f.etiqueta] = sel.value; pintar(); };
    tools.appendChild(sel);
    f._sel = sel;
  }
  const cuenta = document.createElement('span'); cuenta.className = 'cuenta'; tools.appendChild(cuenta);
  const csv = document.createElement('button'); csv.type = 'button'; csv.className = 'boton sec no-imprimir'; csv.textContent = 'Descargar CSV'; csv.style.padding = '6px 12px';
  csv.onclick = () => descargarCSV(actuales, nombreCSV || 'atlas'); tools.appendChild(csv);
  let actuales = filas;
  const env = document.createElement('div'); env.className = 'tabla-env';
  cont.appendChild(tools); cont.appendChild(env);
  function pintar() {
    let rs = filas;
    for (const f of filtros) { const v = estado.f[f.etiqueta]; if (v) rs = rs.filter(r => String(f.valor(r)) === v); }
    if (estado.q) { const toks = estado.q.split(/\s+/).filter(Boolean); rs = rs.filter(r => { const t = norm(JSON.stringify(r)); return toks.every(tk => t.includes(tk)); }); }
    actuales = rs;
    cuenta.textContent = `${rs.length} de ${filas.length}`;
    if (!rs.length) { env.innerHTML = `<div class="vacio">${esc(vacio)}</div>`; return; }
    const LIM = 400;
    env.innerHTML = `<table class="tabla"><thead><tr>${columnas.map(c => `<th>${esc(c.t)}</th>`).join('')}</tr></thead><tbody>${rs.slice(0, LIM).map(r => `<tr>${columnas.map(c => `<td class="${c.cls || ''}">${c.v(r)}</td>`).join('')}</tr>`).join('')}</tbody></table>` +
      (rs.length > LIM ? `<div class="vacio">Se muestran ${LIM} de ${rs.length}. Afina el filtro para ver el resto.</div>` : '');
  }
  pintar();
  return { pintar, estado, filtros };
}

// CSV con todas las columnas de datos + documento, página y evidencia (separador ; para Excel en español)
export function descargarCSV(filas, nombre) {
  if (!filas.length) return;
  const omitir = new Set(['cita', 'cita_a', 'cita_b', 'porcion', 'id']);
  const claves = [...new Set(filas.flatMap(r => Object.keys(r)))].filter(k => !omitir.has(k) && !k.startsWith('evidencia'));
  const cab = [...claves, 'documento', 'pagina', 'evidencia'];
  const q = v => { const s = v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v)); return '"' + s.replace(/"/g, '""') + '"'; };
  const lineas = [cab.join(';'), ...filas.map(r => { const c = r.cita || r.cita_a || {}; return [...claves.map(k => q(r[k])), q(c.doc), q(c.pagina), q(r.evidencia || r.evidencia_a)].join(';'); })];
  const blob = new Blob(['\ufeff' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${nombre}.csv`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
