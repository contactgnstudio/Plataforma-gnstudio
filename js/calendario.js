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
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  /**
   * Parsea una cadena de fecha a objeto Date.
   * - Si es solo 'YYYY-MM-DD' la trata como fecha LOCAL (no UTC).
   * - Si trae hora (ISO completo) la parsea normalmente y extrae
   *   año/mes/día en hora LOCAL para evitar el desplazamiento UTC.
   */
  function parseISO(str) {
    if (!str) return null;
    const s = String(str).trim();
    // Formato solo fecha: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    // Timestamp ISO con hora — construimos fecha local desde componentes UTC
    const raw = new Date(s);
    if (isNaN(raw.getTime())) return null;
    // Usamos UTC para extraer la fecha "intención" del timestamp
    // (Supabase guarda en UTC pero la fecha del día es la que importa)
    return new Date(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate());
  }

  function mismo_dia(d, anio, mes, dia) {
    if (!d) return false;
    return d.getFullYear() === anio && d.getMonth() === mes && d.getDate() === dia;
  }

  /**
   * Extrae la fecha de INICIO de un proyecto.
   * Prioridad: fecha_inicio → fecha → start_date → created_at
   */
  function getFechaInicio(p) {
    return p.fecha_inicio || p.fecha || p.start_date || p.created_at || null;
  }

  /**
   * Extrae la fecha de FIN de un proyecto.
   * Prioridad: fecha_fin → fecha_entrega → end_date → fecha_limite → fecha_fin_real
   */
  function getFechaFin(p) {
    return p.fecha_fin || p.fecha_entrega || p.end_date ||
           p.fecha_limite || p.fecha_fin_real || null;
  }

  /* ──────────────────────────────────────────────
     Obtener proyectos desde getData (sistema GN)
  ────────────────────────────────────────────── */
  async function obtenerProyectos() {
    try {
      // 1. Usar getData del sistema (Supabase + localStorage unificado)
      if (typeof window.getData === 'function' && window.STORAGE_KEYS && window.STORAGE_KEYS.PROYECTOS) {
        const data = await window.getData(window.STORAGE_KEYS.PROYECTOS);
        if (Array.isArray(data) && data.length > 0) return data;
      }
      // 2. Fallback: función específica del módulo proyectos
      if (typeof window.cargarProyectosData === 'function') {
        return await window.cargarProyectosData();
      }
      // 3. Fallback: supabase directo
      if (window._supabase) {
        const { data } = await window._supabase.from('proyectos').select('*');
        return data || [];
      }
      // 4. Fallback: getProyectos legacy
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
     Mapear proyectos a días del mes visible
  ────────────────────────────────────────────── */
  function mapearProyectosPorDia(proyectos, anio, mes) {
    const mapa = {};
    const diasMes = new Date(anio, mes + 1, 0).getDate();

    proyectos.forEach(p => {
      const nombre = p.nombre || p.name || 'Sin nombre';
      const estado = p.estado || p.status || '';

      const rawInicio = getFechaInicio(p);
      const rawFin    = getFechaFin(p);

      const dInicio = parseISO(rawInicio);
      const dFin    = parseISO(rawFin);

      for (let d = 1; d <= diasMes; d++) {
        const key = anio + '-' +
          String(mes + 1).padStart(2, '0') + '-' +
          String(d).padStart(2, '0');

        if (mismo_dia(dInicio, anio, mes, d)) {
          if (!mapa[key]) mapa[key] = [];
          mapa[key].push({ id: p.id, nombre, estado, tipo: 'inicio' });
        }

        if (dFin && mismo_dia(dFin, anio, mes, d)) {
          if (!mapa[key]) mapa[key] = [];
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
    if (tituloEl) tituloEl.textContent = meses[_mes] + ' ' + _anio;

    const primerDia = new Date(_anio, _mes, 1).getDay();
    const diasMes   = new Date(_anio, _mes + 1, 0).getDate();
    const hoyStrVal = fechaStr(_hoy);

    let html = '';
    // Cabeceras
    ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].forEach(function(d) {
      html += '<div class="cal-header-day">' + d + '</div>';
    });

    // Celdas vacías al inicio
    for (let i = 0; i < primerDia; i++) {
      html += '<div class="cal-cell cal-cell-empty"></div>';
    }

    // Días del mes
    for (let d = 1; d <= diasMes; d++) {
      const key   = _anio + '-' + String(_mes + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const items = mapa[key] || [];
      const count = items.length;
      const esHoy = key === hoyStrVal;

      let badgesHTML = '';
      if (count > 0) {
        badgesHTML = '<button class="cal-badge" onclick="calAbrirPopover(event,\'' + key + '\')" title="' + count + ' proyecto(s)">' + count + '</button>';
      }

      html += '<div class="cal-cell' + (esHoy ? ' cal-hoy' : '') + '" data-fecha="' + key + '">' +
        '<span class="cal-dia-num">' + d + '</span>' +
        badgesHTML +
        '</div>';
    }

    contenedor.innerHTML = html;
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

    const partes = fecha.split('-');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const titulo = parseInt(partes[2]) + ' ' + meses[parseInt(partes[1]) - 1] + ' ' + partes[0];

    let listHTML = items.map(function(item) {
      const color     = colorEstado(item.estado);
      const tipoLabel = item.tipo === 'inicio' ? '🚀 Inicio' : '🏁 Fin';
      return '<li class="cal-pop-item" onclick="calIrAProyecto(\'' + item.id + '\')">' +
        '<span class="cal-pop-dot" style="background:' + color + '"></span>' +
        '<span class="cal-pop-nombre">' + item.nombre + '</span>' +
        '<span class="cal-pop-tipo">' + tipoLabel + '</span>' +
        '</li>';
    }).join('');

    const pop = document.createElement('div');
    pop.className = 'cal-popover';
    pop.id = 'cal-popover';
    pop.innerHTML =
      '<div class="cal-pop-header">' +
        '<strong><i class="ph ph-calendar"></i> ' + titulo + '</strong>' +
        '<button class="cal-pop-close" onclick="calCerrarPopover()"><i class="ph ph-x"></i></button>' +
      '</div>' +
      '<ul class="cal-pop-list">' + listHTML + '</ul>';

    const btn  = event.currentTarget;
    const rect = btn.getBoundingClientRect();
    pop.style.position = 'fixed';
    pop.style.top  = (rect.bottom + 6) + 'px';
    pop.style.left = Math.min(rect.left, window.innerWidth - 260) + 'px';

    document.body.appendChild(pop);
    _popoverAbierto = pop;

    setTimeout(function() {
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

  window.calIrAProyecto = function (proyectoId) {
    cerrarPopover();
    if (typeof window.verDetalleProyecto === 'function') {
      window.verDetalleProyecto(proyectoId);
    } else if (typeof window.abrirDetalleProyecto === 'function') {
      window.abrirDetalleProyecto(proyectoId);
    } else {
      const fila = document.querySelector('[data-proyecto-id="' + proyectoId + '"]');
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
    _hoy  = new Date();
    _anio = _hoy.getFullYear();
    _mes  = _hoy.getMonth();
    renderCalendario();
  };

  window.refreshCalendario = renderCalendario;

})();
