// ============================================================
// js/app.js — Lógica principal y navegación (v2)
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
  inicializarCatalogo();
  inicializarClientes();
  inicializarGrupos();
  inicializarCotizaciones();
  inicializarCharts();

  if (!getData('gn_tareas')) setData('gn_tareas', []);

  renderServicios();
  actualizarVistaJSON();
  renderClientes();
  actualizarSelectClientes();
  renderCotizacionesGuardadas();
  renderProyectos();
  renderRegistros();
  actualizarKPIs();

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

  if (gf && !gf.value) gf.value = fechaHoy;
  if (pf && !pf.value) pf.value = fechaHoy;
  if (cf && !cf.value) cf.value = fechaHoy;

  if (ecDesde) {
    var primerDiaMes = yyyy + '-' + mm + '-01';
    ecDesde.value = primerDiaMes;
  }
  if (ecHasta) ecHasta.value = fechaHoy;

  var itbmsPeriodo = document.getElementById('itbms-periodo');
  if (itbmsPeriodo) itbmsPeriodo.value = yyyy + '-' + mm;

  var ecProyecto = document.getElementById('ec-proyecto');
  if (ecProyecto) {
    var proyectos = getData(STORAGE_KEYS.PROYECTOS);
    ecProyecto.innerHTML = '<option value="">Todos los proyectos</option>';
    for (var i = 0; i < proyectos.length; i++) {
      ecProyecto.innerHTML += '<option value="' + proyectos[i].id + '">' + proyectos[i].nombre + '</option>';
    }
  }
});

// ============================================================
// NAVEGACIÓN PRINCIPAL
// ============================================================
function switchSection(sectionId) {
  var panels = document.querySelectorAll('.section-panel');
  for (var i = 0; i < panels.length; i++) panels[i].classList.remove('active');

  var target = document.getElementById(sectionId);
  if (target) target.classList.add('active');

  var links = document.querySelectorAll('.nav-link');
  for (var i = 0; i < links.length; i++) {
    links[i].classList.remove('active');
    if (links[i].getAttribute('data-section') === sectionId) links[i].classList.add('active');
  }

  var titulos = {
    'dashboard': 'Dashboard',
    'negocio': 'Negocio',
    'proyectos': 'Proyectos',
    'finanzas': 'Finanzas'
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
  for (var i = 0; i < subs.length; i++) subs[i].classList.remove('active');

  var target = document.getElementById(parent + '-' + subId);
  if (target) target.classList.add('active');

  var tabs = document.querySelectorAll('#' + parent + ' .sub-nav-item');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove('active');
    var onclick = tabs[i].getAttribute('onclick');
    if (onclick && onclick.indexOf("'" + subId + "'") !== -1) {
      tabs[i].classList.add('active');
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
        overlay.appendChild(links[i].cloneNode(true));
      }
    }
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle('open');
}

// ============================================================
// GASTOS
// ============================================================
function guardarGasto(event) {
  event.preventDefault();
  var feedback = document.getElementById('feedback-gasto');

  var gasto = {
    id: generarId(),
    tipo: 'gasto',
    fecha: document.getElementById('gasto-fecha').value,
    categoria: document.getElementById('gasto-categoria').value,
    descripcion: document.getElementById('gasto-descripcion').value.trim(),
    monto: parseFloat(document.getElementById('gasto-monto').value),
    metodo: document.getElementById('gasto-metodo').value,
    proyectoId: document.getElementById('gasto-proyecto') ? document.getElementById('gasto-proyecto').value : null,
    creadoEn: new Date().toISOString()
  };

  addItem(STORAGE_KEYS.GASTOS, gasto);

  feedback.className = 'form-feedback success';
  feedback.textContent = '✅ Gasto guardado: ' + formatMoney(gasto.monto);
  document.getElementById('formGasto').reset();

  var hoy = new Date();
  var fechaHoy = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
  document.getElementById('gasto-fecha').value = fechaHoy;

  renderRegistros();
  actualizarKPIs();
  renderChartBalance();
  renderChartGastos();

  if (typeof PROYECTO_ACTUAL !== 'undefined' && PROYECTO_ACTUAL && gasto.proyectoId === PROYECTO_ACTUAL.id) {
    if (typeof cargarFinancieroProyecto === 'function') cargarFinancieroProyecto(PROYECTO_ACTUAL);
    if (typeof cargarTimelineProyecto === 'function') cargarTimelineProyecto(PROYECTO_ACTUAL);
  }

  return false;
}

