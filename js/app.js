// ============================================================
// js/app.js — Lógica principal y navegación (versión estable)
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
  try {
    inicializarCatalogo();
  } catch (e) {
    console.error('Error inicializarCatalogo:', e);
  }

  try {
    inicializarClientes();
  } catch (e) {
    console.error('Error inicializarClientes:', e);
  }

  try {
    inicializarGrupos();
  } catch (e) {
    console.error('Error inicializarGrupos:', e);
  }

  try {
    inicializarCotizaciones();
  } catch (e) {
    console.error('Error inicializarCotizaciones:', e);
  }

  try {
    inicializarCharts();
  } catch (e) {
    console.error('Error inicializarCharts:', e);
  }

  if (typeof getData === 'function' && typeof setData === 'function') {
    if (!getData('gn_tareas')) setData('gn_tareas', []);
  }

  asegurarFormularioCliente();
  asegurarFormularioGrupo();

  trySafe(renderServicios);
  trySafe(actualizarVistaJSON);
  trySafe(renderClientes);
  trySafe(actualizarSelectClientes);
  trySafe(renderCotizacionesGuardadas);
  trySafe(renderProyectos);
  trySafe(renderRegistros);
  trySafe(actualizarKPIs);

  setFechasPorDefecto();
  poblarFiltroProyectoEstadoCuenta();
});

function trySafe(fn) {
  if (typeof fn !== 'function') return;
  try {
    fn();
  } catch (e) {
    console.error('Error ejecutando función:', fn.name || 'anónima', e);
  }
}

// ============================================================
// NAVEGACIÓN PRINCIPAL
// ============================================================

