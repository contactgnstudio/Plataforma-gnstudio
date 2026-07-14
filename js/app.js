// ============================================================
// js/app.js — Lógica principal y navegación (CORREGIDO)
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
  inicializarCatalogo();
  inicializarClientes();
  inicializarCotizaciones();
  inicializarCharts();

  renderServicios();
  actualizarVistaJSON();
  renderClientes();
  actualizarSelectClientes();
  renderCotizacionesGuardadas();
  renderProyectos();
  renderRegistros();
  actualizarKPIs();

  // Fecha actual en formato YYYY-MM-DD para inputs type="date"
  var hoy = new Date();
  var yyyy = hoy.getFullYear();
  var mm = String(hoy.getMonth() + 1).padStart(2, '0');
  var dd = String(hoy.getDate()).padStart(2, '0');
  var fechaHoy = yyyy + '-' + mm + '-' + dd;

  var gf = document.getElementById('gasto-fecha');
  var pf = document.getElementById('pago-fecha');
  var cf = document.getElementById('cot-fecha');

  if (gf && !gf.value) gf.value = fechaHoy;
  if (pf && !pf.value) pf.value = fechaHoy;
  if (cf && !cf.value) cf.value = fechaHoy;
});

// ============================================================
// NAVEGACIÓN
// ============================================================
function switchSection(sectionId) {
  var panels = document.querySelectorAll('.section-panel');
  for (var i = 0; i < panels.length; i++) {
    panels[i].classList.remove('active');
  }

  var target = document.getElementById(sectionId);
  if (target) target.classList.add('active');

  var links = document.querySelectorAll('.nav-link');
  for (var i = 0; i < links.length; i++) {
    links[i].classList.remove('active');
    if (links[i].getAttribute('data-section') === sectionId) {
      links[i].classList.add('active');
    }
  }

  var titulos = {
    'dashboard': 'Dashboard',
    'catalogo-servicios': 'Catálogo de Servicios',
    'clientes': 'Clientes',
    'cotizaciones': 'Cotizaciones',
    'proyectos': 'Proyectos',
    'ingresar-gastos': 'Registrar Gasto',
    'ingresar-pagos': 'Registrar Pago',
    'registros': 'Registros'
  };
  var pageTitle = document.getElementById('page-title');
  if (pageTitle) pageTitle.textContent = titulos[sectionId] || 'Dashboard';

  var mobileNav = document.querySelector('.mobile-nav-overlay');
  if (mobileNav) mobileNav.classList.remove('open');

  window.scrollTo({ top: 0, behavior: 'smooth' });
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
  return false;
}

// ============================================================
// PROYECTOS
// ============================================================
function renderProyectos() {
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
  renderProyectos();
  actualizarKPIs();
}

function eliminarProyecto(id) {
  if (!confirm('¿Eliminar este proyecto?')) return;
  deleteItem(STORAGE_KEYS.PROYECTOS, id);
  renderProyectos();
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
