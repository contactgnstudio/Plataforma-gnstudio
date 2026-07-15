// ============================================================
// js/grupos.js — Gestión de Grupos de Servicios
// ============================================================

var GRUPOS_KEY = 'gn_grupos_servicios';
var GRUPO_SERVICIOS_KEY = 'gn_grupo_servicio_map';

var COLORES_GRUPO = {
  green:  { bg: 'rgba(107,189,69,0.15)', border: '#6bbd45', label: 'Verde', icon: '🟢' },
  blue:   { bg: 'rgba(79,140,255,0.15)', border: '#4f8cff', label: 'Azul', icon: '🔵' },
  purple: { bg: 'rgba(168,85,247,0.15)', border: '#a855f7', label: 'Púrpura', icon: '🟣' },
  orange: { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', label: 'Naranja', icon: '🟠' },
  red:    { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', label: 'Rojo', icon: '🔴' },
  teal:   { bg: 'rgba(20,184,166,0.15)', border: '#14b8a6', label: 'Turquesa', icon: '🩵' },
  pink:   { bg: 'rgba(236,72,153,0.15)', border: '#ec4899', label: 'Rosa', icon: '🩷' },
  gray:   { bg: 'rgba(100,116,139,0.15)', border: '#64748b', label: 'Gris', icon: '⚪' }
};

function gsGet(key, fallback) {
  var defaultValue = typeof fallback === 'undefined' ? [] : fallback;

  try {
    if (typeof getData === 'function') {
      var result = getData(key, defaultValue);
      return typeof result === 'undefined' || result === null ? defaultValue : result;
    }

    var raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.error('[grupos.js] Error leyendo "' + key + '"', e);
    return defaultValue;
  }
}

function gsSet(key, value) {
  try {
    if (typeof setData === 'function') {
      return setData(key, value);
    }
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('[grupos.js] Error guardando "' + key + '"', e);
    return false;
  }
}

function gsArray(value) {
  return Array.isArray(value) ? value : [];
}

function gsObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getServiciosBase() {
  if (typeof obtenerServicios === 'function') {
    return gsArray(obtenerServicios());
  }

  if (typeof STORAGE_KEYS !== 'undefined' && STORAGE_KEYS.SERVICIOS) {
    return gsArray(gsGet(STORAGE_KEYS.SERVICIOS, []));
  }

  return gsArray(gsGet('gn_servicios', []));
}

function getGrupoColor(colorKey) {
  return COLORES_GRUPO[colorKey] || COLORES_GRUPO.gray;
}

function obtenerGrupos() {
  return gsArray(gsGet(GRUPOS_KEY, []));
}

function obtenerMapaGrupos() {
  return gsObject(gsGet(GRUPO_SERVICIOS_KEY, {}));
}

function guardarMapaGrupos(map) {
  return gsSet(GRUPO_SERVICIOS_KEY, gsObject(map));
}

function buscarGrupoPorId(id) {
  var grupos = obtenerGrupos();
  for (var i = 0; i < grupos.length; i++) {
    if (grupos[i].id === id) return grupos[i];
  }
  return null;
}

function obtenerGrupoDeServicio(servicioId) {
  var map = obtenerMapaGrupos();
  var grupoId = map[servicioId];
  if (!grupoId) return null;
  return buscarGrupoPorId(grupoId);
}

function inicializarGrupos() {
  var grupos = obtenerGrupos();

  if (!grupos.length) {
    grupos = [
      {
        id: 'grp-desarrollo',
        codigo: 'DESARROLLO',
        nombre: 'Desarrollo Web',
        descripcion: 'Programación, APIs, CMS y deploy',
        color: 'green',
        orden: 1,
        creadoEn: new Date().toISOString()
      },
      {
        id: 'grp-diseno',
        codigo: 'DISENO',
        nombre: 'Diseño Web',
        descripcion: 'UI/UX, landing pages y responsive',
        color: 'blue',
        orden: 2,
        creadoEn: new Date().toISOString()
      },
      {
        id: 'grp-branding',
        codigo: 'BRANDING',
        nombre: 'Branding',
        descripcion: 'Logotipos, manual de marca y papelería',
        color: 'purple',
        orden: 3,
        creadoEn: new Date().toISOString()
      },
      {
        id: 'grp-marketing',
        codigo: 'MARKETING',
        nombre: 'Marketing Digital',
        descripcion: 'Ads, SEO y estrategia',
        color: 'orange',
        orden: 4,
        creadoEn: new Date().toISOString()
      },
      {
        id: 'grp-soporte',
        codigo: 'SOPORTE',
        nombre: 'Soporte & Hosting',
        descripcion: 'Mantenimiento, hosting y dominios',
        color: 'gray',
        orden: 5,
        creadoEn: new Date().toISOString()
      }
    ];

    gsSet(GRUPOS_KEY, grupos);
  }

  var map = obtenerMapaGrupos();
  if (!map || Array.isArray(map)) {
    guardarMapaGrupos({});
  }

  renderGrupos();
  renderGruposVisuales();
  actualizarSelectGrupos();
  renderServiciosPorGrupo();
  renderServiciosSinGrupo();
}

function guardarGrupo(event) {
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }

  var feedback = document.getElementById('feedback-grupo');
  var codigoEl = document.getElementById('grp-codigo');
  var nombreEl = document.getElementById('grp-nombre');
  var descripcionEl = document.getElementById('grp-descripcion');
  var colorEl = document.getElementById('grp-color');
  var ordenEl = document.getElementById('grp-orden');

  if (!codigoEl || !nombreEl) {
    if (feedback) {
      feedback.className = 'form-feedback error';
      feedback.textContent = '❌ Faltan campos del formulario de grupos';
    }
    return false;
  }

  var codigo = codigoEl.value.trim().toUpperCase();
  var nombre = nombreEl.value.trim();
  var descripcion = descripcionEl ? descripcionEl.value.trim() : '';
  var color = colorEl ? colorEl.value : 'gray';
  var orden = ordenEl ? parseInt(ordenEl.value, 10) : 99;

  if (!codigo || !nombre) {
    if (feedback) {
      feedback.className = 'form-feedback error';
      feedback.textContent = '❌ Código y nombre son obligatorios';
    }
    return false;
  }

  var grupos = obtenerGrupos();

  for (var i = 0; i < grupos.length; i++) {
    if (grupos[i].codigo === codigo) {
      if (feedback) {
        feedback.className = 'form-feedback error';
        feedback.textContent = '❌ El código "' + codigo + '" ya existe';
      }
      return false;
    }
  }

  var nuevoGrupo = {
    id: typeof generarId === 'function' ? generarId() : 'grp-' + Date.now(),
    codigo: codigo,
    nombre: nombre,
    descripcion: descripcion,
    color: color,
    orden: isNaN(orden) ? 99 : orden,
    creadoEn: new Date().toISOString()
  };

  grupos.push(nuevoGrupo);
  grupos.sort(function(a, b) {
    return (a.orden || 99) - (b.orden || 99);
  });

  gsSet(GRUPOS_KEY, grupos);

  if (feedback) {
    feedback.className = 'form-feedback success';
    feedback.textContent = '✅ Grupo "' + nombre + '" creado';
  }

  var form = document.getElementById('formGrupo');
  if (form) form.reset();

  renderGrupos();
  renderGruposVisuales();
  actualizarSelectGrupos();
  renderServiciosPorGrupo();
  renderServiciosSinGrupo();

  return false;
}

function eliminarGrupo(id) {
  if (!id) return;

  if (!confirm('¿Eliminar este grupo? Los servicios asignados quedarán sin grupo.')) {
    return;
  }

  var grupos = obtenerGrupos();
  var filtrados = [];

  for (var i = 0; i < grupos.length; i++) {
    if (grupos[i].id !== id) {
      filtrados.push(grupos[i]);
    }
  }

  gsSet(GRUPOS_KEY, filtrados);

  var map = obtenerMapaGrupos();
  var nuevoMap = {};

  for (var servicioId in map) {
    if (Object.prototype.hasOwnProperty.call(map, servicioId) && map[servicioId] !== id) {
      nuevoMap[servicioId] = map[servicioId];
    }
  }

  guardarMapaGrupos(nuevoMap);

  renderGrupos();
  renderGruposVisuales();
  actualizarSelectGrupos();
  renderServiciosPorGrupo();
  renderServiciosSinGrupo();
}

function renderGrupos(filtro) {
  var tbody = document.getElementById('tbodyGrupos');
  if (!tbody) return;

  var grupos = obtenerGrupos();
  var map = obtenerMapaGrupos();
  var conteo = {};

  for (var sid in map) {
    if (Object.prototype.hasOwnProperty.call(map, sid)) {
      var gid = map[sid];
      conteo[gid] = (conteo[gid] || 0) + 1;
    }
  }

  if (filtro) {
    var term = String(filtro).toLowerCase();
    grupos = grupos.filter(function(g) {
      return String(g.nombre || '').toLowerCase().indexOf(term) !== -1 ||
             String(g.codigo || '').toLowerCase().indexOf(term) !== -1;
    });
  }

  grupos.sort(function(a, b) {
    return (a.orden || 99) - (b.orden || 99);
  });

  if (!grupos.length) {
    tbody.innerHTML = '<tr><td colspan="6">No hay grupos registrados</td></tr>';
    return;
  }

  var html = '';

  for (var i = 0; i < grupos.length; i++) {
    var g = grupos[i];
    var color = getGrupoColor(g.color);

    html += ''
      + '<tr>'
      +   '<td><strong>' + escapeHtml(g.codigo) + '</strong></td>'
      +   '<td>' + escapeHtml(g.nombre) + '</td>'
      +   '<td>' + escapeHtml(g.descripcion || '—') + '</td>'
      +   '<td><span style="display:inline-block;padding:4px 10px;border-radius:999px;border:1px solid ' + color.border + ';background:' + color.bg + ';">' + escapeHtml(color.label) + '</span></td>'
      +   '<td>' + (conteo[g.id] || 0) + '</td>'
      +   '<td><button type="button" onclick="eliminarGrupo(\'' + escapeHtml(g.id) + '\')">Eliminar</button></td>'
      + '</tr>';
  }

  tbody.innerHTML = html;
}

function renderGruposVisuales() {
  var container =
    document.getElementById('grupos-visuales') ||
    document.getElementById('gruposVisuales') ||
    document.getElementById('grupos-grid') ||
    document.getElementById('gruposCards');

  if (!container) return;

  var grupos = obtenerGrupos();
  var map = obtenerMapaGrupos();
  var conteo = {};

  for (var sid in map) {
    if (Object.prototype.hasOwnProperty.call(map, sid)) {
      var gid = map[sid];
      conteo[gid] = (conteo[gid] || 0) + 1;
    }
  }

  grupos.sort(function(a, b) {
    return (a.orden || 99) - (b.orden || 99);
  });

  if (!grupos.length) {
    container.innerHTML = '<div class="empty-state">No hay grupos disponibles</div>';
    return;
  }

  var html = '';

  for (var i = 0; i < grupos.length; i++) {
    var g = grupos[i];
    var color = getGrupoColor(g.color);

    html += ''
      + '<div style="border:1px solid ' + color.border + ';background:' + color.bg + ';border-radius:16px;padding:16px;margin-bottom:12px;">'
      +   '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">'
      +     '<div>'
      +       '<div style="font-weight:700;">' + color.icon + ' ' + escapeHtml(g.nombre) + '</div>'
      +       '<div style="font-size:12px;opacity:.8;">' + escapeHtml(g.codigo) + '</div>'
      +     '</div>'
      +     '<div style="font-size:12px;padding:4px 8px;border-radius:999px;background:#fff;border:1px solid rgba(0,0,0,.08);">'
      +       + (conteo[g.id] || 0) + ' servicios'
      +     '</div>'
      +   '</div>'
      +   '<div style="margin-top:10px;font-size:14px;">' + escapeHtml(g.descripcion || 'Sin descripción') + '</div>'
      + '</div>';
  }

  container.innerHTML = html;
}

function actualizarSelectGrupos() {
  var selectIds = [
    'grp-select',
    'grupo-select',
    'servicio-grupo',
    'asignar-grupo',
    'grupoId',
    'grupo-servicio-select'
  ];

  var grupos = obtenerGrupos();
  grupos.sort(function(a, b) {
    return (a.orden || 99) - (b.orden || 99);
  });

  for (var i = 0; i < selectIds.length; i++) {
    var select = document.getElementById(selectIds[i]);
    if (!select) continue;

    var currentValue = select.value;
    var html = '<option value="">Selecciona un grupo</option>';

    for (var j = 0; j < grupos.length; j++) {
      html += '<option value="' + escapeHtml(grupos[j].id) + '">' + escapeHtml(grupos[j].nombre) + '</option>';
    }

    select.innerHTML = html;
    select.value = currentValue;
  }
}

function asignarServicioAGrupo(servicioId, grupoId) {
  if (!servicioId) return false;

  var map = obtenerMapaGrupos();

  if (!grupoId) {
    delete map[servicioId];
  } else {
    map[servicioId] = grupoId;
  }

  guardarMapaGrupos(map);
  renderGrupos();
  renderServiciosPorGrupo();
  renderServiciosSinGrupo();
  renderGruposVisuales();

  return true;
}

function quitarServicioDeGrupo(servicioId) {
  return asignarServicioAGrupo(servicioId, '');
}

function asignarServicioDesdeFormulario(event) {
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }

  var servicioSelect =
    document.getElementById('grp-servicio') ||
    document.getElementById('servicio-select') ||
    document.getElementById('servicio-sin-grupo');

  var grupoSelect =
    document.getElementById('grp-select') ||
    document.getElementById('grupo-select') ||
    document.getElementById('asignar-grupo');

  if (!servicioSelect || !grupoSelect) return false;

  if (!servicioSelect.value || !grupoSelect.value) {
    return false;
  }

  asignarServicioAGrupo(servicioSelect.value, grupoSelect.value);

  servicioSelect.value = '';
  grupoSelect.value = '';

  return false;
}

