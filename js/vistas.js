// Vistas de la aplicación. Cada función recibe el contenedor y los parámetros de la ruta.
import { D, esc, norm, clave, AREAS, documentoCompleto } from './datos.js';
import { chipCita, evid, etqArea, etqCalif, etqTipoRegla, tablaFiltrable, buscarAprox } from './ui.js';
import { buscarRegistros, buscarCorpus, fragmento, resaltar, NOMBRE_TABLA, tokens } from './busqueda.js';

const cita = r => chipCita(r.cita, r.evidencia, r.verificacion === 'aproximada');
const n = x => (x ?? 0).toLocaleString('es-CO');
// Nota de un registro: las inferencias se marcan para que nunca se confundan con el dato citado
const notaHtml = r => !r.nota ? '' : `<div class="pequeno mudo" style="margin-top:4px">${esc(r.nota).replace(/(Inferencia:)/g, '<span class="etq ambar" title="Dato no literal: interpretación de quien extrajo el registro">inferencia</span>').replace(/(Formato en el documento:)/g, '<span class="etq n">formato en el documento</span>')}</div>`;

// ------------------------------------------------------------------ INICIO
export function inicio(cont) {
  const V = D.verificacion || {};
  const porArea = a => D.sistemas.filter(e => e.area === a).length;
  const regs = a => ['materiales', 'repuestos', 'mantenimiento', 'condiciones', 'reglas_homologacion', 'seguridad'].reduce((s, t) => s + D[t].filter(r => r.area === a).length, 0);
  cont.innerHTML = `
  <section class="hero">
    <div class="hero-texto">
      <h1>Qué material, qué norma, qué repuesto — y en qué página lo dice.</h1>
      <p class="lead">Atlas reúne lo que los manuales, planos, certificados y dossiers de Utilities dicen sobre materiales y repuestos. Cada dato se comprobó contra el texto original antes de entrar; si no se pudo comprobar, no está.</p>
      <p class="no-imprimir"><button class="boton" id="hero-buscar" type="button">${D.textoCompleto ? `Buscar en los ${n(V.documentos)} documentos` : 'Buscar en la base'}</button> <a class="boton sec" href="#/expediente" style="display:inline-block">Armar un expediente</a></p>
      <div class="hoja" style="margin-top:18px"><div class="cuerpo" style="padding:10px 14px">${esquema({ calderas: [porArea('calderas'), regs('calderas')], maquinaria: [porArea('maquinaria'), regs('maquinaria')], residuales: [porArea('residuales'), regs('residuales')], desmineralizador: [porArea('desmineralizador'), regs('desmineralizador')] })}</div></div>
    </div>
    <div>
      <div class="sello">
        <h2>Sello de verificación · ${esc(V.fecha || '')}</h2>
        <div class="cifras">
          <div class="cifra"><b>${n(V.registros)}</b><span>registros con cita y evidencia</span></div>
          <div class="cifra"><b>${n(V.exactos)}</b><span>coincidencia literal con la fuente</span></div>
          <div class="cifra"><b>${n(V.aproximados)}</b><span>coincidencia aproximada (≥ 90 % de palabras)</span></div>
          <div class="cifra"><b>${n(V.documentos)}</b><span>documentos leídos</span></div>
          <div class="cifra"><b>${n(V.paginas)}</b><span>páginas de texto, ${n(V.paginas_ocr)} por OCR</span></div>
          <div class="cifra"><b>${n(V.descartados)}</b><span>registros descartados por no verificarse</span></div>
        </div>
        <div class="pie">Cómo se verifica: un script busca la frase de evidencia de cada registro en el texto de la página citada. Los que no aparecen quedan fuera. <a href="#/verificacion">Ver el método</a></div>
      </div>
      <div class="grid-3" style="grid-template-columns:1fr;margin-top:14px">
        ${(() => { const cr = cruceQuimico(D.compatibilidad.filter(r => /^[A-E]$/i.test(String(r.calificacion).trim()))); return cr.length ? `<div class="hoja acceso" style="border-color:var(--rojo)"><h3>${cr.length} componentes para revisar</h3><p>Materiales instalados que la tabla de compatibilidad del mismo proyecto califica como no recomendables para el químico que manejan.</p><a class="ir" href="#/compatibilidad?keep=1" onclick="setTimeout(()=>document.getElementById('cruce')?.scrollIntoView(),300)">Ver el cruce</a></div>` : ''; })()}
        <div class="hoja acceso"><h3>Contradicciones entre documentos</h3><p>${n(D.contradicciones.length)} casos en que dos fuentes dicen cosas distintas del mismo equipo. La herramienta las muestra; no las resuelve sola.</p><a class="ir" href="#/contradicciones">Ver contradicciones</a></div>
        <div class="hoja acceso"><h3>Banco de pruebas</h3><p>${n(D.preguntas.length)} preguntas reales de técnicos con respuesta y cita. Puedes correr la prueba contra el buscador aquí mismo.</p><a class="ir" href="#/banco">Correr la prueba</a></div>
      </div>
    </div>
  </section>
  <section class="grid-3">
    <div class="hoja acceso"><h3>${n(D.materiales.length)} materiales por componente</h3><p>Cuerpos, internos, tubería, bridas, pernos, sellos, elastómeros y recubrimientos con su norma o grado.</p><a class="ir" href="#/materiales">Explorar materiales</a></div>
    <div class="hoja acceso"><h3>${n(D.repuestos.length)} repuestos con número de parte</h3><p>Kits, consumibles e intervalos de reemplazo tal como los publica cada fabricante.</p><a class="ir" href="#/repuestos">Explorar repuestos</a></div>
    <div class="hoja acceso"><h3>${n(D.reglas_homologacion.length)} reglas de homologación</h3><p>Qué piezas exigen original, qué certificados pide cada norma y cómo se aprobó un material en la planta.</p><a class="ir" href="#/reglas">Ver reglas</a></div>
    <div class="hoja acceso"><h3>${n(D.condiciones.length)} condiciones de operación</h3><p>Presiones, temperaturas, caudales, torques y set-points que limitan qué material o repuesto sirve.</p><a class="ir" href="#/condiciones">Ver condiciones</a></div>
    <div class="hoja acceso"><h3>${n(D.mantenimiento.length)} tareas de mantenimiento</h3><p>Frecuencias, inspecciones y criterios de aceptación de cada fabricante.</p><a class="ir" href="#/mantenimiento">Ver mantenimiento</a></div>
    <div class="hoja acceso"><h3>${n(D.seguridad.length)} requisitos de seguridad</h3><p>Lo que los documentos exigen antes de intervenir: bloqueo, despresurización, gas, amoníaco, químicos.</p><a class="ir" href="#/seguridad">Ver seguridad</a></div>
  </section>`;
  document.getElementById('hero-buscar').onclick = () => document.getElementById('abrir-buscar').click();
}

function esquema(c) {
  const nodo = (x, y, w, id, t1, t2) => `<a class="nodo" href="#/equipos?area=${id}"><rect x="${x}" y="${y}" width="${w}" height="54" rx="6"/><text x="${x + 12}" y="${y + 22}">${esc(t1)}</text><text class="sub" x="${x + 12}" y="${y + 40}">${esc(t2)}</text></a>`;
  const sub = (a) => `${c[a][0]} ${c[a][0] === 1 ? 'sistema' : 'sistemas'} · ${n(c[a][1])} datos`;
  const linea = (d) => `<path class="tubo" d="${d}"/><path class="flujo" d="${d}"/>`;
  return `<svg class="esquema" viewBox="0 0 640 262" role="img" aria-label="Esquema de servicios: el agua pasa por el desmineralizador hacia las calderas; la PTAR entrega biogás a la caldera 5 y agua al terciario para reúso; frío, CO₂ y aire comprimido van a proceso">
    ${linea('M30 47 H110')}<text class="eti" x="30" y="39">agua</text>
    ${nodo(110, 20, 170, 'desmineralizador', 'Desmineralizador', sub('desmineralizador'))}
    ${linea('M280 47 H340')}
    ${nodo(340, 20, 170, 'calderas', 'Calderas', sub('calderas'))}
    <path class="tubo vapor" d="M510 47 H610"/><text class="eti" x="522" y="39">vapor a planta</text>
    ${linea('M425 150 V74')}<text class="eti" x="433" y="116">biogás</text>
    ${linea('M610 177 H510')}<text class="eti" x="522" y="169">agua residual</text>
    ${nodo(340, 150, 170, 'residuales', 'PTAR y terciario', sub('residuales'))}
    ${linea('M425 204 V232')}<text class="eti" x="433" y="226">agua tratada a reúso</text>
    ${nodo(110, 150, 170, 'maquinaria', 'Frío, CO₂ y aire', sub('maquinaria'))}
    ${linea('M110 177 H30')}<text class="eti" x="30" y="169">a proceso</text>
    <text class="eti" x="30" y="254">Pulsa un bloque para ver sus sistemas. Los conteos son registros verificados.</text>
  </svg>`;
}

