// ============================================================
// js/grupos.js — Gestión de Grupos de Servicios
// ============================================================

var GRUPOS_KEY = 'gn_grupos_servicios';
var GRUPO_SERVICIOS_KEY = 'gn_grupo_servicio_map';

var COLORES_GRUPO = {
  green:  { bg: 'rgba(107,189,69,0.15)',  border: '#6bbd45', label: 'Verde',     icon: '🟢' },
  blue:   { bg: 'rgba(79,140,255,0.15)',  border: '#4f8cff', label: 'Azul',      icon: '🔵' },
  purple: { bg: 'rgba(168,85,247,0.15)',  border: '#a855f7', label: 'Púrpura',   icon: '🟣' },
  orange: { bg: 'rgba(245,158,11,0.15)',  border: '#f59e0b', label: 'Naranja',   icon: '🟠' },
  red:    { bg: 'rgba(239,68,68,0.15)',   border: '#ef4444', label: 'Rojo',      icon: '🔴' },
  teal:   { bg: 'rgba(20,184,166,0.15)',  border: '#14b8a6', label: 'Turquesa',  icon: '🩵' },
  pink:   { bg: 'rgba(236,72,153,0.15)',  border: '#ec4899', label: 'Rosa',      icon: '🩷' },
  gray:   { bg: 'rgba(100,116,139,0.15)', border: '#64748b', label: 'Gris',      icon: '⚪' }
};

function $grp(id) {
  return document.getElementById(id);
}

function grupoEscapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function contenedorPrimero(ids) {
  for (var i = 0; i < ids.length; i++) {
    var node = document.getElementById(ids[i]);
    if (node) return node;
  }
  return null;
}

// ============================================================
// INICIALIZAR
// ============================================================

function inicializarGrupos() {
  var grupos = getData(GRUPOS_KEY);

  if (!Array.isArray(grupos) || grupos.length === 0) {
    grupos = [
      { id: 'grp-desarrollo',  codigo: 'DESARROLLO',  nombre: 'Desarrollo Web',    descripcion: 'Programación, APIs, CMS y deploy', color: 'green',  orden: 1, creadoEn: new Date().toISOString() },
      { id: 'grp-diseno',      codigo: 'DISENO',      nombre: 'Diseño Web',        descripcion: 'UI/UX, landing pages y responsive', color: 'blue',   orden: 2, creadoEn: new Date().toISOString() },
      { id: 'grp-branding',    codigo: 'BRANDING',    nombre: 'Branding',          descripcion: 'Logotipos, manuales y papelería', color: 'purple', orden: 3, creadoEn: new Date().toISOString() },
      { id: 'grp-marketing',   codigo: 'MARKETING',   nombre: 'Marketing Digital', descripcion: 'Ads, SEO y automatización', color: 'orange', orden: 4, creadoEn: new Date().toISOString() },
      { id: 'grp-social',      codigo: 'SOCIAL',      nombre: 'Social Media',      descripcion: 'Gestión de redes y contenido', color: 'pink', orden: 5, creadoEn: new Date().toISOString() },
      { id: 'grp-consultoria', codigo: 'CONSULTORIA', nombre: 'Consultoría',       descripcion: 'Estrategia, auditorías y asesoría', color: 'teal', orden: 6, creadoEn: new Date().toISOString() },
      { id: 'grp-soporte',     codigo: 'SOPORTE',     nombre: 'Soporte & Hosting', descripcion: 'Mantenimiento, hosting y dominios', color: 'gray', orden: 7, creadoEn: new Date().toISOString() }
    ];
    setData(GRUPOS_KEY, grupos);
  }

  var map = getData(GRUPO_SERVICIOS_KEY);
  if (!map || typeof map !== 'object' || Array.isArray(map)) {
    setData(GRUPO_SERVICIOS_KEY, {});
  }

  renderGrupos();
  renderGruposVisuales();
  actualizarSelectGrupos();
  renderServiciosPorGrupo();
  renderServiciosSinGrupo();
}

// ============================================================
// DATOS
// ============================================================

