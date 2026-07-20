/* ============================================================
   GN Studio OS — Time Tracking Module v1.0
   Gerald Flores | GN Studio
   ============================================================ */

// Estado global del timer
var gnTimer = {
  activo: false,
  tareaId: null,
  proyectoId: null,
  inicio: null,
  intervalo: null,
  segundosAcumulados: 0
};

// ---------- Utilidades ----------
function ttFormatoHMS(segundos) {
  segundos = Math.max(0, Math.floor(segundos));
  var h = Math.floor(segundos / 3600);
  var m = Math.floor((segundos % 3600) / 60);
  var s = segundos % 60;
  return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}

function ttHorasDecimal(segundos) {
  return parseFloat((segundos / 3600).toFixed(2));
}

// ---------- Persistencia localStorage ----------
function ttGetSesiones(proyectoId) {
  try {
    var raw = localStorage.getItem('gn_tt_sesiones_' + proyectoId);
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

function ttSaveSesiones(proyectoId, sesiones) {
  localStorage.setItem('gn_tt_sesiones_' + proyectoId, JSON.stringify(sesiones));
}

function ttGetTareaHoras(proyectoId, tareaId) {
  return ttGetSesiones(proyectoId)
    .filter(function(s){ return s.tareaId === tareaId; })
    .reduce(function(acc, s){ return acc + s.segundos; }, 0);
}

function ttGetProyectoTotalSeg(proyectoId) {
  return ttGetSesiones(proyectoId).reduce(function(acc, s){ return acc + s.segundos; }, 0);
}

// ---------- Control del Timer ----------
function ttIniciar(tareaId, proyectoId, btnEl) {
  // Si hay timer activo en otra tarea, pausar primero
  if (gnTimer.activo && gnTimer.tareaId !== tareaId) {
    ttPausar();
  }
  // Si el mismo timer está activo, pausar
  if (gnTimer.activo && gnTimer.tareaId === tareaId) {
    ttPausar();
    return;
  }

  gnTimer.activo = true;
  gnTimer.tareaId = tareaId;
  gnTimer.proyectoId = proyectoId;
  gnTimer.inicio = new Date().toISOString();
  gnTimer.segundosAcumulados = 0;

  // Resetear todos los botones
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
  if (typeof gnMostrarToast === 'function') gnMostrarToast('Timer iniciado', 'success');
  else if (typeof window.showToast === 'function') window.showToast({ type:'success', title:'Timer iniciado', message:'Registrando tiempo para la tarea.' });
}

function ttPausar() {
  if (!gnTimer.activo) return;
  clearInterval(gnTimer.intervalo);
  gnTimer.activo = false;

  if (gnTimer.segundosAcumulados > 5) {
    var sesiones = ttGetSesiones(gnTimer.proyectoId);
    sesiones.push({
      id: 'ses_' + Date.now(),
      tareaId: gnTimer.tareaId,
      inicio: gnTimer.inicio,
      fin: new Date().toISOString(),
      segundos: gnTimer.segundosAcumulados,
      descripcion: ''
    });
    ttSaveSesiones(gnTimer.proyectoId, sesiones);
  }

  var tid = gnTimer.tareaId;
  document.querySelectorAll('.tt-btn-iniciar').forEach(function(b){
    b.classList.remove('tt-running');
    b.innerHTML = '<i class="ph ph-play"></i>';
    b.title = 'Iniciar timer';
  });

  ttActualizarBarraGlobal();
  ttActualizarDisplayTarea(tid);
  ttActualizarKPIsProyecto(gnTimer.proyectoId);
  if (typeof gnMostrarToast === 'function') gnMostrarToast('Timer pausado', 'info');
  else if (typeof window.showToast === 'function') window.showToast({ type:'info', title:'Timer pausado' });
}

function ttDetener(tareaId, proyectoId, mostrarToast) {
  if (mostrarToast === undefined) mostrarToast = true;
  if (!gnTimer.activo || gnTimer.tareaId !== tareaId) return;

  clearInterval(gnTimer.intervalo);
  gnTimer.activo = false;

  if (gnTimer.segundosAcumulados > 5) {
    var sesiones = ttGetSesiones(proyectoId);
    sesiones.push({
      id: 'ses_' + Date.now(),
      tareaId: tareaId,
      inicio: gnTimer.inicio,
      fin: new Date().toISOString(),
      segundos: gnTimer.segundosAcumulados,
      descripcion: ''
    });
    ttSaveSesiones(proyectoId, sesiones);
  }

  gnTimer = { activo: false, tareaId: null, proyectoId: null, inicio: null, intervalo: null, segundosAcumulados: 0 };

  document.querySelectorAll('.tt-btn-iniciar').forEach(function(b){
    b.classList.remove('tt-running');
    b.innerHTML = '<i class="ph ph-play"></i>';
    b.title = 'Iniciar timer';
  });

  ttActualizarBarraGlobal();
  ttActualizarDisplayTarea(tareaId);
  ttActualizarKPIsProyecto(proyectoId);
  ttRenderSesiones(proyectoId, tareaId);

  if (mostrarToast) {
    if (typeof gnMostrarToast === 'function') gnMostrarToast('Sesión guardada', 'success');
    else if (typeof window.showToast === 'function') window.showToast({ type:'success', title:'Sesión guardada' });
  }
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
  var hEl = document.getElementById('tt-manual-horas');
  var mEl = document.getElementById('tt-manual-min');
  var dEl = document.getElementById('tt-manual-desc');
  if (hEl) hEl.value = '';
  if (mEl) mEl.value = '';
  if (dEl) dEl.value = '';
}

function ttGuardarManual() {
  var modal = document.getElementById('tt-modal-manual');
  if (!modal) return;
  var tareaId = modal.dataset.tareaId;
  var proyectoId = modal.dataset.proyectoId;
  var horas = parseInt(document.getElementById('tt-manual-horas').value) || 0;
  var mins = parseInt(document.getElementById('tt-manual-min').value) || 0;
  var desc = document.getElementById('tt-manual-desc').value.trim();
  var fecha = document.getElementById('tt-manual-fecha').value || new Date().toISOString().split('T')[0];

  var segundos = (horas * 3600) + (mins * 60);
  if (segundos < 60) {
    if (typeof gnMostrarToast === 'function') gnMostrarToast('Ingresa al menos 1 minuto', 'error');
    return;
  }

  var inicio = new Date(fecha + 'T09:00:00').toISOString();
  var fin = new Date(new Date(inicio).getTime() + segundos * 1000).toISOString();

  var sesiones = ttGetSesiones(proyectoId);
  sesiones.push({
    id: 'ses_' + Date.now(),
    tareaId: tareaId,
    inicio: inicio,
    fin: fin,
    segundos: segundos,
    descripcion: desc,
    manual: true
  });
  ttSaveSesiones(proyectoId, sesiones);
  modal.style.display = 'none';
  ttActualizarDisplayTarea(tareaId);
  ttRenderSesiones(proyectoId, tareaId);
  ttActualizarKPIsProyecto(proyectoId);
  if (typeof gnMostrarToast === 'function') gnMostrarToast('Tiempo registrado manualmente', 'success');
  else if (typeof window.showToast === 'function') window.showToast({ type:'success', title:'Tiempo registrado' });
}

function ttCerrarModalManual() {
  var modal = document.getElementById('tt-modal-manual');
  if (modal) modal.style.display = 'none';
}

// ---------- Eliminar sesión ----------
function ttEliminarSesion(proyectoId, sesionId, tareaId) {
  if (!confirm('¿Eliminar esta sesión de tiempo?')) return;
  var sesiones = ttGetSesiones(proyectoId).filter(function(s){ return s.id !== sesionId; });
  ttSaveSesiones(proyectoId, sesiones);
  ttActualizarDisplayTarea(tareaId);
  ttRenderSesiones(proyectoId, tareaId);
  ttActualizarKPIsProyecto(proyectoId);
  if (typeof gnMostrarToast === 'function') gnMostrarToast('Sesión eliminada', 'info');
}

// ---------- UI: display en tarjeta ----------
function ttActualizarDisplayTarea(tareaId) {
  var el = document.querySelector('.tt-display[data-tarea-id="' + tareaId + '"]');
  if (!el) return;
  var proyectoId = el.dataset.proyectoId;
  var total = ttGetTareaHoras(proyectoId, tareaId);
  if (gnTimer.activo && gnTimer.tareaId === tareaId) total += gnTimer.segundosAcumulados;
  el.textContent = ttFormatoHMS(total);

  var barEl = document.querySelector('.tt-progress-bar[data-tarea-id="' + tareaId + '"]');
  var estEl = document.querySelector('.tt-estimado[data-tarea-id="' + tareaId + '"]');
  if (barEl && estEl) {
    var estimadoSeg = parseFloat(estEl.dataset.estimado || 0) * 3600;
    if (estimadoSeg > 0) {
      var pct = Math.min(100, Math.round((total / estimadoSeg) * 100));
      barEl.style.width = pct + '%';
      barEl.style.background = pct >= 100 ? '#F87171' : pct >= 80 ? '#C5A253' : '#2D8B5E';
    }
  }
}

// ---------- UI: barra flotante ----------
function ttActualizarBarraGlobal() {
  var barra = document.getElementById('tt-barra-global');
  if (!barra) return;
  if (!gnTimer.activo) { barra.style.display = 'none'; return; }
  barra.style.display = 'flex';
  var total = ttGetTareaHoras(gnTimer.proyectoId, gnTimer.tareaId) + gnTimer.segundosAcumulados;
  var tiempoEl = document.getElementById('tt-global-tiempo');
  if (tiempoEl) tiempoEl.textContent = ttFormatoHMS(total);
  var nombreEl = document.querySelector('.tt-tarea-nombre[data-tarea-id="' + gnTimer.tareaId + '"]');
  var globalNombre = document.getElementById('tt-global-nombre');
  if (globalNombre) globalNombre.textContent = nombreEl ? nombreEl.textContent : 'Tarea activa';
}

// ---------- Render sesiones de tarea ----------
function ttRenderSesiones(proyectoId, tareaId) {
  var contenedor = document.getElementById('tt-sesiones-' + tareaId);
  if (!contenedor) return;
  var sesiones = ttGetSesiones(proyectoId).filter(function(s){ return s.tareaId === tareaId; });
  if (!sesiones.length) {
    contenedor.innerHTML = '<p class="tt-empty">Sin sesiones registradas aún.</p>';
    return;
  }
  var html = '';
  sesiones.forEach(function(s){
    var fechaStr = new Date(s.inicio).toLocaleDateString('es-PA', { day:'2-digit', month:'short', year:'numeric' });
    html += '<div class="tt-sesion-item">';
    html += '<span class="tt-sesion-fecha">' + fechaStr + '</span>';
    html += '<span class="tt-sesion-dur">' + ttFormatoHMS(s.segundos) + '</span>';
    html += '<span class="tt-sesion-desc">' + (s.descripcion || (s.manual ? 'Manual' : 'Automático')) + '</span>';
    html += '<button class="tt-sesion-del" onclick="ttEliminarSesion(&#39;' + proyectoId + '&#39;,&#39;' + s.id + '&#39;,&#39;' + tareaId + '&#39;)" title="Eliminar"><i class="ph ph-trash"></i></button>';
    html += '</div>';
  });
  contenedor.innerHTML = html;
}

// ---------- KPIs del proyecto ----------
function ttActualizarKPIsProyecto(proyectoId) {
  var kpiEl = document.getElementById('tt-kpi-total');
  var kpiHrsEl = document.getElementById('tt-kpi-horas');
  var kpiValorEl = document.getElementById('tt-kpi-valor');
  if (!kpiEl) return;
  var totalSeg = ttGetProyectoTotalSeg(proyectoId);
  kpiEl.textContent = ttFormatoHMS(totalSeg);
  if (kpiHrsEl) kpiHrsEl.textContent = ttHorasDecimal(totalSeg) + ' hrs';
  if (kpiValorEl) {
    var presupEl = document.getElementById('resumen-kpi-presupuesto');
    var presup = presupEl ? parseFloat(presupEl.textContent.replace(/[^0-9.]/g,'')) || 0 : 0;
    var horas = ttHorasDecimal(totalSeg);
    kpiValorEl.textContent = horas > 0 ? 'USD ' + (presup / horas).toFixed(2) + '/hr' : '—';
  }
}

// ---------- Render panel KPIs ----------
function ttRenderPanelEnTareas(proyectoId) {
  var contenedor = document.getElementById('tt-panel-proyecto');
  if (!contenedor) return;
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
  var totalSeg = ttGetTareaHoras(proyectoId, tareaId);
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

function ttToggleSesiones(tareaId) {
  var panel = document.getElementById('tt-sesiones-' + tareaId);
  if (!panel) return;
  var visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'block';
  if (!visible) {
    var displayEl = document.querySelector('.tt-display[data-tarea-id="' + tareaId + '"]');
    var proyectoId = displayEl ? displayEl.dataset.proyectoId : null;
    if (proyectoId) ttRenderSesiones(proyectoId, tareaId);
  }
}

// ---------- Exportar CSV ----------
function ttExportarReporte(proyectoId) {
  if (!proyectoId) {
    if (typeof gnMostrarToast === 'function') gnMostrarToast('Abre un proyecto primero', 'error');
    return;
  }
  var sesiones = ttGetSesiones(proyectoId);
  if (!sesiones.length) {
    if (typeof gnMostrarToast === 'function') gnMostrarToast('No hay sesiones para exportar', 'error');
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
  if (typeof gnMostrarToast === 'function') gnMostrarToast('Reporte exportado como CSV', 'success');
}
