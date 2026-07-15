// ============================================================
// js/proyectos.js — Módulo de Proyectos (Lista + Detalle)
// ============================================================

var PROYECTO_ACTUAL = null;
var chartProyectoInstance = null;

// ============================================================
// DATOS DE EJEMPLO
// ============================================================
function inicializarProyectosEjemplo() {
  var proyectos = getData(STORAGE_KEYS.PROYECTOS);
  if (!proyectos || proyectos.length === 0) {
    var hoy = new Date();
    var fechaHoy = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');
    var mesPasado = hoy.getFullYear() + '-' + String(hoy.getMonth()).padStart(2, '0') + '-15';
    var dosMeses = hoy.getFullYear() + '-' + String(hoy.getMonth() - 1).padStart(2, '0') + '-01';

    var proyectosEjemplo = [
      {
        id: 'proy-001',
        nombre: 'Rediseño Web Corporativo ACME',
        clienteNombre: 'ACME Corporation',
        clienteId: 'cli-acme',
        presupuesto: 3500.00,
        avance: 75,
        estado: 'en_progreso',
        fechaInicio: mesPasado,
        alcance: 'Rediseño completo del sitio web corporativo con nuestra identidad visual, responsive y optimizado para SEO.',
        notas: 'Reunión inicial: 15/06. Cliente quiere tonos azules. Mockups aprobados el 20/06.',
        creadoEn: mesPasado
      },
      {
        id: 'proy-002',
        nombre: 'E-commerce Boutique Luna',
        clienteNombre: 'Boutique Luna',
        clienteId: 'cli-luna',
        presupuesto: 5800.00,
        avance: 30,
        estado: 'en_progreso',
        fechaInicio: fechaHoy,
        alcance: 'Tienda online con pasarela de pagos Stripe, inventario y panel de administración.',
        notas: 'Pago inicial recibido: $2,900. Esperando materiales del cliente.',
        creadoEn: fechaHoy
      },
      {
        id: 'proy-003',
        nombre: 'Branding Completo - Café Central',
        clienteNombre: 'Café Central',
        clienteId: 'cli-cafe',
        presupuesto: 2200.00,
        avance: 100,
        estado: 'completado',
        fechaInicio: dosMeses,
        alcance: 'Logo, manual de marca, papelería corporativa y packaging.',
        notas: 'Proyecto entregado. Cliente muy satisfecho. Pago final recibido.',
        creadoEn: dosMeses
      },
      {
        id: 'proy-004',
        nombre: 'Campaña Marketing Digital - Gym Pro',
        clienteNombre: 'Gym Pro',
        clienteId: 'cli-gym',
        presupuesto: 1500.00,
        avance: 0,
        estado: 'en_progreso',
        fechaInicio: fechaHoy,
        alcance: 'Gestión de redes sociales, Google Ads y email marketing por 3 meses.',
        notas: 'Contrato firmado. Inicia el lunes.',
        creadoEn: fechaHoy
      },
      {
        id: 'proy-005',
        nombre: 'App Móvil - Delivery Express',
        clienteNombre: 'Delivery Express',
        clienteId: 'cli-delivery',
        presupuesto: 8500.00,
        avance: 10,
        estado: 'en_progreso',
        fechaInicio: mesPasado,
        alcance: 'App iOS y Android para delivery de comida con tracking en tiempo real.',
        notas: 'Fase de investigación de usuario. Entrevistas programadas.',
        creadoEn: mesPasado
      }
    ];

    setData(STORAGE_KEYS.PROYECTOS, proyectosEjemplo);

    // Crear gastos de ejemplo para los proyectos
    var gastosExistentes = getData(STORAGE_KEYS.GASTOS);
    var gastosEjemplo = [
      { id: generarId(), tipo: 'gasto', fecha: mesPasado, categoria: 'software', descripcion: 'Licencia Adobe Creative Cloud - Proyecto ACME', monto: 79.99, metodo: 'tarjeta', proyectoId: 'proy-001', creadoEn: new Date().toISOString() },
      { id: generarId(), tipo: 'gasto', fecha: mesPasado, categoria: 'hosting', descripcion: 'Hosting VPS - Proyecto ACME', monto: 45.00, metodo: 'transferencia', proyectoId: 'proy-001', creadoEn: new Date().toISOString() },
      { id: generarId(), tipo: 'gasto', fecha: fechaHoy, categoria: 'software', descripcion: 'Licencia Figma - Proyecto Boutique Luna', monto: 45.00, metodo: 'tarjeta', proyectoId: 'proy-002', creadoEn: new Date().toISOString() },
      { id: generarId(), tipo: 'gasto', fecha: dosMeses, categoria: 'equipo', descripcion: 'Impresión papelería - Café Central', monto: 180.00, metodo: 'efectivo', proyectoId: 'proy-003', creadoEn: new Date().toISOString() },
      { id: generarId(), tipo: 'gasto', fecha: mesPasado, categoria: 'marketing', descripcion: 'Ads Facebook - Gym Pro', monto: 200.00, metodo: 'tarjeta', proyectoId: 'proy-004', creadoEn: new Date().toISOString() },
      { id: generarId(), tipo: 'gasto', fecha: mesPasado, categoria: 'software', descripcion: 'Licencia Flutter - Delivery Express', monto: 120.00, metodo: 'transferencia', proyectoId: 'proy-005', creadoEn: new Date().toISOString() }
    ];
    setData(STORAGE_KEYS.GASTOS, gastosExistentes.concat(gastosEjemplo));

    // Crear pagos de ejemplo
    var pagosExistentes = getData(STORAGE_KEYS.PAGOS);
    var pagosEjemplo = [
      { id: generarId(), tipo: 'pago', fecha: mesPasado, cliente: 'ACME Corporation', concepto: 'Pago inicial 50% - Rediseño Web', monto: 1750.00, metodo: 'transferencia', estado: 'recibido', proyectoId: 'proy-001', creadoEn: new Date().toISOString() },
      { id: generarId(), tipo: 'pago', fecha: fechaHoy, cliente: 'Boutique Luna', concepto: 'Pago inicial 50% - E-commerce', monto: 2900.00, metodo: 'transferencia', estado: 'recibido', proyectoId: 'proy-002', creadoEn: new Date().toISOString() },
      { id: generarId(), tipo: 'pago', fecha: dosMeses, cliente: 'Café Central', concepto: 'Pago inicial - Branding', monto: 1100.00, metodo: 'efectivo', estado: 'recibido', proyectoId: 'proy-003', creadoEn: new Date().toISOString() },
      { id: generarId(), tipo: 'pago', fecha: mesPasado, cliente: 'Café Central', concepto: 'Pago final - Branding', monto: 1100.00, metodo: 'transferencia', estado: 'recibido', proyectoId: 'proy-003', creadoEn: new Date().toISOString() },
      { id: generarId(), tipo: 'pago', fecha: fechaHoy, cliente: 'Gym Pro', concepto: 'Pago mes 1 - Marketing', monto: 500.00, metodo: 'tarjeta', estado: 'recibido', proyectoId: 'proy-004', creadoEn: new Date().toISOString() }
    ];
    setData(STORAGE_KEYS.PAGOS, pagosExistentes.concat(pagosEjemplo));

    // Crear tareas de ejemplo
    var tareasEjemplo = [
      { id: generarId(), proyectoId: 'proy-001', titulo: 'Investigación de usuario', asignado: 'Ana - UX', fechaLimite: mesPasado, estado: 'completada', creadoEn: new Date().toISOString() },
      { id: generarId(), proyectoId: 'proy-001', titulo: 'Wireframes homepage', asignado: 'Ana - UX', fechaLimite: mesPasado, estado: 'completada', creadoEn: new Date().toISOString() },
      { id: generarId(), proyectoId: 'proy-001', titulo: 'Diseño UI mockups', asignado: 'Carlos - Diseño', fechaLimite: fechaHoy, estado: 'en_progreso', creadoEn: new Date().toISOString() },
      { id: generarId(), proyectoId: 'proy-001', titulo: 'Desarrollo frontend', asignado: 'María - Dev', fechaLimite: fechaHoy, estado: 'pendiente', creadoEn: new Date().toISOString() },
      { id: generarId(), proyectoId: 'proy-001', titulo: 'Testing y QA', asignado: 'QA Team', fechaLimite: fechaHoy, estado: 'pendiente', creadoEn: new Date().toISOString() },
      { id: generarId(), proyectoId: 'proy-002', titulo: 'Setup del proyecto', asignado: 'María - Dev', fechaLimite: fechaHoy, estado: 'en_progreso', creadoEn: new Date().toISOString() },
      { id: generarId(), proyectoId: 'proy-003', titulo: 'Conceptos de logo', asignado: 'Carlos - Diseño', fechaLimite: dosMeses, estado: 'completada', creadoEn: new Date().toISOString() },
      { id: generarId(), proyectoId: 'proy-003', titulo: 'Manual de marca', asignado: 'Carlos - Diseño', fechaLimite: mesPasado, estado: 'completada', creadoEn: new Date().toISOString() }
    ];
    setData('gn_tareas', tareasEjemplo);
  }
}