function renderServiciosPorGrupo() {
  var container =
    document.getElementById('servicios-por-grupo') ||
    document.getElementById('serviciosPorGrupo') ||
    document.getElementById('listaServiciosPorGrupo');

  if (!container) return;

  var grupos = obtenerGrupos();
  var servicios = getServiciosBase();
  var map = obtenerMapaGrupos();

  grupos.sort(function(a, b) {
    return (a.orden || 99) - (b.orden || 99);
  });

  if (!grupos.length) {
    container.innerHTML = '<div class="empty-state">No hay grupos registrados</div>';
    return;
  }

  var html = '';

  for (var i = 0; i < grupos.length; i++) {
    var g = grupos[i];
    var color = getGrupoColor(g.color);
    var items = [];

    for (var j = 0; j < servicios.length; j++) {
      if (map[servicios[j].id] === g.id) {
        items.push(servicios[j]);
      }
    }

    html += ''
      + '<div style="border:1px solid ' + color.border + ';border-radius:16px;padding:16px;margin-bottom:16px;background:#fff;">'
      +   '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px;">'
      +     '<div style="font-weight:700;">' + color.icon + ' ' + escapeHtml(g.nombre) + '</div>'
      +     '<div style="font-size:12px;color:#666;">' + items.length + ' servicios</div>'
      +   '</div>';

    if (!items.length) {
      html += '<div style="color:#777;">Sin servicios asignados</div>';
    } else {
      html += '<div>';

      for (var k = 0; k < items.length; k++) {
        var s = items[k];
        html += ''
          + '<div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:' + (k === 0 ? '0' : '1px solid #eee') + ';">'
          +   '<div>'
          +     '<div><strong>' + escapeHtml(s.codigo) + '</strong> — ' + escapeHtml(s.descripcion) + '</div>'
          +     '<div style="font-size:12px;color:#777;">' + escapeHtml(s.unidad || 'und') + '</div>'
          +   '</div>'
          +   '<button type="button" onclick="quitarServicioDeGrupo(\'' + escapeHtml(s.id) + '\')">Quitar</button>'
          + '</div>';
      }

      html += '</div>';
    }

    html += '</div>';
  }

  container.innerHTML = html;
}

