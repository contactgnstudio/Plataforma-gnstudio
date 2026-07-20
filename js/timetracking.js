/* ============================================================
   GN Studio OS — Time Tracking Module v2.0 (Supabase)
   Gerald Flores | GN Studio
   ============================================================
   Arquitectura:
   - localStorage: caché del timer activo (cronómetro en curso)
   - Supabase (time_entries): persistencia real de sesiones finalizadas
   - Fallback: si Supabase falla, guarda en localStorage igual
   ============================================================ */

// ---------- Estado global del timer ----------
var gnTimer = {
  activo: false,
  tareaId: null,
  proyectoId: null,
  inicio: null,
  intervalo: null,
  segundosAcumulados: 0
};

// ---------- Caché en memoria de sesiones (por proyecto) ----------
var _ttCache = {}; // { [proyectoId]: sesiones[] }

// ---------- Utilidades ----------
function ttFormatoHMS(segundos) {
  segundos = Math.max(0, Math.floor(segundos));
  var h = Math.floor(segundos / 3600);
  var m = Math.floor((segundos % 3600) / 60);
  var s = segundos % 60;
  return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}
function ttHorasDecimal(segundos) { return parseFloat((segundos / 3600).toFixed(2)); }

// ---------- localStorage helpers (caché local + offline fallback) ----------
function _ttLSKey(proyectoId) { return 'gn_tt_sesiones_' + proyectoId; }
function _ttLSGet(proyectoId) {
  try { var r = localStorage.getItem(_ttLSKey(proyectoId)); return r ? JSON.parse(r) : []; }
  catch(e) { return []; }
}
function _ttLSSave(proyectoId, sesiones) {
  localStorage.setItem(_ttLSKey(proyectoId), JSON.stringify(sesiones));
}
function _ttLSAdd(proyectoId, sesion) {
  var list = _ttLSGet(proyectoId);
  list.push(sesion);
  _ttLSSave(proyectoId, list);
}
function _ttLSDel(proyectoId, sesionId) {
  _ttLSSave(proyectoId, _ttLSGet(proyectoId).filter(function(s){ return s.id !== sesionId; }));
}

// ---------- Supabase helpers ----------
async function _ttSbInsert(sesion) {
  if (typeof window.addItem !== 'function') return null;
  var payload = {
    proyecto_id: sesion.proyectoId,
    tarea_id:    sesion.tareaId,
    inicio:      sesion.inicio,
    fin:         sesion.fin,
    segundos:    sesion.segundos,
    descripcion: sesion.descripcion || '',
    manual:      sesion.manual || false
  };
  return await window.addItem('time_entries', payload);
}

async function _ttSbDelete(sesionId) {
  if (typeof window.deleteItem !== 'function') return false;
  return await window.deleteItem('time_entries', sesionId);
}

async function _ttSbGetPorProyecto(proyectoId) {
  if (typeof window.getDataFiltered !== 'function') return [];
  var rows = await window.getDataFiltered('time_entries', { proyecto_id: proyectoId }, { orderBy: 'created_at', ascending: false });
  return Array.isArray(rows) ? rows : [];
}

async function _ttSbGetPorTarea(proyectoId, tareaId) {
  if (typeof window.getDataFiltered !== 'function') return [];
  // Filtrar por proyecto primero (índice), luego por tarea
  var rows = await _ttSbGetPorProyecto(proyectoId);
  return rows.filter(function(r){ return r.tarea_id === tareaId; });
}

// ---------- Normalizar fila Supabase → sesion local ----------
function _ttNorm(row) {
  return {
    id:          row.id,
    tareaId:     row.tarea_id,
    proyectoId:  row.proyecto_id,
    inicio:      row.inicio,
    fin:         row.fin,
    segundos:    row.segundos || 0,
    descripcion: row.descripcion || '',
    manual:      row.manual || false,
    _sb: true  // marcador: viene de Supabase
  };
}