// ============================================================
// PAGOS
// ============================================================
function guardarPago(event) {
  event.preventDefault();
  var feedback = document.getElementById('feedback-pago');

  var pago = {
    id: generarId(),
    tipo: 'pago',
    fecha: document.getElementById('pago-fecha').value,
    cliente: document.getElementById('pago-cliente').value.trim(),
    concepto: document.getElementById('pago-concepto').value.trim(),
    monto: parseFloat(document.getElementById('pago-monto').value),
    metodo: document.getElementById('pago-metodo').value,
    estado: document.getElementById('pago-estado').value,
    proyectoId: document.getElementById('pago-proyecto') ? document.getElementById('pago-proyecto').value : null,
    creadoEn: new Date().toISOString()
  };

  addItem(STORAGE_KEYS.PAGOS, pago);

  feedback.className = 'form-feedback success';
  feedback.textContent = '✅ Pago registrado: ' + formatMoney(pago.monto);
  document.getElementById('formPago').reset();

  var hoy = new Date();
  var fechaHoy = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
  document.getElementById('pago-fecha').value = fechaHoy;

  renderRegistros();
  actualizarKPIs();
  renderChartBalance();

  if (typeof PROYECTO_ACTUAL !== 'undefined' && PROYECTO_ACTUAL && pago.proyectoId === PROYECTO_ACTUAL.id) {
    if (typeof cargarFinancieroProyecto === 'function') cargarFinancieroProyecto(PROYECTO_ACTUAL);
    if (typeof cargarTimelineProyecto === 'function') cargarTimelineProyecto(PROYECTO_ACTUAL);
  }

  return false;
}

// ============================================================
// PROYECTOS (lista simple para compatibilidad)
// ============================================================
function renderProyectosSimple() {
  var tbody = document.getElementById('tbodyProyectos');
  if (!tbody) return;

  var proyectos = getData(STORAGE_KEYS.PROYECTOS);
  proyectos.sort(function(a, b) { return new Date(b.creadoEn) - new Date(a.creadoEn); });

  if (proyectos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="tabla-vacia"><div class="tabla-vacia-icon">🏗️</div>No hay proyectos registrados</td></tr>';
    return;
  }

  var html = '';
  for (var i = 0; i < proyectos.length; i++) {
    var p = proyectos[i];
    var avancePct = Math.round(p.avance || 0);
    var estadoClass = p.estado === 'en_progreso' ? 'estado-cotizado' :
                      p.estado === 'completado' ? 'estado-aprobado' : 'estado-vencido';
    var estadoText = p.estado === 'en_progreso' ? 'En Progreso' :
                     p.estado === 'completado' ? 'Completado' : 'Pausado';

    html += '<tr>' +
      '<td><strong style="color:#a855f7">#' + (i + 1) + '</strong></td>' +
      '<td>' + (p.clienteNombre || '—') + '</td>' +
      '<td>' + p.nombre + '</td>' +
      '<td class="td-monto">' + formatMoney(p.presupuesto) + '</td>' +
      '<td>' +
        '<div style="background:rgba(255,255,255,0.05);border-radius:4px;height:8px;overflow:hidden;">' +
          '<div style="background:linear-gradient(90deg,#6bbd45,#4f8cff);height:100%;width:' + avancePct + '%;border-radius:4px;transition:width 0.5s;"></div>' +
        '</div>' +
        '<span style="font-size:11px;color:#8a8a96;margin-top:4px;display:block;">' + avancePct + '%</span>' +
      '</td>' +
      '<td><span class="estado-badge ' + estadoClass + '">' + estadoText + '</span></td>' +
      '<td>' + formatDate(p.fechaInicio) + '</td>' +
      '<td class="td-actions">' +
        '<button class="btn-icon" onclick="avanzarProyecto(\'' + p.id + '\')" title="Avanzar" style="background:rgba(107,189,69,0.1);color:#6bbd45;">▲</button>' +
        '<button class="btn-icon" onclick="eliminarProyecto(\'' + p.id + '\')" title="Eliminar" style="margin-left:4px;">🗑</button>' +
      '</td>' +
      '</tr>';
  }

  tbody.innerHTML = html;
}

function avanzarProyecto(id) {
  var proyecto = findItem(STORAGE_KEYS.PROYECTOS, id);
  if (!proyecto) return;
  var nuevoAvance = Math.min((proyecto.avance || 0) + 25, 100);
  var nuevoEstado = nuevoAvance >= 100 ? 'completado' : proyecto.estado;
  updateItem(STORAGE_KEYS.PROYECTOS, id, { avance: nuevoAvance, estado: nuevoEstado });
  if (typeof renderProyectos === 'function') renderProyectos();
  else renderProyectosSimple();
  actualizarKPIs();
}

function eliminarProyecto(id) {
  if (!confirm('¿Eliminar este proyecto?')) return;
  deleteItem(STORAGE_KEYS.PROYECTOS, id);
  if (typeof renderProyectos === 'function') renderProyectos();
  else renderProyectosSimple();
  actualizarKPIs();
}

