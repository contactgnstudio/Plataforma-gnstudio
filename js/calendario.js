/**
 * calendario.js — GN Studio OS
 * Módulo de calendario de proyectos por fecha de inicio / finalización
 */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────
     Estado interno
  ────────────────────────────────────────────── */
  let _hoy        = new Date();
  let _anio       = _hoy.getFullYear();
  let _mes        = _hoy.getMonth(); // 0-based
  let _popoverAbierto = null;

  /* ──────────────────────────────────────────────
     Helpers de fecha
  ────────────────────────────────────────────── */
  function fechaStr(d) {
    // Devuelve 'YYYY-MM-DD' de un objeto Date
    return d.toISOString().slice(0, 10);
  }

  function parseISO(str) {
    if (!str) return null;
    // Soporta 'YYYY-MM-DD' y timestamps
    const d = new Date(str);
    return isNaN(d) ? null : d;
  }

  function mismo_dia(d, anio, mes, dia) {
    if (!d) return false;
    return d.getFullYear() === anio && d.getMonth() === mes && d.getDate() === dia;
  }

  /* ──────────────────────────────────────────────
     Obtener proyectos desde Supabase / storage
  ────────────────────────────────────────────── */
  async function obtenerProyectos() {
    try {
      // Intentar via función global que ya usa el sistema
      if (typeof window.cargarProyectosData === 'function') {
        return await window.cargarProyectosData();
      }
      // Fallback: leer desde supabase directo si está disponible
      if (window._supabase) {
        const { data } = await window._supabase.from('proyectos').select('*');
        return data || [];
      }
      // Fallback local storage
      if (typeof window.getProyectos === 'function') {
        return window.getProyectos();
      }
      return [];
    } catch (e) {
      console.warn('[Calendario] No se pudieron cargar proyectos:', e);
      return [];
    }
  }

  /* ──────────────────────────────────────────────
     Mapear proyectos a días del mes actual
  ────────────────────────────────────────────── */
  function mapearProyectosPorDia(proyectos, anio, mes) {
    const mapa = {}; // { 'YYYY-MM-DD': [{ id, nombre, estado, tipo:'inicio'|'fin' }] }

    proyectos.forEach(p => {
      const nombre = p.nombre || p.name || 'Sin nombre';
      const estado = p.estado || p.status || '';

      const campoInicio = p.fecha_inicio || p.fecha || p.start_date || p.created_at;
      const campoFin    = p.fecha_fin    || p.fecha_entrega || p.end_date || p.fecha_limite;

      const dInicio = parseISO(campoInicio);
      const dFin    = parseISO(campoFin);

      // Solo días dentro del mes visible
      const diasMes = new Date(anio, mes + 1, 0).getDate();
      for (let d = 1; d <= diasMes; d++) {
        if (mismo_dia(dInicio, anio, mes, d)) {
          const key = `${anio}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          if (!mapa[key]) mapa[key] = [];
          mapa[key].push({ id: p.id, nombre, estado, tipo: 'inicio' });
        }
        if (mismo_dia(dFin, anio, mes, d)) {
          const key = `${anio}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          if (!mapa[key]) mapa[key] = [];
          // Evitar duplicado si inicio == fin
          const yaExiste = mapa[key].some(x => x.id === p.id && x.tipo === 'fin');
          if (!yaExiste) mapa[key].push({ id: p.id, nombre, estado, tipo: 'fin' });
        }
      }
    });
    return mapa;
  }

  /* ──────────────────────────────────────────────
     Color de estado
  ────────────────────────────────────────────── */
  function colorEstado(estado) {
    const e = (estado || '').toLowerCase();
    if (e.includes('complet') || e.includes('entregad')) return '#2D8B5E';
    if (e.includes('progres') || e.includes('activ'))   return '#C5A253';
    if (e.includes('pausa') || e.includes('espera'))    return '#94a3b8';
    if (e.includes('cancel'))                           return '#F87171';
    return '#C5A253';
  }

  /* ──────────────────────────────────────────────
     Renderizar el calendario
  ────────────────────────────────────────────── */
  async function renderCalendario() {
    const contenedor = document.getElementById('cal-grid');
    const tituloEl   = document.getElementById('cal-titulo');
    if (!contenedor) return;

    const proyectos = await obtenerProyectos();
    const mapa      = mapearProyectosPorDia(proyectos, _anio, _mes);

    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    if (tituloEl) tituloEl.textContent = `${meses[_mes]} ${_anio}`;

    const primerDia  = new Date(_anio, _mes, 1).getDay(); // 0=Dom
    const diasMes    = new Date(_anio, _mes + 1, 0).getDate();
    const hoyStr     = fechaStr(_hoy);

    let html = '';
    // Cabeceras
    ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].forEach(d => {
      html += `<div class="cal-header-day">${d}</div>`;
    });

    // Celdas vacías al inicio
    for (let i = 0; i < primerDia; i++) {
      html += `<div class="cal-cell cal-cell-empty"></div>`;
    }

    // Días del mes
    for (let d = 1; d <= diasMes; d++) {
      const key    = `${_anio}-${String(_mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const items  = mapa[key] || [];
      const count  = items.length;
      const esHoy  = key === hoyStr;

      let badgesHTML = '';
      if (count > 0) {
        badgesHTML = `<button
          class="cal-badge"
          onclick="calAbrirPopover(event, '${key}')"
          title="${count} proyecto(s)"
        >${count}</button>`;
      }

      html += `<div class="cal-cell${esHoy ? ' cal-hoy' : ''}" data-fecha="${key}">
        <span class="cal-dia-num">${d}</span>
        ${badgesHTML}
      </div>`;
    }

    contenedor.innerHTML = html;
    // Guardar mapa para uso del popover
    window._calMapa = mapa;
  }

  /* ──────────────────────────────────────────────
     Popover con lista de proyectos del día
  ────────────────────────────────────────────── */
  window.calAbrirPopover = function (event, fecha) {
    event.stopPropagation();
    cerrarPopover();

    const items = (window._calMapa || {})[fecha] || [];
    if (!items.length) return;

    const [anio, mes, dia] = fecha.split('-');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const titulo = `${parseInt(dia)} ${meses[parseInt(mes)-1]} ${anio}`;

    let listHTML = items.map(item => {
      const color  = colorEstado(item.estado);
      const tipoLabel = item.tipo === 'inicio' ? '🚀 Inicio' : '🏁 Fin';
      return `<li class="cal-pop-item" onclick="calIrAProyecto('${item.id}')">
        <span class="cal-pop-dot" style="background:${color}"></span>
        <span class="cal-pop-nombre">${item.nombre}</span>
        <span class="cal-pop-tipo">${tipoLabel}</span>
      </li>`;
    }).join('');

    const pop = document.createElement('div');
    pop.className = 'cal-popover';
    pop.id = 'cal-popover';
    pop.innerHTML = `
      <div class="cal-pop-header">
        <strong><i class="ph ph-calendar"></i> ${titulo}</strong>
        <button class="cal-pop-close" onclick="calCerrarPopover()"><i class="ph ph-x"></i></button>
      </div>
      <ul class="cal-pop-list">${listHTML}</ul>
    `;

    // Posicionar relativo al botón que hizo click
    const btn  = event.currentTarget;
    const rect = btn.getBoundingClientRect();
    pop.style.position = 'fixed';
    pop.style.top  = (rect.bottom + 6) + 'px';
    pop.style.left = Math.min(rect.left, window.innerWidth - 260) + 'px';

    document.body.appendChild(pop);
    _popoverAbierto = pop;

    // Cerrar al hacer click fuera
    setTimeout(() => {
      document.addEventListener('click', cerrarPopoverFuera, { once: true });
    }, 10);
  };

  function cerrarPopoverFuera(e) {
    const pop = document.getElementById('cal-popover');
    if (pop && !pop.contains(e.target)) cerrarPopover();
  }

  window.calCerrarPopover = cerrarPopover;
  function cerrarPopover() {
    const pop = document.getElementById('cal-popover');
    if (pop) pop.remove();
    _popoverAbierto = null;
  }

  /* Navegar al proyecto desde el popover */
  window.calIrAProyecto = function (proyectoId) {
    cerrarPopover();
    // Usar la función existente del sistema
    if (typeof window.verDetalleProyecto === 'function') {
      window.verDetalleProyecto(proyectoId);
    } else if (typeof window.abrirDetalleProyecto === 'function') {
      window.abrirDetalleProyecto(proyectoId);
    } else {
      // Intentar click en la tabla de proyectos
      const fila = document.querySelector(`[data-proyecto-id="${proyectoId}"]`);
      if (fila) fila.click();
    }
  };

  /* ──────────────────────────────────────────────
     Navegación de meses
  ────────────────────────────────────────────── */
  window.calMesAnterior = function () {
    _mes--;
    if (_mes < 0) { _mes = 11; _anio--; }
    renderCalendario();
  };

  window.calMesSiguiente = function () {
    _mes++;
    if (_mes > 11) { _mes = 0; _anio++; }
    renderCalendario();
  };

  window.calHoy = function () {
    _hoy = new Date();
    _anio = _hoy.getFullYear();
    _mes  = _hoy.getMonth();
    renderCalendario();
  };

  /* ──────────────────────────────────────────────
     Init público
  ────────────────────────────────────────────── */
  window.initCalendario = function () {
    _hoy = new Date();
    _anio = _hoy.getFullYear();
    _mes  = _hoy.getMonth();
    renderCalendario();
  };

  window.refreshCalendario = renderCalendario;

})();
