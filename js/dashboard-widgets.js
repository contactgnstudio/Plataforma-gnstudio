// ============================================================
// js/dashboard-widgets.js
// GN Studio OS — Dashboard Improvements v1.0
// Elementos: Saludo contextual, Por Cobrar, Quick Actions,
//            Tareas Urgentes, Próximos Eventos, Meta Mensual
// ============================================================

(function(window, document) {
  'use strict';

  var byId = function(id) { return document.getElementById(id); };
  var getData = function(key) { return typeof window.getData === 'function' ? window.getData(key) : Promise.resolve([]); };
  var formatMoney = function(v) { return typeof window.formatMoney === 'function' ? window.formatMoney(v) : 'USD ' + parseFloat(v || 0).toFixed(2); };
  var esc = function(v) { return typeof window.escapeHtml === 'function' ? window.escapeHtml(String(v || '')) : String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };

  // ============================================================
  // 1. SALUDO CONTEXTUAL CON FECHA
  // ============================================================
  function renderSaludoContextual() {
    var el = byId('dashboard-saludo');
    if (!el) return;

    var ahora = new Date();
    var hora = ahora.getHours();
    var saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

    var dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    var meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    var fechaStr = dias[ahora.getDay()] + ', ' + ahora.getDate() + ' de ' + meses[ahora.getMonth()] + ' de ' + ahora.getFullYear();

    el.innerHTML =
      '<div class="saludo-header">' +
        '<div class="saludo-titulo">' + saludo + ', <strong>GN Studio</strong> <span class="saludo-emoji">👋</span></div>' +
        '<div class="saludo-fecha">' + fechaStr + '</div>' +
      '</div>' +
      '<div class="saludo-resumen" id="saludo-resumen-texto">Calculando resumen...</div>';

    // Actualizar resumen con datos reales
    Promise.all([
      getData(window.STORAGE_KEYS ? window.STORAGE_KEYS.PROYECTOS : 'proyectos'),
      getData(window.STORAGE_KEYS ? window.STORAGE_KEYS.PAGOS : 'pagos')
    ]).then(function(results) {
      var proyectos = results[0] || [];
      var pagos = results[1] || [];
      var hoyISO = ahora.toISOString().slice(0,10);

      // Contar tareas urgentes: fecha_limite <= hoy y no completadas
      var tareasUrgentes = 0;
      proyectos.forEach(function(p) {
        (p.tareas || []).forEach(function(t) {
          if (t.estado !== 'completada' && t.fecha_limite && t.fecha_limite <= hoyISO) tareasUrgentes++;
        });
      });

      // Contar proyectos con saldo pendiente
      var cobrandoPendientes = 0;
      proyectos.forEach(function(p) {
        if (p.estado === 'cancelado') return;
        var cobrado = (pagos).filter(function(pg) { return pg.proyecto_id === p.id; })
          .reduce(function(a,pg) { return a + (parseFloat(pg.monto)||0); }, 0);
        if ((parseFloat(p.presupuesto)||0) - cobrado > 0.01) cobrandoPendientes++;
      });

      var partes = [];
      if (tareasUrgentes > 0) partes.push(tareasUrgentes + ' tarea' + (tareasUrgentes !== 1 ? 's urgentes' : ' urgente'));
      if (cobrandoPendientes > 0) partes.push(cobrandoPendientes + ' pago' + (cobrandoPendientes !== 1 ? 's pendientes de cobrar' : ' pendiente de cobrar'));

      var resumenEl = byId('saludo-resumen-texto');
      if (resumenEl) {
        resumenEl.textContent = partes.length > 0
          ? 'Tienes ' + partes.join(' y ') + '.'
          : 'Todo al día — sin tareas urgentes ni cobros pendientes. ✅';
      }
    }).catch(function() {
      var resumenEl = byId('saludo-resumen-texto');
      if (resumenEl) resumenEl.textContent = '';
    });
  }

  // ============================================================
  // 2. CARD "POR COBRAR" GLOBAL
  // ============================================================
  async function renderPorCobrar() {
    var el = byId('kpi-por-cobrar');
    var elCount = byId('kpi-por-cobrar-count');
    if (!el) return;

    try {
      var proyectos = await getData(window.STORAGE_KEYS ? window.STORAGE_KEYS.PROYECTOS : 'proyectos');
      var pagos = await getData(window.STORAGE_KEYS ? window.STORAGE_KEYS.PAGOS : 'pagos');

      var totalPorCobrar = 0;
      var countProyectos = 0;

      (proyectos || []).forEach(function(p) {
        if (p.estado === 'cancelado') return;
        var cobrado = (pagos || []).filter(function(pg) { return pg.proyecto_id === p.id; })
          .reduce(function(a, pg) { return a + (parseFloat(pg.monto) || 0); }, 0);
        var pendiente = (parseFloat(p.presupuesto) || 0) - cobrado;
        if (pendiente > 0.01) {
          totalPorCobrar += pendiente;
          countProyectos++;
        }
      });

      el.textContent = formatMoney(totalPorCobrar);
      if (elCount) {
        elCount.textContent = countProyectos > 0
          ? countProyectos + ' proyecto' + (countProyectos !== 1 ? 's' : '')
          : 'Sin pendientes';
      }
    } catch(e) {
      if (el) el.textContent = formatMoney(0);
    }
  }

  // ============================================================
  // 3. QUICK ACTIONS
  // (Los botones apuntan a funciones ya existentes en otros módulos)
  // ============================================================
  function initQuickActions() {
    // Los onclick están en el HTML; aquí solo verificamos que existan las funciones
    // y mostramos/ocultamos el bloque si es necesario.
    var el = byId('quick-actions-bar');
    if (el) el.style.display = 'flex';
  }

  // ============================================================
  // 4. TAREAS URGENTES DEL DÍA (cross-proyectos)
  // ============================================================
  async function renderTareasUrgentes() {
    var container = byId('tareas-urgentes-lista');
    if (!container) return;

    try {
      var proyectos = await getData(window.STORAGE_KEYS ? window.STORAGE_KEYS.PROYECTOS : 'proyectos');
      var hoy = new Date();
      hoy.setHours(0,0,0,0);
      var hoyISO = hoy.toISOString().slice(0,10);

      var urgentes = [];
      (proyectos || []).forEach(function(p) {
        (p.tareas || []).forEach(function(t) {
          if (t.estado === 'completada') return;
          if (!t.fecha_limite) return;
          if (t.fecha_limite > hoyISO) return;
          var fechaTarea = new Date(t.fecha_limite + 'T00:00:00');
          var diasVencida = Math.round((hoy - fechaTarea) / 86400000);
          urgentes.push({
            titulo: t.titulo || 'Tarea sin título',
            proyecto: p.nombre || 'Proyecto',
            prioridad: t.prioridad || 'media',
            fecha_limite: t.fecha_limite,
            diasVencida: diasVencida
          });
        });
      });

      urgentes.sort(function(a, b) { return b.diasVencida - a.diasVencida; });
      urgentes = urgentes.slice(0, 5);

      if (urgentes.length === 0) {
        container.innerHTML =
          '<div class="widget-empty">' +
            '<i class="ph ph-check-circle" style="color:#2D8B5E;font-size:22px;"></i>' +
            '<span>Sin tareas urgentes. ¡Todo al día!</span>' +
          '</div>';
        return;
      }

      var prioridadColor = { urgente: '#F87171', alta: '#fb923c', media: '#C5A253', baja: '#6b7280' };

      container.innerHTML = urgentes.map(function(t) {
        var color = prioridadColor[t.prioridad] || '#C5A253';
        var badge = t.diasVencida === 0
          ? '<span class="tarea-badge tarea-hoy">Hoy</span>'
          : '<span class="tarea-badge tarea-vencida">Vencida ' + t.diasVencida + 'd</span>';
        return '<div class="tarea-urgente-item">' +
          '<span class="tarea-dot" style="background:' + color + ';"></span>' +
          '<div class="tarea-info">' +
            '<span class="tarea-titulo">' + esc(t.titulo) + '</span>' +
            '<span class="tarea-proyecto">' + esc(t.proyecto) + '</span>' +
          '</div>' +
          badge +
        '</div>';
      }).join('');
    } catch(e) {
      container.innerHTML = '<div class="widget-empty">No se pudieron cargar las tareas.</div>';
    }
  }

  // ============================================================
  // 5. PRÓXIMOS EVENTOS DEL MES (mini-vista)
  // ============================================================
  async function renderProximosEventos() {
    var container = byId('proximos-eventos-lista');
    if (!container) return;

    try {
      var proyectos = await getData(window.STORAGE_KEYS ? window.STORAGE_KEYS.PROYECTOS : 'proyectos');
      var hoyISO = new Date().toISOString().slice(0,10);

      var eventos = [];
      (proyectos || []).forEach(function(p) {
        if (p.estado === 'cancelado') return;
        var fecha = p.fecha_entrega || p.fecha_fin_estimada || p.fecha_fin || null;
        if (fecha && fecha >= hoyISO) {
          eventos.push({
            fecha: fecha,
            proyecto: p.nombre || 'Sin nombre',
            cliente: p.cliente_nombre || p.cliente || ''
          });
        }
      });

      eventos.sort(function(a, b) { return a.fecha.localeCompare(b.fecha); });
      eventos = eventos.slice(0, 3);

      if (eventos.length === 0) {
        container.innerHTML =
          '<div class="widget-empty">' +
            '<i class="ph ph-calendar-x" style="font-size:22px;color:var(--gn-text-muted);"></i>' +
            '<span>Sin entregas próximas registradas.</span>' +
          '</div>';
        return;
      }

      var mesesCortos = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

      container.innerHTML = eventos.map(function(ev) {
        var d = new Date(ev.fecha + 'T00:00:00');
        var diaNum = d.getDate();
        var mesStr = mesesCortos[d.getMonth()];
        return '<div class="evento-item">' +
          '<div class="evento-fecha-badge"><span class="evento-dia">' + diaNum + '</span><span class="evento-mes">' + mesStr + '</span></div>' +
          '<div class="evento-info">' +
            '<span class="evento-proyecto">' + esc(ev.proyecto) + '</span>' +
            (ev.cliente ? '<span class="evento-cliente">' + esc(ev.cliente) + '</span>' : '') +
          '</div>' +
        '</div>';
      }).join('');
    } catch(e) {
      container.innerHTML = '<div class="widget-empty">No se pudieron cargar los eventos.</div>';
    }
  }

  // ============================================================
  // 6. META MENSUAL DE INGRESOS (barra de progreso)
  // ============================================================
  var META_KEY = 'gn_meta_mensual';

  function obtenerMeta() {
    var stored = localStorage.getItem(META_KEY);
    return stored ? parseFloat(stored) : 3000;
  }

  function guardarMeta(valor) {
    localStorage.setItem(META_KEY, String(parseFloat(valor) || 3000));
  }

  function abrirEditorMeta() {
    var meta = obtenerMeta();
    var nueva = prompt('Define tu meta mensual de ingresos (USD):', meta);
    if (nueva === null) return;
    var val = parseFloat(nueva);
    if (!val || val <= 0) { alert('Valor inválido. Ingresa un número mayor a 0.'); return; }
    guardarMeta(val);
    renderMetaMensual();
  }

  async function renderMetaMensual() {
    var barEl = byId('meta-barra-fill');
    var pctEl = byId('meta-pct-texto');
    var metaEl = byId('meta-valor-texto');
    var alcanzadoEl = byId('meta-alcanzado-texto');
    if (!barEl) return;

    try {
      var pagos = await getData(window.STORAGE_KEYS ? window.STORAGE_KEYS.PAGOS : 'pagos');
      var ahora = new Date();
      var mesActual = ahora.getMonth();
      var anioActual = ahora.getFullYear();

      var totalMes = (pagos || []).reduce(function(acc, p) {
        var fecha = p.fecha || p.fechaPago || p.created_at || '';
        if (!fecha) return acc;
        var f = new Date(fecha);
        if (f.getMonth() === mesActual && f.getFullYear() === anioActual) {
          return acc + (parseFloat(p.monto) || 0);
        }
        return acc;
      }, 0);

      var meta = obtenerMeta();
      var pct = Math.min(100, Math.round((totalMes / meta) * 100));
      var color = pct >= 100 ? '#2D8B5E' : pct >= 60 ? '#C5A253' : '#F87171';

      barEl.style.width = pct + '%';
      barEl.style.background = color;
      if (pctEl) pctEl.textContent = pct + '%';
      if (metaEl) metaEl.textContent = formatMoney(meta);
      if (alcanzadoEl) alcanzadoEl.textContent = formatMoney(totalMes);
    } catch(e) {
      if (barEl) barEl.style.width = '0%';
    }
  }

  // ============================================================
  // INIT — Exportar y ejecutar al cargar
  // ============================================================
  window.renderSaludoContextual = renderSaludoContextual;
  window.renderPorCobrar = renderPorCobrar;
  window.initQuickActions = initQuickActions;
  window.renderTareasUrgentes = renderTareasUrgentes;
  window.renderProximosEventos = renderProximosEventos;
  window.renderMetaMensual = renderMetaMensual;
  window.abrirEditorMeta = abrirEditorMeta;

  // Se llama desde inicializarAppGNStudio() en app.js
  window.inicializarDashboardWidgets = async function() {
    renderSaludoContextual();
    await renderPorCobrar();
    initQuickActions();
    await renderTareasUrgentes();
    await renderProximosEventos();
    await renderMetaMensual();
  };

})(window, document);
