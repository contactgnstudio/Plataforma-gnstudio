// ============================================================
// js/app.js - Logica principal del Dashboard Financiero Proyintel
// ============================================================

var chartInstances = {};

// ============================================================
// INICIALIZACION
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
  inicializarStorage();
    // Inicializar catálogo si estamos en esa sección
  if (document.getElementById('tbodyItems')) {
    inicializarCatalogo();
    renderItems();
    actualizarVistaJSON();
  }
  var periodoEl = document.getElementById('periodo-actual');
  if (periodoEl) periodoEl.textContent = periodoActual;

  renderKPIs();
  renderTablaGastos();
  renderTablaPagos();
  renderResumen();
  renderResumenPagos();
  renderRegistros();
  inicializarGraficas();

  // Set fecha actual en formularios
  var hoy = new Date().toISOString().split('T')[0];
  var fechaGasto = document.getElementById('gasto-fecha');
  var fechaPago = document.getElementById('pago-fecha');
  if (fechaGasto) fechaGasto.value = hoy;
  if (fechaPago) fechaPago.value = hoy;
});

// ============================================================
// NAVEGACION DE SECCIONES
// ============================================================
function switchSection(sectionId) {
  var panels = document.querySelectorAll('.section-panel');
  for (var i = 0; i < panels.length; i++) {
    panels[i].classList.remove('active');
  }
  
  var tabs = document.querySelectorAll('.nav-tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove('active');
  }

  var panel = document.getElementById(sectionId);
  var tab = document.querySelector('.nav-tab[data-section="' + sectionId + '"]');
  if (panel) panel.classList.add('active');
  if (tab) tab.classList.add('active');

  // Re-renderizar al volver al dashboard
  if (sectionId === 'dashboard') {
    renderTablaGastos();
    renderTablaPagos();
    renderResumen();
    renderResumenPagos();
    actualizarGraficas();
  }
}

function switchRegTab(tabId) {
  var panels = document.querySelectorAll('.reg-panel');
  for (var i = 0; i < panels.length; i++) {
    panels[i].classList.remove('active');
  }
  
  var tabs = document.querySelectorAll('.reg-tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove('active');
  }

  var panel = document.getElementById(tabId);
  if (event && event.target) event.target.classList.add('active');
  if (panel) panel.classList.add('active');
}

// ============================================================
// KPIs
// ============================================================
function renderKPIs() {
  var gastos = obtenerGastos();
  var pagos = obtenerPagos();

  var totalGastos = 0;
  for (var i = 0; i < gastos.length; i++) totalGastos += gastos[i].total;
  
  var totalPagos = 0;
  for (var i = 0; i < pagos.length; i++) totalPagos += pagos[i].monto;

  var totalMateriales = 0;
  var totalOperativo = 0;
  var totalMO = 0;
  for (var i = 0; i < gastos.length; i++) {
    if (gastos[i].categoria === 'materiales') totalMateriales += gastos[i].total;
    else if (gastos[i].categoria === 'operativo') totalOperativo += gastos[i].total;
    else if (gastos[i].categoria === 'mano-obra') totalMO += gastos[i].total;
  }

  var balance = totalPagos - totalGastos;

  var kpis = [
    { label: 'Total Gastos', value: totalGastos, change: 'Gastos acumulados', positive: true, color: 'rojo' },
    { label: 'Total Ingresos', value: totalPagos, change: 'Pagos recibidos', positive: true, color: 'verde' },
    { label: 'Balance', value: balance, change: balance >= 0 ? 'Ganancia neta' : 'Perdida neta', positive: balance >= 0, color: balance >= 0 ? 'verde' : 'rojo' },
    { label: 'Mano de Obra', value: totalMO, change: 'Mayor categoria', positive: true, color: 'amarillo' }
  ];

  var container = document.getElementById('kpi-container');
  if (!container) return;

  var html = '';
  for (var i = 0; i < kpis.length; i++) {
    var k = kpis[i];
    html += '<div class="kpi-card ' + k.color + '">' +
      '<div class="kpi-label">' + k.label + '</div>' +
      '<div class="kpi-value">' + fmt.format(k.value) + '</div>' +
      '<span class="kpi-change ' + (k.positive ? 'positive' : 'negative') + '">' + k.change + '</span>' +
      '</div>';
  }
  container.innerHTML = html;
}