// ---------- Obtener sesiones (Supabase + caché) ----------
async function ttGetSesionesProyecto(proyectoId) {
  if (_ttCache[proyectoId]) return _ttCache[proyectoId];
  var rows = await _ttSbGetPorProyecto(proyectoId);
  if (rows.length) {
    _ttCache[proyectoId] = rows.map(_ttNorm);
  } else {
    // fallback localStorage
    _ttCache[proyectoId] = _ttLSGet(proyectoId);
  }
  return _ttCache[proyectoId];
}

async function ttGetTareaHoras(proyectoId, tareaId) {
  var sesiones = await ttGetSesionesProyecto(proyectoId);
  return sesiones
    .filter(function(s){ return s.tareaId === tareaId; })
    .reduce(function(acc, s){ return acc + s.segundos; }, 0);
}

async function ttGetProyectoTotalSeg(proyectoId) {
  var sesiones = await ttGetSesionesProyecto(proyectoId);
  return sesiones.reduce(function(acc, s){ return acc + s.segundos; }, 0);
}

// ---------- Guardar sesión (Supabase + fallback LS) ----------
async function ttGuardarSesion(sesion) {
  // Intentar Supabase
  var result = await _ttSbInsert(sesion);
  if (result && result.id) {
    // Supabase OK: normalizar y agregar a caché
    var norm = _ttNorm(result);
    if (!_ttCache[sesion.proyectoId]) _ttCache[sesion.proyectoId] = [];
    _ttCache[sesion.proyectoId].unshift(norm);
    return norm;
  }
  // Fallback: localStorage
  var fallback = Object.assign({ id: 'ses_' + Date.now() }, sesion);
  _ttLSAdd(sesion.proyectoId, fallback);
  if (!_ttCache[sesion.proyectoId]) _ttCache[sesion.proyectoId] = [];
  _ttCache[sesion.proyectoId].unshift(fallback);
  return fallback;
}

// ---------- Control del Timer ----------
function ttIniciar(tareaId, proyectoId, btnEl) {
  if (gnTimer.activo && gnTimer.tareaId !== tareaId) { ttPausar(); }
  if (gnTimer.activo && gnTimer.tareaId === tareaId) { ttPausar(); return; }

  gnTimer.activo = true;
  gnTimer.tareaId = tareaId;
  gnTimer.proyectoId = proyectoId;
  gnTimer.inicio = new Date().toISOString();
  gnTimer.segundosAcumulados = 0;

  document.querySelectorAll('.tt-btn-iniciar').forEach(function(b){
    b.classList.remove('tt-running');
    b.innerHTML = '<i class="ph ph-play"></i>';
    b.title = 'Iniciar timer';
  });
  if (btnEl) {
    btnEl.classList.add('tt-running');
    btnEl.innerHTML = '<i class="ph ph-pause"></i>';
    btnEl.title = 'Pausar timer';
  }

  gnTimer.intervalo = setInterval(function(){
    gnTimer.segundosAcumulados++;
    ttActualizarDisplayTarea(tareaId);
    ttActualizarBarraGlobal();
  }, 1000);

  ttActualizarBarraGlobal();
  if (typeof window.showToast === 'function') window.showToast({ type:'success', title:'Timer iniciado', message:'Registrando tiempo para la tarea.' });
}

function ttPausar() {
  if (!gnTimer.activo) return;
  clearInterval(gnTimer.intervalo);
  gnTimer.activo = false;

  if (gnTimer.segundosAcumulados > 5) {
    var sesion = {
      tareaId:     gnTimer.tareaId,
      proyectoId:  gnTimer.proyectoId,
      inicio:      gnTimer.inicio,
      fin:         new Date().toISOString(),
      segundos:    gnTimer.segundosAcumulados,
      descripcion: '',
      manual:      false
    };
    ttGuardarSesion(sesion).then(function(){
      ttActualizarDisplayTareaAsync(sesion.tareaId);
      ttActualizarKPIsProyecto(sesion.proyectoId);
    });
  }

  var tid = gnTimer.tareaId;
  var pid = gnTimer.proyectoId;
  document.querySelectorAll('.tt-btn-iniciar').forEach(function(b){
    b.classList.remove('tt-running');
    b.innerHTML = '<i class="ph ph-play"></i>';
    b.title = 'Iniciar timer';
  });
  gnTimer.segundosAcumulados = 0;
  ttActualizarBarraGlobal();
  if (typeof window.showToast === 'function') window.showToast({ type:'info', title:'Timer pausado. Sesión guardada.' });
}