// ============================================================
// VISTA LISTA
// ============================================================
function renderProyectos(filtro) {
  var grid = document.getElementById('proyectos-grid');
  if (!grid) return;

  inicializarProyectosEjemplo();

  var proyectos = getData(STORAGE_KEYS.PROYECTOS);

  if (filtro && filtro !== 'todos') {
    proyectos = proyectos.filter(function(p) { return p.estado === filtro; });
  }

  proyectos.sort(function(a, b) { return new Date(b.creadoEn) - new Date(a.creadoEn); });

  if (proyectos.length === 0) {
    grid.innerHTML = '<div class="tabla-vacia" style="grid-column:1/-1;"><div class="tabla-vacia-icon">🏗️</div>No hay proyectos registrados</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < proyectos.length; i++) {
    var p = proyectos[i];
    var avancePct = Math.round(p.avance || 0);
    var colorStatus = p.estado === 'en_progreso' ? '#4f8cff' : 
                      p.estado === 'completado' ? '#6bbd45' : '#64748b';

    html += '<div class="proyecto-card" onclick="abrirProyecto(\'' + p.id + '\')">' +
      '<div class="proyecto-card-status" style="background:' + colorStatus + ';"></div>' +
      '<div class="proyecto-card-header">' +
        '<span class="proyecto-card-title">' + p.nombre + '</span>' +
        '<span class="estado-badge estado-' + (p.estado === 'en_progreso' ? 'cotizado' : p.estado === 'completado' ? 'aprobado' : 'vencido') + '">' +
          (p.estado === 'en_progreso' ? 'En Progreso' : p.estado === 'completado' ? 'Completado' : 'Pausado') +
        '</span>' +
      '</div>' +
      '<div class="proyecto-card-cliente">👤 ' + (p.clienteNombre || 'Sin cliente') + '</div>' +
      '<div class="proyecto-card-progress">' +
        '<div class="proyecto-card-progress-bar">' +
          '<div class="proyecto-card-progress-fill" style="width:' + avancePct + '%;background:linear-gradient(90deg,' + colorStatus + ',#6bbd45);"></div>' +
        '</div>' +
        '<div class="proyecto-card-progress-text">' +
          '<span>' + avancePct + '% completado</span>' +
          '<span>' + formatDate(p.fechaInicio) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="proyecto-card-footer">' +
        '<span class="proyecto-card-budget">' + formatMoney(p.presupuesto) + '</span>' +
        '<span class="proyecto-card-dates">💰 Presupuesto</span>' +
      '</div>' +
      '</div>';
  }

  grid.innerHTML = html;
}