// ============================================================
// TABLA DE GASTOS
// ============================================================
function renderTablaGastos(filtro) {
  filtro = filtro || 'todos';
  var tbody = document.getElementById('tbodyGastos');
  if (!tbody) return;

  var gastos = obtenerGastos();
  if (filtro !== 'todos') {
    var filtrados = [];
    for (var i = 0; i < gastos.length; i++) {
      if (gastos[i].categoria === filtro) filtrados.push(gastos[i]);
    }
    gastos = filtrados;
  }

  var html = '';
  for (var i = 0; i < gastos.length; i++) {
    var g = gastos[i];
    var catClass = g.categoria === 'materiales' ? 'cat-materiales' : g.categoria === 'operativo' ? 'cat-operativo' : 'cat-mano-obra';
    var catLabel = g.categoria === 'materiales' ? 'Materiales' : g.categoria === 'operativo' ? 'Operativo' : 'Mano de Obra';
    html += '<tr>' +
      '<td>' + g.no + '</td>' +
      '<td>' + g.fecha + '</td>' +
      '<td>' + g.factura + '</td>' +
      '<td>' + g.descripcion + '</td>' +
      '<td><span class="td-categoria ' + catClass + '">' + catLabel + '</span></td>' +
      '<td class="td-monto">' + fmt.format(g.total) + '</td>' +
      '<td class="td-actions">' +
        '<button class="btn-icon" onclick="eliminarGastoConfirm(' + g.no + ')" title="Eliminar">🗑</button>' +
      '</td>' +
      '</tr>';
  }
  tbody.innerHTML = html;
}

function filtrarTablaGastos(cat) {
  var btns = document.querySelectorAll('.section-actions .filter-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.remove('active');
  }
  if (event && event.target) event.target.classList.add('active');
  renderTablaGastos(cat);
}

function eliminarGastoConfirm(no) {
  if (confirm('¿Eliminar este gasto?')) {
    eliminarGasto(no);
    renderTablaGastos();
    renderKPIs();
    renderResumen();
    actualizarGraficas();
    renderRegistros();
  }
}

// ============================================================
// TABLA DE PAGOS
// ============================================================
function renderTablaPagos(filtro) {
  filtro = filtro || 'todos';
  var tbody = document.getElementById('tbodyPagos');
  if (!tbody) return;

  var pagos = obtenerPagos();
  if (filtro !== 'todos') {
    var filtrados = [];
    for (var i = 0; i < pagos.length; i++) {
      if (pagos[i].estado === filtro) filtrados.push(pagos[i]);
    }
    pagos = filtrados;
  }

  var metodoMap = { transferencia: 'Transferencia', efectivo: 'Efectivo', cheque: 'Cheque', yappy: 'Yappy', otro: 'Otro' };

  var html = '';
  for (var i = 0; i < pagos.length; i++) {
    var p = pagos[i];
    var estadoClass = p.estado === 'completado' ? 'cat-completado' : p.estado === 'pendiente' ? 'cat-pendiente' : 'cat-parcial';
    var estadoLabel = p.estado === 'completado' ? 'Completado' : p.estado === 'pendiente' ? 'Pendiente' : 'Parcial';
    html += '<tr>' +
      '<td>' + p.no + '</td>' +
      '<td>' + p.fecha + '</td>' +
      '<td>' + p.cliente + '</td>' +
      '<td>' + p.proyecto + '</td>' +
      '<td>' + (metodoMap[p.metodo] || p.metodo) + '</td>' +
      '<td class="td-monto">' + fmt.format(p.monto) + '</td>' +
      '<td><span class="td-categoria ' + estadoClass + '">' + estadoLabel + '</span></td>' +
      '<td class="td-actions">' +
        '<button class="btn-icon" onclick="eliminarPagoConfirm(' + p.no + ')" title="Eliminar">🗑</button>' +
      '</td>' +
      '</tr>';
  }
  tbody.innerHTML = html;
}

function filtrarTablaPagos(estado) {
  var btns = document.querySelectorAll('#tablaPagos ~ .section-actions .filter-btn, .section-actions .filter-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.remove('active');
  }
  if (event && event.target) event.target.classList.add('active');
  renderTablaPagos(estado);
}

