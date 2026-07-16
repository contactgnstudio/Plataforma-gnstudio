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
// ============================================================
// COMPATIBILIDAD FALTANTE — errores globales actuales
// Pegar al FINAL de js/app.js
// ============================================================

// ------------------------------------------------------------
// 1) renderRegistros()
// app.js la usa al iniciar, pero no existe siempre.
// Fallback: si existe generarEstadoCuenta(), la reutilizamos.
// ------------------------------------------------------------
function renderRegistros() {
  if (typeof generarEstadoCuenta === 'function') {
    try {
      return generarEstadoCuenta();
    } catch (e) {
      console.error('Error en renderRegistros/generarEstadoCuenta:', e);
      return false;
    }
  }
  return false;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function obtenerClientePorId(clienteId) {
  if (!clienteId) return null;
  if (typeof getData !== 'function' || typeof STORAGE_KEYS === 'undefined') return null;

  var clientes = getData(STORAGE_KEYS.CLIENTES) || [];
  for (var i = 0; i < clientes.length; i++) {
    if (clientes[i].id === clienteId) return clientes[i];
  }
  return null;
}

function textoDeSelect(selectId) {
  var select = document.getElementById(selectId);
  if (!select) return '';
  if (select.selectedIndex < 0) return '';
  return (select.options[select.selectedIndex] && select.options[select.selectedIndex].text) || '';
}

function valorTexto(id) {
  var el = document.getElementById(id);
  return el ? String(el.value || '').trim() : '';
}

function valorNumero(id) {
  var el = document.getElementById(id);
  var n = el ? parseFloat(el.value) : 0;
  return isNaN(n) ? 0 : n;
}

function htmlEscape(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ------------------------------------------------------------
// 2) actualizarInfoCliente()
// index.html la llama en onchange del select de cotización.
// ------------------------------------------------------------
function actualizarInfoCliente() {
  var clienteId = valorTexto('cot-cliente');
  var cliente = obtenerClientePorId(clienteId);

  var atencion = document.getElementById('cot-atencion');
  if (atencion && cliente && !atencion.value.trim()) {
    atencion.value = cliente.contacto || '';
  }

  var posiblesInfoIds = [
    'cot-cliente-info',
    'cot-info-cliente',
    'info-cliente-cot',
    'cliente-info-cot'
  ];

  var infoBox = null;
  for (var i = 0; i < posiblesInfoIds.length; i++) {
    var el = document.getElementById(posiblesInfoIds[i]);
    if (el) {
      infoBox = el;
      break;
    }
  }

  if (infoBox) {
    if (!cliente) {
      infoBox.innerHTML = '';
      infoBox.style.display = 'none';
    } else {
      infoBox.style.display = 'block';
      infoBox.innerHTML = ''
        + '<div><strong>Cliente:</strong> ' + htmlEscape(cliente.nombre || '—') + '</div>'
        + '<div><strong>Contacto:</strong> ' + htmlEscape(cliente.contacto || '—') + '</div>'
        + '<div><strong>Teléfono:</strong> ' + htmlEscape(cliente.telefono || '—') + '</div>'
        + '<div><strong>Email:</strong> ' + htmlEscape(cliente.email || '—') + '</div>'
        + '<div><strong>Dirección:</strong> ' + htmlEscape(cliente.direccion || '—') + '</div>';
    }
  }

  return false;
}

// ------------------------------------------------------------
// Helpers de cotización
// ------------------------------------------------------------
function obtenerResumenCotizacionDesdeDOM() {
  var subtotalTxt = document.getElementById('cot-subtotal');
  var itbmsTxt = document.getElementById('cot-itbms-monto');
  var descuentoTxt = document.getElementById('cot-descuento-monto');
  var totalTxt = document.getElementById('cot-total');

  return {
    subtotal: subtotalTxt ? subtotalTxt.textContent : formatMoney(0),
    itbms: itbmsTxt ? itbmsTxt.textContent : formatMoney(0),
    descuento: descuentoTxt ? descuentoTxt.textContent : formatMoney(0),
    total: totalTxt ? totalTxt.textContent : formatMoney(0)
  };
}

function obtenerItemsCotizacionPreview() {
  var filas = [];
  var tbody = document.getElementById('tbodyItemsCotizacion');

  if (tbody && tbody.querySelectorAll('tr').length > 0) {
    var trs = tbody.querySelectorAll('tr');
    for (var i = 0; i < trs.length; i++) {
      var tds = trs[i].querySelectorAll('td');
      if (tds.length >= 6) {
        filas.push({
          descripcion: tds[1] ? tds[1].textContent.trim() : '',
          cantidad: tds[2] ? tds[2].textContent.trim() : '',
          unidad: tds[3] ? tds[3].textContent.trim() : '',
          precio: tds[4] ? tds[4].textContent.trim() : '',
          total: tds[5] ? tds[5].textContent.trim() : ''
        });
      }
    }
  }

  if (filas.length === 0 && typeof itemsCotizacionActual !== 'undefined' && Array.isArray(itemsCotizacionActual)) {
    for (var j = 0; j < itemsCotizacionActual.length; j++) {
      var item = itemsCotizacionActual[j];
      filas.push({
        descripcion: (item.codigo ? '[' + item.codigo + '] ' : '') + (item.descripcion || ''),
        cantidad: item.cantidad || 0,
        unidad: item.unidad || '',
        precio: formatMoney(item.precioUnitario || 0),
        total: formatMoney((item.cantidad || 0) * (item.precioUnitario || 0))
      });
    }
  }

  return filas;
}

// ------------------------------------------------------------
// 3) vistaPreviaCotizacion()
// index.html la llama desde el botón de vista previa.
// ------------------------------------------------------------
function vistaPreviaCotizacion() {
  var clienteId = valorTexto('cot-cliente');
  var cliente = obtenerClientePorId(clienteId);
  var proyecto = valorTexto('cot-proyecto');
  var atencion = valorTexto('cot-atencion');
  var fecha = valorTexto('cot-fecha');
  var alcance = valorTexto('cot-alcance');
  var resumen = obtenerResumenCotizacionDesdeDOM();
  var items = obtenerItemsCotizacionPreview();

  if (!clienteId) {
    alert('Selecciona un cliente antes de ver la vista previa');
    return false;
  }

  if (!proyecto) {
    alert('Ingresa el nombre del proyecto');
    return false;
  }

  var rows = '';
  for (var i = 0; i < items.length; i++) {
    rows += ''
      + '<tr>'
      + '<td style="padding:8px;border:1px solid #ddd;">' + (i + 1) + '</td>'
      + '<td style="padding:8px;border:1px solid #ddd;">' + htmlEscape(items[i].descripcion) + '</td>'
      + '<td style="padding:8px;border:1px solid #ddd;text-align:center;">' + htmlEscape(items[i].cantidad) + '</td>'
      + '<td style="padding:8px;border:1px solid #ddd;text-align:center;">' + htmlEscape(items[i].unidad) + '</td>'
      + '<td style="padding:8px;border:1px solid #ddd;text-align:right;">' + htmlEscape(items[i].precio) + '</td>'
      + '<td style="padding:8px;border:1px solid #ddd;text-align:right;">' + htmlEscape(items[i].total) + '</td>'
      + '</tr>';
  }

  if (!rows) {
    rows = '<tr><td colspan="6" style="padding:12px;border:1px solid #ddd;text-align:center;color:#666;">No hay items agregados</td></tr>';
  }

  var html = ''
    + '<!DOCTYPE html>'
    + '<html lang="es">'
    + '<head>'
    + '  <meta charset="UTF-8">'
    + '  <title>Vista Previa Cotización</title>'
    + '  <style>'
    + '    body{font-family:Arial,sans-serif;margin:30px;color:#222;}'
    + '    h1,h2,h3{margin:0 0 12px;}'
    + '    .top{display:flex;justify-content:space-between;gap:20px;margin-bottom:24px;}'
    + '    .box{margin-bottom:18px;}'
    + '    table{width:100%;border-collapse:collapse;margin-top:16px;}'
    + '    .totales{width:360px;margin-left:auto;margin-top:20px;border-collapse:collapse;}'
    + '    .totales td{padding:8px;border:1px solid #ddd;}'
    + '    .muted{color:#666;}'
    + '    .actions{margin-bottom:20px;}'
    + '    button{padding:10px 14px;margin-right:8px;border:none;border-radius:8px;cursor:pointer;}'
    + '    .print{background:#6bbd45;color:#fff;}'
    + '  </style>'
    + '</head>'
    + '<body>'
    + '  <div class="actions"><button class="print" onclick="window.print()">Imprimir / PDF</button></div>'
    + '  <div class="top">'
    + '    <div>'
    + '      <h1>GN Studio</h1>'
    + '      <div class="muted">Vista previa de cotización</div>'
    + '    </div>'
    + '    <div>'
    + '      <div><strong>Fecha:</strong> ' + htmlEscape(formatDate(fecha || new Date().toISOString().slice(0, 10))) + '</div>'
    + '      <div><strong>Proyecto:</strong> ' + htmlEscape(proyecto) + '</div>'
    + '    </div>'
    + '  </div>'
    + '  <div class="box">'
    + '    <h3>Cliente</h3>'
    + '    <div><strong>Nombre:</strong> ' + htmlEscape(cliente ? cliente.nombre : '—') + '</div>'
    + '    <div><strong>Contacto:</strong> ' + htmlEscape(atencion || (cliente ? cliente.contacto : '—')) + '</div>'
    + '    <div><strong>Teléfono:</strong> ' + htmlEscape(cliente ? cliente.telefono : '—') + '</div>'
    + '    <div><strong>Email:</strong> ' + htmlEscape(cliente ? cliente.email : '—') + '</div>'
    + '    <div><strong>Dirección:</strong> ' + htmlEscape(cliente ? cliente.direccion : '—') + '</div>'
    + '  </div>'
    + '  <div class="box">'
    + '    <h3>Alcance</h3>'
    + '    <div>' + htmlEscape(alcance || 'Sin descripción de alcance') + '</div>'
    + '  </div>'
    + '  <table>'
    + '    <thead>'
    + '      <tr>'
    + '        <th style="padding:8px;border:1px solid #ddd;">#</th>'
    + '        <th style="padding:8px;border:1px solid #ddd;">Descripción</th>'
    + '        <th style="padding:8px;border:1px solid #ddd;">Cant.</th>'
    + '        <th style="padding:8px;border:1px solid #ddd;">Unidad</th>'
    + '        <th style="padding:8px;border:1px solid #ddd;">Precio Unit.</th>'
    + '        <th style="padding:8px;border:1px solid #ddd;">Total</th>'
    + '      </tr>'
    + '    </thead>'
    + '    <tbody>' + rows + '</tbody>'
    + '  </table>'
    + '  <table class="totales">'
    + '    <tr><td><strong>Subtotal</strong></td><td style="text-align:right;">' + htmlEscape(resumen.subtotal) + '</td></tr>'
    + '    <tr><td><strong>ITBMS</strong></td><td style="text-align:right;">' + htmlEscape(resumen.itbms) + '</td></tr>'
    + '    <tr><td><strong>Descuento</strong></td><td style="text-align:right;">' + htmlEscape(resumen.descuento) + '</td></tr>'
    + '    <tr><td><strong>TOTAL</strong></td><td style="text-align:right;color:#6bbd45;"><strong>' + htmlEscape(resumen.total) + '</strong></td></tr>'
    + '  </table>'
    + '</body>'
    + '</html>';

  var win = window.open('', '_blank');
  if (!win) {
    alert('El navegador bloqueó la ventana emergente de vista previa');
    return false;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();

  return false;
}

// ------------------------------------------------------------
// 4) abrirModalGastoProyecto()
// Fallback: en lugar de modal inexistente, salta a Finanzas y
// preselecciona el proyecto actual si existe.
// ------------------------------------------------------------
function abrirModalGastoProyecto() {
  try {
    switchSection('finanzas');
  } catch (e) {
    console.warn('No se pudo cambiar a Finanzas:', e);
  }

  try {
    switchSubSection('finanzas', 'estado-cuenta');
  } catch (e) {
    console.warn('No se pudo cambiar sub-sección Finanzas:', e);
  }

  var proyectoId = null;
  if (typeof PROYECTO_ACTUAL !== 'undefined' && PROYECTO_ACTUAL && PROYECTO_ACTUAL.id) {
    proyectoId = PROYECTO_ACTUAL.id;
  }

  var gastoProyecto = document.getElementById('gasto-proyecto');
  if (gastoProyecto && proyectoId) {
    gastoProyecto.value = proyectoId;
  }

  var ecProyecto = document.getElementById('ec-proyecto');
  if (ecProyecto && proyectoId) {
    ecProyecto.value = proyectoId;
  }

  var gastoFecha = document.getElementById('gasto-fecha');
  if (gastoFecha && !gastoFecha.value) {
    var hoy = new Date();
    gastoFecha.value = hoy.getFullYear()
      + '-' + String(hoy.getMonth() + 1).padStart(2, '0')
      + '-' + String(hoy.getDate()).padStart(2, '0');
  }

  var monto = document.getElementById('gasto-monto');
  if (monto) {
    setTimeout(function () {
      monto.scrollIntoView({ behavior: 'smooth', block: 'center' });
      monto.focus();
    }, 80);
  }

  return false;
}

function cerrarModalGastoProyecto() {
  return false;
}