function filtrarProyectos(filtro) {
  renderProyectos(filtro);
}

// ============================================================
// VISTA DETALLE
// ============================================================
function abrirProyecto(id) {
  var proyecto = findItem(STORAGE_KEYS.PROYECTOS, id);
  if (!proyecto) return;

  PROYECTO_ACTUAL = proyecto;

  document.getElementById('proyectos-lista').style.display = 'none';
  document.getElementById('proyecto-detalle').style.display = 'block';

  document.getElementById('detalle-proyecto-nombre').textContent = proyecto.nombre;
  document.getElementById('detalle-proyecto-cliente').textContent = proyecto.clienteNombre || '—';
  document.getElementById('detalle-proyecto-fecha').textContent = formatDate(proyecto.fechaInicio);
  document.getElementById('detalle-proyecto-presupuesto').textContent = formatMoney(proyecto.presupuesto);

  var estadoBadge = document.getElementById('detalle-proyecto-estado');
  estadoBadge.textContent = proyecto.estado === 'en_progreso' ? 'En Progreso' : proyecto.estado === 'completado' ? 'Completado' : 'Pausado';
  estadoBadge.className = 'estado-badge estado-' + (proyecto.estado === 'en_progreso' ? 'cotizado' : proyecto.estado === 'completado' ? 'aprobado' : 'vencido');

  var notasField = document.getElementById('proyecto-notas');
  if (notasField) notasField.value = proyecto.notas || '';

  switchProyectoTab('resumen');
  cargarResumenProyecto(proyecto);
  cargarFinancieroProyecto(proyecto);
  cargarTareasProyecto(proyecto);
  cargarTimelineProyecto(proyecto);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function volverAListaProyectos() {
  document.getElementById('proyecto-detalle').style.display = 'none';
  document.getElementById('proyectos-lista').style.display = 'block';
  PROYECTO_ACTUAL = null;
  renderProyectos();
}

function switchProyectoTab(tab) {
  var tabs = document.querySelectorAll('.proyecto-tab');
  var contents = document.querySelectorAll('.proyecto-tab-content');

  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
  for (var i = 0; i < contents.length; i++) contents[i].classList.remove('active');

  var tabBtn = document.querySelector('.proyecto-tab[onclick="switchProyectoTab(\'' + tab + '\')"]');
  if (tabBtn) tabBtn.classList.add('active');

  var content = document.getElementById('proyecto-tab-' + tab);
  if (content) content.classList.add('active');
}

// ============================================================
// RESUMEN DEL PROYECTO
// ============================================================
function cargarResumenProyecto(proyecto) {
  var avance = proyecto.avance || 0;
  var pctEl = document.getElementById('proyecto-progreso-pct');
  if (pctEl) pctEl.textContent = avance + '%';

  var circle = document.querySelector('#proyecto-progreso-visual circle:last-child');
  if (circle) {
    var offset = 283 - (283 * avance / 100);
    circle.setAttribute('stroke-dashoffset', offset);
  }

  var gastos = getData(STORAGE_KEYS.GASTOS).filter(function(g) { 
    return g.proyectoId === proyecto.id; 
  });
  var pagos = getData(STORAGE_KEYS.PAGOS).filter(function(p) { 
    return p.proyectoId === proyecto.id; 
  });

  var totalGastos = 0;
  for (var i = 0; i < gastos.length; i++) totalGastos += parseFloat(gastos[i].monto) || 0;

  var totalPagos = 0;
  for (var i = 0; i < pagos.length; i++) totalPagos += parseFloat(pagos[i].monto) || 0;

  var porCobrar = Math.max(0, proyecto.presupuesto - totalPagos);
  var utilidad = totalPagos - totalGastos;

  var rp = document.getElementById('resumen-presupuesto');
  var rg = document.getElementById('resumen-gastos');
  var rpa = document.getElementById('resumen-pagos');
  var rpc = document.getElementById('resumen-por-cobrar');
  var ru = document.getElementById('resumen-utilidad');

  if (rp) rp.textContent = formatMoney(proyecto.presupuesto);
  if (rg) rg.textContent = formatMoney(totalGastos);
  if (rpa) rpa.textContent = formatMoney(totalPagos);
  if (rpc) rpc.textContent = formatMoney(porCobrar);
  if (ru) ru.textContent = formatMoney(utilidad);

  renderChartProyecto(gastos, pagos);
}

function renderChartProyecto(gastos, pagos) {
  var ctx = document.getElementById('chartProyectoBalance');
  if (!ctx) return;

  if (chartProyectoInstance) {
    chartProyectoInstance.destroy();
  }

  var meses = {};
  for (var i = 5; i >= 0; i--) {
    var d = new Date();
    d.setMonth(d.getMonth() - i);
    var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    meses[key] = { label: d.toLocaleDateString('es-PA', { month: 'short' }), gastos: 0, pagos: 0 };
  }

  for (var i = 0; i < gastos.length; i++) {
    if (gastos[i].fecha) {
      var key = gastos[i].fecha.substring(0, 7);
      if (meses[key]) meses[key].gastos += parseFloat(gastos[i].monto) || 0;
    }
  }

  for (var i = 0; i < pagos.length; i++) {
    if (pagos[i].fecha) {
      var key = pagos[i].fecha.substring(0, 7);
      if (meses[key]) meses[key].pagos += parseFloat(pagos[i].monto) || 0;
    }
  }

  var labels = [], gastosData = [], pagosData = [];
  for (var key in meses) {
    labels.push(meses[key].label);
    gastosData.push(meses[key].gastos);
    pagosData.push(meses[key].pagos);
  }

  chartProyectoInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'Gastos', data: gastosData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.4 },
        { label: 'Pagos', data: pagosData, borderColor: '#6bbd45', backgroundColor: 'rgba(107,189,69,0.1)', fill: true, tension: 0.4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#8a8a96' } } },
      scales: {
        x: { ticks: { color: '#8a8a96' }, grid: { color: 'rgba(255,255,255,0.03)' } },
        y: { ticks: { color: '#8a8a96' }, grid: { color: 'rgba(255,255,255,0.03)' } }
      }
    }
  });
}

