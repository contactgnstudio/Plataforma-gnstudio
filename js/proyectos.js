// ============================================================
// js/proyectos.js — Módulo de Proyectos (Lista + Detalle)
// ============================================================

var PROYECTO_ACTUAL = null;
var chartProyectoInstance = null;

// ============================================================
// VISTA LISTA
// ============================================================
function renderProyectos(filtro) {
  var grid = document.getElementById('proyectos-grid');
  if (!grid) return;

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
  
  // Cargar notas si existen
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
// UTILIDADES
// ============================================================
function abrirModalCliente() {
  switchSubSection('negocio', 'crm');
  var input = document.getElementById('cli-codigo');
  if (input) input.focus();
}

function abrirModalGrupo() {
  switchSubSection('negocio', 'catalogo');
  var input = document.getElementById('grp-codigo');
  if (input) input.focus();
}

function abrirModalGastoProyecto() {
  if (!PROYECTO_ACTUAL) return;
  alert('🚧 Abrir modal de gasto para proyecto: ' + PROYECTO_ACTUAL.nombre + '\n(En desarrollo: vincular automáticamente el proyecto)');
}

function abrirModalPagoProyecto() {
  if (!PROYECTO_ACTUAL) return;
  alert('🚧 Abrir modal de pago para proyecto: ' + PROYECTO_ACTUAL.nombre + '\n(En desarrollo: vincular automáticamente el proyecto)');
}