function ttDetener(tareaId, proyectoId) {
  if (!gnTimer.activo || gnTimer.tareaId !== tareaId) return;
  clearInterval(gnTimer.intervalo);
  gnTimer.activo = false;

  if (gnTimer.segundosAcumulados > 5) {
    var sesion = {
      tareaId:    tareaId,
      proyectoId: proyectoId,
      inicio:     gnTimer.inicio,
      fin:        new Date().toISOString(),
      segundos:   gnTimer.segundosAcumulados,
      descripcion: '',
      manual:     false
    };
    ttGuardarSesion(sesion).then(function(){
      ttActualizarDisplayTareaAsync(tareaId);
      ttActualizarKPIsProyecto(proyectoId);
      ttRenderSesionesAsync(proyectoId, tareaId);
    });
  }

  gnTimer = { activo: false, tareaId: null, proyectoId: null, inicio: null, intervalo: null, segundosAcumulados: 0 };
  document.querySelectorAll('.tt-btn-iniciar').forEach(function(b){
    b.classList.remove('tt-running');
    b.innerHTML = '<i class="ph ph-play"></i>';
    b.title = 'Iniciar timer';
  });
  ttActualizarBarraGlobal();
  if (typeof window.showToast === 'function') window.showToast({ type:'success', title:'Sesión guardada en Supabase' });
}

// ---------- Tiempo Manual ----------
function ttRegistrarManual(tareaId, proyectoId) {
  var modal = document.getElementById('tt-modal-manual');
  if (!modal) return;
  modal.dataset.tareaId = tareaId;
  modal.dataset.proyectoId = proyectoId;
  modal.style.display = 'flex';
  var fechaEl = document.getElementById('tt-manual-fecha');
  if (fechaEl) fechaEl.value = new Date().toISOString().split('T')[0];
  ['tt-manual-horas','tt-manual-min','tt-manual-desc'].forEach(function(id){
    var el = document.getElementById(id); if (el) el.value = '';
  });
}

function ttGuardarManual() {
  var modal = document.getElementById('tt-modal-manual');
  if (!modal) return;
  var tareaId    = modal.dataset.tareaId;
  var proyectoId = modal.dataset.proyectoId;
  var horas  = parseInt(document.getElementById('tt-manual-horas').value) || 0;
  var mins   = parseInt(document.getElementById('tt-manual-min').value) || 0;
  var desc   = document.getElementById('tt-manual-desc').value.trim();
  var fecha  = document.getElementById('tt-manual-fecha').value || new Date().toISOString().split('T')[0];
  var seg    = (horas * 3600) + (mins * 60);

  if (seg < 60) {
    if (typeof window.showToast === 'function') window.showToast({ type:'warning', title:'Ingresa al menos 1 minuto' });
    return;
  }

  var inicio = new Date(fecha + 'T09:00:00').toISOString();
  var fin    = new Date(new Date(inicio).getTime() + seg * 1000).toISOString();
  var sesion = { tareaId: tareaId, proyectoId: proyectoId, inicio: inicio, fin: fin, segundos: seg, descripcion: desc, manual: true };

  ttGuardarSesion(sesion).then(function(){
    modal.style.display = 'none';
    ttActualizarDisplayTareaAsync(tareaId);
    ttActualizarKPIsProyecto(proyectoId);
    ttRenderSesionesAsync(proyectoId, tareaId);
    if (typeof window.showToast === 'function') window.showToast({ type:'success', title:'Tiempo registrado manualmente' });
  });
}

function ttCerrarModalManual() {
  var modal = document.getElementById('tt-modal-manual');
  if (modal) modal.style.display = 'none';
}

