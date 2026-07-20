// ============================================================
// js/proyectos.js — ProjectOS v3.0 (ClickUp/Monday style)
// Vista reestructurada: header hero + tabs mejorados + kanban pro
// Tareas auto desde servicios de cotización con categoría/prioridad
// ============================================================

(function(window, document) {
  'use strict';

  var PROYECTO_ACTUAL = null;
  var CLIENTES_CACHE = [];
  var CHART_PROYECTO = null;

  function byId(id) { return document.getElementById(id); }
  function qsa(selector) { return Array.prototype.slice.call(document.querySelectorAll(selector)); }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function text(value, fallback) { if (value === null || value === undefined || value === '') return fallback || '—'; return String(value); }
  function num(value) { var n = parseFloat(value); return isNaN(n) ? 0 : n; }
  function intVal(value) { var n = parseInt(value, 10); return isNaN(n) ? 0 : n; }
  function money(value) { var n = num(value); if (typeof window.formatMoney === 'function') return window.formatMoney(n); return '$' + n.toFixed(2); }
  function formatDateSafe(value) { if (!value) return '—'; if (typeof window.formatDate === 'function') return window.formatDate(value); return value; }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  function estadoLabel(estado) {
    var map = { pendiente: 'Pendiente', en_progreso: 'En Progreso', pausado: 'Pausado', completado: 'Completado', cancelado: 'Cancelado', registrado: 'Registrado', confirmado: 'Confirmado', reversado: 'Reversado' };
    return map[estado] || estado || 'Pendiente';
  }
  function estadoColor(estado) {
    var map = { pendiente: '#C5A253', en_progreso: '#C5A253', pausado: '#6B7280', completado: '#2D8B5E', cancelado: '#F87171', registrado: '#C5A253', confirmado: '#2D8B5E', reversado: '#F87171' };
    return map[estado] || '#2D8B5E';
  }

  function getStorageKey(name, fallback) { if (window.STORAGE_KEYS && window.STORAGE_KEYS[name]) return window.STORAGE_KEYS[name]; return fallback; }

  async function getAll(tableName, options) { if (typeof window.getData !== 'function') return []; var rows = await window.getData(tableName, options || {}); return Array.isArray(rows) ? rows : []; }
  async function getFiltered(tableName, filters, options) { if (typeof window.getDataFiltered !== 'function') return []; var rows = await window.getDataFiltered(tableName, filters || {}, options || {}); return Array.isArray(rows) ? rows : []; }
  async function insertRow(tableName, payload) { if (typeof window.addItem !== 'function') return null; return await window.addItem(tableName, payload); }
  async function updateRow(tableName, id, payload) { if (typeof window.updateItem !== 'function') return false; return await window.updateItem(tableName, id, payload); }
  async function findItem(tableName, id) { if (typeof window.findItem !== 'function') return null; return await window.findItem(tableName, id); }
  async function getSessionUserId() { if (typeof window.getSessionUserId === 'function') return await window.getSessionUserId(); var sb = window.supabaseClient || null; if (!sb) return null; try { var session = await sb.auth.getSession(); return session && session.data && session.data.session ? session.data.session.user.id : null; } catch (e) { return null; } }

  function deriveAvance(row) {
    var estado = row.estado || 'pendiente';
    var presupuesto = num(row.presupuesto);
    var cobrado = num(row.total_cobrado);
    if (estado === 'completado') return 100;
    if (estado === 'cancelado') return 0;
    if (presupuesto > 0 && cobrado > 0) return Math.max(0, Math.min(99, Math.round((cobrado / presupuesto) * 100)));
    if (estado === 'en_progreso') return 25;
    if (estado === 'pausado') return 50;
    return 0;
  }

  function normalizeCliente(row) {
    return { id: row && row.id ? row.id : '', nombre: row && (row.nombre || row.nombre_comercial || row.empresa || row.razon_social) ? (row.nombre || row.nombre_comercial || row.empresa || row.razon_social) : 'Cliente' };
  }
  function normalizeProyecto(row) {
    return { id: row.id, userId: row.user_id || '', cotizacionId: row.cotizacion_id || '', clienteId: row.cliente_id || '', nombre: row.nombre || 'Proyecto', descripcion: row.descripcion || '', fechaInicio: row.fecha_inicio || '', fechaFin: row.fecha_fin || '', fechaFinReal: row.fecha_fin_real || '', estado: row.estado || 'en_progreso', presupuesto: num(row.presupuesto), totalCobrado: num(row.total_cobrado), totalGastado: num(row.total_gastado), notas: row.notas || '', createdAt: row.created_at || '', updatedAt: row.updated_at || '', avance: deriveAvance(row), raw: row };
  }
  function normalizeGasto(row) { return { id: row.id, proyectoId: row.proyecto_id || '', fecha: row.fecha || row.created_at || '', categoria: row.tipo || 'General', descripcion: row.descripcion || row.referencia || 'Gasto registrado', monto: num(row.monto), metodo: row.metodo_pago || row.metodo || '—', referencia: row.referencia || '', createdAt: row.created_at || '' }; }
  function normalizePago(row) { return { id: row.id, proyectoId: row.proyecto_id || '', fecha: row.fecha || row.created_at || '', concepto: row.concepto || row.descripcion || row.referencia || 'Pago recibido', monto: num(row.monto), metodo: row.metodo_pago || row.metodo || row.forma_pago || '—', estado: row.estado || 'registrado', referencia: row.referencia || '', createdAt: row.created_at || '' }; }
  function normalizeTarea(row) { return { id: row.id, proyectoId: row.proyecto_id || '', titulo: row.titulo || row.nombre || 'Tarea', asignado: row.responsable || '', fechaLimite: row.fecha_limite || '', estado: row.estado || 'pendiente', descripcion: row.descripcion || '', prioridad: row.prioridad || 'media', categoria: row.categoria || '', createdAt: row.created_at || '' }; }

  async function obtenerClientes() { var rows = await getAll(getStorageKey('CLIENTES', 'clientes'), { orderBy: 'created_at', ascending: false }); CLIENTES_CACHE = rows.map(normalizeCliente); return CLIENTES_CACHE; }
  async function ensureClientesCache() { if (!CLIENTES_CACHE.length) await obtenerClientes(); return CLIENTES_CACHE; }
  async function getClienteNombre(clienteId) { if (!clienteId) return 'Sin cliente'; await ensureClientesCache(); for (var i = 0; i < CLIENTES_CACHE.length; i++) { if (String(CLIENTES_CACHE[i].id) === String(clienteId)) return CLIENTES_CACHE[i].nombre; } return 'Sin cliente'; }

  async function obtenerProyectos() {
    var rows = await getAll(getStorageKey('PROYECTOS', 'proyectos'), { orderBy: 'created_at', ascending: false });
    var proyectos = rows.map(normalizeProyecto);
    for (var i = 0; i < proyectos.length; i++) { proyectos[i].clienteNombre = await getClienteNombre(proyectos[i].clienteId); }
    return proyectos;
  }

  async function obtenerProyectoPorId(id) {
    if (!id) return null;
    if (typeof window.findItem === 'function') {
      var row = await window.findItem(getStorageKey('PROYECTOS', 'proyectos'), id);
      if (row) { var proyecto = normalizeProyecto(row); proyecto.clienteNombre = await getClienteNombre(proyecto.clienteId); return proyecto; }
    }
    var proyectos = await obtenerProyectos();
    for (var i = 0; i < proyectos.length; i++) { if (String(proyectos[i].id) === String(id)) return proyectos[i]; }
    return null;
  }

  async function obtenerFilasProyectoCompat(tableKey, proyectoId) { var tableName = getStorageKey(tableKey, tableKey.toLowerCase()); var rows = await getFiltered(tableName, { proyecto_id: proyectoId }, { orderBy: 'created_at', ascending: false }); return rows.length ? rows : []; }
  async function obtenerGastosProyecto(proyectoId) { var rows = await obtenerFilasProyectoCompat('GASTOS', proyectoId); return rows.map(normalizeGasto); }
  async function obtenerPagosProyecto(proyectoId) { var rows = await obtenerFilasProyectoCompat('PAGOS', proyectoId); return rows.map(normalizePago); }
  async function obtenerTareasProyecto(proyectoId) { var rows = await obtenerFilasProyectoCompat('TAREAS', proyectoId); return rows.map(normalizeTarea); }

  async function obtenerCotizacionProyecto(proyectoId) {
    if (!proyectoId) return null;
    if (typeof window.obtenerCotizacionProyecto === 'function') return await window.obtenerCotizacionProyecto(proyectoId);
    var rows = await getFiltered('cotizaciones', { proyecto_id: proyectoId }, { orderBy: 'created_at', ascending: false });
    return rows && rows.length ? rows[0] : null;
  }

  async function actualizarSelectClientesProyecto() {
    var select = byId('proy-cliente');
    if (!select) return;
    var clientes = await obtenerClientes();
    var currentValue = select.value;
    var html = '<option value="">Selecciona un cliente</option>';
    for (var i = 0; i < clientes.length; i++) { html += '<option value="' + esc(clientes[i].id) + '">' + esc(clientes[i].nombre) + '</option>'; }
    select.innerHTML = html;
    if (currentValue) select.value = currentValue;
  }

  function generarIdProyectoLegible(proyecto) {
    var fecha = proyecto.fechaInicio || proyecto.createdAt || todayISO();
    var d = new Date(fecha);
    if (isNaN(d.getTime())) d = new Date();
    var dia = String(d.getDate()).padStart(2, '0');
    var mes = String(d.getMonth() + 1).padStart(2, '0');
    var ano = String(d.getFullYear()).slice(-2);
    return 'PRO-' + dia + mes + ano;
  }

  async function renderProyectos(filtro) {
    var tbody = byId('tbodyProyectos');
    if (!tbody) return false;
    var proyectos = await obtenerProyectos();
    if (filtro && filtro !== 'todos') { proyectos = proyectos.filter(function(p) { return p.estado === filtro; }); }
    if (!proyectos.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay proyectos registrados</td></tr>'; return false; }
    var html = '';
    proyectos.forEach(function(p) {
      var fecha = formatDateSafe(p.fechaInicio || p.createdAt || '');
      var idLegible = generarIdProyectoLegible(p);
      var color = estadoColor(p.estado);
      html += '<tr>';
      html += '<td>' + esc(fecha) + '</td>';
      html += '<td><span style="font-size:11px;font-family:monospace;opacity:.7;">' + esc(idLegible) + '</span></td>';
      html += '<td><button type="button" class="link-button" onclick="verProyecto(&#39;' + esc(p.id) + '&#39;)">' + esc(p.nombre || 'Proyecto') + '</button></td>';
      html += '<td>' + esc(p.clienteNombre || 'Sin cliente') + '</td>';
      html += '<td><span class="estado-badge" style="background:' + color + '22;color:' + color + ';border:1px solid ' + color + '44;font-size:11px;">' + estadoLabel(p.estado) + '</span></td>';
      html += '<td>' + money(p.presupuesto) + '</td>';
      html += '<td>' + money(p.totalCobrado) + '</td>';
      html += '</tr>';
    });
    tbody.innerHTML = html;
    return false;
  }

  async function buscarProyectos() {
    var input = byId('buscar-proyecto');
    var term = input ? input.value.trim().toLowerCase() : '';
    var proyectos = await obtenerProyectos();
    proyectos = proyectos.filter(function(p) { if (!term) return true; return (p.nombre || '').toLowerCase().indexOf(term) !== -1 || (p.clienteNombre || '').toLowerCase().indexOf(term) !== -1 || (p.descripcion || '').toLowerCase().indexOf(term) !== -1; });
    var tbody = byId('tbodyProyectos');
    if (!tbody) return false;
    if (!proyectos.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No se encontraron proyectos</td></tr>'; return false; }
    var html = '';
    proyectos.forEach(function(p) {
      var fecha = formatDateSafe(p.fechaInicio || p.createdAt || '');
      var idLegible = generarIdProyectoLegible(p);
      var color = estadoColor(p.estado);
      html += '<tr>';
      html += '<td>' + esc(fecha) + '</td>';
      html += '<td><span style="font-size:11px;font-family:monospace;opacity:.7;">' + esc(idLegible) + '</span></td>';
      html += '<td><button type="button" class="link-button" onclick="verProyecto(&#39;' + esc(p.id) + '&#39;)">' + esc(p.nombre || 'Proyecto') + '</button></td>';
      html += '<td>' + esc(p.clienteNombre || 'Sin cliente') + '</td>';
      html += '<td><span class="estado-badge" style="background:' + color + '22;color:' + color + ';border:1px solid ' + color + '44;font-size:11px;">' + estadoLabel(p.estado) + '</span></td>';
      html += '<td>' + money(p.presupuesto) + '</td>';
      html += '<td>' + money(p.totalCobrado) + '</td>';
      html += '</tr>';
    });
    tbody.innerHTML = html;
    return false;
  }

  async function filtrarProyectos(estado) {
    await renderProyectos(estado || 'todos');
    qsa('[onclick*="filtrarProyectos("]').forEach(function(btn) {
      btn.classList.remove('active');
      var onclick = btn.getAttribute('onclick') || '';
      if (onclick.indexOf("'" + (estado || 'todos') + "'") !== -1 || onclick.indexOf('"' + (estado || 'todos') + '"') !== -1) btn.classList.add('active');
    });
    return false;
  }

  function setText(id, value) { var el = byId(id); if (el) el.textContent = value; }
  function setValue(id, value) { var el = byId(id); if (el) el.value = value; }
  function setDisplay(id, show) { var el = byId(id); if (el) el.style.display = show ? 'block' : 'none'; }
  function setHTML(id, value) { var el = byId(id); if (el) el.innerHTML = value; }

  function actualizarProgresoVisual(avance) {
    var pct = Math.max(0, Math.min(100, intVal(avance)));
    var txt = byId('proyecto-progreso-pct');
    if (txt) txt.textContent = pct + '%';
    var wrap = byId('proyecto-progreso-visual');
    if (wrap) {
      var circles = wrap.querySelectorAll('circle');
      if (circles.length > 1) { var circumference = 283; var offset = circumference - (pct / 100) * circumference; circles[1].setAttribute('stroke-dashoffset', String(offset)); }
    }
    var kpiAvance = byId('resumen-kpi-avance');
    if (kpiAvance) kpiAvance.textContent = pct + '%';
    // Hero progress bar
    var heroBar = byId('proyecto-hero-progress-bar');
    if (heroBar) heroBar.style.width = pct + '%';
    var heroPct = byId('proyecto-hero-progress-pct');
    if (heroPct) heroPct.textContent = pct + '%';
  }

  // ============================================================
  // HERO HEADER (estilo ClickUp/Monday)
  // ============================================================
  function renderHeroHeader(proyecto, tareas, totalPagos, presupuesto) {
    var container = byId('proyecto-hero');
    if (!container) return;

    var avance = proyecto.avance || 0;
    var porCobrar = Math.max(0, presupuesto - totalPagos);
    var colorEstado = estadoColor(proyecto.estado);
    var completadas = tareas.filter(function(t) { return t.estado === 'completada'; }).length;
    var totalTareas = tareas.length;

    // Determinar color barra de progreso
    var barColor = avance >= 100 ? '#2D8B5E' : avance >= 50 ? '#C5A253' : '#6B7280';

    var fechaInicioFmt = formatDateSafe(proyecto.fechaInicio || proyecto.createdAt);
    var fechaFinFmt = proyecto.fechaFin ? formatDateSafe(proyecto.fechaFin) : 'Sin fecha límite';

    var html = '';
    html += '<div class="proyecto-hero-inner">';
    // Left: title + meta
    html += '<div class="proyecto-hero-left">';
    html += '<div class="proyecto-hero-id"><i class="ph ph-hash"></i> ' + esc(generarIdProyectoLegible(proyecto)) + '</div>';
    html += '<h2 class="proyecto-hero-nombre">' + esc(proyecto.nombre) + '</h2>';
    html += '<div class="proyecto-hero-meta">';
    html += '<span class="proyecto-hero-badge" style="background:' + colorEstado + '22;color:' + colorEstado + ';border:1px solid ' + colorEstado + '44;"><i class="ph ph-circle-half-tilt"></i> ' + estadoLabel(proyecto.estado) + '</span>';
    html += '<span><i class="ph ph-user"></i> ' + esc(proyecto.clienteNombre || 'Sin cliente') + '</span>';
    html += '<span><i class="ph ph-calendar-blank"></i> Inicio: ' + esc(fechaInicioFmt) + '</span>';
    html += '<span><i class="ph ph-flag"></i> ' + esc(fechaFinFmt) + '</span>';
    html += '</div>';
    // Progress bar
    html += '<div class="proyecto-hero-progress">';
    html += '<div class="proyecto-hero-progress-track"><div id="proyecto-hero-progress-bar" class="proyecto-hero-progress-fill" style="width:' + avance + '%;background:' + barColor + ';"></div></div>';
    html += '<span id="proyecto-hero-progress-pct" style="font-size:12px;font-weight:700;color:' + barColor + ';min-width:36px;">' + avance + '%</span>';
    html += '</div>';
    html += '</div>';
    // Right: KPI chips
    html += '<div class="proyecto-hero-kpis">';
    html += '<div class="hero-kpi"><div class="hero-kpi-val">' + money(presupuesto) + '</div><div class="hero-kpi-lbl">Presupuesto</div></div>';
    html += '<div class="hero-kpi"><div class="hero-kpi-val" style="color:#2D8B5E;">' + money(totalPagos) + '</div><div class="hero-kpi-lbl">Cobrado</div></div>';
    html += '<div class="hero-kpi"><div class="hero-kpi-val" style="color:#C5A253;">' + money(porCobrar) + '</div><div class="hero-kpi-lbl">Por Cobrar</div></div>';
    html += '<div class="hero-kpi"><div class="hero-kpi-val">' + completadas + '/' + totalTareas + '</div><div class="hero-kpi-lbl">Tareas</div></div>';
    html += '</div>';
    html += '</div>';
    container.innerHTML = html;
  }

  function renderTimeline(proyecto, tareas, gastos, pagos) {
    var container = byId('proyecto-timeline');
    if (!container) return;
    var eventos = [];
    if (proyecto.fechaInicio) { eventos.push({ fecha: proyecto.fechaInicio, tipo: 'inicio', titulo: 'Inicio del proyecto', descripcion: proyecto.nombre }); }
    if (proyecto.fechaFin) { eventos.push({ fecha: proyecto.fechaFin, tipo: 'meta', titulo: 'Fecha fin estimada', descripcion: 'Fecha objetivo del proyecto' }); }
    if (proyecto.fechaFinReal) { eventos.push({ fecha: proyecto.fechaFinReal, tipo: 'cierre', titulo: 'Fecha fin real', descripcion: 'Cierre real del proyecto' }); }
    tareas.forEach(function(t) { eventos.push({ fecha: t.fechaLimite || t.createdAt || '', tipo: 'tarea', titulo: t.titulo, descripcion: 'Tarea ' + (t.estado || 'pendiente') + (t.asignado ? ' · ' + t.asignado : '') }); });
    gastos.forEach(function(g) { eventos.push({ fecha: g.fecha || g.createdAt || '', tipo: 'gasto', titulo: g.descripcion, descripcion: 'Gasto ' + money(g.monto) }); });
    pagos.forEach(function(p) { eventos.push({ fecha: p.fecha || p.createdAt || '', tipo: 'pago', titulo: p.concepto, descripcion: 'Pago recibido ' + money(p.monto) }); });
    eventos = eventos.filter(function(e) { return e.fecha; });
    eventos.sort(function(a, b) { return new Date(b.fecha) - new Date(a.fecha); });
    if (!eventos.length) { container.innerHTML = '<div class="empty-state">No hay actividad registrada en la línea de tiempo</div>'; return; }
    var iconos = { inicio: 'ph-rocket', meta: 'ph-calendar', cierre: 'ph-check-circle', tarea: 'ph-puzzle-piece', gasto: 'ph-currency-dollar', pago: 'ph-coins' };
    var colores = { inicio: '#2D8B5E', meta: '#C5A253', cierre: '#2D8B5E', tarea: '#C5A253', gasto: '#F87171', pago: '#2D8B5E' };
    var html = '';
    for (var i = 0; i < eventos.length; i++) {
      var ev = eventos[i];
      var icono = iconos[ev.tipo] || 'ph-circle';
      var color = colores[ev.tipo] || '#C5A253';
      html += '<div class="timeline-item" style="border-left:3px solid ' + color + ';padding:10px 14px;margin-bottom:12px;background:rgba(255,255,255,0.02);border-radius:10px;">';
      html += '<div style="font-weight:700;display:flex;align-items:center;gap:8px;"><i class="ph ' + icono + '" style="color:' + color + ';"></i> ' + esc(ev.titulo) + '</div>';
      html += '<div style="opacity:.8;margin-top:4px;font-size:12px;">' + esc(formatDateSafe(ev.fecha)) + '</div>';
      html += '<div style="margin-top:6px;font-size:13px;">' + esc(ev.descripcion) + '</div>';
      html += '</div>';
    }
    container.innerHTML = html;
  }

  function renderTablaGastos(gastos) {
    var tbody = byId('tbodyGastosProyecto');
    if (!tbody) return;
    if (!gastos.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay gastos registrados</td></tr>'; return; }
    var html = '';
    for (var i = 0; i < gastos.length; i++) { html += '<tr><td>' + esc(formatDateSafe(gastos[i].fecha)) + '</td><td>' + esc(gastos[i].categoria) + '</td><td>' + esc(gastos[i].descripcion) + '</td><td>' + money(gastos[i].monto) + '</td><td>' + esc(gastos[i].metodo) + '</td></tr>'; }
    tbody.innerHTML = html;
  }

  function renderTablaPagos(pagos) {
    var tbody = byId('tbodyPagosProyecto');
    if (!tbody) return;
    if (!pagos.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay pagos registrados</td></tr>'; return; }
    var html = '';
    for (var i = 0; i < pagos.length; i++) { var color = estadoColor(pagos[i].estado); html += '<tr><td>' + esc(formatDateSafe(pagos[i].fecha)) + '</td><td>' + esc(pagos[i].concepto) + '</td><td>' + money(pagos[i].monto) + '</td><td>' + esc(pagos[i].metodo) + '</td><td><span class="estado-badge" style="background:' + color + '22;color:' + color + ';border:1px solid ' + color + '55;">' + esc(estadoLabel(pagos[i].estado)) + '</span></td></tr>'; }
    tbody.innerHTML = html;
  }

  // ============================================================
  // KANBAN PRO (ClickUp style: prioridad + categoría + descripción)
  // ============================================================
  function prioridadConfig(prioridad) {
    var map = {
      urgente: { color: '#F87171', icon: 'ph-warning-circle', label: 'Urgente' },
      alta: { color: '#F59E0B', icon: 'ph-arrow-up', label: 'Alta' },
      media: { color: '#C5A253', icon: 'ph-minus', label: 'Media' },
      baja: { color: '#6B7280', icon: 'ph-arrow-down', label: 'Baja' }
    };
    return map[prioridad] || map['media'];
  }

  function renderKanbanTareas(tareas) {
    var container = byId('tareas-kanban');
    if (!container) return;

    // Contador global de tareas por estado para el header
    var estadosConfig = [
      { key: 'pendiente', label: 'Pendiente', color: '#6B7280', icon: 'ph-circle' },
      { key: 'en_progreso', label: 'En Progreso', color: '#C5A253', icon: 'ph-spinner' },
      { key: 'revision', label: 'En Revisión', color: '#A78BFA', icon: 'ph-magnifying-glass' },
      { key: 'completada', label: 'Completada', color: '#2D8B5E', icon: 'ph-check-circle' }
    ];

    var html = '<div class="kanban-board">';
    for (var e = 0; e < estadosConfig.length; e++) {
      var cfg = estadosConfig[e];
      var tareasEstado = tareas.filter(function(t) { return t.estado === cfg.key; });
      html += '<div class="kanban-column">';
      html += '<div class="kanban-col-header" style="border-top:3px solid ' + cfg.color + ';">';
      html += '<span style="display:flex;align-items:center;gap:6px;"><i class="ph ' + cfg.icon + '" style="color:' + cfg.color + ';"></i>' + cfg.label + '</span>';
      html += '<span class="kanban-count" style="background:' + cfg.color + '22;color:' + cfg.color + ';">' + tareasEstado.length + '</span>';
      html += '</div>';
      html += '<div class="kanban-col-body">';
      if (!tareasEstado.length) {
        html += '<div class="kanban-empty"><i class="ph ph-tray" style="font-size:20px;opacity:.3;"></i><span>Sin tareas</span></div>';
      } else {
        for (var i = 0; i < tareasEstado.length; i++) {
          var t = tareasEstado[i];
          var prio = prioridadConfig(t.prioridad);
          html += '<div class="kanban-card" onclick="editarTareaProyecto(&#39;' + esc(t.id) + '&#39;)">';
          // Top: prioridad + categoria
          html += '<div class="kanban-card-top">';
          html += '<span class="kanban-prio" style="color:' + prio.color + ';background:' + prio.color + '15;"><i class="ph ' + prio.icon + '"></i> ' + prio.label + '</span>';
          if (t.categoria) html += '<span class="kanban-cat">' + esc(t.categoria) + '</span>';
          html += '</div>';
          // Título
          html += '<div class="kanban-card-title">' + esc(t.titulo) + '</div>';
          // Descripción
          if (t.descripcion && t.descripcion !== 'Generada desde cotización') {
            html += '<div class="kanban-card-desc">' + esc(t.descripcion.substring(0, 80)) + (t.descripcion.length > 80 ? '...' : '') + '</div>';
          }
          // Meta: asignado + fecha
          html += '<div class="kanban-card-meta">';
          if (t.asignado) html += '<span><i class="ph ph-user"></i> ' + esc(t.asignado) + '</span>';
          if (t.fechaLimite) {
            var hoy = new Date(); var fl = new Date(t.fechaLimite);
            var vencida = fl < hoy && cfg.key !== 'completada';
            html += '<span style="color:' + (vencida ? '#F87171' : 'inherit') + ';"><i class="ph ph-calendar"></i> ' + esc(formatDateSafe(t.fechaLimite)) + (vencida ? ' ⚠' : '') + '</span>';
          }
          if (!t.asignado && !t.fechaLimite) html += '<span style="opacity:.4;font-size:11px;">Sin asignación</span>';
          html += '</div>';
          html += '</div>';
        }
      }
      html += '</div></div>';
    }
    html += '</div>';
    container.innerHTML = html;
  }

  function destroyProyectoChart() { if (CHART_PROYECTO && typeof CHART_PROYECTO.destroy === 'function') { CHART_PROYECTO.destroy(); CHART_PROYECTO = null; } }

  function renderProyectoChart(totalPagos, totalGastos, porCobrar) {
    var canvas = byId('chartProyectoBalance');
    if (!canvas || typeof window.Chart === 'undefined') return;
    destroyProyectoChart();
    var ctx = canvas.getContext('2d');
    CHART_PROYECTO = new window.Chart(ctx, {
      type: 'doughnut',
      data: { labels: ['Pagos', 'Gastos', 'Por Cobrar'], datasets: [{ data: [totalPagos, totalGastos, porCobrar], backgroundColor: ['#2D8B5E', '#F87171', '#C5A253'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#F0F0F5' } } } }
    });
  }

  async function renderDetalleProyecto(proyecto) {
    var gastos = await obtenerGastosProyecto(proyecto.id);
    var pagos = await obtenerPagosProyecto(proyecto.id);
    var tareas = await obtenerTareasProyecto(proyecto.id);
    var cotizacion = await obtenerCotizacionProyecto(proyecto.id);

    var totalGastosFiltrado = gastos.reduce(function(acc, item) { return acc + item.monto; }, 0);
    var totalPagosFiltrado = pagos.reduce(function(acc, item) { return acc + item.monto; }, 0);

    var totalGastos = totalGastosFiltrado > 0 ? totalGastosFiltrado : num(proyecto.totalGastado);
    var totalPagos = totalPagosFiltrado > 0 ? totalPagosFiltrado : num(proyecto.totalCobrado);
    var presupuesto = num(proyecto.presupuesto);
    var porCobrar = Math.max(0, presupuesto - totalPagos);
    var utilidad = totalPagos - totalGastos;
    var avance = proyecto.avance || deriveAvance(proyecto.raw);

    // Hero header
    renderHeroHeader(proyecto, tareas, totalPagos, presupuesto);

    // KPIs (tab resumen)
    setText('resumen-kpi-presupuesto', money(presupuesto));
    setText('resumen-kpi-gastos', money(totalGastos));
    setText('resumen-kpi-pagos', money(totalPagos));
    setText('resumen-kpi-utilidad', money(utilidad));
    setText('resumen-kpi-por-cobrar', money(porCobrar));

    // Resumen financiero
    setText('resumen-presupuesto', money(presupuesto));
    setText('resumen-gastos', money(totalGastos));
    setText('resumen-pagos', money(totalPagos));
    setText('resumen-por-cobrar', money(porCobrar));
    setText('resumen-utilidad', money(utilidad));

    setValue('proyecto-notas', proyecto.notas || '');
    actualizarProgresoVisual(avance);
    renderTimeline(proyecto, tareas, gastos, pagos);
    renderTablaGastos(gastos);
    renderTablaPagos(pagos);
    renderKanbanTareas(tareas);
    renderProyectoChart(totalPagos, totalGastos, porCobrar);

    // Documentos: renderizar cotización
    if (typeof window.renderCotizacionDocumento === 'function') {
      await window.renderCotizacionDocumento('cotizacion-documento-container', proyecto.cotizacionId || (cotizacion ? cotizacion.id : null));
    } else {
      var docContainer = byId('cotizacion-documento-container');
      if (docContainer) {
        if (cotizacion) { docContainer.innerHTML = '<div class="empty-state">Cotización: ' + esc(cotizacion.numero || '') + ' — Función de renderizado no disponible</div>'; }
        else { docContainer.innerHTML = '<div class="empty-state">No hay cotización asociada a este proyecto.</div>'; }
      }
    }

    setDisplay('proyecto-detalle', true);
    var panel = byId('proyecto-detalle');
    if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    switchProyectoTab('resumen');
  }

  async function verProyecto(id) {
    var proyecto = await obtenerProyectoPorId(id);
    if (!proyecto) return false;
    PROYECTO_ACTUAL = proyecto;
    await renderDetalleProyecto(proyecto);
    return false;
  }

  function volverAListaProyectos() { setDisplay('proyecto-detalle', false); PROYECTO_ACTUAL = null; destroyProyectoChart(); return false; }

  function switchProyectoTab(tabId) {
    ['resumen', 'financiero', 'tareas', 'documentos'].forEach(function(key) {
      var pane = byId('proyecto-tab-' + key);
      if (pane) { pane.style.display = key === tabId ? 'block' : 'none'; pane.classList.toggle('active', key === tabId); }
    });
    qsa('.proyecto-tab').forEach(function(btn) {
      var onclick = btn.getAttribute('onclick') || '';
      var active = onclick.indexOf("'" + tabId + "'") !== -1 || onclick.indexOf('"' + tabId + '"') !== -1;
      btn.classList.toggle('active', active);
    });
    return false;
  }

  async function guardarNotasProyecto() {
    if (!PROYECTO_ACTUAL) return false;
    var notasEl = byId('proyecto-notas');
    var notas = notasEl ? notasEl.value : '';
    var ok = await updateRow(getStorageKey('PROYECTOS', 'proyectos'), PROYECTO_ACTUAL.id, { notas: notas });
    if (!ok) { alert('No se pudieron guardar las notas del proyecto.'); return false; }
    PROYECTO_ACTUAL.notas = notas;
    if (window.showToast) { window.showToast({ type: 'success', title: 'Notas guardadas', message: 'Las notas del proyecto se actualizaron correctamente.' }); }
    return false;
  }

  async function guardarTareaProyecto(event) {
    if (event) event.preventDefault();
    if (!PROYECTO_ACTUAL) return false;
    var titulo = byId('tarea-titulo') ? byId('tarea-titulo').value.trim() : '';
    var responsable = byId('tarea-asignado') ? byId('tarea-asignado').value.trim() : '';
    var fechaLimite = byId('tarea-fecha-limite') ? byId('tarea-fecha-limite').value : '';
    var estado = byId('tarea-estado') ? byId('tarea-estado').value : 'pendiente';
    var prioridad = byId('tarea-prioridad') ? byId('tarea-prioridad').value : 'media';
    var descripcion = byId('tarea-descripcion') ? byId('tarea-descripcion').value.trim() : '';
    var form = byId('formTareaProyecto');
    if (!titulo) { alert('Completa el título de la tarea.'); return false; }

    var payload = { proyecto_id: PROYECTO_ACTUAL.id, titulo: titulo, estado: estado, prioridad: prioridad };
    if (responsable) payload.responsable = responsable;
    if (fechaLimite) payload.fecha_limite = fechaLimite;
    if (descripcion) payload.descripcion = descripcion;

    var result = await insertRow(getStorageKey('TAREAS', 'tareas'), payload);
    if (!result) { alert('No se pudo guardar la tarea. Error de conexión con Supabase.'); return false; }
    if (form) form.reset();
    await verProyecto(PROYECTO_ACTUAL.id);
    if (typeof window.actualizarKPIs === 'function') await window.actualizarKPIs();
    return false;
  }

  function editarTareaProyecto(tareaId) {
    if (!tareaId || !PROYECTO_ACTUAL) return false;
    if (window.showToast) { window.showToast({ type: 'info', title: 'Editar tarea', message: 'Función de edición de tareas en desarrollo.' }); }
    return false;
  }

  function seleccionarProyectoEnFinanzas(proyecto) {
    if (!proyecto) return;
    var selectGasto = byId('gasto-proyecto'); if (selectGasto) selectGasto.value = proyecto.id;
    var selectPago = byId('pago-proyecto'); if (selectPago) selectPago.value = proyecto.id;
    var selectEstadoCuenta = byId('ec-proyecto'); if (selectEstadoCuenta) selectEstadoCuenta.value = proyecto.id;
  }

  function navegarAFinanzasConProyecto(tipo) {
    if (!PROYECTO_ACTUAL) { alert('No hay proyecto activo seleccionado.'); return false; }
    if (typeof window.switchSection === 'function') window.switchSection('finanzas');
    if (typeof window.switchSubSection === 'function') window.switchSubSection('finanzas', 'estado-cuenta');
    if (typeof window.actualizarSelectProyectosFinanzas === 'function') window.actualizarSelectProyectosFinanzas();
    setTimeout(function() {
      seleccionarProyectoEnFinanzas(PROYECTO_ACTUAL);
      if (typeof window.generarEstadoCuenta === 'function') window.generarEstadoCuenta();
      var targetId = tipo === 'gasto' ? 'form-gasto-finanzas' : 'form-pago-finanzas';
      var target = byId(targetId);
      if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return false;
  }

  function abrirModalGastoProyecto() { return navegarAFinanzasConProyecto('gasto'); }
  function abrirModalPagoProyecto() { return navegarAFinanzasConProyecto('pago'); }

  // ============================================================
  // MAPA DE CATEGORÍAS → TAREAS AUTOMÁTICAS
  // Cada categoría genera subtareas predefinidas con prioridad
  // ============================================================
  var TAREAS_POR_CATEGORIA = {
    diseno: [
      { titulo: 'Brief y levantamiento de requerimientos de diseño', prioridad: 'alta' },
      { titulo: 'Investigación de referentes y moodboard', prioridad: 'media' },
      { titulo: 'Wireframes / bocetos iniciales', prioridad: 'alta' },
      { titulo: 'Diseño de propuesta visual', prioridad: 'alta' },
      { titulo: 'Revisión y ajustes del cliente', prioridad: 'media' },
      { titulo: 'Entrega de archivos finales', prioridad: 'alta' }
    ],
    web: [
      { titulo: 'Definición de arquitectura y estructura del sitio', prioridad: 'alta' },
      { titulo: 'Diseño UI/UX de páginas principales', prioridad: 'alta' },
      { titulo: 'Desarrollo frontend', prioridad: 'alta' },
      { titulo: 'Integración CMS / backend', prioridad: 'media' },
      { titulo: 'Pruebas y control de calidad (QA)', prioridad: 'alta' },
      { titulo: 'Publicación y configuración de dominio/hosting', prioridad: 'alta' },
      { titulo: 'Capacitación al cliente', prioridad: 'baja' }
    ],
    marketing: [
      { titulo: 'Definición de estrategia y objetivos', prioridad: 'alta' },
      { titulo: 'Investigación de audiencia y competencia', prioridad: 'media' },
      { titulo: 'Creación de contenido y creatividades', prioridad: 'alta' },
      { titulo: 'Configuración de campañas', prioridad: 'alta' },
      { titulo: 'Monitoreo y optimización', prioridad: 'media' },
      { titulo: 'Reporte de resultados', prioridad: 'media' }
    ],
    foto: [
      { titulo: 'Coordinación de sesión fotográfica', prioridad: 'alta' },
      { titulo: 'Preparación de locación y equipos', prioridad: 'media' },
      { titulo: 'Sesión fotográfica', prioridad: 'urgente' },
      { titulo: 'Selección y edición de fotos', prioridad: 'alta' },
      { titulo: 'Entrega de galería al cliente', prioridad: 'alta' }
    ],
    video: [
      { titulo: 'Guión y storyboard', prioridad: 'alta' },
      { titulo: 'Producción / grabación', prioridad: 'urgente' },
      { titulo: 'Edición y postproducción', prioridad: 'alta' },
      { titulo: 'Revisión del cliente', prioridad: 'media' },
      { titulo: 'Entrega de archivos finales', prioridad: 'alta' }
    ],
    branding: [
      { titulo: 'Brief de marca y diagnóstico', prioridad: 'alta' },
      { titulo: 'Investigación de mercado y competencia', prioridad: 'media' },
      { titulo: 'Propuesta de naming y concepto visual', prioridad: 'alta' },
      { titulo: 'Diseño de identidad visual (logo, paleta, tipografía)', prioridad: 'urgente' },
      { titulo: 'Manual de marca', prioridad: 'alta' },
      { titulo: 'Aplicaciones y piezas de marca', prioridad: 'media' },
      { titulo: 'Entrega de archivos', prioridad: 'alta' }
    ],
    social: [
      { titulo: 'Auditoría de redes sociales actuales', prioridad: 'media' },
      { titulo: 'Estrategia de contenido y calendario editorial', prioridad: 'alta' },
      { titulo: 'Creación de plantillas y piezas gráficas', prioridad: 'alta' },
      { titulo: 'Publicación y gestión de contenidos', prioridad: 'media' },
      { titulo: 'Análisis de métricas y reporte', prioridad: 'media' }
    ],
    otros: [
      { titulo: 'Revisión y aprobación de propuesta', prioridad: 'alta' },
      { titulo: 'Ejecución del servicio', prioridad: 'alta' },
      { titulo: 'Revisión y ajustes finales', prioridad: 'media' },
      { titulo: 'Entrega y cierre', prioridad: 'alta' }
    ]
  };

  // Detectar categoría desde nombre/descripción de servicio
  function detectarCategoria(texto) {
    var t = (texto || '').toLowerCase();
    if (/\bweb\b|landing|sitio|página|wordpress|e-?commerce|tienda/i.test(t)) return 'web';
    if (/\bbranding\b|marca|identidad|logo|logotipo/i.test(t)) return 'branding';
    if (/\bdise[ñn]o\b|ui|ux|ilustr|banner|flyer|cartel|portada/i.test(t)) return 'diseno';
    if (/\bmarketing\b|publicidad|ads|campañ|sem|seo|ppc/i.test(t)) return 'marketing';
    if (/\bsocial|redes|instagram|facebook|tiktok|contenido/i.test(t)) return 'social';
    if (/\bfoto|photograph|sesión|shooting/i.test(t)) return 'foto';
    if (/\bvideo|film|animaci|motion|reel|reels/i.test(t)) return 'video';
    return 'otros';
  }

  // ============================================================
  // GENERAR TAREAS AUTOMÁTICAS DESDE COTIZACIÓN
  // ============================================================
  async function generarTareasDesdeCotizacion(proyectoId, cotizacionId) {
    if (!proyectoId || !cotizacionId) return;
    try {
      var cot = await findItem('cotizaciones', cotizacionId);
      if (!cot || !cot.items) return;
      var items = [];
      try { items = typeof cot.items === 'string' ? JSON.parse(cot.items) : cot.items; } catch (e) { items = []; }
      if (!items || !items.length) return;

      var tareasCreadas = 0;
      var categoriasUsadas = {};

      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var descripcionServicio = item.descripcion || item.nombre || item.titulo || 'Servicio';
        var categoriaItem = item.categoria || detectarCategoria(descripcionServicio);

        // Si ya usamos esta categoría, no duplicar subtareas
        if (categoriasUsadas[categoriaItem]) continue;
        categoriasUsadas[categoriaItem] = true;

        var plantilla = TAREAS_POR_CATEGORIA[categoriaItem] || TAREAS_POR_CATEGORIA['otros'];

        for (var j = 0; j < plantilla.length; j++) {
          var tpl = plantilla[j];
          var payload = {
            proyecto_id: proyectoId,
            titulo: tpl.titulo,
            estado: 'pendiente',
            prioridad: tpl.prioridad || 'media',
            categoria: categoriaItem,
            descripcion: 'Auto-generada desde: ' + descripcionServicio.substring(0, 80)
          };
          await insertRow(getStorageKey('TAREAS', 'tareas'), payload);
          tareasCreadas++;
        }
      }

      if (window.showToast && tareasCreadas > 0) {
        window.showToast({ type: 'success', title: 'Tareas generadas ✓', message: tareasCreadas + ' tareas creadas automáticamente desde los servicios de la cotización.' });
      }
    } catch (error) { console.error('Error generando tareas desde cotización', error); }
  }

  // ============================================================
  // Guardar proyecto + cotización desde proforma
  // ============================================================
  async function guardarProformaProyecto(event) {
    if (event) event.preventDefault();
    var form = byId('formProformaProyecto');
    var feedback = byId('feedback-proforma');
    if (!form) return false;
    if (feedback) { feedback.className = 'form-feedback'; feedback.style.display = 'none'; feedback.textContent = ''; }

    try {
      var nombreProyecto = byId('pf-nombre-proyecto') ? byId('pf-nombre-proyecto').value.trim() : '';
      var fecha = byId('pf-fecha') ? byId('pf-fecha').value : todayISO();
      var clienteSelect = byId('pf-cliente');
      var alcanceEditor = byId('pf-alcance-editor');
      var alcanceTextarea = byId('pf-alcance');

      if (!nombreProyecto || !clienteSelect || !clienteSelect.value) {
        if (feedback) { feedback.className = 'form-feedback error'; feedback.textContent = 'Completa nombre de proyecto y cliente.'; feedback.style.display = 'block'; }
        return false;
      }

      var clienteId = clienteSelect.value;
      var clienteNombre = (clienteSelect.options[clienteSelect.selectedIndex] || {}).text || 'Cliente';
      if (alcanceEditor && alcanceTextarea) alcanceTextarea.value = alcanceEditor.innerHTML;
      var alcanceHtml = alcanceTextarea ? alcanceTextarea.value : '';

      var tbody = byId('tbodyProformaServicios');
      var items = [];
      var subtotal = 0;
      var itbmsTotal = 0;

      if (tbody) {
        Array.prototype.slice.call(tbody.querySelectorAll('tr')).forEach(function(tr) {
          var nombreInput = tr.querySelector('.pf-input-nombre');
          var unidadSelect = tr.querySelector('.pf-select-unidad');
          var cantInput = tr.querySelector('.pf-input-cantidad');
          var precioInput = tr.querySelector('.pf-input-precio');
          var itbmsCheck = tr.querySelector('.pf-check-itbms');
          if (!nombreInput) return;
          var descripcion = (nombreInput.value || '').trim();
          var unidad = (unidadSelect ? unidadSelect.value : 'und').trim() || 'und';
          var cant = parseFloat(cantInput ? cantInput.value : '0') || 0;
          var precio = parseFloat(precioInput ? precioInput.value : '0') || 0;
          var aplicaItbms = itbmsCheck ? itbmsCheck.checked : false;
          var categoria = tr.dataset.categoria || detectarCategoria(descripcion);
          var totalFila = cant * precio;
          if (!descripcion) return;
          subtotal += totalFila;
          if (aplicaItbms) itbmsTotal += totalFila * 0.07;
          items.push({ descripcion: descripcion, unidad: unidad, cantidad: cant, precio: precio, total: totalFila, itbms: aplicaItbms, categoria: categoria });
        });
      }

      var itbmsGlobal = byId('pf-aplica-itbms');
      if (itbmsGlobal && itbmsGlobal.checked) itbmsTotal = subtotal * 0.07;
      var totalPropuesta = subtotal + itbmsTotal;

      if (!items.length || subtotal <= 0) {
        if (feedback) { feedback.className = 'form-feedback error'; feedback.textContent = 'Añade al menos un servicio a la propuesta económica.'; feedback.style.display = 'block'; }
        return false;
      }

      // 1. Crear proyecto
      var payloadProyecto = { cliente_id: clienteId, nombre: nombreProyecto, descripcion: alcanceHtml, fecha_inicio: fecha || todayISO(), estado: 'en_progreso', presupuesto: totalPropuesta, total_cobrado: 0, total_gastado: 0, notas: '' };
      var proyecto = await insertRow(getStorageKey('PROYECTOS', 'proyectos'), payloadProyecto);
      if (!proyecto) {
        if (feedback) { feedback.className = 'form-feedback error'; feedback.textContent = 'No se pudo guardar el proyecto.'; feedback.style.display = 'block'; }
        return false;
      }

      // 2. Crear cotización vinculada al proyecto
      var userId = await getSessionUserId();
      var cotizacion = null;
      if (typeof window.crearCotizacionDesdeProforma === 'function') {
        cotizacion = await window.crearCotizacionDesdeProforma({
          userId: userId, proyectoId: proyecto.id, clienteId: clienteId, clienteNombre: clienteNombre,
          fecha: fecha, nombreProyecto: nombreProyecto, alcanceHtml: alcanceHtml,
          items: items, subtotal: subtotal, itbms: itbmsTotal, total: totalPropuesta
        });
      }

      // 3. Generar tareas automáticas desde cotización (con plantillas por categoría)
      if (cotizacion && cotizacion.id) {
        await generarTareasDesdeCotizacion(proyecto.id, cotizacion.id);
      } else if (items.length) {
        // Fallback: generar desde items directamente si no hay cotizacion.id
        var categoriasUsadas = {};
        var tareasCreadas = 0;
        for (var i = 0; i < items.length; i++) {
          var cat = items[i].categoria || detectarCategoria(items[i].descripcion || '');
          if (categoriasUsadas[cat]) continue;
          categoriasUsadas[cat] = true;
          var plantilla = TAREAS_POR_CATEGORIA[cat] || TAREAS_POR_CATEGORIA['otros'];
          for (var j = 0; j < plantilla.length; j++) {
            var tpl = plantilla[j];
            await insertRow(getStorageKey('TAREAS', 'tareas'), {
              proyecto_id: proyecto.id, titulo: tpl.titulo, estado: 'pendiente',
              prioridad: tpl.prioridad || 'media', categoria: cat,
              descripcion: 'Auto-generada desde: ' + (items[i].descripcion || '').substring(0, 80)
            });
            tareasCreadas++;
          }
        }
        if (window.showToast && tareasCreadas > 0) {
          window.showToast({ type: 'success', title: 'Tareas generadas ✓', message: tareasCreadas + ' tareas creadas automáticamente.' });
        }
      }

      if (feedback) { feedback.className = 'form-feedback success'; feedback.textContent = '¡Proyecto, cotización y tareas creados correctamente!'; feedback.style.display = 'block'; }

      form.reset();
      if (byId('pf-fecha')) byId('pf-fecha').value = todayISO();
      if (alcanceEditor) alcanceEditor.innerHTML = '';
      if (byId('tbodyProformaServicios')) byId('tbodyProformaServicios').innerHTML = '';
      actualizarTotalesProforma();

      await renderProyectos('todos');
      if (typeof window.actualizarKPIs === 'function') window.actualizarKPIs();
      if (typeof window.actualizarSelectProyectosFinanzas === 'function') window.actualizarSelectProyectosFinanzas();

      // Abrir el proyecto recién creado
      setTimeout(function() { verProyecto(proyecto.id); }, 400);

      return false;
    } catch (error) {
      console.error('Error guardando proforma de proyecto', error);
      if (feedback) { feedback.className = 'form-feedback error'; feedback.textContent = 'Ocurrió un error al guardar la proforma.'; feedback.style.display = 'block'; }
      return false;
    }
  }

  // ============================================================
  // Imprimir / Descargar cotización
  // ============================================================
  function imprimirCotizacionProyecto() {
    if (!PROYECTO_ACTUAL) return false;
    var container = byId('cotizacion-documento-container');
    if (!container) return false;
    var cotDoc = container.querySelector('.cot-doc-container');
    if (!cotDoc) { alert('No hay cotización para imprimir.'); return false; }
    var printWindow = window.open('', '_blank');
    printWindow.document.write('<html><head><title>Cotización ' + esc(PROYECTO_ACTUAL.nombre || '') + '</title>');
    printWindow.document.write('<style>body{font-family:Inter,sans-serif;margin:0;padding:20px;background:#f5f5f5;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(cotDoc.outerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(function() { printWindow.print(); }, 500);
    return false;
  }

  function descargarCotizacionPDF() {
    if (!PROYECTO_ACTUAL) return false;
    if (window.showToast) { window.showToast({ type: 'info', title: 'Descargar PDF', message: 'Usa Imprimir → Guardar como PDF.' }); }
    return false;
  }

  // ============================================================
  // Proforma (sin cambios estructurales)
  // ============================================================
  function togglePanelProforma() {
    var panel = byId('proyecto-proforma-panel');
    if (!panel) return;
    var isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';
    if (isHidden) { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); cargarSelectClientesProforma(); cargarSelectServiciosCatalogo(); }
  }

  async function cargarSelectClientesProforma() {
    var select = byId('pf-cliente');
    if (!select) return;
    var clientes = await obtenerClientes();
    var currentValue = select.value;
    var html = '<option value="">Selecciona un cliente</option>';
    for (var i = 0; i < clientes.length; i++) html += '<option value="' + esc(clientes[i].id) + '">' + esc(clientes[i].nombre) + '</option>';
    select.innerHTML = html;
    if (currentValue) select.value = currentValue;
  }

  async function cargarSelectServiciosCatalogo() {
    var select = byId('pf-select-servicio-catalogo');
    if (!select) return;
    var servicios = [];
    if (typeof window.obtenerServicios === 'function') servicios = await window.obtenerServicios();
    servicios = Array.isArray(servicios) ? servicios : [];
    var html = '<option value="">-- Selecciona un servicio del catalogo --</option>';
    for (var i = 0; i < servicios.length; i++) {
      var s = servicios[i];
      var nombre = s.descripcion || s.nombre || s.codigo || 'Servicio';
      var precio = parseFloat(s.precio || 0) || 0;
      var unidad = s.unidad || 'und';
      var itbms = parseInt(s.itbms, 10) === 1 ? 1 : 0;
      var categoria = s.categoria || detectarCategoria(nombre);
      html += '<option value="' + esc(s.id || '') + '" data-nombre="' + esc(nombre) + '" data-precio="' + precio + '" data-unidad="' + esc(unidad) + '" data-itbms="' + itbms + '" data-categoria="' + esc(categoria) + '">' + esc(nombre) + ' — ' + money(precio) + ' / ' + esc(unidad) + '</option>';
    }
    select.innerHTML = html;
  }

  function agregarServicioCatalogoAProforma() {
    var select = byId('pf-select-servicio-catalogo');
    if (!select || !select.value) { if (window.showToast) window.showToast({ type: 'warning', title: 'Selecciona un servicio', message: 'Elige un servicio del catalogo para agregarlo a la propuesta.' }); return; }
    var option = select.options[select.selectedIndex];
    var nombre = option.getAttribute('data-nombre') || 'Servicio';
    var precio = parseFloat(option.getAttribute('data-precio') || 0) || 0;
    var unidad = option.getAttribute('data-unidad') || 'und';
    var itbms = parseInt(option.getAttribute('data-itbms') || '0', 10);
    var categoria = option.getAttribute('data-categoria') || detectarCategoria(nombre);
    agregarFilaProforma(nombre, unidad, '', precio.toFixed(2), itbms, categoria);
    select.value = '';
  }

  function agregarFilaProformaVacia() { agregarFilaProforma('', '', '', '', 0, 'otros'); }

  var UNIDADES_OPCIONES = [
    { value: 'und', label: 'und', step: '1' }, { value: 'hr', label: 'hr', step: '1' },
    { value: 'dia', label: 'día', step: '0.01' }, { value: 'mes', label: 'mes', step: '0.01' },
    { value: 'pagina', label: 'pág', step: '1' }, { value: 'proyecto', label: 'proy', step: '1' },
    { value: 'paquete', label: 'paq', step: '1' }
  ];

  function buildUnidadSelect(selectedValue) {
    var html = '<select class="pf-select-unidad" style="width:100px;padding:6px 8px;background:transparent;border:1px solid rgba(18,53,36,0.25);border-radius:6px;color:#F0F0F5;font-size:13px;">';
    for (var i = 0; i < UNIDADES_OPCIONES.length; i++) { var opt = UNIDADES_OPCIONES[i]; var sel = opt.value === selectedValue ? ' selected' : ''; html += '<option value="' + opt.value + '"' + sel + '>' + opt.label + '</option>'; }
    html += '</select>';
    return html;
  }

  function agregarFilaProforma(nombre, unidad, cantidad, precio, itbms, categoria) {
    var tbody = byId('tbodyProformaServicios');
    if (!tbody) return;
    var tr = document.createElement('tr');
    tr.dataset.categoria = categoria || detectarCategoria(nombre || '');
    var stepInicial = '0.01';
    for (var u = 0; u < UNIDADES_OPCIONES.length; u++) { if (UNIDADES_OPCIONES[u].value === unidad) { stepInicial = UNIDADES_OPCIONES[u].step; break; } }
    var html = '';
    html += '<td><input type="text" class="pf-input-nombre" value="' + esc(nombre) + '" placeholder="Descripcion del servicio" style="width:100%;padding:6px 8px;background:transparent;border:1px solid rgba(18,53,36,0.25);border-radius:6px;color:#F0F0F5;font-size:13px;"></td>';
    html += '<td>' + buildUnidadSelect(unidad) + '</td>';
    html += '<td><input type="number" class="pf-input-cantidad" value="' + esc(cantidad) + '" placeholder="0" min="0" step="' + stepInicial + '" style="width:80px;padding:6px 8px;background:transparent;border:1px solid rgba(18,53,36,0.25);border-radius:6px;color:#F0F0F5;font-size:13px;text-align:center;"></td>';
    html += '<td><input type="number" class="pf-input-precio" value="' + esc(precio) + '" placeholder="0.00" min="0" step="0.01" style="width:100px;padding:6px 8px;background:transparent;border:1px solid rgba(18,53,36,0.25);border-radius:6px;color:#F0F0F5;font-size:13px;text-align:right;"></td>';
    html += '<td style="text-align:center;"><input type="checkbox" class="pf-check-itbms" ' + (itbms ? 'checked' : '') + ' style="width:18px;height:18px;accent-color:#C5A253;cursor:pointer;"></td>';
    html += '<td class="pf-total-fila" style="font-weight:600;text-align:right;">0.00</td>';
    html += '<td style="text-align:center;"><button type="button" class="btn-eliminar-fila" style="background:none;border:none;color:#F87171;cursor:pointer;font-size:16px;"><i class="ph ph-trash"></i></button></td>';
    tr.innerHTML = html;

    var btnEliminar = tr.querySelector('.btn-eliminar-fila');
    if (btnEliminar) btnEliminar.addEventListener('click', function() { tr.remove(); actualizarTotalesProforma(); });

    // Auto-detectar categoría cuando se escribe el nombre
    var inputNombre = tr.querySelector('.pf-input-nombre');
    if (inputNombre) {
      inputNombre.addEventListener('input', function() {
        tr.dataset.categoria = detectarCategoria(inputNombre.value);
        actualizarTotalesProforma();
      });
    }

    var selectUnidad = tr.querySelector('.pf-select-unidad');
    var inputCantidad = tr.querySelector('.pf-input-cantidad');
    if (selectUnidad && inputCantidad) {
      selectUnidad.addEventListener('change', function() {
        for (var u = 0; u < UNIDADES_OPCIONES.length; u++) { if (UNIDADES_OPCIONES[u].value === selectUnidad.value) { inputCantidad.setAttribute('step', UNIDADES_OPCIONES[u].step); break; } }
        actualizarTotalesProforma();
      });
    }

    var inputs = tr.querySelectorAll('input, select');
    for (var k = 0; k < inputs.length; k++) { if (inputs[k] === selectUnidad || inputs[k] === inputNombre) continue; inputs[k].addEventListener('input', function() { actualizarTotalesProforma(); }); inputs[k].addEventListener('change', function() { actualizarTotalesProforma(); }); }
    tbody.appendChild(tr);
    actualizarTotalesProforma();
  }

  function actualizarTotalesProforma() {
    var tbody = byId('tbodyProformaServicios');
    if (!tbody) return;
    var filas = tbody.querySelectorAll('tr');
    var subtotal = 0;
    var itbmsTotal = 0;
    for (var i = 0; i < filas.length; i++) {
      var tr = filas[i];
      var cantidadInput = tr.querySelector('.pf-input-cantidad');
      var precioInput = tr.querySelector('.pf-input-precio');
      var itbmsCheck = tr.querySelector('.pf-check-itbms');
      var totalCell = tr.querySelector('.pf-total-fila');
      var cantidad = parseFloat(cantidadInput ? cantidadInput.value : 0) || 0;
      var precio = parseFloat(precioInput ? precioInput.value : 0) || 0;
      var aplicaItbms = itbmsCheck ? itbmsCheck.checked : false;
      var totalFila = cantidad * precio;
      if (totalCell) totalCell.textContent = totalFila.toFixed(2);
      subtotal += totalFila;
      if (aplicaItbms) itbmsTotal += totalFila * 0.07;
    }
    var itbmsGlobal = byId('pf-aplica-itbms');
    if (itbmsGlobal && itbmsGlobal.checked) itbmsTotal = subtotal * 0.07;
    var total = subtotal + itbmsTotal;
    var elSubtotal = byId('pf-subtotal-propuesta');
    var elItbms = byId('pf-itbms-total');
    var elTotal = byId('pf-total-propuesta');
    var elItbmsMonto = byId('pf-itbms-monto');
    if (elSubtotal) elSubtotal.textContent = money(subtotal);
    if (elItbms) elItbms.textContent = money(itbmsTotal);
    if (elTotal) elTotal.textContent = money(total);
    if (elItbmsMonto) elItbmsMonto.textContent = itbmsTotal > 0 ? 'ITBMS incluido: ' + money(itbmsTotal) : '';
  }

  function inicializarEditorAlcance() {
    var toolbar = document.querySelector('.editor-toolbar');
    var editor = byId('pf-alcance-editor');
    if (!toolbar || !editor) return;
    toolbar.addEventListener('click', function(e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      e.preventDefault();
      var cmd = btn.getAttribute('data-cmd');
      if (!cmd) return;
      editor.focus();
      if (cmd === 'bold') document.execCommand('bold', false, null);
      else if (cmd === 'italic') document.execCommand('italic', false, null);
      else if (cmd === 'unorderedList') document.execCommand('insertUnorderedList', false, null);
      else if (cmd === 'orderedList') document.execCommand('insertOrderedList', false, null);
    });
  }

  async function inicializarProyectos() {
    await ensureClientesCache();
    await actualizarSelectClientesProyecto();
    await renderProyectos('todos');
    if (byId('proy-fecha') && !byId('proy-fecha').value) byId('proy-fecha').value = todayISO();
    if (byId('buscar-proyecto')) byId('buscar-proyecto').addEventListener('input', function() { buscarProyectos(); });
    var itbmsGlobal = byId('pf-aplica-itbms');
    if (itbmsGlobal) itbmsGlobal.addEventListener('change', actualizarTotalesProforma);
    inicializarEditorAlcance();
    var pfFecha = byId('pf-fecha');
    if (pfFecha && !pfFecha.value) pfFecha.value = (new Date()).toISOString().slice(0, 10);
  }

  // Exponer funciones
  window.inicializarProyectos = inicializarProyectos;
  window.actualizarSelectClientesProyecto = actualizarSelectClientesProyecto;
  window.obtenerProyectos = obtenerProyectos;
  window.renderProyectos = renderProyectos;
  window.buscarProyectos = buscarProyectos;
  window.filtrarProyectos = filtrarProyectos;
  window.verProyecto = verProyecto;
  window.renderDetalleProyecto = renderDetalleProyecto;
  window.volverAListaProyectos = volverAListaProyectos;
  window.switchProyectoTab = switchProyectoTab;
  window.guardarNotasProyecto = guardarNotasProyecto;
  window.guardarTareaProyecto = guardarTareaProyecto;
  window.editarTareaProyecto = editarTareaProyecto;
  window.guardarProformaProyecto = guardarProformaProyecto;
  window.togglePanelProforma = togglePanelProforma;
  window.cargarSelectClientesProforma = cargarSelectClientesProforma;
  window.cargarSelectServiciosCatalogo = cargarSelectServiciosCatalogo;
  window.agregarServicioCatalogoAProforma = agregarServicioCatalogoAProforma;
  window.agregarFilaProformaVacia = agregarFilaProformaVacia;
  window.agregarFilaProforma = agregarFilaProforma;
  window.actualizarTotalesProforma = actualizarTotalesProforma;
  window.inicializarEditorAlcance = inicializarEditorAlcance;
  window.imprimirCotizacionProyecto = imprimirCotizacionProyecto;
  window.descargarCotizacionPDF = descargarCotizacionPDF;
  window.abrirModalGastoProyecto = abrirModalGastoProyecto;
  window.abrirModalPagoProyecto = abrirModalPagoProyecto;
  window.generarTareasDesdeCotizacion = generarTareasDesdeCotizacion;

})(window, document);
