/* ============================================================
   GN Studio OS — Time Tracking Module
   Autor: GN Studio | Integra con proyectos.js y storage.js
   ============================================================ */

// ---------- Estado global del timer ----------
let gnTimer = {
  activo: false,
  tareaId: null,
  proyectoId: null,
  inicio: null,
  intervalo: null,
  segundosAcumulados: 0
};

// ---------- Utilidades de tiempo ----------
function ttFormatoHMS(segundos) {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function ttSegundosDesde(isoString) {
  return Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
}

function ttHorasDecimal(segundos) {
  return parseFloat((segundos / 3600).toFixed(2));
}

// ---------- Persistencia (localStorage) ----------
function ttGetSesiones(proyectoId) {
  const raw = localStorage.getItem(`gn_tt_sesiones_${proyectoId}`);
  return raw ? JSON.parse(raw) : [];
}

function ttSaveSesiones(proyectoId, sesiones) {
  localStorage.setItem(`gn_tt_sesiones_${proyectoId}`, JSON.stringify(sesiones));
}

function ttGetTareaHoras(proyectoId, tareaId) {
  const sesiones = ttGetSesiones(proyectoId);
  return sesiones.filter(s => s.tareaId === tareaId).reduce((acc, s) => acc + s.segundos, 0);
}

function ttGetProyectoTotalSeg(proyectoId) {
  return ttGetSesiones(proyectoId).reduce((acc, s) => acc + s.segundos, 0);
}

// ---------- Control del Timer ----------
function ttIniciar(tareaId, proyectoId, btnEl) {
  if (gnTimer.activo) {
    // Si hay un timer activo en otra tarea, detenerlo primero
    if (gnTimer.tareaId !== tareaId) {
      ttDetener(gnTimer.tareaId, gnTimer.proyectoId, false);
    } else {
      // Pausar el mismo timer
      ttPausar();
      return;
    }
  }

  gnTimer.activo = true;
  gnTimer.tareaId = tareaId;
  gnTimer.proyectoId = proyectoId;
  gnTimer.inicio = new Date().toISOString();
  gnTimer.segundosAcumulados = 0;

  // Actualizar botón activo
  document.querySelectorAll('.tt-btn-iniciar').forEach(b => {
    b.classList.remove('tt-running');
    b.innerHTML = '<i class="ph ph-play"></i>';
    b.title = 'Iniciar timer';
  });
  if (btnEl) {
    btnEl.classList.add('tt-running');
    btnEl.innerHTML = '<i class="ph ph-pause"></i>';
    btnEl.title = 'Pausar timer';
  }

  // Iniciar intervalo
  gnTimer.intervalo = setInterval(() => {
    gnTimer.segundosAcumulados++;
    ttActualizarDisplayTarea(tareaId);
    ttActualizarBarraGlobal();
  }, 1000);

  ttActualizarBarraGlobal();
  gnMostrarToast('Timer iniciado', 'success');
}

function ttPausar() {
  if (!gnTimer.activo) return;
  clearInterval(gnTimer.intervalo);
  gnTimer.activo = false;

  // Guardar sesión parcial
  if (gnTimer.segundosAcumulados > 5) {
    const sesiones = ttGetSesiones(gnTimer.proyectoId);
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

  document.querySelectorAll('.tt-btn-iniciar').forEach(b => {
    b.classList.remove('tt-running');
    b.innerHTML = '<i class="ph ph-play"></i>';
    b.title = 'Iniciar timer';
  });

  ttActualizarBarraGlobal();
  ttActualizarDisplayTarea(gnTimer.tareaId);
  gnMostrarToast('Timer pausado', 'info');
}

function ttDetener(tareaId, proyectoId, mostrarToast = true) {
  if (gnTimer.activo && gnTimer.tareaId === tareaId) {
    clearInterval(gnTimer.intervalo);
    gnTimer.activo = false;

    if (gnTimer.segundosAcumulados > 5) {
      const sesiones = ttGetSesiones(proyectoId);
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

    document.querySelectorAll('.tt-btn-iniciar').forEach(b => {
      b.classList.remove('tt-running');
      b.innerHTML = '<i class="ph ph-play"></i>';
      b.title = 'Iniciar timer';
    });

    ttActualizarBarraGlobal();
    ttActualizarDisplayTarea(tareaId);
    if (mostrarToast) gnMostrarToast('Sesión guardada', 'success');
  }

  ttRenderSesiones(proyectoId, tareaId);
}

// ---------- Registrar tiempo manual ----------
function ttRegistrarManual(tareaId, proyectoId) {
  const modal = document.getElementById('tt-modal-manual');
  if (modal) {
    modal.dataset.tareaId = tareaId;
    modal.dataset.proyectoId = proyectoId;
    modal.style.display = 'flex';
    document.getElementById('tt-manual-horas').value = '';
    document.getElementById('tt-manual-min').value = '';
    document.getElementById('tt-manual-desc').value = '';
    const fechaEl = document.getElementById('tt-manual-fecha');
    if (fechaEl) fechaEl.value = new Date().toISOString().split('T')[0];
  }
}

function ttGuardarManual() {
  const modal = document.getElementById('tt-modal-manual');
  const tareaId = modal.dataset.tareaId;
  const proyectoId = modal.dataset.proyectoId;
  const horas = parseInt(document.getElementById('tt-manual-horas').value) || 0;
  const mins = parseInt(document.getElementById('tt-manual-min').value) || 0;
  const desc = document.getElementById('tt-manual-desc').value.trim();
  const fecha = document.getElementById('tt-manual-fecha').value || new Date().toISOString().split('T')[0];

  const segundos = (horas * 3600) + (mins * 60);
  if (segundos < 60) {
    gnMostrarToast('Ingresa al menos 1 minuto', 'error');
    return;
  }

  const inicio = new Date(fecha + 'T09:00:00').toISOString();
  const fin = new Date(new Date(inicio).getTime() + segundos * 1000).toISOString();

  const sesiones = ttGetSesiones(proyectoId);
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
  gnMostrarToast('Tiempo registrado manualmente', 'success');
}

function ttCerrarModalManual() {
  const modal = document.getElementById('tt-modal-manual');
  if (modal) modal.style.display = 'none';
}

// ---------- Eliminar sesión ----------
function ttEliminarSesion(proyectoId, sesionId, tareaId) {
  if (!confirm('¿Eliminar esta sesión de tiempo?')) return;
  let sesiones = ttGetSesiones(proyectoId);
  sesiones = sesiones.filter(s => s.id !== sesionId);
  ttSaveSesiones(proyectoId, sesiones);
  ttActualizarDisplayTarea(tareaId);
  ttRenderSesiones(proyectoId, tareaId);
  ttActualizarKPIsProyecto(proyectoId);
  gnMostrarToast('Sesión eliminada', 'info');
}

// ---------- UI: actualizar display de tiempo en tarjeta de tarea ----------
function ttActualizarDisplayTarea(tareaId) {
  const el = document.querySelector(`.tt-display[data-tarea-id="${tareaId}"]`);
  if (!el) return;
  const proyectoId = el.dataset.proyectoId;
  let total = ttGetTareaHoras(proyectoId, tareaId);
  if (gnTimer.activo && gnTimer.tareaId === tareaId) total += gnTimer.segundosAcumulados;
  el.textContent = ttFormatoHMS(total);

  // Barra de progreso vs estimado
  const barEl = document.querySelector(`.tt-progress-bar[data-tarea-id="${tareaId}"]`);
  const estimadoEl = document.querySelector(`.tt-estimado[data-tarea-id="${tareaId}"]`);
  if (barEl && estimadoEl) {
    const estimadoSeg = parseInt(estimadoEl.dataset.estimado || 0) * 3600;
    if (estimadoSeg > 0) {
      const pct = Math.min(100, Math.round((total / estimadoSeg) * 100));
      barEl.style.width = pct + '%';
      barEl.style.background = pct >= 100 ? '#F87171' : pct >= 80 ? '#C5A253' : '#2D8B5E';
    }
  }
}

// ---------- UI: barra flotante global ----------
function ttActualizarBarraGlobal() {
  let barra = document.getElementById('tt-barra-global');
  if (!barra) return;
  if (!gnTimer.activo) {
    barra.style.display = 'none';
    return;
  }
  barra.style.display = 'flex';
  const total = ttGetTareaHoras(gnTimer.proyectoId, gnTimer.tareaId) + gnTimer.segundosAcumulados;
  barra.querySelector('#tt-global-tiempo').textContent = ttFormatoHMS(total);
  const nombreEl = document.querySelector(`.tt-tarea-nombre[data-tarea-id="${gnTimer.tareaId}"]`);
  barra.querySelector('#tt-global-nombre').textContent = nombreEl ? nombreEl.textContent : 'Tarea activa';
}

// ---------- Render panel de sesiones de una tarea ----------
function ttRenderSesiones(proyectoId, tareaId) {
  const contenedor = document.getElementById(`tt-sesiones-${tareaId}`);
  if (!contenedor) return;
  const sesiones = ttGetSesiones(proyectoId).filter(s => s.tareaId === tareaId);
  if (sesiones.length === 0) {
    contenedor.innerHTML = '<p class="tt-empty">Sin sesiones registradas aún.</p>';
    return;
  }
  contenedor.innerHTML = sesiones.map(s => {
    const fechaStr = new Date(s.inicio).toLocaleDateString('es-PA', { day:'2-digit', month:'short', year:'numeric' });
    return `
      <div class="tt-sesion-item">
        <span class="tt-sesion-fecha">${fechaStr}</span>
        <span class="tt-sesion-dur">${ttFormatoHMS(s.segundos)}</span>
        <span class="tt-sesion-desc">${s.descripcion || (s.manual ? 'Manual' : 'Automático')}</span>
        <button class="tt-sesion-del" onclick="ttEliminarSesion('${proyectoId}','${s.id}','${tareaId}')" title="Eliminar"><i class="ph ph-trash"></i></button>
      </div>`;
  }).join('');
}

// ---------- KPIs del proyecto (panel superior del tab Tareas) ----------
function ttActualizarKPIsProyecto(proyectoId) {
  const kpiEl = document.getElementById('tt-kpi-total');
  const kpiHrsEl = document.getElementById('tt-kpi-horas');
  const kpiValorEl = document.getElementById('tt-kpi-valor');
  if (!kpiEl) return;

  const totalSeg = ttGetProyectoTotalSeg(proyectoId);
  kpiEl.textContent = ttFormatoHMS(totalSeg);
  if (kpiHrsEl) kpiHrsEl.textContent = ttHorasDecimal(totalSeg) + ' hrs';

  // Calcular valor por hora basado en presupuesto del proyecto
  const presupEl = document.getElementById('resumen-kpi-presupuesto');
  if (kpiValorEl && presupEl) {
    const presup = parseFloat(presupEl.textContent.replace(/[^0-9.]/g, '')) || 0;
    const horas = ttHorasDecimal(totalSeg);
    const valorHora = horas > 0 ? (presup / horas).toFixed(2) : '—';
    kpiValorEl.textContent = horas > 0 ? `USD ${valorHora}/hr` : '—';
  }
}

// ---------- Render completo del panel de Time Tracking ----------
function ttRenderPanelEnTareas(proyectoId, tareas) {
  // Este panel se inserta dentro del tab Tareas del proyecto
  const contenedor = document.getElementById('tt-panel-proyecto');
  if (!contenedor) return;

  contenedor.innerHTML = `
    <!-- KPIs de tiempo -->
    <div class="tt-kpi-row">
      <div class="tt-kpi-card">
        <div class="tt-kpi-icon"><i class="ph ph-clock"></i></div>
        <div>
          <div class="tt-kpi-value" id="tt-kpi-total">00:00:00</div>
          <div class="tt-kpi-label">Tiempo Total</div>
        </div>
      </div>
      <div class="tt-kpi-card">
        <div class="tt-kpi-icon"><i class="ph ph-hourglass"></i></div>
        <div>
          <div class="tt-kpi-value" id="tt-kpi-horas">0 hrs</div>
          <div class="tt-kpi-label">Horas Decimales</div>
        </div>
      </div>
      <div class="tt-kpi-card">
        <div class="tt-kpi-icon"><i class="ph ph-currency-dollar"></i></div>
        <div>
          <div class="tt-kpi-value" id="tt-kpi-valor">—</div>
          <div class="tt-kpi-label">Valor / Hora (est.)</div>
        </div>
      </div>
    </div>
  `;

  ttActualizarKPIsProyecto(proyectoId);
}

// ---------- HTML de controles para inyectar en cada tarjeta de tarea ----------
function ttControlsHTML(tareaId, proyectoId, estimadoHrs = 0) {
  const totalSeg = ttGetTareaHoras(proyectoId, tareaId);
  const isRunning = gnTimer.activo && gnTimer.tareaId === tareaId;
  return `
    <div class="tt-controls" data-tarea-id="${tareaId}">
      <div class="tt-controls-row">
        <span class="tt-label"><i class="ph ph-clock"></i> Tiempo:</span>
        <span class="tt-display" data-tarea-id="${tareaId}" data-proyecto-id="${proyectoId}">${ttFormatoHMS(totalSeg + (isRunning ? gnTimer.segundosAcumulados : 0))}</span>
        <button class="tt-btn-iniciar ${isRunning ? 'tt-running' : ''}" 
                title="${isRunning ? 'Pausar' : 'Iniciar'} timer"
                onclick="ttIniciar('${tareaId}','${proyectoId}', this)">
          <i class="ph ph-${isRunning ? 'pause' : 'play'}"></i>
        </button>
        <button class="tt-btn-stop" title="Detener y guardar" onclick="ttDetener('${tareaId}','${proyectoId}')">
          <i class="ph ph-stop"></i>
        </button>
        <button class="tt-btn-manual" title="Registrar tiempo manual" onclick="ttRegistrarManual('${tareaId}','${proyectoId}')">
          <i class="ph ph-pencil-simple"></i>
        </button>
        <button class="tt-btn-log" title="Ver sesiones" onclick="ttToggleSesiones('${tareaId}')">
          <i class="ph ph-list"></i>
        </button>
      </div>
      ${estimadoHrs > 0 ? `
      <div class="tt-progress-wrap">
        <div class="tt-progress-track">
          <div class="tt-progress-bar" data-tarea-id="${tareaId}" style="width:0%"></div>
        </div>
        <span class="tt-estimado" data-tarea-id="${tareaId}" data-estimado="${estimadoHrs}">${estimadoHrs}h est.</span>
      </div>` : ''}
      <div class="tt-sesiones-panel" id="tt-sesiones-${tareaId}" style="display:none;"></div>
    </div>
  `;
}

function ttToggleSesiones(tareaId) {
  const panel = document.getElementById(`tt-sesiones-${tareaId}`);
  if (!panel) return;
  const visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'block';
  if (!visible) {
    const ctrlEl = document.querySelector(`.tt-controls[data-tarea-id="${tareaId}"]`);
    const proyectoId = ctrlEl ? document.querySelector(`.tt-display[data-tarea-id="${tareaId}"]`).dataset.proyectoId : null;
    if (proyectoId) ttRenderSesiones(proyectoId, tareaId);
  }
}

// ---------- Exportar reporte de tiempo del proyecto ----------
function ttExportarReporte(proyectoId) {
  const sesiones = ttGetSesiones(proyectoId);
  if (sesiones.length === 0) {
    gnMostrarToast('No hay sesiones para exportar', 'error');
    return;
  }

  let csv = 'Fecha,Tarea ID,Duración (hh:mm:ss),Horas,Descripción,Tipo\n';
  sesiones.forEach(s => {
    const fecha = new Date(s.inicio).toLocaleDateString('es-PA');
    csv += `"${fecha}","${s.tareaId}","${ttFormatoHMS(s.segundos)}","${ttHorasDecimal(s.segundos)}","${s.descripcion || ''}","${s.manual ? 'Manual' : 'Automático'}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-tiempo-${proyectoId}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  gnMostrarToast('Reporte exportado como CSV', 'success');
}