// ============================================================
// REGISTROS
// ============================================================
function renderRegistros(filtro) {
  var tbody = document.getElementById('tbodyRegistros');
  if (!tbody) return;

  var gastos = getData(STORAGE_KEYS.GASTOS);
  var pagos = getData(STORAGE_KEYS.PAGOS);
  var todos = [];

  for (var i = 0; i < gastos.length; i++) {
    todos.push(Object.assign({}, gastos[i], { tipoLabel: 'Gasto', categoriaLabel: GASTO_LABELS[gastos[i].categoria] || gastos[i].categoria }));
  }
  for (var i = 0; i < pagos.length; i++) {
    todos.push(Object.assign({}, pagos[i], { tipoLabel: 'Pago', categoriaLabel: pagos[i].concepto }));
  }

  todos.sort(function(a, b) { return new Date(b.fecha) - new Date(a.fecha); });

  if (filtro && filtro !== 'todos') {
    todos = todos.filter(function(r) { return r.tipo === filtro; });
  }

  if (todos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="tabla-vacia"><div class="tabla-vacia-icon">📑</div>No hay registros</td></tr>';
    return;
  }

  var html = '';
  for (var i = 0; i < todos.length; i++) {
    var r = todos[i];
    var tipoColor = r.tipo === 'gasto' ? '#ef4444' : '#6bbd45';
    html += '<tr>' +
      '<td>' + formatDate(r.fecha) + '</td>' +
      '<td><span style="color:' + tipoColor + ';font-weight:600;font-size:11px;text-transform:uppercase;">' + r.tipoLabel + '</span></td>' +
      '<td>' + (r.categoriaLabel || '—') + '</td>' +
      '<td>' + r.descripcion + '</td>' +
      '<td class="td-monto" style="color:' + tipoColor + '">' + (r.tipo === 'gasto' ? '-' : '+') + formatMoney(r.monto) + '</td>' +
      '<td>' + (r.metodo || '—') + '</td>' +
      '</tr>';
  }

  tbody.innerHTML = html;
}

function filtrarRegistros(tipo) {
  renderRegistros(tipo);
}

// ============================================================
// KPIs
// ============================================================
function actualizarKPIs() {
  var gastos = getData(STORAGE_KEYS.GASTOS);
  var pagos = getData(STORAGE_KEYS.PAGOS);
  var cotizaciones = getData(STORAGE_KEYS.COTIZACIONES);
  var proyectos = getData(STORAGE_KEYS.PROYECTOS);
  var clientes = getData(STORAGE_KEYS.CLIENTES);

  var totalGastos = 0;
  for (var i = 0; i < gastos.length; i++) totalGastos += parseFloat(gastos[i].monto) || 0;

  var totalPagos = 0;
  for (var i = 0; i < pagos.length; i++) totalPagos += parseFloat(pagos[i].monto) || 0;

  var cotizacionesActivas = 0;
  for (var i = 0; i < cotizaciones.length; i++) {
    if (cotizaciones[i].estado === 'cotizado') cotizacionesActivas++;
  }

  var proyectosEnCurso = 0;
  for (var i = 0; i < proyectos.length; i++) {
    if (proyectos[i].estado === 'en_progreso') proyectosEnCurso++;
  }

  var kpiIngresos = document.getElementById('kpi-ingresos');
  var kpiGastos = document.getElementById('kpi-gastos');
  var kpiBalance = document.getElementById('kpi-balance');
  var kpiCot = document.getElementById('kpi-cotizaciones');
  var kpiProy = document.getElementById('kpi-proyectos');
  var kpiCli = document.getElementById('kpi-clientes');

  if (kpiIngresos) kpiIngresos.textContent = formatMoney(totalPagos);
  if (kpiGastos) kpiGastos.textContent = formatMoney(totalGastos);
  if (kpiBalance) kpiBalance.textContent = formatMoney(totalPagos - totalGastos);
  if (kpiCot) kpiCot.textContent = cotizacionesActivas;
  if (kpiProy) kpiProy.textContent = proyectosEnCurso;
  if (kpiCli) kpiCli.textContent = clientes.length;
}