function switchSection(sectionId) {
  var panels = document.querySelectorAll('.section-panel');
  for (var i = 0; i < panels.length; i++) {
    panels[i].classList.remove('active');
  }

  var target = document.getElementById(sectionId);
  if (target) target.classList.add('active');

  var links = document.querySelectorAll('.nav-link');
  for (var j = 0; j < links.length; j++) {
    links[j].classList.remove('active');
    if (links[j].getAttribute('data-section') === sectionId) {
      links[j].classList.add('active');
    }
  }

  var titulos = {
    dashboard: 'Dashboard',
    negocio: 'Negocio',
    proyectos: 'Proyectos',
    finanzas: 'Finanzas'
  };

  var pageTitle = document.getElementById('page-title');
  if (pageTitle) pageTitle.textContent = titulos[sectionId] || 'Dashboard';

  if (sectionId === 'negocio') switchSubSection('negocio', 'crm');
  if (sectionId === 'finanzas') switchSubSection('finanzas', 'estado-cuenta');

  var mobileNav = document.querySelector('.mobile-nav-overlay');
  if (mobileNav) mobileNav.classList.remove('open');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// SUB-NAVEGACIÓN
// ============================================================

function switchSubSection(parent, subId) {
  var subs = document.querySelectorAll('#' + parent + ' .sub-section');
  for (var i = 0; i < subs.length; i++) {
    subs[i].classList.remove('active');
  }

  var target = document.getElementById(parent + '-' + subId);
  if (target) target.classList.add('active');

  var tabs = document.querySelectorAll('#' + parent + ' .sub-nav-item');
  for (var j = 0; j < tabs.length; j++) {
    tabs[j].classList.remove('active');
    var onclick = tabs[j].getAttribute('onclick');
    if (onclick && onclick.indexOf("'" + subId + "'") !== -1) {
      tabs[j].classList.add('active');
    }
  }
}

function toggleMobileNav() {
  var overlay = document.querySelector('.mobile-nav-overlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'mobile-nav-overlay';

    var navLinks = document.querySelector('.nav-links');
    if (navLinks) {
      var links = navLinks.querySelectorAll('.nav-link');
      for (var i = 0; i < links.length; i++) {
        var clone = links[i].cloneNode(true);
        overlay.appendChild(clone);
      }
    }

    document.body.appendChild(overlay);
  }

  overlay.classList.toggle('open');
}

// ============================================================
// FECHAS Y FILTROS
// ============================================================

function setFechasPorDefecto() {
  var hoy = new Date();
  var yyyy = hoy.getFullYear();
  var mm = String(hoy.getMonth() + 1).padStart(2, '0');
  var dd = String(hoy.getDate()).padStart(2, '0');
  var fechaHoy = yyyy + '-' + mm + '-' + dd;

  var gf = document.getElementById('gasto-fecha');
  var pf = document.getElementById('pago-fecha');
  var cf = document.getElementById('cot-fecha');
  var ecDesde = document.getElementById('ec-desde');
  var ecHasta = document.getElementById('ec-hasta');
  var itbmsPeriodo = document.getElementById('itbms-periodo');

  if (gf && !gf.value) gf.value = fechaHoy;
  if (pf && !pf.value) pf.value = fechaHoy;
  if (cf && !cf.value) cf.value = fechaHoy;
  if (ecDesde && !ecDesde.value) ecDesde.value = yyyy + '-' + mm + '-01';
  if (ecHasta && !ecHasta.value) ecHasta.value = fechaHoy;
  if (itbmsPeriodo && !itbmsPeriodo.value) itbmsPeriodo.value = yyyy + '-' + mm;
}

function poblarFiltroProyectoEstadoCuenta() {
  var ecProyecto = document.getElementById('ec-proyecto');
  if (!ecProyecto) return;
  if (typeof getData !== 'function' || typeof STORAGE_KEYS === 'undefined') return;

  var proyectos = getData(STORAGE_KEYS.PROYECTOS) || [];
  var html = '<option value="">Todos los proyectos</option>';

  for (var i = 0; i < proyectos.length; i++) {
    html += '<option value="' + proyectos[i].id + '">' + escapeHtml(proyectos[i].nombre || 'Proyecto') + '</option>';
  }

  ecProyecto.innerHTML = html;
}

// ============================================================
// FORMULARIOS INLINE DINÁMICOS
// ============================================================

function asegurarFormularioCliente() {
  if (document.getElementById('formCliente')) return;

  var acciones = encontrarContenedorAccionCliente();
  if (!acciones) return;

  var wrap = document.createElement('div');
  wrap.className = 'form-section';
  wrap.id = 'panelClienteInline';
  wrap.style.display = 'none';
  wrap.style.marginTop = '16px';

  wrap.innerHTML = ''
    + '<div class="form-header">'
    + '  <h3 class="section-title">Nuevo Cliente</h3>'
    + '</div>'
    + '<form id="formCliente" onsubmit="return guardarCliente(event)">'
    + '  <div class="form-grid">'
    + '    <div class="form-group">'
    + '      <label for="cli-codigo">Código <span class="required">*</span></label>'
    + '      <input type="text" id="cli-codigo" maxlength="30" placeholder="Ej. CLI-001" required>'
    + '    </div>'
    + '    <div class="form-group">'
    + '      <label for="cli-nombre">Nombre <span class="required">*</span></label>'
    + '      <input type="text" id="cli-nombre" maxlength="150" placeholder="Nombre del cliente" required>'
    + '    </div>'
    + '    <div class="form-group">'
    + '      <label for="cli-contacto">Contacto</label>'
    + '      <input type="text" id="cli-contacto" maxlength="150" placeholder="Persona de contacto">'
    + '    </div>'
    + '    <div class="form-group">'
    + '      <label for="cli-telefono">Teléfono</label>'
    + '      <input type="text" id="cli-telefono" maxlength="50" placeholder="+507 6000-0000">'
    + '    </div>'
    + '    <div class="form-group">'
    + '      <label for="cli-email">Email</label>'
    + '      <input type="email" id="cli-email" maxlength="150" placeholder="correo@cliente.com">'
    + '    </div>'
    + '    <div class="form-group full-width">'
    + '      <label for="cli-direccion">Dirección</label>'
    + '      <input type="text" id="cli-direccion" maxlength="250" placeholder="Dirección del cliente">'
    + '    </div>'
    + '  </div>'
    + '  <div class="form-actions">'
    + '    <button type="submit" class="btn-primary">Guardar Cliente</button>'
    + '    <button type="button" class="btn-secondary" onclick="cerrarModalCliente()">Cancelar</button>'
    + '  </div>'
    + '  <div class="form-feedback" id="feedback-cliente"></div>'
    + '</form>';

  acciones.parentNode.insertBefore(wrap, acciones.nextSibling);
}

function asegurarFormularioGrupo() {
  if (document.getElementById('formGrupo')) return;

  var seccion = encontrarSeccionGrupos();
  if (!seccion) return;

  var wrap = document.createElement('div');
  wrap.className = 'form-section';
  wrap.id = 'panelGrupoInline';
  wrap.style.display = 'none';
  wrap.style.marginBottom = '20px';

  wrap.innerHTML = ''
    + '<div class="form-header">'
    + '  <h3 class="section-title">Nuevo Grupo</h3>'
    + '</div>'
    + '<form id="formGrupo" onsubmit="return guardarGrupo(event)">'
    + '  <div class="form-grid">'
    + '    <div class="form-group">'
    + '      <label for="grp-codigo">Código <span class="required">*</span></label>'
    + '      <input type="text" id="grp-codigo" maxlength="30" placeholder="Ej. DISENO" required>'
    + '    </div>'
    + '    <div class="form-group">'
    + '      <label for="grp-nombre">Nombre <span class="required">*</span></label>'
    + '      <input type="text" id="grp-nombre" maxlength="150" placeholder="Nombre del grupo" required>'
    + '    </div>'
    + '    <div class="form-group full-width">'
    + '      <label for="grp-descripcion">Descripción</label>'
    + '      <input type="text" id="grp-descripcion" maxlength="250" placeholder="Descripción breve del grupo">'
    + '    </div>'
    + '    <div class="form-group">'
    + '      <label for="grp-color">Color</label>'
    + '      <select id="grp-color">'
    + '        <option value="green">Verde</option>'
    + '        <option value="blue">Azul</option>'
    + '        <option value="purple">Púrpura</option>'
    + '        <option value="orange">Naranja</option>'
    + '        <option value="red">Rojo</option>'
    + '        <option value="teal">Turquesa</option>'
    + '        <option value="pink">Rosa</option>'
    + '        <option value="gray">Gris</option>'
    + '      </select>'
    + '    </div>'
    + '    <div class="form-group">'
    + '      <label for="grp-orden">Orden</label>'
    + '      <input type="number" id="grp-orden" min="1" step="1" value="99">'
    + '    </div>'
    + '  </div>'
    + '  <div class="form-actions">'
    + '    <button type="submit" class="btn-primary">Guardar Grupo</button>'
    + '    <button type="button" class="btn-secondary" onclick="cerrarModalGrupo()">Cancelar</button>'
    + '  </div>'
    + '  <div class="form-feedback" id="feedback-grupo"></div>'
    + '</form>';

  var gruposVisual = document.getElementById('grupos-visual');
  if (gruposVisual && gruposVisual.parentNode === seccion) {
    seccion.insertBefore(wrap, gruposVisual);
  } else {
    seccion.appendChild(wrap);
  }
}

function encontrarContenedorAccionCliente() {
  var botones = document.querySelectorAll('button');
  for (var i = 0; i < botones.length; i++) {
    var onclick = botones[i].getAttribute('onclick') || '';
    if (onclick.indexOf('abrirModalCliente') !== -1) {
      return botones[i].closest('.section-actions') || botones[i].parentNode;
    }
  }
  return null;
}

function encontrarSeccionGrupos() {
  var gruposVisual = document.getElementById('grupos-visual');
  if (gruposVisual) {
    return gruposVisual.parentNode;
  }

  var botones = document.querySelectorAll('button');
  for (var i = 0; i < botones.length; i++) {
    var onclick = botones[i].getAttribute('onclick') || '';
    if (onclick.indexOf('abrirModalGrupo') !== -1) {
      return botones[i].closest('.section');
    }
  }

  return null;
}

// ============================================================
// HELPERS DE APERTURA/CIERRE
// ============================================================

function abrirModalCliente() {
  switchSection('negocio');
  switchSubSection('negocio', 'crm');
  asegurarFormularioCliente();

  var panel = document.getElementById('panelClienteInline');
  if (!panel) {
    console.warn('No se encontró panelClienteInline');
    return false;
  }

  panel.style.display = 'block';

  var codigo = document.getElementById('cli-codigo');
  if (codigo && !codigo.value) codigo.value = sugerirCodigoCliente();

  setTimeout(function () {
    if (codigo) codigo.focus();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);

  return false;
}

function cerrarModalCliente() {
  var panel = document.getElementById('panelClienteInline');
  if (panel) panel.style.display = 'none';

  var form = document.getElementById('formCliente');
  if (form) form.reset();

  var feedback = document.getElementById('feedback-cliente');
  if (feedback) feedback.textContent = '';

  return false;
}

function abrirModalGrupo() {
  switchSection('negocio');
  switchSubSection('negocio', 'catalogo');
  asegurarFormularioGrupo();

  var panel = document.getElementById('panelGrupoInline');
  if (!panel) {
    console.warn('No se encontró panelGrupoInline');
    return false;
  }

  panel.style.display = 'block';

  var codigo = document.getElementById('grp-codigo');
  if (codigo && !codigo.value) codigo.value = sugerirCodigoGrupo();

  setTimeout(function () {
    if (codigo) codigo.focus();
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);

  return false;
}

function cerrarModalGrupo() {
  var panel = document.getElementById('panelGrupoInline');
  if (panel) panel.style.display = 'none';

  var form = document.getElementById('formGrupo');
  if (form) form.reset();

  var feedback = document.getElementById('feedback-grupo');
  if (feedback) feedback.textContent = '';

  return false;
}

// Compatibilidad con otros posibles botones del HTML
function abrirModalServicio() { return false; }
function cerrarModalServicio() { return false; }
function abrirModalCotizacion() { return false; }
function cerrarModalCotizacion() { return false; }
function abrirModalProyecto() { return false; }
function cerrarModalProyecto() { return false; }

// ============================================================
// SUGERENCIAS DE CÓDIGO
// ============================================================

function sugerirCodigoCliente() {
  if (typeof getData !== 'function' || typeof STORAGE_KEYS === 'undefined') return 'CLI-001';
  var clientes = getData(STORAGE_KEYS.CLIENTES) || [];
  return 'CLI-' + String(clientes.length + 1).padStart(3, '0');
}

function sugerirCodigoGrupo() {
  if (typeof obtenerGrupos !== 'function') return 'GRUPO-001';
  var grupos = obtenerGrupos() || [];
  return 'GRUPO-' + String(grupos.length + 1).padStart(3, '0');
}

// ============================================================
// GASTOS
// ============================================================

function guardarGasto(event) {
  event.preventDefault();

  var feedback = document.getElementById('feedback-gasto');
  var monto = parseFloat(document.getElementById('gasto-monto').value || 0);

  var gasto = {
    id: generarId(),
    tipo: 'gasto',
    fecha: valorDe('gasto-fecha'),
    categoria: valorDe('gasto-categoria'),
    descripcion: valorDe('gasto-descripcion').trim(),
    monto: monto,
    metodo: valorDe('gasto-metodo'),
    proyectoId: document.getElementById('gasto-proyecto') ? valorDe('gasto-proyecto') : null,
    creadoEn: new Date().toISOString()
  };

  addItem(STORAGE_KEYS.GASTOS, gasto);

  if (feedback) {
    feedback.className = 'form-feedback success';
    feedback.textContent = '✅ Gasto guardado: ' + formatMoney(gasto.monto);
  }

  var form = document.getElementById('formGasto');
  if (form) form.reset();

  setFechasPorDefecto();
  trySafe(renderRegistros);
  trySafe(actualizarKPIs);
  trySafe(renderChartBalance);
  trySafe(renderChartGastos);

  if (typeof PROYECTO_ACTUAL !== 'undefined' && PROYECTO_ACTUAL && gasto.proyectoId === PROYECTO_ACTUAL.id) {
    trySafe(function () { if (typeof cargarFinancieroProyecto === 'function') cargarFinancieroProyecto(PROYECTO_ACTUAL); });
    trySafe(function () { if (typeof cargarTimelineProyecto === 'function') cargarTimelineProyecto(PROYECTO_ACTUAL); });
  }

  return false;
}

// ============================================================
// PAGOS
// ============================================================

function guardarPago(event) {
  event.preventDefault();

  var feedback = document.getElementById('feedback-pago');
  var monto = parseFloat(document.getElementById('pago-monto').value || 0);

  var pago = {
    id: generarId(),
    tipo: 'pago',
    fecha: valorDe('pago-fecha'),
    cliente: valorDe('pago-cliente').trim(),
    concepto: valorDe('pago-concepto').trim(),
    monto: monto,
    metodo: valorDe('pago-metodo'),
    estado: valorDe('pago-estado'),
    proyectoId: document.getElementById('pago-proyecto') ? valorDe('pago-proyecto') : null,
    creadoEn: new Date().toISOString()
  };

  addItem(STORAGE_KEYS.PAGOS, pago);

  if (feedback) {
    feedback.className = 'form-feedback success';
    feedback.textContent = '✅ Pago registrado: ' + formatMoney(pago.monto);
  }

  var form = document.getElementById('formPago');
  if (form) form.reset();

  setFechasPorDefecto();
  trySafe(renderRegistros);
  trySafe(actualizarKPIs);
  trySafe(renderChartBalance);

  if (typeof PROYECTO_ACTUAL !== 'undefined' && PROYECTO_ACTUAL && pago.proyectoId === PROYECTO_ACTUAL.id) {
    trySafe(function () { if (typeof cargarFinancieroProyecto === 'function') cargarFinancieroProyecto(PROYECTO_ACTUAL); });
    trySafe(function () { if (typeof cargarTimelineProyecto === 'function') cargarTimelineProyecto(PROYECTO_ACTUAL); });
  }

  return false;
}

// ============================================================
// PROYECTOS SIMPLE
// ============================================================

function renderProyectosSimple() {
  var tbody = document.getElementById('tbodyProyectos');
  if (!tbody) return;
  if (typeof getData !== 'function' || typeof STORAGE_KEYS === 'undefined') return;

  var proyectos = getData(STORAGE_KEYS.PROYECTOS) || [];

  proyectos.sort(function (a, b) {
    return new Date(b.creadoEn || 0) - new Date(a.creadoEn || 0);
  });

  if (proyectos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay proyectos registrados</td></tr>';
    return;
  }

  var html = '';
  for (var i = 0; i < proyectos.length; i++) {
    var p = proyectos[i];
    html += ''
      + '<tr>'
      + '<td>' + escapeHtml(p.codigo || '-') + '</td>'
      + '<td>' + escapeHtml(p.nombre || '-') + '</td>'
      + '<td>' + escapeHtml(p.cliente || '-') + '</td>'
      + '<td>' + escapeHtml(p.estado || '-') + '</td>'
      + '<td>' + formatMoney(parseFloat(p.total || 0)) + '</td>'
      + '<td>' + escapeHtml(formatDate(p.fechaInicio || p.creadoEn || '')) + '</td>'
      + '<td><button class="btn-table danger" onclick="eliminarProyectoCompat(\'' + escapeAttr(p.id) + '\')">Eliminar</button></td>'
      + '</tr>';
  }

  tbody.innerHTML = html;
}

function eliminarProyectoCompat(id) {
  if (!confirm('¿Eliminar este proyecto?')) return;
  if (typeof deleteItem === 'function' && typeof STORAGE_KEYS !== 'undefined') {
    deleteItem(STORAGE_KEYS.PROYECTOS, id);
  }
  trySafe(renderProyectos);
  trySafe(renderProyectosSimple);
  trySafe(actualizarKPIs);
}

// ============================================================
// EXPORTAR
// ============================================================

function exportarTodo() {
  if (typeof localStorage === 'undefined') return;

  var data = {};
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && key.indexOf('gn_') === 0) {
      try {
        data[key] = JSON.parse(localStorage.getItem(key));
      } catch (e) {
        data[key] = localStorage.getItem(key);
      }
    }
  }

  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'gnstudio-backup.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// UTILIDADES
// ============================================================

function valorDe(id) {
  var el = document.getElementById(id);
  return el ? el.value : '';
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return String(str || '').replace(/'/g, '&#39;');
}