// ---------- Eliminar sesión ----------
async function ttEliminarSesion(proyectoId, sesionId, tareaId) {
  if (!confirm('¿Eliminar esta sesión de tiempo?')) return;

  // Supabase delete
  await _ttSbDelete(sesionId);
  // Limpiar caché
  if (_ttCache[proyectoId]) {
    _ttCache[proyectoId] = _ttCache[proyectoId].filter(function(s){ return s.id !== sesionId; });
  }
  // Limpiar localStorage por si acaso
  _ttLSDel(proyectoId, sesionId);

  ttActualizarDisplayTareaAsync(tareaId);
  ttRenderSesionesAsync(proyectoId, tareaId);
  ttActualizarKPIsProyecto(proyectoId);
  if (typeof window.showToast === 'function') window.showToast({ type:'info', title:'Sesión eliminada' });
}

// ---------- UI: display en tarjeta (async) ----------
function ttActualizarDisplayTareaAsync(tareaId) {
  ttGetTareaHoras(
    (gnTimer.activo && gnTimer.tareaId === tareaId ? gnTimer.proyectoId : null) ||
    (document.querySelector('.tt-display[data-tarea-id="' + tareaId + '"]') || {}).dataset && document.querySelector('.tt-display[data-tarea-id="' + tareaId + '"]').dataset.proyectoId,
    tareaId
  ).then(function(totalSeg){
    var el = document.querySelector('.tt-display[data-tarea-id="' + tareaId + '"]');
    if (el) el.textContent = ttFormatoHMS(totalSeg);
    _ttActualizarBarra(tareaId, totalSeg);
  }).catch(function(){});
}

function ttActualizarDisplayTarea(tareaId) {
  // Versión síncrona usando caché en memoria (para el setInterval)
  var el = document.querySelector('.tt-display[data-tarea-id="' + tareaId + '"]');
  if (!el) return;
  var proyectoId = el.dataset.proyectoId;
  var cached = _ttCache[proyectoId] || [];
  var totalBase = cached
    .filter(function(s){ return s.tareaId === tareaId; })
    .reduce(function(acc, s){ return acc + s.segundos; }, 0);
  var live = (gnTimer.activo && gnTimer.tareaId === tareaId) ? gnTimer.segundosAcumulados : 0;
  el.textContent = ttFormatoHMS(totalBase + live);
  _ttActualizarBarra(tareaId, totalBase + live);
}

function _ttActualizarBarra(tareaId, totalSeg) {
  var barEl = document.querySelector('.tt-progress-bar[data-tarea-id="' + tareaId + '"]');
  var estEl = document.querySelector('.tt-estimado[data-tarea-id="' + tareaId + '"]');
  if (barEl && estEl) {
    var estimadoSeg = parseFloat(estEl.dataset.estimado || 0) * 3600;
    if (estimadoSeg > 0) {
      var pct = Math.min(100, Math.round((totalSeg / estimadoSeg) * 100));
      barEl.style.width = pct + '%';
      barEl.style.background = pct >= 100 ? '#F87171' : pct >= 80 ? '#C5A253' : '#2D8B5E';
    }
  }
}

// ---------- Barra flotante global ----------
function ttActualizarBarraGlobal() {
  var barra = document.getElementById('tt-barra-global');
  if (!barra) return;
  if (!gnTimer.activo) { barra.style.display = 'none'; return; }
  barra.style.display = 'flex';
  var cached = (_ttCache[gnTimer.proyectoId] || []);
  var base = cached
    .filter(function(s){ return s.tareaId === gnTimer.tareaId; })
    .reduce(function(acc, s){ return acc + s.segundos; }, 0);
  var tiempoEl = document.getElementById('tt-global-tiempo');
  if (tiempoEl) tiempoEl.textContent = ttFormatoHMS(base + gnTimer.segundosAcumulados);
  var nombreEl = document.querySelector('.tt-tarea-nombre[data-tarea-id="' + gnTimer.tareaId + '"]');
  var globalNombre = document.getElementById('tt-global-nombre');
  if (globalNombre) globalNombre.textContent = nombreEl ? nombreEl.textContent : 'Tarea activa';
}