function eliminarPagoConfirm(no) {
  if (confirm('¿Eliminar este pago?')) {
    eliminarPago(no);
    renderTablaPagos();
    renderKPIs();
    renderResumenPagos();
    renderRegistros();
  }
}

// ============================================================
// RESUMEN FINANCIERO - GASTOS
// ============================================================
function renderResumen() {
  var gastos = obtenerGastos();
  
  var totalMat = 0, totalOp = 0, totalMO = 0;
  for (var i = 0; i < gastos.length; i++) {
    if (gastos[i].categoria === 'materiales') totalMat += gastos[i].total;
    else if (gastos[i].categoria === 'operativo') totalOp += gastos[i].total;
    else if (gastos[i].categoria === 'mano-obra') totalMO += gastos[i].total;
  }
  var total = totalMat + totalOp + totalMO;

  var desglose = document.getElementById('desgloseCategorias');
  if (desglose) {
    desglose.innerHTML =
      '<div class="resumen-row"><span class="resumen-label">Materiales</span><span class="resumen-value">' + fmt.format(totalMat) + '</span></div>' +
      '<div class="resumen-row"><span class="resumen-label">Operativo</span><span class="resumen-value">' + fmt.format(totalOp) + '</span></div>' +
      '<div class="resumen-row"><span class="resumen-label">Mano de Obra</span><span class="resumen-value">' + fmt.format(totalMO) + '</span></div>' +
      '<div class="resumen-row total"><span class="resumen-label" style="color:var(--verde);font-weight:600">TOTAL</span><span class="resumen-value total-val">' + fmt.format(total) + '</span></div>';
  }

  var progreso = document.getElementById('progresoPresupuesto');
  if (progreso) {
    var cats = [
      { label: 'Materiales', val: totalMat, pres: presupuestos.materiales, cls: 'fill-verde' },
      { label: 'Operativo', val: totalOp, pres: presupuestos.operativo, cls: 'fill-azul' },
      { label: 'Mano de Obra', val: totalMO, pres: presupuestos['mano-obra'], cls: 'fill-amarillo' }
    ];

    var html = '';
    for (var i = 0; i < cats.length; i++) {
      var c = cats[i];
      var pct = Math.min((c.val / c.pres) * 100, 100);
      html += '<div class="progress-item">' +
        '<div class="progress-header"><span>' + c.label + '</span><span>' + pct.toFixed(1) + '% · ' + fmt.format(c.val) + ' / ' + fmt.format(c.pres) + '</span></div>' +
        '<div class="progress-bar"><div class="progress-fill ' + c.cls + '" style="width:' + pct + '%"></div></div>' +
        '</div>';
    }
    progreso.innerHTML = html;
  }
}

// ============================================================
// RESUMEN DE PAGOS
// ============================================================
function renderResumenPagos() {
  var pagos = obtenerPagos();
  
  var total = 0, completados = 0, pendientes = 0, parciales = 0;
  for (var i = 0; i < pagos.length; i++) {
    total += pagos[i].monto;
    if (pagos[i].estado === 'completado') completados += pagos[i].monto;
    else if (pagos[i].estado === 'pendiente') pendientes += pagos[i].monto;
    else if (pagos[i].estado === 'parcial') parciales += pagos[i].monto;
  }

  var container = document.getElementById('resumenPagos');
  if (!container) return;

  container.innerHTML =
    '<div class="resumen-pago-card"><div class="rp-label">Total Recibido</div><div class="rp-value" style="color:#6bbd45">' + fmt.format(total) + '</div></div>' +
    '<div class="resumen-pago-card"><div class="rp-label">Completados</div><div class="rp-value" style="color:#6bbd45">' + fmt.format(completados) + '</div></div>' +
    '<div class="resumen-pago-card"><div class="rp-label">Pendientes</div><div class="rp-value" style="color:#e74c3c">' + fmt.format(pendientes) + '</div></div>';
}