// ============================================================
// FINANCIERO DEL PROYECTO
// ============================================================
function cargarFinancieroProyecto(proyecto) {
  var gastos = getData(STORAGE_KEYS.GASTOS).filter(function(g) { return g.proyectoId === proyecto.id; });
  var pagos = getData(STORAGE_KEYS.PAGOS).filter(function(p) { return p.proyectoId === proyecto.id; });

  var tbodyG = document.getElementById('tbodyGastosProyecto');
  if (tbodyG) {
    var htmlG = '';
    for (var i = 0; i < gastos.length; i++) {
      var g = gastos[i];
      htmlG += '<tr>' +
        '<td>' + formatDate(g.fecha) + '</td>' +
        '<td>' + (GASTO_LABELS[g.categoria] || g.categoria) + '</td>' +
        '<td>' + g.descripcion + '</td>' +
        '<td class="td-monto" style="color:#ef4444;">-' + formatMoney(g.monto) + '</td>' +
        '<td>' + (g.metodo || '—') + '</td>' +
        '</tr>';
    }
    if (htmlG === '') htmlG = '<tr><td colspan="5" class="tabla-vacia">No hay gastos registrados</td></tr>';
    tbodyG.innerHTML = htmlG;
  }

  var tbodyP = document.getElementById('tbodyPagosProyecto');
  if (tbodyP) {
    var htmlP = '';
    for (var i = 0; i < pagos.length; i++) {
      var p = pagos[i];
      htmlP += '<tr>' +
        '<td>' + formatDate(p.fecha) + '</td>' +
        '<td>' + p.concepto + '</td>' +
        '<td class="td-monto" style="color:#6bbd45;">+' + formatMoney(p.monto) + '</td>' +
        '<td>' + (p.metodo || '—') + '</td>' +
        '<td><span class="estado-badge estado-' + (p.estado === 'recibido' ? 'aprobado' : 'cotizado') + '">' + p.estado + '</span></td>' +
        '</tr>';
    }
    if (htmlP === '') htmlP = '<tr><td colspan="5" class="tabla-vacia">No hay pagos registrados</td></tr>';
    tbodyP.innerHTML = htmlP;
  }
}