function renderServiciosSinGrupo() {
  var container =
    document.getElementById('servicios-sin-grupo') ||
    document.getElementById('serviciosSinGrupo') ||
    document.getElementById('listaServiciosSinGrupo');

  var select =
    document.getElementById('grp-servicio') ||
    document.getElementById('servicio-select') ||
    document.getElementById('servicio-sin-grupo');

  var servicios = getServiciosBase();
  var map = obtenerMapaGrupos();
  var sinGrupo = [];

  for (var i = 0; i < servicios.length; i++) {
    if (!map[servicios[i].id]) {
      sinGrupo.push(servicios[i]);
    }
  }

  if (select) {
    var currentValue = select.value;
    var options = '<option value="">Selecciona un servicio</option>';

    for (var j = 0; j < sinGrupo.length; j++) {
      options += '<option value="' + escapeHtml(sinGrupo[j].id) + '">' + escapeHtml(sinGrupo[j].codigo + ' — ' + sinGrupo[j].descripcion) + '</option>';
    }

    select.innerHTML = options;
    select.value = currentValue;
  }

  if (!container) return;

  if (!sinGrupo.length) {
    container.innerHTML = '<div class="empty-state">✅ Todos los servicios tienen un grupo asignado</div>';
    return;
  }

  var html = '';

  for (var k = 0; k < sinGrupo.length; k++) {
    var s = sinGrupo[k];
    html += ''
      + '<div style="padding:12px 0;border-bottom:1px solid #eee;">'
      +   '<div><strong>' + escapeHtml(s.codigo) + '</strong> — ' + escapeHtml(s.descripcion) + '</div>'
      +   '<div style="font-size:12px;color:#777;">' + escapeHtml(s.unidad || 'und') + '</div>'
      + '</div>';
  }

  container.innerHTML = html;
}

function filtrarGrupos() {
  var input = document.getElementById('buscar-grupo') || document.getElementById('filtro-grupos');
  var valor = input ? input.value : '';
  renderGrupos(valor);
}