// ============================================================
// REGISTROS COMPLETOS
// ============================================================
function renderRegistros() {
  var tbodyG = document.getElementById('tbodyRegGastos');
  var tbodyP = document.getElementById('tbodyRegPagos');

  if (tbodyG) {
    var gastos = obtenerGastos();
    var html = '';
    for (var i = 0; i < gastos.length; i++) {
      var g = gastos[i];
      var catLabel = g.categoria === 'materiales' ? 'Materiales' : g.categoria === 'operativo' ? 'Operativo' : 'Mano de Obra';
      html += '<tr><td>' + g.no + '</td><td>' + g.fecha + '</td><td>' + g.factura + '</td><td>' + g.descripcion + '</td><td>' + catLabel + '</td><td>' + fmt.format(g.total) + '</td></tr>';
    }
    tbodyG.innerHTML = html;
  }

  if (tbodyP) {
    var pagos = obtenerPagos();
    var metodoMap = { transferencia: 'Transferencia', efectivo: 'Efectivo', cheque: 'Cheque', yappy: 'Yappy', otro: 'Otro' };
    var html = '';
    for (var i = 0; i < pagos.length; i++) {
      var p = pagos[i];
      var estadoLabel = p.estado === 'completado' ? 'Completado' : p.estado === 'pendiente' ? 'Pendiente' : 'Parcial';
      html += '<tr><td>' + p.no + '</td><td>' + p.fecha + '</td><td>' + p.cliente + '</td><td>' + p.proyecto + '</td><td>' + (metodoMap[p.metodo] || p.metodo) + '</td><td>' + fmt.format(p.monto) + '</td><td>' + estadoLabel + '</td></tr>';
    }
    tbodyP.innerHTML = html;
  }
}

// ============================================================
// GRAFICAS
// ============================================================
function inicializarGraficas() {
  chartInstances.evolucion = crearChartEvolucion();
  chartInstances.distribucion = crearChartDistribucion();
  chartInstances.barras = crearChartBarras();
  chartInstances.topGastos = crearChartTopGastos();
}

function actualizarGraficas() {
  var keys = Object.keys(chartInstances);
  for (var i = 0; i < keys.length; i++) {
    var chart = chartInstances[keys[i]];
    if (chart) chart.destroy();
  }
  inicializarGraficas();
}

// ============================================================
// FORMULARIO: GUARDAR GASTO
// ============================================================
function guardarGasto(event) {
  event.preventDefault();

  var feedback = document.getElementById('feedback-gasto');
  if (!feedback) return false;

  var gasto = {
    fecha: document.getElementById('gasto-fecha').value,
    factura: document.getElementById('gasto-factura').value,
    descripcion: document.getElementById('gasto-descripcion').value,
    categoria: document.getElementById('gasto-categoria').value,
    total: document.getElementById('gasto-total').value
  };

  var resultado = guardarGastoEnStorage(gasto);

  if (resultado.exito) {
    feedback.className = 'form-feedback success';
    feedback.textContent = '✅ Gasto guardado correctamente. N° ' + resultado.gasto.no;
    document.getElementById('formGasto').reset();
    document.getElementById('gasto-fecha').value = new Date().toISOString().split('T')[0];

    renderKPIs();
    renderResumen();
    actualizarGraficas();
  } else {
    feedback.className = 'form-feedback error';
    feedback.textContent = '❌ ' + resultado.errores.join(', ');
  }

  return false;
}

// ============================================================
// FORMULARIO: GUARDAR PAGO
// ============================================================
function guardarPago(event) {
  event.preventDefault();

  var feedback = document.getElementById('feedback-pago');
  if (!feedback) return false;

  var pago = {
    fecha: document.getElementById('pago-fecha').value,
    cliente: document.getElementById('pago-cliente').value,
    proyecto: document.getElementById('pago-proyecto').value,
    metodo: document.getElementById('pago-metodo').value,
    monto: document.getElementById('pago-monto').value,
    estado: document.getElementById('pago-estado').value,
    notas: document.getElementById('pago-notas').value
  };

  var resultado = guardarPagoEnStorage(pago);

  if (resultado.exito) {
    feedback.className = 'form-feedback success';
    feedback.textContent = '✅ Pago guardado correctamente. N° ' + resultado.pago.no;
    document.getElementById('formPago').reset();
    document.getElementById('pago-fecha').value = new Date().toISOString().split('T')[0];

    renderKPIs();
    renderResumenPagos();
    renderTablaPagos();
  } else {
    feedback.className = 'form-feedback error';
    feedback.textContent = '❌ ' + resultado.errores.join(', ');
  }

  return false;
}