// ============================================================
// TAREAS DEL PROYECTO
// ============================================================
function cargarTareasProyecto(proyecto) {
  var tareas = getData('gn_tareas').filter(function(t) { return t.proyectoId === proyecto.id; });

  var estados = ['pendiente', 'en_progreso', 'revision', 'completada'];
  var labels = { pendiente: 'Pendiente', en_progreso: 'En Progreso', revision: 'Revisión', completada: 'Completada' };
  var colores = { pendiente: '#64748b', en_progreso: '#4f8cff', revision: '#f59e0b', completada: '#6bbd45' };

  var html = '';
  for (var i = 0; i < estados.length; i++) {
    var estado = estados[i];
    var tareasEstado = tareas.filter(function(t) { return t.estado === estado; });

    html += '<div class="kanban-column">' +
      '<div class="kanban-col-header ' + estado + '">' +
        '<span style="width:8px;height:8px;border-radius:50%;background:' + colores[estado] + ';display:inline-block;margin-right:6px;"></span>' +
        labels[estado] +
        '<span style="margin-left:auto;font-size:12px;color:var(--gn-text-muted);">' + tareasEstado.length + '</span>' +
      '</div>' +
      '<div class="kanban-col-body">';

    for (var j = 0; j < tareasEstado.length; j++) {
      var t = tareasEstado[j];
      html += '<div class="kanban-card">' +
        '<div class="kanban-card-title">' + t.titulo + '</div>' +
        '<div class="kanban-card-meta">' +
          (t.asignado ? '<span>👤 ' + t.asignado + '</span>' : '') +
          (t.fechaLimite ? '<span>📅 ' + formatDate(t.fechaLimite) + '</span>' : '') +
        '</div>' +
        '</div>';
    }

    html += '</div></div>';
  }

  var container = document.getElementById('tareas-kanban');
  if (container) container.innerHTML = html;
}