// ============================================================
// ACTIVIDAD RECIENTE (Dashboard)
// ============================================================
function renderActividadReciente() {
  var tbody = document.getElementById('tbodyActividadReciente');
  if (!tbody) return;

  var gastos = getData(STORAGE_KEYS.GASTOS);
  var pagos = getData(STORAGE_KEYS.PAGOS);
  var cotizaciones = getData(STORAGE_KEYS.COTIZACIONES);
  var todos = [];

  for (var i = 0; i < Math.min(gastos.length, 5); i++) {
    todos.push({ fecha: gastos[i].fecha, tipo: 'gasto', descripcion: gastos[i].descripcion, monto: gastos[i].monto, estado: 'Completado' });
  }
  for (var i = 0; i < Math.min(pagos.length, 5); i++) {
    todos.push({ fecha: pagos[i].fecha, tipo: 'pago', descripcion: pagos[i].concepto, monto: pagos[i].monto, estado: pagos[i].estado });
  }
  for (var i = 0; i < Math.min(cotizaciones.length, 5); i++) {
    todos.push({ fecha: cotizaciones[i].fecha, tipo: 'cotizacion', descripcion: cotizaciones[i].proyecto, monto: cotizaciones[i].total, estado: cotizaciones[i].estado });
  }

  todos.sort(function(a, b) { return new Date(b.fecha) - new Date(a.fecha); });
  todos = todos.slice(0, 10);

  if (todos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="tabla-vacia">No hay actividad reciente</td></tr>';
    return;
  }

  var html = '';
  for (var i = 0; i < todos.length; i++) {
    var r = todos[i];
    var tipoColor = r.tipo === 'gasto' ? '#ef4444' : r.tipo === 'pago' ? '#6bbd45' : '#4f8cff';
    var tipoLabel = r.tipo === 'gasto' ? 'Gasto' : r.tipo === 'pago' ? 'Pago' : 'Cotización';
    var estadoClass = r.estado === 'aprobado' || r.estado === 'recibido' || r.estado === 'Completado' ? 'estado-aprobado' : 'estado-cotizado';

    html += '<tr>' +
      '<td>' + formatDate(r.fecha) + '</td>' +
      '<td><span style="color:' + tipoColor + ';font-weight:600;font-size:11px;text-transform:uppercase;">' + tipoLabel + '</span></td>' +
      '<td>' + r.descripcion + '</td>' +
      '<td class="td-monto">' + formatMoney(r.monto) + '</td>' +
      '<td><span class="estado-badge ' + estadoClass + '">' + r.estado + '</span></td>' +
      '</tr>';
  }

  tbody.innerHTML = html;
}

// ============================================================
// PIPELINE MINI (Dashboard)
// ============================================================
function renderPipelineMini() {
  var container = document.getElementById('pipeline-mini');
  if (!container) return;

  var cotizaciones = getData(STORAGE_KEYS.COTIZACIONES);
  var counts = { cotizado: 0, aprobado: 0, en_progreso: 0, vencido: 0, rechazado: 0 };

  for (var i = 0; i < cotizaciones.length; i++) {
    var estado = cotizaciones[i].estado;
    if (counts[estado] !== undefined) counts[estado]++;
  }

  var total = cotizaciones.length || 1;
  var pctCotizado = Math.round((counts.cotizado / total) * 100);
  var pctAprobado = Math.round((counts.aprobado / total) * 100);
  var pctProgreso = Math.round((counts.en_progreso / total) * 100);
  var pctVencido = Math.round((counts.vencido / total) * 100);

  container.innerHTML =
    '<div class="pipeline-bar">' +
      '<div class="pipeline-segment" style="width:' + pctCotizado + '%;background:#4f8cff;">' + counts.cotizado + ' Cotizados</div>' +
      '<div class="pipeline-segment" style="width:' + pctAprobado + '%;background:#6bbd45;">' + counts.aprobado + ' Aprobados</div>' +
      '<div class="pipeline-segment" style="width:' + pctProgreso + '%;background:#a855f7;">' + counts.en_progreso + ' En Progreso</div>' +
      '<div class="pipeline-segment" style="width:' + pctVencido + '%;background:#64748b;">' + counts.vencido + ' Vencidos</div>' +
    '</div>' +
    '<div class="pipeline-legend">' +
      '<span><span class="dot" style="background:#4f8cff;"></span> Cotizado</span>' +
      '<span><span class="dot" style="background:#6bbd45;"></span> Aprobado</span>' +
      '<span><span class="dot" style="background:#a855f7;"></span> En Progreso</span>' +
      '<span><span class="dot" style="background:#ef4444;"></span> Rechazado</span>' +
    '</div>';
}

// ============================================================
// EXPORTAR
// ============================================================
function exportarTodo() {
  var data = {
    servicios: getData(STORAGE_KEYS.SERVICIOS),
    clientes: getData(STORAGE_KEYS.CLIENTES),
    cotizaciones: getData(STORAGE_KEYS.COTIZACIONES),
    proyectos: getData(STORAGE_KEYS.PROYECTOS),
    gastos: getData(STORAGE_KEYS.GASTOS),
    pagos: getData(STORAGE_KEYS.PAGOS),
    grupos: getData('gn_grupos_servicios'),
    tareas: getData('gn_tareas'),
    exportadoEn: new Date().toISOString()
  };

  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'gn-studio-backup-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);
}