// ------------------------------------------------------------------ BUSCAR
export async function buscar(cont, params) {
  const q = params.get('q') || '';
  cont.innerHTML = `<div class="cabecera"><div><h1>Buscar</h1><p>${D.textoCompleto ? `Busca en los registros verificados y, aparte, en el texto de los ${n(D.documentos.length)} documentos (códigos, normas, números de parte, tags).` : 'Busca en los registros verificados: materiales, normas, números de parte, condiciones, reglas y preguntas.'}</p></div></div>
  <form class="filtros" id="f-busq"><input type="search" name="q" value="${esc(q)}" placeholder="p. ej. A193 B7 · 74915792 · NBR amoníaco · V1V6PCV01 · Derakane"><button class="boton" type="submit">Buscar</button></form>
  <div class="busq-cols"><div id="b-reg"></div><div id="b-cor"></div></div>`;
  document.getElementById('f-busq').onsubmit = e => { e.preventDefault(); location.hash = '#/buscar?q=' + encodeURIComponent(new FormData(e.target).get('q')); };
  if (!q.trim()) return;
  const R = document.getElementById('b-reg'), C = document.getElementById('b-cor');
  const regs = buscarRegistros(q, 60);
  R.innerHTML = `<h2>Registros verificados <small class="mudo">${regs.length}</small></h2>` + (regs.length ? regs.map(x => tarjetaRegistro(x.t, x.r, q)).join('') : '<div class="vacio">Ningún registro contiene todos los términos.</div>');
  if (!D.textoCompleto) { C.innerHTML = `<h2>En el texto de los documentos</h2><div class="vacio">Esta versión pública no incluye el texto completo de los manuales. La versión interna sí busca en las ${n(D.verificacion.paginas)} páginas.</div>`; return; }
  C.innerHTML = `<h2>En el texto de los documentos</h2><div class="vacio">Buscando…</div>`;
  const cor = await buscarCorpus(q, 40);
  if (!cor.paginas.length) { C.innerHTML = `<h2>En el texto de los documentos</h2><div class="vacio">Ningún documento contiene todos los términos.${cor.terminos?.some(t => t.length > 1) ? ' Se probaron variantes: ' + esc(cor.terminos.flat().join(', ')) : ''}</div>`; return; }
  C.innerHTML = `<h2>En el texto de los documentos <small class="mudo">${cor.total} páginas; se muestran ${cor.paginas.length}</small></h2>` + cor.paginas.map(p => `<div class="hoja" style="padding:10px 12px;margin-bottom:8px" data-id="${p.id}" data-p="${p.pagina}"><div><b>${esc(p.doc.nombre)}</b> <span class="mudo pequeno">${esc(p.doc.sistema)}</span></div><div class="pequeno mudo">${esc(p.doc.path)}</div><div class="snippet">…</div><div style="margin-top:6px">${chipCita({ id: p.id, doc: p.doc.path, pagina: p.pagina }, '')}</div></div>`).join('');
  for (const el of C.querySelectorAll('[data-id]')) {
    const frag = await fragmento(el.dataset.id, +el.dataset.p, q, 220);
    el.querySelector('.snippet').innerHTML = resaltar(esc(frag), q);
    el.querySelector('.cita').dataset.ev = tokens(q).join(' ');
  }
}

export function tarjetaRegistro(t, r, q) {
  const rs = s => q ? resaltar(esc(s ?? ''), q) : esc(s ?? '');
  let cuerpo = '';
  switch (t) {
    case 'materiales': cuerpo = `<div class="t">${rs(r.componente)} — <span class="mat">${rs(r.material)}</span></div><div class="d">${r.norma_grado ? `<code>${rs(r.norma_grado)}</code> · ` : ''}${rs(r.equipo)}${r.fluido_servicio ? ' · ' + rs(r.fluido_servicio) : ''}</div>`; break;
    case 'repuestos': cuerpo = `<div class="t">${rs(r.parte)} <code>${rs(r.numero_parte)}</code></div><div class="d">${rs(r.fabricante)} · ${rs(r.equipo)}${r.intervalo_reemplazo ? ' · ' + rs(r.intervalo_reemplazo) : ''}</div>`; break;
    case 'compatibilidad': cuerpo = `<div class="t">${rs(r.material)} + ${rs(r.quimico_fluido)} ${etqCalif(r.calificacion)}</div><div class="d">${rs(r.concentracion_condicion || '')} ${rs(r.equipo || '')}</div>`; break;
    case 'mantenimiento': cuerpo = `<div class="t">${rs(r.tarea)}</div><div class="d">${rs(r.frecuencia)} · ${rs(r.equipo)}${r.criterio_aceptacion ? ' · ' + rs(r.criterio_aceptacion) : ''}</div>`; break;
    case 'condiciones': cuerpo = `<div class="t">${rs(r.parametro)}: ${rs(r.valor)} ${rs(r.unidad || '')}</div><div class="d">${rs(r.equipo)}</div>`; break;
    case 'reglas_homologacion': cuerpo = `<div class="t">${etqTipoRegla(r.tipo)} ${rs(r.equipo_o_fabricante)}</div><div class="d">${rs(r.regla)}</div>`; break;
    case 'contradicciones': cuerpo = `<div class="t">Contradicción: ${rs(r.tema)}</div><div class="d">${rs(r.version_a)} ⇄ ${rs(r.version_b)}</div>`; break;
    case 'seguridad': cuerpo = `<div class="t">${rs(r.riesgo_o_requisito)}</div><div class="d">${rs(r.detalle)} · ${rs(r.equipo)}</div>`; break;
    case 'preguntas': cuerpo = `<div class="t">${rs(r.pregunta)}</div><div class="d">${rs(r.respuesta)}</div>`; break;
    case 'equipos': cuerpo = `<div class="t">${rs(r.nombre)}</div><div class="d">${rs([r.fabricante, r.modelo, r.serie].filter(Boolean).join(' · '))}</div>`; break;
  }
  const c = t === 'contradicciones' ? chipCita(r.cita_a, r.evidencia_a) + ' ' + chipCita(r.cita_b, r.evidencia_b) : cita(r);
  return `<div class="hoja" style="padding:10px 12px;margin-bottom:8px"><div class="pequeno mudo" style="font-family:var(--f-tit);font-weight:600">${esc(NOMBRE_TABLA[t])}</div>${cuerpo}<div style="margin-top:6px">${c}</div></div>`;
}

// ------------------------------------------------------------------ SISTEMAS Y EQUIPOS
const TABLAS_EQ = ['materiales', 'repuestos', 'condiciones', 'mantenimiento', 'reglas_homologacion', 'seguridad', 'compatibilidad', 'contradicciones'];
export function equipos(cont, params) {
  const area = params.get('area') || '';
  const lista = D.sistemas.filter(s => !area || s.area === area);
  cont.innerHTML = `<div class="cabecera"><div><h1>Sistemas</h1><p>Cada sistema reúne lo que dicen sus documentos: materiales, repuestos, condiciones, mantenimiento, reglas y contradicciones, con la cita de cada dato.</p></div></div>
  <div class="filtros">${['', ...Object.keys(AREAS)].map(a => `<a class="etq ${a === area ? 'teal' : 'area'}" href="#/equipos${a ? '?area=' + a : ''}" style="padding:5px 10px">${a ? AREAS[a] : 'Todas las áreas'}</a>`).join('')}<span class="cuenta">${lista.length} sistemas</span></div>
  <div class="grid-equipos">${lista.map(s => { const tot = Object.values(s.conteo).reduce((a, b) => a + b, 0); return `<a class="hoja eq-card" href="#/sistema/${s.id}"><div>${etqArea(s.area)}</div><h3>${esc(s.nombre)}</h3><div class="meta">${esc(s.descripcion)}</div><div class="conteo"><span><b>${n(tot)}</b> datos verificados</span><span><b>${n(s.documentos)}</b> documentos</span><span><b>${n(s.paginas)}</b> páginas</span></div></a>`; }).join('')}</div>`;
}