function guardarTareaProyecto(event) {
  event.preventDefault();
  if (!PROYECTO_ACTUAL) return false;

  var tarea = {
    id: generarId(),
    proyectoId: PROYECTO_ACTUAL.id,
    titulo: document.getElementById('tarea-titulo').value,
    asignado: document.getElementById('tarea-asignado').value,
    fechaLimite: document.getElementById('tarea-fecha-limite').value,
    estado: document.getElementById('tarea-estado').value,
    creadoEn: new Date().toISOString()
  };

  addItem('gn_tareas', tarea);
  document.getElementById('formTareaProyecto').reset();
  cargarTareasProyecto(PROYECTO_ACTUAL);
  return false;
}

// ============================================================
// TIMELINE
// ============================================================
function cargarTimelineProyecto(proyecto) {
  var container = document.getElementById('proyecto-timeline');
  if (!container) return;

  var eventos = [];

  eventos.push({ fecha: proyecto.fechaInicio, tipo: 'inicio', texto: 'Proyecto iniciado', monto: null });

  var gastos = getData(STORAGE_KEYS.GASTOS).filter(function(g) { return g.proyectoId === proyecto.id; });
  for (var i = 0; i < gastos.length; i++) {
    eventos.push({ fecha: gastos[i].fecha, tipo: 'gasto', texto: gastos[i].descripcion, monto: -gastos[i].monto });
  }

  var pagos = getData(STORAGE_KEYS.PAGOS).filter(function(p) { return p.proyectoId === proyecto.id; });
  for (var i = 0; i < pagos.length; i++) {
    eventos.push({ fecha: pagos[i].fecha, tipo: 'pago', texto: pagos[i].concepto, monto: pagos[i].monto });
  }

  var tareas = getData('gn_tareas').filter(function(t) { return t.proyectoId === proyecto.id && t.estado === 'completada'; });
  for (var i = 0; i < tareas.length; i++) {
    eventos.push({ fecha: tareas[i].creadoEn.split('T')[0], tipo: 'tarea', texto: 'Tarea completada: ' + tareas[i].titulo, monto: null });
  }

  eventos.sort(function(a, b) { return new Date(b.fecha) - new Date(a.fecha); });

  var html = '';
  for (var i = 0; i < eventos.length; i++) {
    var e = eventos[i];
    html += '<div class="timeline-item ' + e.tipo + '">' +
      '<div class="timeline-date">' + formatDate(e.fecha) + '</div>' +
      '<div class="timeline-content">' + e.texto + '</div>';
    if (e.monto !== null) {
      html += '<div class="timeline-monto" style="color:' + (e.monto > 0 ? '#6bbd45' : '#ef4444') + ';">' +
        (e.monto > 0 ? '+' : '') + formatMoney(Math.abs(e.monto)) + '</div>';
    }
    html += '</div>';
  }

  container.innerHTML = html || '<p class="tabla-vacia" style="padding:20px;">No hay actividad registrada</p>';
}