function obtenerGrupos() {
  var grupos = getData(GRUPOS_KEY);
  grupos = Array.isArray(grupos) ? grupos : [];
  grupos.sort(function(a, b) {
    return (parseInt(a.orden, 10) || 99) - (parseInt(b.orden, 10) || 99);
  });
  return grupos;
}

function obtenerMapaGrupos() {
  var map = getData(GRUPO_SERVICIOS_KEY);
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
}

function guardarMapaGrupos(map) {
  setData(GRUPO_SERVICIOS_KEY, map || {});
}

function obtenerGrupoDeServicio(servicioId) {
  var map = obtenerMapaGrupos();
  var grupoId = map[servicioId];
  if (!grupoId) return null;

  var grupos = obtenerGrupos();
  for (var i = 0; i < grupos.length; i++) {
    if (grupos[i].id === grupoId) return grupos[i];
  }

  return null;
}

// ============================================================
// MODAL DE GRUPO
// ============================================================

function abrirModalGrupo() {
  var existing = document.getElementById('gn-modal-grupo');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'gn-modal-grupo';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';

  modal.innerHTML = `
    <div style="background:#1a1a2e;border-radius:12px;padding:32px;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;border:1px solid #2a2a4a;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <h3 style="margin:0;color:#fff;font-size:18px;">Nuevo Grupo</h3>
        <button type="button" onclick="cerrarModalGrupo()" style="background:none;border:none;color:#aaa;font-size:24px;cursor:pointer;">&#x2715;</button>
      </div>

      <form id="formGrupo" onsubmit="return guardarGrupo(event)">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div>
            <label style="color:#aaa;font-size:12px;display:block;margin-bottom:6px;">CÓDIGO *</label>
            <input id="grp-codigo" type="text" placeholder="Ej: DESARROLLO" maxlength="30" style="width:100%;padding:10px;background:#0f0f23;border:1px solid #333;border-radius:8px;color:#fff;box-sizing:border-box;" />
          </div>

          <div>
            <label style="color:#aaa;font-size:12px;display:block;margin-bottom:6px;">ORDEN</label>
            <input id="grp-orden" type="number" min="1" step="1" value="99" style="width:100%;padding:10px;background:#0f0f23;border:1px solid #333;border-radius:8px;color:#fff;box-sizing:border-box;" />
          </div>

          <div style="grid-column:1/-1;">
            <label style="color:#aaa;font-size:12px;display:block;margin-bottom:6px;">NOMBRE *</label>
            <input id="grp-nombre" type="text" placeholder="Nombre del grupo" style="width:100%;padding:10px;background:#0f0f23;border:1px solid #333;border-radius:8px;color:#fff;box-sizing:border-box;" />
          </div>

          <div style="grid-column:1/-1;">
            <label style="color:#aaa;font-size:12px;display:block;margin-bottom:6px;">DESCRIPCIÓN</label>
            <textarea id="grp-descripcion" rows="3" placeholder="Descripción breve del grupo" style="width:100%;padding:10px;background:#0f0f23;border:1px solid #333;border-radius:8px;color:#fff;box-sizing:border-box;resize:vertical;"></textarea>
          </div>

          <div style="grid-column:1/-1;">
            <label style="color:#aaa;font-size:12px;display:block;margin-bottom:6px;">COLOR</label>
            <select id="grp-color" style="width:100%;padding:10px;background:#0f0f23;border:1px solid #333;border-radius:8px;color:#fff;box-sizing:border-box;">
              <option value="green">🟢 Verde</option>
              <option value="blue" selected>🔵 Azul</option>
              <option value="purple">🟣 Púrpura</option>
              <option value="orange">🟠 Naranja</option>
              <option value="red">🔴 Rojo</option>
              <option value="teal">🩵 Turquesa</option>
              <option value="pink">🩷 Rosa</option>
              <option value="gray">⚪ Gris</option>
            </select>
          </div>
        </div>

        <div id="feedback-grupo" class="form-feedback" style="margin-top:16px;"></div>

        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;">
          <button type="button" onclick="cerrarModalGrupo()" style="padding:10px 20px;background:#333;border:none;border-radius:8px;color:#fff;cursor:pointer;">Cancelar</button>
          <button type="submit" style="padding:10px 20px;background:#2563eb;border:none;border-radius:8px;color:#fff;cursor:pointer;">Guardar Grupo</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener('click', function(e) {
    if (e.target === modal) cerrarModalGrupo();
  });
}

function cerrarModalGrupo() {
  var modal = document.getElementById('gn-modal-grupo');
  if (modal) modal.remove();
}

// ============================================================
// CRUD
// ============================================================

function guardarGrupo(event) {
  if (event) event.preventDefault();

  var feedback = $grp('feedback-grupo');
  var codigo = ($grp('grp-codigo') ? $grp('grp-codigo').value : '').trim().toUpperCase();
  var nombre = ($grp('grp-nombre') ? $grp('grp-nombre').value : '').trim();
  var descripcion = ($grp('grp-descripcion') ? $grp('grp-descripcion').value : '').trim();
  var color = $grp('grp-color') ? $grp('grp-color').value : 'blue';
  var orden = parseInt($grp('grp-orden') ? $grp('grp-orden').value : 99, 10) || 99;

  if (!codigo || !nombre) {
    if (feedback) {
      feedback.className = 'form-feedback error';
      feedback.textContent = '❌ Completa código y nombre del grupo';
      feedback.style.display = 'block';
    }
    return false;
  }

  var grupos = obtenerGrupos();

  for (var i = 0; i < grupos.length; i++) {
    if (grupos[i].codigo === codigo) {
      if (feedback) {
        feedback.className = 'form-feedback error';
        feedback.textContent = '❌ El código "' + codigo + '" ya existe';
        feedback.style.display = 'block';
      }
      return false;
    }
  }

  grupos.push({
    id: generarId(),
    codigo: codigo,
    nombre: nombre,
    descripcion: descripcion,
    color: color,
    orden: orden,
    creadoEn: new Date().toISOString()
  });

  grupos.sort(function(a, b) {
    return (parseInt(a.orden, 10) || 99) - (parseInt(b.orden, 10) || 99);
  });

  setData(GRUPOS_KEY, grupos);

  if (feedback) {
    feedback.className = 'form-feedback success';
    feedback.textContent = '✅ Grupo "' + nombre + '" creado';
    feedback.style.display = 'block';
  }

  if ($grp('formGrupo')) $grp('formGrupo').reset();

  renderGrupos();
  renderGruposVisuales();
  actualizarSelectGrupos();
  renderServiciosPorGrupo();
  renderServiciosSinGrupo();

  setTimeout(function() {
    cerrarModalGrupo();
  }, 500);

  return false;
}

function eliminarGrupo(id) {
  if (!confirm('¿Eliminar este grupo? Los servicios asignados quedarán sin grupo.')) return;

  var grupos = obtenerGrupos().filter(function(g) {
    return g.id !== id;
  });
  setData(GRUPOS_KEY, grupos);

  var map = obtenerMapaGrupos();
  for (var sid in map) {
    if (map[sid] === id) delete map[sid];
  }
  guardarMapaGrupos(map);

  renderGrupos();
  renderGruposVisuales();
  actualizarSelectGrupos();
  renderServicios();
  renderServiciosPorGrupo();
  renderServiciosSinGrupo();
}

// ============================================================
// SELECTS
// ============================================================

function actualizarSelectGrupos() {
  var grupos = obtenerGrupos();

  var selects = [
    $grp('serv-grupo'),
    $grp('serv-categoria'),
    $grp('filtro-grupo-servicio'),
    $grp('filtro-servicio-grupo')
  ];

  for (var s = 0; s < selects.length; s++) {
    var select = selects[s];
    if (!select) continue;

    var esFiltro = select.id.indexOf('filtro') !== -1;
    var html = esFiltro
      ? '<option value="todos">Todos los grupos</option>'
      : '<option value="">Sin grupo</option>';

    for (var i = 0; i < grupos.length; i++) {
      html += '<option value="' + grupos[i].id + '">' + grupoEscapeHtml(grupos[i].nombre) + '</option>';
    }

    select.innerHTML = html;
  }
}

// ============================================================
// MAPEAR SERVICIOS
// ============================================================

function asignarServicioAGrupo(servicioId, grupoId) {
  var map = obtenerMapaGrupos();

  if (grupoId) {
    map[servicioId] = grupoId;
  } else {
    delete map[servicioId];
  }

  guardarMapaGrupos(map);

  renderServicios();
  renderServiciosPorGrupo();
  renderServiciosSinGrupo();
}

function quitarServicioDeGrupo(servicioId) {
  asignarServicioAGrupo(servicioId, '');
}

// ============================================================
// RENDER TABLA
// ============================================================

function renderGrupos(filtro) {
  var tbody = $grp('tbodyGrupos');
  if (!tbody) return;

  var grupos = obtenerGrupos();
  var map = obtenerMapaGrupos();
  var conteo = {};

  for (var sid in map) {
    var gid = map[sid];
    conteo[gid] = (conteo[gid] || 0) + 1;
  }

  if (filtro) {
    var term = filtro.toLowerCase();
    grupos = grupos.filter(function(g) {
      return (g.nombre || '').toLowerCase().indexOf(term) !== -1
        || (g.codigo || '').toLowerCase().indexOf(term) !== -1;
    });
  }

  if (grupos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay grupos registrados</td></tr>';
    return;
  }

  var html = '';

  for (var i = 0; i < grupos.length; i++) {
    var g = grupos[i];
    var color = COLORES_GRUPO[g.color] || COLORES_GRUPO.blue;

    html += ''
      + '<tr>'
      + '<td>' + grupoEscapeHtml(g.codigo) + '</td>'
      + '<td>' + grupoEscapeHtml(g.nombre) + '</td>'
      + '<td>' + grupoEscapeHtml(g.descripcion || '—') + '</td>'
      + '<td><span style="display:inline-block;padding:4px 8px;border-radius:999px;background:' + color.bg + ';border:1px solid ' + color.border + ';">' + color.icon + ' ' + color.label + '</span></td>'
      + '<td>' + (conteo[g.id] || 0) + '</td>'
      + '<td><button type="button" class="btn-table danger" onclick="eliminarGrupo(\'' + g.id + '\')">Eliminar</button></td>'
      + '</tr>';
  }

  tbody.innerHTML = html;
}

// ============================================================
// RENDER VISUAL
// ============================================================

function renderGruposVisuales() {
  var container = $grp('grupos-visual');
  if (!container) return;

  var grupos = obtenerGrupos();
  var map = obtenerMapaGrupos();
  var conteo = {};

  for (var sid in map) {
    var gid = map[sid];
    conteo[gid] = (conteo[gid] || 0) + 1;
  }

  if (grupos.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay grupos registrados</div>';
    return;
  }

  var html = '';

  for (var i = 0; i < grupos.length; i++) {
    var g = grupos[i];
    var color = COLORES_GRUPO[g.color] || COLORES_GRUPO.blue;
    var totalServicios = conteo[g.id] || 0;

    html += ''
      + '<div class="grupo-card" style="border:1px solid ' + color.border + ';background:' + color.bg + ';">'
      + '  <div class="grupo-card-header" style="display:flex;justify-content:space-between;align-items:center;gap:12px;">'
      + '    <div>'
      + '      <div style="font-size:12px;opacity:0.8;">' + grupoEscapeHtml(g.codigo) + '</div>'
      + '      <h3 style="margin:4px 0 0;">' + color.icon + ' ' + grupoEscapeHtml(g.nombre) + '</h3>'
      + '    </div>'
      + '    <div style="font-size:12px;padding:4px 8px;border-radius:999px;background:rgba(255,255,255,0.15);">' + totalServicios + ' servicios</div>'
      + '  </div>'
      + '  <p style="margin-top:12px;">' + grupoEscapeHtml(g.descripcion || 'Sin descripción') + '</p>'
      + '</div>';
  }

  container.innerHTML = html;
}

// ============================================================
// RENDER SERVICIOS POR GRUPO
// ============================================================

function renderServiciosPorGrupo() {
  var container = contenedorPrimero(['servicios-por-grupo', 'serviciosPorGrupo']);
  if (!container) return;

  var grupos = obtenerGrupos();
  var map = obtenerMapaGrupos();
  var servicios = typeof obtenerServicios === 'function' ? obtenerServicios() : [];

  if (!Array.isArray(servicios) || servicios.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay servicios cargados todavía.</div>';
    return;
  }

  var html = '';

  for (var i = 0; i < grupos.length; i++) {
    var grupo = grupos[i];
    var color = COLORES_GRUPO[grupo.color] || COLORES_GRUPO.blue;
    var items = servicios.filter(function(servicio) {
      return map[servicio.id] === grupo.id;
    });

    if (items.length === 0) continue;

    html += '<div style="margin-bottom:24px;">';
    html += '<h3 style="margin-bottom:12px;color:' + color.border + ';">' + color.icon + ' ' + grupoEscapeHtml(grupo.nombre) + '</h3>';
    html += '<div style="display:grid;gap:12px;">';

    for (var j = 0; j < items.length; j++) {
      var servicio = items[j];
      html += ''
        + '<div style="padding:12px;border:1px solid #2a2a4a;border-radius:10px;background:#111827;">'
        + '  <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;">'
        + '    <div>'
        + '      <strong>' + grupoEscapeHtml(servicio.nombre || 'Servicio sin nombre') + '</strong><br>'
        + '      <span style="color:#94a3b8;font-size:12px;">' + grupoEscapeHtml(servicio.codigo || 'Sin código') + '</span>'
        + '    </div>'
        + '    <button type="button" class="btn-table danger" onclick="quitarServicioDeGrupo(\'' + servicio.id + '\')">Quitar</button>'
        + '  </div>'
        + '</div>';
    }

    html += '</div>';
    html += '</div>';
  }

  if (!html) {
    html = '<div class="empty-state">No hay servicios asignados a grupos.</div>';
  }

  container.innerHTML = html;
}

// ============================================================
// RENDER SERVICIOS SIN GRUPO
// ============================================================

function renderServiciosSinGrupo() {
  var container = contenedorPrimero(['servicios-sin-grupo', 'serviciosSinGrupo']);
  if (!container) return;

  var map = obtenerMapaGrupos();
  var grupos = obtenerGrupos();
  var servicios = typeof obtenerServicios === 'function' ? obtenerServicios() : [];

  if (!Array.isArray(servicios) || servicios.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay servicios disponibles.</div>';
    return;
  }

  var sinGrupo = servicios.filter(function(servicio) {
    return !map[servicio.id];
  });

  if (sinGrupo.length === 0) {
    container.innerHTML = '<div class="empty-state">Todos los servicios ya tienen grupo.</div>';
    return;
  }

  var options = '<option value="">Selecciona un grupo</option>';
  for (var i = 0; i < grupos.length; i++) {
    options += '<option value="' + grupos[i].id + '">' + grupoEscapeHtml(grupos[i].nombre) + '</option>';
  }

  var html = '<div style="display:grid;gap:12px;">';

  for (var j = 0; j < sinGrupo.length; j++) {
    var servicio = sinGrupo[j];
    html += ''
      + '<div style="padding:12px;border:1px solid #2a2a4a;border-radius:10px;background:#111827;">'
      + '  <div style="display:grid;grid-template-columns:1fr 220px;gap:12px;align-items:center;">'
      + '    <div>'
      + '      <strong>' + grupoEscapeHtml(servicio.nombre || 'Servicio sin nombre') + '</strong><br>'
      + '      <span style="color:#94a3b8;font-size:12px;">' + grupoEscapeHtml(servicio.codigo || 'Sin código') + '</span>'
      + '    </div>'
      + '    <div style="display:flex;gap:8px;">'
      + '      <select id="grupo-servicio-' + servicio.id + '" style="flex:1;padding:10px;background:#0f0f23;border:1px solid #333;border-radius:8px;color:#fff;">'
      +            options
      + '      </select>'
      + '      <button type="button" class="btn-primary" onclick="asignarServicioAGrupo(\'' + servicio.id + '\', document.getElementById(\'grupo-servicio-' + servicio.id + '\').value)">Asignar</button>'
      + '    </div>'
      + '  </div>'
      + '</div>';
  }

  html += '</div>';
  container.innerHTML = html;
}