export function equipo(cont, params, id) {
  const S = D.sistemaPorId[id];
  if (!S) { cont.innerHTML = '<div class="vacio">Sistema no encontrado.</div>'; return; }
  const eqs = D.equiposIdx.filter(e => e.sistema === id);
  const fichas = D.equipos.filter(r => r.sistema === id);
  const docs = D.documentos.filter(d => d.sid === id);
  let filtroEq = params.get('eq') || '';
  cont.innerHTML = `<div class="cabecera"><div>${etqArea(S.area)}<h1>${esc(S.nombre)}</h1><p>${esc(S.descripcion)}</p></div><a class="boton" href="#/expediente?sistema=${id}">Armar expediente de una pieza</a></div>
  ${fichas.length ? `<section class="seccion" style="margin-top:0"><h2>Placas y datos de equipo <small>${fichas.length}</small></h2><div class="tabla-env"><table class="tabla"><thead><tr><th>Equipo</th><th>Fabricante y modelo</th><th>Serie</th><th>Capacidad / servicio</th><th>Fuente</th></tr></thead><tbody>${fichas.map((f, i) => `<tr class="${i >= 8 ? 'oculta-placa' : ''}"><td><b>${esc(f.nombre)}</b></td><td>${esc([f.fabricante, f.modelo].filter(Boolean).join(' · '))}</td><td class="cod">${esc(f.serie || '')}</td><td>${esc([f.capacidad, f.servicio_fluido, f.anio].filter(Boolean).join(' · '))}</td><td>${cita(f)}</td></tr>`).join('')}</tbody></table></div>${fichas.length > 8 ? `<p><button type="button" class="boton sec" id="ver-placas">Ver las ${fichas.length} placas</button></p>` : ''}</section>` : ''}
  <section class="seccion"><h2>Componentes y equipos citados <small>${eqs.length}</small></h2><div class="filtros" id="s-eqs"></div></section>
  <div id="s-cuerpo"></div>
  <section class="seccion"><h2>Documentos del sistema <small>${docs.length}</small></h2><details class="hoja" style="padding:10px 14px"><summary>Ver la lista</summary><ul class="pequeno">${docs.map(d => `<li><a href="#/doc/${d.id}">${esc(d.nombre)}</a> <span class="mudo">${d.pages ? d.pages + ' p.' : d.ext}${d.citas ? ' · ' + d.citas + ' citas' : ''}</span></li>`).join('')}</ul></details></section>`;
  const pintarChips = () => {
    document.getElementById('s-eqs').innerHTML = `<button type="button" class="etq ${!filtroEq ? 'teal' : 'area'}" data-k="" style="padding:5px 10px;border:0;cursor:pointer">Todos</button>` + eqs.map(e => `<button type="button" class="etq ${filtroEq === e.clave ? 'teal' : 'area'}" data-k="${esc(e.clave)}" style="padding:5px 10px;border:0;cursor:pointer">${esc(e.nombre)} <span class="mudo">${e.registros}</span></button>`).join('');
    document.querySelectorAll('#s-eqs button').forEach(b => b.onclick = () => { filtroEq = b.dataset.k; pintarChips(); pintarCuerpo(); });
  };
  const pintarCuerpo = () => {
    const de = t => D[t].filter(r => r.sistema === id && (!filtroEq || (r.sistema + '/' + clave(r.equipo || r.equipo_o_fabricante || 'General')) === filtroEq));
    const mats = de('materiales'), reps = de('repuestos'), conds = de('condiciones'), mant = de('mantenimiento'), reg = de('reglas_homologacion'), seg = de('seguridad'), comp = de('compatibilidad'), contra = de('contradicciones');
    const sec = (tit, rows, html) => rows.length ? `<section class="seccion"><h2>${tit} <small>${rows.length}</small></h2>${html}</section>` : '';
    const tabla = (cols, rows) => `<div class="tabla-env"><table class="tabla"><thead><tr>${cols.map(c => `<th>${c.t}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${cols.map(c => `<td class="${c.cls || ''}">${c.v(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    const eqCol = filtroEq ? [] : [{ t: 'Equipo', cls: 'eq', v: r => esc(r.equipo || r.equipo_o_fabricante || '') }];
    document.getElementById('s-cuerpo').innerHTML =
      sec('Materiales por componente', mats, tabla([...eqCol, { t: 'Componente', v: r => esc(r.componente) }, { t: 'Material', v: r => `<span class="mat">${esc(r.material)}</span>${r.norma_grado ? `<span class="norma">${esc(r.norma_grado)}</span>` : ''}` }, { t: 'Servicio', v: r => esc([r.fluido_servicio, r.presion_max, r.temperatura_max].filter(Boolean).join(' · ')) }, { t: 'Fuente', v: r => cita(r) + notaHtml(r) }], mats)) +
      sec('Repuestos', reps, tabla([...eqCol, { t: 'Parte', v: r => esc(r.parte) }, { t: 'Nº de parte', cls: 'cod', v: r => esc(r.numero_parte || '—') }, { t: 'Cantidad / intervalo', v: r => esc([r.cantidad, r.intervalo_reemplazo, r.criterio_reemplazo].filter(Boolean).join(' · ')) }, { t: 'Fuente', v: cita }], reps)) +
      sec('Condiciones de diseño y operación', conds, tabla([...eqCol, { t: 'Parámetro', v: r => esc(r.parametro) }, { t: 'Valor', v: r => `<b>${esc(r.valor)}</b> ${esc(r.unidad || '')}` }, { t: 'Fuente', v: cita }], conds)) +
      sec('Compatibilidad y reglas de material', comp, tabla([{ t: 'Material', v: r => esc(r.material) }, { t: 'Fluido / químico', v: r => esc(r.quimico_fluido) }, { t: 'Calificación', v: r => etqCalif(r.calificacion) }, { t: 'Condición', v: r => esc(r.concentracion_condicion || '') }, { t: 'Fuente', v: cita }], comp)) +
      sec('Mantenimiento e inspección', mant, tabla([...eqCol, { t: 'Tarea', v: r => esc(r.tarea) }, { t: 'Frecuencia', v: r => esc(r.frecuencia) }, { t: 'Criterio', v: r => esc(r.criterio_aceptacion || '') }, { t: 'Fuente', v: cita }], mant)) +
      sec('Reglas de homologación y calidad', reg, reg.map(r => `<div class="hoja" style="padding:10px 12px;margin-bottom:8px">${etqTipoRegla(r.tipo)} <span class="mudo pequeno">${esc(r.equipo_o_fabricante || '')}</span><div>${esc(r.regla)}</div><div style="margin-top:6px">${cita(r)}</div></div>`).join('')) +
      sec('Seguridad y permisos', seg, seg.map(r => `<div class="hoja" style="padding:10px 12px;margin-bottom:8px"><b>${esc(r.riesgo_o_requisito)}</b> — ${esc(r.detalle)}<div style="margin-top:6px">${cita(r)}</div></div>`).join('')) +
      sec('Contradicciones documentadas', contra, contra.map(tarjetaContra).join(''));
  };
  pintarChips(); pintarCuerpo();
  const vp = document.getElementById('ver-placas');
  if (vp) vp.onclick = () => { document.querySelectorAll('.oculta-placa').forEach(t => t.classList.remove('oculta-placa')); vp.remove(); };
}

// ------------------------------------------------------------------ TABLAS
export function materiales(cont) {
  cont.innerHTML = `<div class="cabecera"><div><h1>Materiales por componente</h1><p>Cada fila es un componente con el material que indica un documento de la planta o del fabricante. La norma o grado aparece tal como está escrita en la fuente.</p></div></div>`;
  tablaFiltrable({ cont, nombreCSV: 'atlas-materiales', filas: D.materiales, filtros: [{ etiqueta: 'Área', valor: r => r.area, mostrar: v => AREAS[v] }, { etiqueta: 'Sistema', valor: r => r.sistema, mostrar: v => D.sistemaPorId[v]?.nombre || v }],
    columnas: [{ t: 'Equipo', cls: 'eq', v: r => `<a href="#/sistema/${r.sistema}">${esc(r.equipo || '')}</a><div class="pequeno mudo">${esc(D.sistemaPorId[r.sistema]?.nombre || '')}</div>` }, { t: 'Componente', v: r => esc(r.componente) }, { t: 'Material', v: r => `<span class="mat">${esc(r.material)}</span>${r.norma_grado ? `<span class="norma">${esc(r.norma_grado)}</span>` : ''}` }, { t: 'Servicio', v: r => esc([r.fluido_servicio, r.presion_max, r.temperatura_max].filter(Boolean).join(' · ')) }, { t: 'Fuente', v: r => cita(r) + notaHtml(r) }] });
}
export function repuestos(cont) {
  cont.innerHTML = `<div class="cabecera"><div><h1>Repuestos y consumibles</h1><p>Números de parte, kits e intervalos de reemplazo tal como los publica cada fabricante. Antes de pedir, confirma modelo y serie del equipo instalado.</p></div></div>`;
  tablaFiltrable({ cont, nombreCSV: 'atlas-repuestos', filas: D.repuestos, filtros: [{ etiqueta: 'Área', valor: r => r.area, mostrar: v => AREAS[v] }, { etiqueta: 'Sistema', valor: r => r.sistema, mostrar: v => D.sistemaPorId[v]?.nombre || v }, { etiqueta: 'Fabricante', valor: r => r.fabricante }],
    columnas: [{ t: 'Equipo', cls: 'eq', v: r => `<a href="#/sistema/${r.sistema}">${esc(r.equipo || '')}</a><div class="pequeno mudo">${esc(D.sistemaPorId[r.sistema]?.nombre || '')}</div>` }, { t: 'Parte', v: r => esc(r.parte) + (r.consumible ? ' <span class="etq n">consumible</span>' : '') }, { t: 'Nº de parte', cls: 'cod', v: r => esc(r.numero_parte || '—') }, { t: 'Fabricante', v: r => esc(r.fabricante || '') }, { t: 'Cantidad / intervalo / criterio', v: r => esc([r.cantidad, r.intervalo_reemplazo, r.criterio_reemplazo].filter(Boolean).join(' · ')) }, { t: 'Fuente', v: cita }] });
}
export function mantenimiento(cont) {
  cont.innerHTML = `<div class="cabecera"><div><h1>Mantenimiento e inspección</h1><p>Tareas, frecuencias y criterios de aceptación.</p></div></div>`;
  tablaFiltrable({ cont, nombreCSV: 'atlas-mantenimiento', filas: D.mantenimiento, filtros: [{ etiqueta: 'Área', valor: r => r.area, mostrar: v => AREAS[v] }, { etiqueta: 'Sistema', valor: r => r.sistema, mostrar: v => D.sistemaPorId[v]?.nombre || v }],
    columnas: [{ t: 'Equipo', cls: 'eq', v: r => `<a href="#/sistema/${r.sistema}">${esc(r.equipo || '')}</a><div class="pequeno mudo">${esc(D.sistemaPorId[r.sistema]?.nombre || '')}</div>` }, { t: 'Tarea', v: r => esc(r.tarea) }, { t: 'Frecuencia', v: r => esc(r.frecuencia) }, { t: 'Criterio', v: r => esc(r.criterio_aceptacion || '') }, { t: 'Fuente', v: cita }] });
}
export function condiciones(cont) {
  cont.innerHTML = `<div class="cabecera"><div><h1>Condiciones de diseño y operación</h1><p>Presiones, temperaturas, caudales y set-points que limitan qué material o repuesto sirve.</p></div></div>`;
  tablaFiltrable({ cont, nombreCSV: 'atlas-condiciones', filas: D.condiciones, filtros: [{ etiqueta: 'Área', valor: r => r.area, mostrar: v => AREAS[v] }, { etiqueta: 'Sistema', valor: r => r.sistema, mostrar: v => D.sistemaPorId[v]?.nombre || v }],
    columnas: [{ t: 'Equipo', cls: 'eq', v: r => `<a href="#/sistema/${r.sistema}">${esc(r.equipo || '')}</a><div class="pequeno mudo">${esc(D.sistemaPorId[r.sistema]?.nombre || '')}</div>` }, { t: 'Parámetro', v: r => esc(r.parametro) }, { t: 'Valor', v: r => `<b>${esc(r.valor)}</b> ${esc(r.unidad || '')}` }, { t: 'Fuente', v: cita }] });
}
export function seguridad(cont) {
  cont.innerHTML = `<div class="cabecera"><div><h1>Seguridad y permisos</h1><p>Lo que los documentos exigen antes de intervenir o reemplazar un componente. Los procedimientos HSE propios de la planta no están en este archivo.</p></div></div>`;
  tablaFiltrable({ cont, nombreCSV: 'atlas-seguridad', filas: D.seguridad, filtros: [{ etiqueta: 'Área', valor: r => r.area, mostrar: v => AREAS[v] }, { etiqueta: 'Sistema', valor: r => r.sistema, mostrar: v => D.sistemaPorId[v]?.nombre || v }],
    columnas: [{ t: 'Equipo', cls: 'eq', v: r => `<a href="#/sistema/${r.sistema}">${esc(r.equipo || '')}</a><div class="pequeno mudo">${esc(D.sistemaPorId[r.sistema]?.nombre || '')}</div>` }, { t: 'Riesgo o requisito', v: r => `<b>${esc(r.riesgo_o_requisito)}</b>` }, { t: 'Detalle', v: r => esc(r.detalle) }, { t: 'Fuente', v: cita }] });
}
export function reglas(cont) {
  cont.innerHTML = `<div class="cabecera"><div><h1>Reglas de homologación y calidad</h1><p>Restricciones de los fabricantes, certificados y pruebas que exigen las normas, y el procedimiento con que la planta aprobó materiales. Decide si una pieza se puede fabricar u homologar.</p></div></div>
  <div class="leyenda">${['solo original', 'modificacion prohibida', 'certificado requerido', 'norma de diseño', 'prueba requerida', 'procedimiento aprobacion', 'fabricable local'].map(etqTipoRegla).join(' ')}</div>`;
  tablaFiltrable({ cont, nombreCSV: 'atlas-reglas_homologacion', filas: D.reglas_homologacion, filtros: [{ etiqueta: 'Tipo', valor: r => r.tipo }, { etiqueta: 'Área', valor: r => r.area, mostrar: v => AREAS[v] }, { etiqueta: 'Equipo o fabricante', valor: r => r.equipo_o_fabricante }],
    columnas: [{ t: 'Tipo', v: r => etqTipoRegla(r.tipo) }, { t: 'Equipo o fabricante', cls: 'eq', v: r => esc(r.equipo_o_fabricante) }, { t: 'Regla', v: r => esc(r.regla) }, { t: 'Fuente', v: cita }] });
}

// ------------------------------------------------------------------ COMPATIBILIDAD
export function compatibilidad(cont) {
  const rows = D.compatibilidad;
  const tablas = rows.filter(r => /^[A-E]$/i.test(String(r.calificacion).trim()));
  const mats = [...new Set(tablas.map(r => r.material))].sort((a, b) => a.localeCompare(b));
  const qs = [...new Set(tablas.map(r => r.quimico_fluido))].sort((a, b) => a.localeCompare(b));
  const celda = (m, q) => tablas.filter(r => r.material === m && r.quimico_fluido === q);
  cont.innerHTML = `<div class="cabecera"><div><h1>Compatibilidad química</h1><p>La matriz viene de las tablas de compatibilidad incluidas en los proyectos (calificación A–E). Debajo, las reglas de material por fluido que dan los fabricantes. Pulsa una celda para ver la fuente.</p></div></div>
  <div class="leyenda">${['A', 'B', 'C', 'D', 'E'].map(etqCalif).join(' ')}</div>
  <div class="tabla-env ajuste"><table class="matriz"><thead><tr><th>Material</th>${qs.map(q => `<th>${esc(q)}</th>`).join('')}</tr></thead><tbody>${mats.map(m => `<tr><th>${esc(m)}</th>${qs.map(q => { const c = celda(m, q); if (!c.length) return '<td></td>'; const k = c[0].calificacion.toUpperCase(); return `<td class="${k.toLowerCase()}"><button type="button" class="cita" data-doc="${esc(c[0].cita.id)}" data-pag="${esc(c[0].cita.pagina)}" data-ev="${esc(c[0].evidencia)}" title="${esc(c[0].concentracion_condicion || '')}">${k}</button></td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
  <section class="seccion" id="cruce"></section>
  <section class="seccion"><h2>Reglas de material por fluido <small>${rows.length - tablas.length}</small></h2><div id="comp-reglas"></div></section>`;
  pintarCruce(tablas);
  tablaFiltrable({ nombreCSV: 'atlas-compatibilidad', cont: document.getElementById('comp-reglas'), filas: rows.filter(r => !tablas.includes(r)), filtros: [{ etiqueta: 'Área', valor: r => r.area, mostrar: v => AREAS[v] }],
    columnas: [{ t: 'Material', v: r => `<b>${esc(r.material)}</b>` }, { t: 'Fluido o químico', v: r => esc(r.quimico_fluido) }, { t: 'Calificación / regla', v: r => esc(r.calificacion) }, { t: 'Condición', v: r => esc(r.concentracion_condicion || '') }, { t: 'Equipo', cls: 'eq', v: r => esc(r.equipo || '') }, { t: 'Fuente', v: cita }] });
}

// Cruce: materiales instalados (registros de materiales) cuyo fluido contiene un químico que la tabla califica C o D para ese material.
const QUIMICOS = [{ re: /hcl|clorh[ií]drico/i, tabla: /clorh/i, nombre: 'ácido clorhídrico' }, { re: /naoh|soda c[aá]ustica|hidr[oó]xido de sodio|sosa/i, tabla: /hidr[oó]xido de sodio/i, nombre: 'soda cáustica' }];
const ALIAS_MAT = [
  [/aisi.?304|ss.?304|inox(idable)? 304|1\.4301|\b304l?\b/i, /304/], [/aisi.?316|ss.?316|1\.4401|1\.4404|cf8m|\b316l?\b/i, /316/], [/epdm/i, /e\.?p\.?d\.?m/i], [/viton|fkm/i, /viton/i],
  [/nbr|buna|nitrilo/i, /buna/i], [/neopreno/i, /neopreno/i], [/ptfe|tefl[oó]n/i, /teflon|ptfe/i], [/acero al carbono|a-?36\b|a106|a105|a53\b|carbon steel/i, /acero al carbono/i],
  [/fundici[oó]n|hierro|ggg|ductile|cast iron|a126|a536/i, /fundici/i], [/lat[oó]n|brass/i, /lat[oó]n/i], [/alumin/i, /aluminio/i], [/hypalon/i, /hypalon/i], [/silicon/i, /silicona/i], [/bronce|bronze/i, /bronce/i]];
export function cruceQuimico(tablas) {
  const out = [];
  for (const m of D.materiales) {
    const txt = `${m.material} ${m.norma_grado || ''}`;
    const fl = `${m.fluido_servicio || ''} ${m.componente || ''}`;
    for (const q of QUIMICOS) {
      if (!q.re.test(fl)) continue;
      for (const [reMat, reTabla] of ALIAS_MAT) {
        if (!reMat.test(txt)) continue;
        const c = tablas.find(c => reTabla.test(c.material) && q.tabla.test(c.quimico_fluido));
        if (c && /^[CD]$/i.test(String(c.calificacion).trim())) out.push({ m, c, q });
      }
    }
  }
  return out;
}
function pintarCruce(tablas) {
  const cr = cruceQuimico(tablas);
  const el = document.getElementById('cruce');
  if (!cr.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<h2>Cruce con lo instalado <small>${cr.length} combinaciones para revisar</small></h2>
  <p class="mudo" style="max-width:75ch">Componentes registrados en la planta cuyo servicio incluye un químico frente al cual la tabla del proyecto califica su material como C o D. Es un cruce automático entre dos fuentes verificadas: indica qué revisar, no confirma una falla. La tabla advierte que no considera presión ni temperatura.</p>
  <div class="tabla-env"><table class="tabla"><thead><tr><th>Sistema y componente</th><th>Material instalado</th><th>Servicio</th><th>Calificación de la tabla</th><th>Fuentes</th></tr></thead><tbody>${cr.map(({ m, c }) => `<tr><td><a href="#/sistema/${m.sistema}">${esc(D.sistemaPorId[m.sistema]?.nombre || '')}</a><div>${esc(m.componente)}</div></td><td><span class="mat">${esc(m.material)}</span>${m.norma_grado ? `<span class="norma">${esc(m.norma_grado)}</span>` : ''}</td><td>${esc(m.fluido_servicio || '')}${/recubrimiento|revestimiento|prfv|liner|derakane/i.test(m.material + ' ' + (m.nota || '')) ? '<div class="pequeno mudo">Tiene recubrimiento: la exposición del metal depende de su integridad.</div>' : ''}</td><td>${etqCalif(c.calificacion)}<div class="pequeno mudo">${esc(c.material)} · ${esc(c.quimico_fluido)}</div></td><td>${cita(m)}<br>${cita(c)}</td></tr>`).join('')}</tbody></table></div>`;
}

// ------------------------------------------------------------------ CONTRADICCIONES
export function tarjetaContra(r) {
  return `<div class="contra"><div class="c-tema">${esc(r.tema)} <span class="mudo pequeno" style="font-weight:400">${esc(r.equipo || '')}</span></div>
  <div class="lado"><b>${esc(r.version_a)}</b>${chipCita(r.cita_a, r.evidencia_a)}<div class="evid">«${esc(r.evidencia_a)}»</div></div>
  <div class="lado"><b>${esc(r.version_b)}</b>${chipCita(r.cita_b, r.evidencia_b)}<div class="evid">«${esc(r.evidencia_b)}»</div></div>
  ${r.nota ? `<div class="nota">${esc(r.nota)}</div>` : ''}</div>`;
}
export function contradicciones(cont) {
  cont.innerHTML = `<div class="cabecera"><div><h1>Contradicciones entre documentos</h1><p>Dos fuentes dicen cosas distintas del mismo equipo. Ambas evidencias están verificadas. Atlas no decide cuál es la correcta: eso lo resuelve una verificación en campo o el dueño del documento.</p></div></div><div class="filtros" id="cf"></div><div id="cl"></div>`;
  const areas = ['', ...new Set(D.contradicciones.map(r => r.area))];
  let area = '';
  const pintar = () => {
    document.getElementById('cf').innerHTML = areas.map(a => `<button type="button" class="etq ${a === area ? 'teal' : 'area'}" data-a="${a}" style="padding:5px 10px;border:0;cursor:pointer">${a ? AREAS[a] : 'Todas'}</button>`).join('');
    document.getElementById('cl').innerHTML = D.contradicciones.filter(r => !area || r.area === area).map(tarjetaContra).join('') || '<div class="vacio">Sin registros.</div>';
    document.querySelectorAll('#cf button').forEach(b => b.onclick = () => { area = b.dataset.a; pintar(); });
  };
  pintar();
}

// ------------------------------------------------------------------ EXPEDIENTE
const PAL_ORIGINAL = /rotor|cojinete|bearing|control|controlador|llama|seguridad|alivio|actuador|servo|sensor|sonda|transmisor|tarjeta|cpu|rodamiento axial|sello mec|oil seal|presostato|electrov|solenoide|v[áa]lvula de corte|vgd|skp|lmv|membrana|celda|quemador|variador|plc|inverter/i;
const PAL_LOCAL = /brida|contrabrida|empaque|junta|gasket|tornill|perno|esp[áa]rrago|tuerca|arandela|soporte|tuber[íi]a|tubo|niple|termopozo|o-?ring|placa|l[áa]mina|chapa|cabezal|ducto|espaciador|pasamanos|anclaje|aislamiento|refractario|malla|filtro y|tramo/i;

export function expediente(cont, params) {
  const sSel = params.get('sistema') || '';
  cont.innerHTML = `<div class="cabecera"><div><h1>Expediente para mandar a hacer u homologar una pieza</h1><p>Elige el sistema, el equipo y la pieza. Atlas reúne las condiciones de servicio, el material con su norma, las reglas del fabricante y lo que hay que exigirle al proveedor. El resultado es una propuesta con citas; la aprobación sigue siendo de mantenimiento.</p></div></div>
  <div class="pasos"><form class="formulario hoja" style="padding:16px" id="fx">
    <label for="x-sis">Sistema</label><select id="x-sis" name="sistema"><option value="">Elige un sistema…</option>${D.sistemas.map(s => `<option value="${s.id}" ${s.id === sSel ? 'selected' : ''}>${esc(s.nombre)}</option>`).join('')}</select>
    <label for="x-eq">Equipo</label><select id="x-eq" name="equipo"><option value="">Primero elige el sistema</option></select>
    <label for="x-comp">Pieza o componente</label><select id="x-comp" name="componente"><option value="">Primero elige el equipo</option></select>
    <label for="x-otro">Si no está en la lista, descríbela</label><input id="x-otro" name="otro" placeholder="p. ej. tramo de tubería 2&quot; del cabezal">
    <label for="x-sap">Código SAP (opcional)</label><input id="x-sap" name="sap" class="mono">
    <label for="x-motivo">Motivo</label><select id="x-motivo" name="motivo"><option>Falla o desgaste</option><option>Sin stock del original</option><option>Mejora o cambio de material</option><option>Pieza sin fabricante identificado</option></select>
    <label for="x-sol">Solicita</label><input id="x-sol" name="solicitante" placeholder="nombre y cargo">
    <p style="margin-top:16px"><button class="boton" type="submit">Armar expediente</button> <button class="boton sec no-imprimir" type="button" id="x-print">Imprimir</button></p>
  </form><div id="x-out"><div class="vacio">El expediente aparece aquí.</div></div></div>`;
  const selS = document.getElementById('x-sis'), selE = document.getElementById('x-eq'), selC = document.getElementById('x-comp');
  const llenarEq = () => {
    const eqs = D.equiposIdx.filter(e => e.sistema === selS.value && (e.conteo.materiales || e.conteo.repuestos));
    selE.innerHTML = `<option value="">${eqs.length ? 'Elige el equipo…' : 'Primero elige el sistema'}</option>` + eqs.map(e => `<option value="${esc(e.clave)}">${esc(e.nombre)}</option>`).join('');
    llenarComp();
  };
  const llenarComp = () => {
    const k = selE.value;
    const filas = [...D.materiales, ...D.repuestos].filter(r => (r.sistema + '/' + clave(r.equipo || 'General')) === k);
    const comps = [...new Set(filas.map(r => r.componente || r.parte).filter(Boolean))];
    selC.innerHTML = `<option value="">${comps.length ? 'Elige la pieza…' : 'Sin piezas registradas; descríbela abajo'}</option>` + comps.map(c => `<option>${esc(c)}</option>`).join('');
  };
  selS.onchange = llenarEq; selE.onchange = llenarComp; llenarEq();
  document.getElementById('x-print').onclick = () => window.print();
  document.getElementById('fx').onsubmit = e => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); document.getElementById('x-out').innerHTML = armarFicha(f); document.getElementById('x-out').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
}

function armarFicha(f) {
  const S = D.sistemaPorId[f.sistema];
  if (!S) return '<div class="vacio">Elige un sistema.</div>';
  const e = D.equiposIdx.find(x => x.clave === f.equipo) || { clave: '', nombre: S.nombre, sistema: S.id, area: S.area };
  const pieza = f.componente || f.otro;
  if (!pieza) return '<div class="vacio">Elige o describe la pieza.</div>';
  const deEq = t => D[t].filter(r => (r.sistema + '/' + clave(r.equipo || r.equipo_o_fabricante || 'General')) === e.clave);
  const deS = t => D[t].filter(r => r.sistema === S.id);
  const de = t => { const x = deEq(t); return x.length ? x : deS(t); };
  const mats = deEq('materiales').filter(r => r.componente === f.componente);
  const reps = deEq('repuestos').filter(r => r.parte === f.componente);
  const otrosMats = mats.length ? [] : deS('materiales').filter(r => tokens(pieza).filter(t => t.length > 3).some(t => norm(r.componente + ' ' + r.material).includes(t))).slice(0, 12);
  const matsUsar = mats.length ? mats : otrosMats;
  const conds = de('condiciones').slice(0, 14), mant = de('mantenimiento'), seg = de('seguridad');
  // reglas: del equipo, y de fabricantes cuyo nombre aparece en el nombre del equipo o en la ficha
  const nombreEq = norm(e.nombre);
  const reglas = deS('reglas_homologacion').filter(r => (r.sistema + '/' + clave(r.equipo_o_fabricante || 'General')) === e.clave || norm(r.equipo_o_fabricante).split(/[\s–\-(),/]+/).filter(w => w.length > 3).some(w => nombreEq.includes(w)) || /garant|general|planta|mayekawa|fabricante/i.test(r.equipo_o_fabricante || ''));
  const soloOrig = reglas.filter(r => /solo original|modificacion prohibida/.test(norm(r.tipo)));
  const certs = reglas.filter(r => /certificado|norma de dise|prueba requerida|procedimiento/.test(norm(r.tipo)));
  const locales = reglas.filter(r => /fabricable/.test(norm(r.tipo)));
  const esCritica = PAL_ORIGINAL.test(pieza), esLocal = PAL_LOCAL.test(pieza);
  // compatibilidad: materiales de la pieza frente a fluidos del equipo
  const fluidos = [...new Set(matsUsar.map(m => m.fluido_servicio).filter(Boolean))];
  const alertas = [];
  for (const m of matsUsar) for (const c of D.compatibilidad.filter(c => /^[A-E]$/i.test(String(c.calificacion).trim()))) {
    const mm = norm(m.material), cm = norm(c.material);
    const coincideMat = mm.includes(cm) || cm.includes(mm) || tokens(cm).filter(t => t.length > 3).some(t => mm.includes(t));
    if (!coincideMat) continue;
    const fl = norm(fluidos.join(' ') + ' ' + (m.fluido_servicio || ''));
    const cq = tokens(c.quimico_fluido).filter(t => t.length > 3);
    if (cq.some(t => fl.includes(t)) && !alertas.some(a => a.c === c)) alertas.push({ c, m });
  }
  const malas = alertas.filter(a => /^d$/i.test(String(a.c.calificacion).trim()));
  let clase, cls, razon;
  if (soloOrig.length && esCritica) { clase = 'Solo original'; cls = 'rojo'; razon = 'El fabricante exige repuesto original o prohíbe modificaciones y la pieza es un componente funcional o certificado.'; }
  else if (esCritica) { clase = 'Solo original (por tipo de pieza)'; cls = 'rojo'; razon = 'La pieza es un componente de control, seguridad o sellado. Sin una regla del fabricante en el archivo, se trata como original hasta que ingeniería diga lo contrario.'; }
  else if (esLocal && matsUsar.length && matsUsar.some(m => m.norma_grado)) { clase = 'Fabricable localmente'; cls = 'verde'; razon = 'Es una pieza mecánica simple y los documentos dan el material con norma, así que se puede especificar y exigir certificado al taller.'; }
  else if (esLocal) { clase = 'Fabricable localmente, falta la norma'; cls = 'ambar'; razon = 'Es una pieza mecánica simple, pero los documentos no dan material con norma. Ingeniería debe fijar la especificación antes de fabricar.'; }
  else { clase = 'Homologable'; cls = 'teal'; razon = 'No es un componente certificado ni una pieza simple de taller: buscar un equivalente comercial con la misma norma y comparar ficha técnica y certificado.'; }
  if (malas.length) { cls = 'ambar'; razon += ' Además hay una alerta de compatibilidad química (abajo).'; }
  const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  const li = (r, txt) => `<li>${txt} ${cita(r)}</li>`;
  return `<div class="ficha">
    <div class="ficha-cab"><div><div class="pequeno mudo">Atlas Utilities · Cervecería Unión · ${esc(fecha)}</div><h2>Expediente: ${esc(pieza)}</h2><div class="mudo">${esc(S.nombre)} · ${esc(e.nombre)}</div></div><div class="estado" style="color:var(--ambar)">PENDIENTE DE APROBACIÓN</div></div>
    <dl><dt>Sistema</dt><dd>${esc(S.nombre)}</dd><dt>Equipo</dt><dd>${esc(e.nombre)}</dd>
    <dt>Pieza</dt><dd>${esc(pieza)}</dd>${f.sap ? `<dt>Código SAP</dt><dd class="mono">${esc(f.sap)}</dd>` : ''}<dt>Motivo</dt><dd>${esc(f.motivo)}</dd>${f.solicitante ? `<dt>Solicita</dt><dd>${esc(f.solicitante)}</dd>` : ''}</dl>
    <div class="clasif ${cls}"><b>Clasificación propuesta: ${esc(clase)}</b><div>${esc(razon)}</div><div class="pequeno mudo" style="margin-top:4px">Propuesta de reglas fijas (tipo de pieza + reglas del fabricante en el archivo). No sustituye el criterio de ingeniería.</div></div>
    <h3>1. Condiciones de servicio</h3>${conds.length ? `<ul>${conds.map(r => li(r, `${esc(r.parametro)}: <b>${esc(r.valor)} ${esc(r.unidad || '')}</b>`)).join('')}</ul>` : '<p class="mudo">No hay condiciones de operación registradas para este equipo. Pedirlas a operación antes de especificar.</p>'}
    ${reps.length ? `<h3>Repuesto original identificado</h3><ul>${reps.map(r => li(r, `<b>${esc(r.parte)}</b> <code>${esc(r.numero_parte || 's/n')}</code> ${esc(r.fabricante || '')} ${esc([r.cantidad, r.intervalo_reemplazo].filter(Boolean).join(' · '))}`)).join('')}</ul>` : ''}
    <h3>2. Material y norma según los documentos</h3>${!mats.length && matsUsar.length ? '<p class="pequeno mudo">No hay un registro exacto para esta pieza; se muestran componentes relacionados del mismo sistema.</p>' : ''}${matsUsar.length ? `<ul>${matsUsar.map(r => li(r, `<b>${esc(r.componente)}</b>: ${esc(r.material)}${r.norma_grado ? ` — <code>${esc(r.norma_grado)}</code>` : ' — <span class="etq ambar">sin norma en el documento</span>'}${r.fluido_servicio ? ` (${esc(r.fluido_servicio)})` : ''}`)).join('')}</ul>` : '<p class="mudo">Ningún documento del archivo indica el material de esta pieza. Ingeniería debe especificarlo; Atlas no puede proponer uno sin fuente.</p>'}
    ${alertas.length ? `<h3>3. Compatibilidad química</h3><ul>${alertas.map(a => li(a.c, `${esc(a.c.material)} frente a ${esc(a.c.quimico_fluido)}: ${etqCalif(a.c.calificacion)} ${a.c.concentracion_condicion ? esc(a.c.concentracion_condicion) : ''}`)).join('')}</ul>${malas.length ? '<div class="clasif ambar"><b>Alerta</b>: al menos una tabla califica el material instalado como no recomendable para el fluido. Verificar en campo antes de reponer igual.</div>' : ''}` : '<h3>3. Compatibilidad química</h3><p class="mudo">No hay en el archivo una tabla que cruce este material con el fluido del equipo.</p>'}
    <h3>4. Reglas del fabricante y de la planta</h3>${reglas.length ? `<ul>${reglas.map(r => li(r, `${etqTipoRegla(r.tipo)} ${esc(r.regla)}`)).join('')}</ul>` : '<p class="mudo">No hay reglas registradas para este equipo o fabricante.</p>'}
    <h3>5. Exigir al proveedor o taller</h3><ul>
      ${cls === 'rojo' ? '<li>Pedir al fabricante o distribuidor autorizado con modelo, número de serie y código de parte. No aceptar equivalentes sin autorización escrita del fabricante.</li>' : ''}
      ${cls !== 'rojo' ? `<li>Certificado de material tipo EN 10204 3.1 con número de colada, composición química y propiedades mecánicas, trazable a la norma indicada${matsUsar.some(m => m.norma_grado) ? ` (${esc([...new Set(matsUsar.map(m => m.norma_grado).filter(Boolean))].join('; '))})` : ''}.</li><li>Plano o isométrico emitido para fabricación, con dimensiones, tolerancias y acabado.</li><li>Registro dimensional y visual de recepción; prueba de presión o de fuga cuando la pieza contenga fluido, con presión y criterio definidos por ingeniería.</li>` : ''}
      ${certs.length ? certs.map(r => li(r, esc(r.regla))).join('') : ''}
      ${locales.length ? locales.map(r => li(r, `Permitido por el fabricante: ${esc(r.regla)}`)).join('') : ''}
    </ul>
    ${seg.length ? `<h3>6. Seguridad antes de intervenir</h3><ul>${seg.slice(0, 8).map(r => li(r, `<b>${esc(r.riesgo_o_requisito)}</b>: ${esc(r.detalle)}`)).join('')}</ul>` : ''}
    ${mant.length ? `<h3>${seg.length ? 7 : 6}. Mantenimiento relacionado</h3><ul>${mant.slice(0, 6).map(r => li(r, `${esc(r.tarea)} — ${esc(r.frecuencia)}`)).join('')}</ul>` : ''}
    <h3>Aprobación</h3><dl><dt>Revisó (ingeniería)</dt><dd>__________________________</dd><dt>Aprobó (mantenimiento)</dt><dd>__________________________</dd><dt>Fecha</dt><dd>____ / ____ / ______</dd></dl>
    <p class="pequeno mudo" style="margin-top:14px">Cada dato lleva su documento y página; pulsa la cita para ver el texto original. Lo que no está en el archivo se marca como pendiente en vez de suponerse.</p>
  </div>`;
}

// ------------------------------------------------------------------ BANCO DE PRUEBAS
export function banco(cont) {
  const cats = ['', ...new Set(D.preguntas.map(p => p.categoria).filter(Boolean))];
  cont.innerHTML = `<div class="cabecera"><div><h1>Banco de pruebas</h1><p>${D.preguntas.length} preguntas como las que hace un técnico, con la respuesta y la cita verificadas. «Correr la prueba» lanza cada pregunta al buscador y mide si encuentra el documento y la página correctos.</p></div><button class="boton" id="correr">Correr la prueba</button></div>
  <div id="res-prueba"></div>
  <div class="filtros"><select id="b-cat">${cats.map(c => `<option value="${esc(c)}">${c ? esc(c) : 'Todas las categorías'}</option>`).join('')}</select><span class="cuenta" id="b-n"></span></div><div id="b-lista"></div>`;
  const pintar = () => {
    const c = document.getElementById('b-cat').value;
    const ps = D.preguntas.filter(p => !c || p.categoria === c);
    document.getElementById('b-n').textContent = `${ps.length} preguntas`;
    document.getElementById('b-lista').innerHTML = ps.map((p, i) => `<details class="preg"><summary>${esc(p.pregunta)} <span class="etq n" style="margin-left:auto">${esc(p.categoria || '')}</span></summary><div class="resp"><p>${esc(p.respuesta)}</p>${cita(p)}${evid(p)}</div></details>`).join('');
  };
  document.getElementById('b-cat').onchange = pintar; pintar();
  document.getElementById('correr').onclick = async () => {
    const out = document.getElementById('res-prueba');
    let docOk = 0, pagOk = 0, corpusOk = 0, hecho = 0;
    const total = D.preguntas.length;
    out.innerHTML = `<div class="hoja" style="padding:14px"><div class="barra"><div id="bar" style="width:0"></div></div><div class="pequeno mudo" id="bar-t" style="margin-top:6px">0 de ${total}</div></div>`;
    const fallos = [];
    for (const p of D.preguntas) {
      const regs = buscarRegistros(p.pregunta, 5, { excluir: ['preguntas'] });
      const docHit = regs.some(x => (x.r.cita?.id || x.r.cita_a?.id) === p.cita.id);
      const pagHit = regs.some(x => x.r.cita?.id === p.cita.id && +x.r.cita.pagina === +p.cita.pagina);
      let corpHit = false;
      if (D.textoCompleto) try { const c = await buscarCorpus(p.pregunta, 10); corpHit = c.paginas.some(x => x.id === p.cita.id); } catch (e) { }
      docOk += docHit; pagOk += pagHit; corpusOk += corpHit; hecho++;
      if (!docHit) fallos.push(p);
      document.getElementById('bar').style.width = (100 * hecho / total) + '%';
      document.getElementById('bar-t').textContent = `${hecho} de ${total}`;
      if (hecho % 10 === 0) await new Promise(r => setTimeout(r, 0));
    }
    const pct = x => Math.round(100 * x / total) + ' %';
    out.innerHTML = `<div class="resultado-prueba">
      <div class="hoja"><b>${pct(docOk)}</b><span class="pequeno mudo">Registros: documento correcto entre los 5 primeros</span></div>
      <div class="hoja"><b>${pct(pagOk)}</b><span class="pequeno mudo">Registros: documento y página exactos</span></div>
      ${D.textoCompleto ? `<div class="hoja"><b>${pct(corpusOk)}</b><span class="pequeno mudo">Texto completo: el documento citado entre las 10 primeras páginas</span></div>` : ''}
    </div>${fallos.length ? `<details class="hoja" style="padding:10px 14px;margin-bottom:14px"><summary>Preguntas que el buscador de registros no resolvió (${fallos.length})</summary><ul>${fallos.map(p => `<li class="pequeno">${esc(p.pregunta)}</li>`).join('')}</ul></details>` : ''}
    <p class="pequeno mudo">La prueba corre en tu navegador con el mismo buscador de la barra superior. Mide recuperación (si el sistema lleva a la fuente correcta), no redacción. Las preguntas se escribieron a partir de los mismos documentos, así que el resultado es optimista frente a preguntas nuevas: sirve para detectar regresiones cuando cambie la base.</p>`;
  };
}

// ------------------------------------------------------------------ DOCUMENTOS
export function documentos(cont) {
  const porArea = {};
  for (const d of D.documentos) { (porArea[d.area] ??= {}); (porArea[d.area][d.sistema] ??= []).push(d); }
  cont.innerHTML = `<div class="cabecera"><div><h1>Documentos</h1><p>${n(D.documentos.length)} archivos leídos completos: ${n(D.verificacion.paginas)} páginas, de las cuales ${n(D.verificacion.paginas_ocr)} se reconocieron por OCR. El número entre corchetes es cuántos registros verificados citan cada documento.</p></div></div>
  <div class="filtros"><input type="search" id="d-q" placeholder="Filtrar por nombre o ruta…"></div><div class="arbol" id="d-arbol"></div>`;
  const pintar = () => {
    const q = norm(document.getElementById('d-q').value);
    document.getElementById('d-arbol').innerHTML = Object.entries(porArea).map(([a, sis]) => Object.entries(sis).map(([s, ds]) => {
      const f = ds.filter(d => !q || norm(d.path).includes(q));
      if (!f.length) return '';
      return `<details ${q ? 'open' : ''}><summary>${esc(AREAS[a])} · ${esc(s)} <span class="n">${f.length}</span></summary><ul>${f.map(d => `<li><a href="#/doc/${d.id}">${esc(d.nombre)}</a> <span class="n">${d.pages ? d.pages + ' p.' : d.ext}${d.ocr_pages ? ' · ' + d.ocr_pages + ' OCR' : ''}${d.citas ? ' [' + d.citas + ']' : ''}</span></li>`).join('')}</ul></details>`;
    }).join('')).join('');
  };
  document.getElementById('d-q').oninput = pintar; pintar();
}

export async function documento(cont, params, id) {
  const d = D.docPorId[id];
  if (!d) { cont.innerHTML = '<div class="vacio">Documento no encontrado.</div>'; return; }
  const regs = [];
  for (const t of Object.keys(NOMBRE_TABLA)) for (const r of D[t]) { const cs = r.cita_a ? [r.cita_a, r.cita_b] : [r.cita]; if (cs.some(c => c && c.id === id)) regs.push({ t, r }); }
  cont.innerHTML = `<div class="cabecera"><div>${etqArea(d.area)} <span class="etq n">${esc(d.sistema)}</span><h1 style="font-size:24px">${esc(d.nombre)}</h1><p class="mono pequeno">${esc(d.path)}</p></div></div>
  <div class="visor"><div class="pags" id="v-pags"><div class="vacio pequeno">Cargando…</div></div><div><div class="texto" id="v-texto"></div><div class="pequeno mudo" style="margin-top:8px">Texto extraído automáticamente${d.ocr_pages ? '; las páginas marcadas OCR vienen de escaneos y pueden tener errores' : ''}.</div></div></div>
  ${regs.length ? `<section class="seccion"><h2>Registros que citan este documento <small>${regs.length}</small></h2><div id="d-regs">${regs.slice(0, 40).map(x => tarjetaRegistro(x.t, x.r, '')).join('')}</div>${regs.length > 40 ? `<p><button type="button" class="boton sec" id="d-mas">Ver los ${regs.length}</button></p>` : ''}</section>` : ''}`;
  const mas = document.getElementById('d-mas');
  if (mas) mas.onclick = () => { document.getElementById('d-regs').innerHTML = regs.map(x => tarjetaRegistro(x.t, x.r, '')).join(''); mas.remove(); };
  if (!D.textoCompleto) { document.querySelector('.visor').innerHTML = `<div class="hoja" style="padding:16px;grid-column:1/-1"><p>Esta versión pública no incluye el texto de los documentos. El archivo original está en la carpeta de la planta:</p><p class="mono pequeno">${esc(d.path)}</p><p class="mudo pequeno">${d.pages ? d.pages + ' páginas' : d.ext}${d.ocr_pages ? ', ' + d.ocr_pages + ' por OCR' : ''}.</p></div>`; return; }
  let doc;
  try { doc = await documentoCompleto(id); } catch (e) { document.getElementById('v-pags').innerHTML = '<div class="vacio pequeno">Sin texto.</div>'; return; }
  const pags = Object.keys(doc).map(Number).sort((a, b) => a - b);
  let actual = +(params.get('p') || pags[0] || 0);
  if (!doc[String(actual)]) actual = pags[0];
  const P = document.getElementById('v-pags'), T = document.getElementById('v-texto');
  const ir = p => { actual = p; T.textContent = doc[String(p)] || ''; P.querySelectorAll('button').forEach(b => b.classList.toggle('activa', +b.dataset.p === p)); const q = params.get('q'); if (q) T.innerHTML = resaltar(esc(T.textContent), q); };
  P.innerHTML = pags.map(p => `<button type="button" data-p="${p}">${p === 0 ? 'archivo' : 'pág. ' + p}</button>`).join('');
  P.querySelectorAll('button').forEach(b => b.onclick = () => ir(+b.dataset.p));
  ir(actual);
  const b = P.querySelector('button.activa'); if (b) b.scrollIntoView({ block: 'center' });
}

// ------------------------------------------------------------------ VERIFICACIÓN
export function verificacion(cont) {
  const V = D.verificacion;
  const filas = Object.entries(V.por_archivo || {}).map(([t, c]) => { const rs = D[t] || []; const ex = rs.filter(r => r.verificacion === 'exacta').length; return { t, c, ex, ap: rs.length - ex }; });
  cont.innerHTML = `<div class="cabecera"><div><h1>Cómo se verifica cada dato</h1><p>La integridad del Atlas no depende de que alguien confíe en el resumen: depende de que cada registro pueda rastrearse hasta una frase de un documento. Así funciona.</p></div></div>
  <div class="grid-3">
    <div class="hoja acceso"><h3>1. Extracción</h3><p>Los ${n(V.documentos)} PDF, Word y Excel se convirtieron a texto página por página. Las ${n(V.paginas_ocr)} páginas escaneadas pasaron por reconocimiento óptico (OCR) en español e inglés.</p></div>
    <div class="hoja acceso"><h3>2. Registro con evidencia</h3><p>Cada dato se escribió como un registro con su documento, su página y una frase copiada literalmente de esa página: la <b>evidencia</b>. Sin evidencia no hay registro.</p></div>
    <div class="hoja acceso"><h3>3. Comprobación de la evidencia</h3><p>Un script abre la página citada y busca la evidencia. Coincidencia literal: <b>exacta</b>. Si solo coincide el 90 % de las palabras (típico en OCR): <b>aproximada</b>, marcada con ≈. Si no aparece: el registro se descarta.</p></div>
    <div class="hoja acceso"><h3>4. Control de cifras</h3><p>Cada número de los campos de datos (presiones, temperaturas, números de parte, normas, cantidades) debe aparecer en la página citada. Las conversiones o cálculos propios van aparte, en «nota», marcados como inferencia. Si una cifra no está en la fuente, el registro se descarta.</p></div>
    <div class="hoja acceso"><h3>5. Sin credenciales</h3><p>Algunos manuales publican contraseñas o códigos de acceso de fábrica. Esos valores se reemplazaron por «[clave omitida]» en todo el texto publicado (${n(V.redacciones || 0)} reemplazos) y ningún registro los contiene.</p></div>
    <div class="hoja acceso"><h3>6. Verificación independiente</h3><p>El repositorio incluye <code>herramientas/verificar.py</code>: repite la comprobación contra el texto de los documentos. ${D.textoCompleto ? 'Cualquiera con esta versión puede correrlo.' : 'Esta versión pública no trae ese texto, así que se corre sobre la versión interna.'}</p></div>
  </div>
  <section class="seccion"><h2>Resultado de la última verificación <small>${esc(V.fecha)}</small></h2>
  <div class="tabla-env"><table class="tabla"><thead><tr><th>Tabla</th><th>Registros</th><th>Exactos</th><th>Aproximados</th></tr></thead><tbody>${filas.map(f => `<tr><td>${esc(NOMBRE_TABLA[f.t] || f.t)}</td><td>${n(f.c)}</td><td>${n(f.ex)}</td><td>${n(f.ap)}</td></tr>`).join('')}<tr><td><b>Total</b></td><td><b>${n(V.registros)}</b></td><td><b>${n(V.exactos)}</b></td><td><b>${n(V.aproximados)}</b></td></tr></tbody></table></div>
  <p style="margin-top:10px">Registros descartados: <b>${n(V.descartados)}</b> (${n(V.cifras_no_halladas || 0)} por cifras que no aparecían en la página citada, ${n(V.con_credenciales || 0)} por contener credenciales, el resto por evidencia no encontrada). Registros cuya cifra está en la página con otro formato y lo anotan: ${n(V.cifras_formato_distinto || 0)}. Documentos citados: ${n(V.docs_citados)} de ${n(V.documentos)}.${D.textoCompleto ? ` Términos indexados para búsqueda en texto completo: ${n(V.terminos_indexados)}.` : ' Esta es la versión pública: contiene los registros y sus frases de evidencia, pero no el texto completo de los manuales.'}</p></section>
  <section class="seccion"><h2>Lo que el Atlas no hace</h2><ul>
    <li>No inventa: si un dato no está en los documentos, dice que no está.</li>
    <li>No resuelve contradicciones: muestra las dos versiones con sus fuentes.</li>
    <li>No aprueba: el expediente sale «pendiente de aprobación» y nombra quién debe firmar.</li>
    <li>No corrige los documentos: si un manual es plantilla de otro proyecto o tiene un error de traducción, el registro lo anota en la columna de notas.</li>
    <li>No contiene contraseñas ni credenciales aunque algunos manuales las publiquen: esas líneas se excluyeron.</li>
  </ul></section>
  <section class="seccion"><h2>Cómo verificarlo tú mismo</h2><p>${D.textoCompleto ? 'Pulsa cualquier cita. El panel muestra el texto de la página con la evidencia resaltada. Si quieres ir más allá, abre el documento completo y compáralo con el PDF original en la carpeta de la planta.' : 'Pulsa cualquier cita. El panel muestra la frase verificada, el archivo y la página. Abre ese PDF en la carpeta de la planta y busca la frase en esa página.'}</p></section>`;
}