// ============================================================
// NOTAS
// ============================================================
function guardarNotasProyecto() {
  if (!PROYECTO_ACTUAL) return;
  var notas = document.getElementById('proyecto-notas').value;
  updateItem(STORAGE_KEYS.PROYECTOS, PROYECTO_ACTUAL.id, { notas: notas });

  var feedback = document.createElement('div');
  feedback.className = 'form-feedback success';
  feedback.textContent = '✅ Notas guardadas';
  feedback.style.display = 'block';

  var container = document.getElementById('proyecto-tab-documentos');
  if (container) {
    var existing = container.querySelector('.form-feedback');
    if (existing) existing.remove();
    container.appendChild(feedback);
    setTimeout(function() { feedback.remove(); }, 3000);
  }
}

// ============================================================
// FORMULARIO CREAR PROYECTO
// ============================================================
function guardarProyecto(event) {
  event.preventDefault();

  var clienteSelect = document.getElementById('proy-cliente');
  var clienteNombre = clienteSelect.options[clienteSelect.selectedIndex].text;

  var proyecto = {
    id: generarId(),
    nombre: document.getElementById('proy-nombre').value.trim(),
    clienteId: clienteSelect.value,
    clienteNombre: clienteNombre,
    presupuesto: parseFloat(document.getElementById('proy-presupuesto').value) || 0,
    fechaInicio: document.getElementById('proy-fecha').value,
    estado: 'en_progreso',
    avance: 0,
    alcance: document.getElementById('proy-alcance').value.trim(),
    notas: '',
    creadoEn: new Date().toISOString()
  };

  addItem(STORAGE_KEYS.PROYECTOS, proyecto);

  var feedback = document.getElementById('feedback-proyecto');
  if (feedback) {
    feedback.className = 'form-feedback success';
    feedback.textContent = '✅ Proyecto "' + proyecto.nombre + '" creado';
  }

  document.getElementById('formProyecto').reset();

  var hoy = new Date();
  document.getElementById('proy-fecha').value = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0');

  renderProyectos();
  actualizarKPIs();

  // Actualizar select de proyectos en finanzas
  var ecProyecto = document.getElementById('ec-proyecto');
  if (ecProyecto) {
    var proyectos = getData(STORAGE_KEYS.PROYECTOS);
    ecProyecto.innerHTML = '<option value="">Todos los proyectos</option>';
    for (var i = 0; i < proyectos.length; i++) {
      ecProyecto.innerHTML += '<option value="' + proyectos[i].id + '">' + proyectos[i].nombre + '</option>';
    }
  }

  return false;
}

function actualizarSelectClientesProyecto() {
  var select = document.getElementById('proy-cliente');
  if (!select) return;

  var clientes = getData(STORAGE_KEYS.CLIENTES);
  select.innerHTML = '<option value="">Selecciona un cliente</option>';
  for (var i = 0; i < clientes.length; i++) {
    select.innerHTML += '<option value="' + clientes[i].id + '">' + clientes[i].nombre + '</option>';
  }
}