// ---------- Render sesiones de tarea (async) ----------
function ttRenderSesionesAsync(proyectoId, tareaId) {
  var contenedor = document.getElementById('tt-sesiones-' + tareaId);
  if (!contenedor) return;
  // Invalidar caché para forzar recarga
  delete _ttCache[proyectoId];
  ttGetSesionesProyecto(proyectoId).then(function(sesiones){
    var tareaItems = sesiones.filter(function(s){ return s.tareaId === tareaId; });
    if (!tareaItems.length) { contenedor.innerHTML = '<p class="tt-empty">Sin sesiones registradas aún.</p>'; return; }
    var html = '';
    tareaItems.forEach(function(s){
      var fechaStr = new Date(s.inicio).toLocaleDateString('es-PA', { day:'2-digit', month:'short', year:'numeric' });
      html += '<div class="tt-sesion-item">';
      html += '<span class="tt-sesion-fecha">' + fechaStr + '</span>';
      html += '<span class="tt-sesion-dur">' + ttFormatoHMS(s.segundos) + '</span>';
      html += '<span class="tt-sesion-desc">' + (s.descripcion || (s.manual ? 'Manual' : 'Automático')) + '</span>';
      html += '<button class="tt-sesion-del" onclick="ttEliminarSesion(&#39;' + proyectoId + '&#39;,&#39;' + s.id + '&#39;,&#39;' + tareaId + '&#39;)" title="Eliminar"><i class="ph ph-trash"></i></button>';
      html += '</div>';
    });
    contenedor.innerHTML = html;
  });
}

function ttToggleSesiones(tareaId) {
  var panel = document.getElementById('tt-sesiones-' + tareaId);
  if (!panel) return;
  var visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'block';
  if (!visible) {
    var displayEl = document.querySelector('.tt-display[data-tarea-id="' + tareaId + '"]');
    var proyectoId = displayEl ? displayEl.dataset.proyectoId : null;
    if (proyectoId) ttRenderSesionesAsync(proyectoId, tareaId);
  }
}

// ---------- KPIs del proyecto ----------
function ttActualizarKPIsProyecto(proyectoId) {
  if (!proyectoId) return;
  ttGetProyectoTotalSeg(proyectoId).then(function(totalSeg){
    var kpiEl     = document.getElementById('tt-kpi-total');
    var kpiHrsEl  = document.getElementById('tt-kpi-horas');
    var kpiValorEl = document.getElementById('tt-kpi-valor');
    if (!kpiEl) return;
    kpiEl.textContent = ttFormatoHMS(totalSeg);
    if (kpiHrsEl) kpiHrsEl.textContent = ttHorasDecimal(totalSeg) + ' hrs';
    if (kpiValorEl) {
      var presupEl = document.getElementById('resumen-kpi-presupuesto');
      var presup = presupEl ? parseFloat(presupEl.textContent.replace(/[^0-9.]/g,'')) || 0 : 0;
      var hrs = ttHorasDecimal(totalSeg);
      kpiValorEl.textContent = hrs > 0 && presup > 0 ? 'USD ' + (presup / hrs).toFixed(2) + '/hr' : '—';
    }
  });
}

// ---------- Render panel KPIs ----------
function ttRenderPanelEnTareas(proyectoId) {
  var contenedor = document.getElementById('tt-panel-proyecto');
  if (!contenedor) return;
  // Invalidar caché al abrir nuevo proyecto
  delete _ttCache[proyectoId];
  contenedor.innerHTML =
    '<div class="tt-kpi-row">' +
      '<div class="tt-kpi-card"><div class="tt-kpi-icon"><i class="ph ph-clock"></i></div><div><div class="tt-kpi-value" id="tt-kpi-total">00:00:00</div><div class="tt-kpi-label">Tiempo Total</div></div></div>' +
      '<div class="tt-kpi-card"><div class="tt-kpi-icon"><i class="ph ph-hourglass"></i></div><div><div class="tt-kpi-value" id="tt-kpi-horas">0 hrs</div><div class="tt-kpi-label">Horas Decimales</div></div></div>' +
      '<div class="tt-kpi-card"><div class="tt-kpi-icon"><i class="ph ph-currency-dollar"></i></div><div><div class="tt-kpi-value" id="tt-kpi-valor">—</div><div class="tt-kpi-label">Valor / Hora (est.)</div></div></div>' +
    '</div>';
  ttActualizarKPIsProyecto(proyectoId);
}

// ---------- HTML controles de tarea ----------
function ttControlsHTML(tareaId, proyectoId, estimadoHrs) {
  estimadoHrs = estimadoHrs || 0;
  // Obtener total de caché sincrónico (se actualiza al abrir el proyecto)
  var cached = (_ttCache[proyectoId] || []);
  var totalSeg = cached
    .filter(function(s){ return s.tareaId === tareaId; })
    .reduce(function(acc, s){ return acc + s.segundos; }, 0);
  var isRunning = gnTimer.activo && gnTimer.tareaId === tareaId;

  var html = '<div class="tt-controls" data-tarea-id="' + tareaId + '">';
  html += '<div class="tt-controls-row">';
  html += '<span class="tt-label"><i class="ph ph-clock"></i> Tiempo:</span>';
  html += '<span class="tt-display" data-tarea-id="' + tareaId + '" data-proyecto-id="' + proyectoId + '">' + ttFormatoHMS(totalSeg + (isRunning ? gnTimer.segundosAcumulados : 0)) + '</span>';
  html += '<button class="tt-btn-iniciar' + (isRunning ? ' tt-running' : '') + '" title="' + (isRunning ? 'Pausar' : 'Iniciar') + ' timer" onclick="ttIniciar(&#39;' + tareaId + '&#39;,&#39;' + proyectoId + '&#39;,this)"><i class="ph ph-' + (isRunning ? 'pause' : 'play') + '"></i></button>';
  html += '<button class="tt-btn-stop" title="Detener y guardar" onclick="ttDetener(&#39;' + tareaId + '&#39;,&#39;' + proyectoId + '&#39;)"><i class="ph ph-stop"></i></button>';
  html += '<button class="tt-btn-manual" title="Registrar tiempo manual" onclick="ttRegistrarManual(&#39;' + tareaId + '&#39;,&#39;' + proyectoId + '&#39;)"><i class="ph ph-pencil-simple"></i></button>';
  html += '<button class="tt-btn-log" title="Ver sesiones" onclick="ttToggleSesiones(&#39;' + tareaId + '&#39;)"><i class="ph ph-list"></i></button>';
  html += '</div>';
  if (estimadoHrs > 0) {
    html += '<div class="tt-progress-wrap"><div class="tt-progress-track"><div class="tt-progress-bar" data-tarea-id="' + tareaId + '" style="width:0%"></div></div><span class="tt-estimado" data-tarea-id="' + tareaId + '" data-estimado="' + estimadoHrs + '">' + estimadoHrs + 'h est.</span></div>';
  }
  html += '<div class="tt-sesiones-panel" id="tt-sesiones-' + tareaId + '" style="display:none;"></div>';
  html += '</div>';
  return html;
}

// ---------- Exportar CSV ----------
async function ttExportarReporte(proyectoId) {
  if (!proyectoId) {
    if (typeof window.showToast === 'function') window.showToast({ type:'warning', title:'Abre un proyecto primero' });
    return;
  }
  // Forzar recarga desde Supabase
  delete _ttCache[proyectoId];
  var sesiones = await ttGetSesionesProyecto(proyectoId);
  if (!sesiones.length) {
    if (typeof window.showToast === 'function') window.showToast({ type:'warning', title:'No hay sesiones para exportar' });
    return;
  }
  var csv = 'Fecha,Tarea ID,Duracion (hh:mm:ss),Horas,Descripcion,Tipo\n';
  sesiones.forEach(function(s){
    var fecha = new Date(s.inicio).toLocaleDateString('es-PA');
    csv += '"' + fecha + '","' + s.tareaId + '","' + ttFormatoHMS(s.segundos) + '","' + ttHorasDecimal(s.segundos) + '","' + (s.descripcion || '') + '","' + (s.manual ? 'Manual' : 'Automatico') + '"\n';
  });
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'reporte-tiempo-' + proyectoId + '-' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  if (typeof window.showToast === 'function') window.showToast({ type:'success', title:'Reporte exportado como CSV' });
}
