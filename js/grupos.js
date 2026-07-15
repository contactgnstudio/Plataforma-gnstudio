// ============================================================
// js/grupos.js — Gestión de Grupos de Servicios (v2)
// ============================================================

var GRUPOS_KEY = 'gn_grupos_servicios';
var GRUPO_SERVICIOS_KEY = 'gn_grupo_servicio_map';

var COLORES_GRUPO = {
  green:  { bg: 'rgba(107,189,69,0.15)',  border: '#6bbd45',  label: 'Verde', icon: '🟢' },
  blue:   { bg: 'rgba(79,140,255,0.15)',  border: '#4f8cff',  label: 'Azul', icon: '🔵' },
  purple: { bg: 'rgba(168,85,247,0.15)',  border: '#a855f7',  label: 'Púrpura', icon: '🟣' },
  orange: { bg: 'rgba(245,158,11,0.15)',  border: '#f59e0b',  label: 'Naranja', icon: '🟠' },
  red:    { bg: 'rgba(239,68,68,0.15)',   border: '#ef4444',  label: 'Rojo', icon: '🔴' },
  teal:   { bg: 'rgba(20,184,166,0.15)',  border: '#14b8a6',  label: 'Turquesa', icon: '🩵' },
  pink:   { bg: 'rgba(236,72,153,0.15)',  border: '#ec4899',  label: 'Rosa', icon: '🩷' },
  gray:   { bg: 'rgba(100,116,139,0.15)', border: '#64748b',  label: 'Gris', icon: '⚪' }
};

var gruposEjemplo = [
  { id: 'grp-desarrollo', codigo: 'DESARROLLO', nombre: 'Desarrollo Web', descripcion: 'Programación, APIs, CMS, deploy', color: 'green', orden: 1, creadoEn: new Date().toISOString() },
  { id: 'grp-diseno',     codigo: 'DISENO',     nombre: 'Diseño Web',     descripcion: 'UI/UX, landing pages, responsive', color: 'blue', orden: 2, creadoEn: new Date().toISOString() },
  { id: 'grp-branding',   codigo: 'BRANDING',   nombre: 'Branding',       descripcion: 'Logotipos, manual de marca, papelería', color: 'purple', orden: 3, creadoEn: new Date().toISOString() },
  { id: 'grp-marketing',  codigo: 'MARKETING',  nombre: 'Marketing Digital', descripcion: 'Ads, SEO, email marketing', color: 'orange', orden: 4, creadoEn: new Date().toISOString() },
  { id: 'grp-social',     codigo: 'SOCIAL',     nombre: 'Social Media',   descripcion: 'Gestión de redes, contenido', color: 'pink', orden: 5, creadoEn: new Date().toISOString() },
  { id: 'grp-consultoria', codigo: 'CONSULTORIA', nombre: 'Consultoría',   descripcion: 'Auditorías, estrategia, asesoría', color: 'teal', orden: 6, creadoEn: new Date().toISOString() },
  { id: 'grp-soporte',    codigo: 'SOPORTE',    nombre: 'Soporte & Hosting', descripcion: 'Mantenimiento, hosting, dominios', color: 'gray', orden: 7, creadoEn: new Date().toISOString() }
];

// ============================================================
// INICIALIZAR
// ============================================================
function inicializarGrupos() {
  var grupos = getData(GRUPOS_KEY);
  if (!grupos || grupos.length === 0) {
    setData(GRUPOS_KEY, gruposEjemplo);
  }
  
  var map = getData(GRUPO_SERVICIOS_KEY);
  if (!map) setData(GRUPO_SERVICIOS_KEY, {});
  
  renderGrupos();
  renderGruposVisuales();
  actualizarSelectGrupos();
  renderServiciosPorGrupo();
  renderServiciosSinGrupo();
}

function obtenerGrupos() {
  return getData(GRUPOS_KEY) || [];
}

function obtenerMapaGrupos() {
  return getData(GRUPO_SERVICIOS_KEY) || {};
}

function guardarMapaGrupos(map) {
  setData(GRUPO_SERVICIOS_KEY, map);
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
// CRUD GRUPOS
// ============================================================
function guardarGrupo(event) {
  event.preventDefault();
  var feedback = document.getElementById('feedback-grupo');
  
  var codigo = document.getElementById('grp-codigo').value.trim().toUpperCase();
  var grupos = obtenerGrupos();
  
  for (var i = 0; i < grupos.length; i++) {
    if (grupos[i].codigo === codigo) {
      feedback.className = 'form-feedback error';
      feedback.textContent = '❌ El código "' + codigo + '" ya existe';
      return false;
    }
  }
  
  var nuevoGrupo = {
    id: generarId(),
    codigo: codigo,
    nombre: document.getElementById('grp-nombre').value.trim(),
    descripcion: document.getElementById('grp-descripcion').value.trim(),
    color: document.getElementById('grp-color').value,
    orden: parseInt(document.getElementById('grp-orden').value) || 99,
    creadoEn: new Date().toISOString()
  };
  
  grupos.push(nuevoGrupo);
  grupos.sort(function(a, b) { return a.orden - b.orden; });
  setData(GRUPOS_KEY, grupos);
  
  feedback.className = 'form-feedback success';
  feedback.textContent = '✅ Grupo "' + nuevoGrupo.nombre + '" creado';
  document.getElementById('formGrupo').reset();
  
  renderGrupos();
  renderGruposVisuales();
  actualizarSelectGrupos();
  renderServiciosPorGrupo();
  renderServiciosSinGrupo();
  return false;
}

function eliminarGrupo(id) {
  if (!confirm('¿Eliminar este grupo? Los servicios asignados quedarán sin grupo.')) return;
  
  var map = obtenerMapaGrupos();
  var nuevoMap = {};
  for (var sid in map) {
    if (map[sid] !== id) nuevoMap[sid] = map[sid];
  }
  guardarMapaGrupos(nuevoMap);
  
  var grupos = obtenerGrupos().filter(function(g) { return g.id !== id; });
  setData(GRUPOS_KEY, grupos);
  
  renderGrupos();
  renderGruposVisuales();
  actualizarSelectGrupos();
  renderServiciosPorGrupo();
  renderServiciosSinGrupo();
}

// ============================================================
// RENDER GRUPOS (tabla)
// ============================================================
function renderGrupos(filtro) {
  var tbody = document.getElementById('tbodyGrupos');
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
      return g.nombre.toLowerCase().indexOf(term) !== -1 ||
             g.codigo.toLowerCase().indexOf(term) !== -1;
    });
  }
  
  if (grupos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="tabla-vacia"><div class="tabla-vacia-icon">📁</div>No hay grupos creados</td></tr>';
    return;
  }
  
  var html = '';
  for (var i = 0; i < grupos.length; i++) {
    var g = grupos[i];
    var color = COLORES_GRUPO[g.color] || COLORES_GRUPO.gray;
    var cantidad = conteo[g.id] || 0;
    
    html += '<tr>' +
      '<td>' + g.orden + '</td>' +
      '<td><strong style="color:' + color.border + '">' + g.codigo + '</strong></td>' +
      '<td>' + g.nombre + '</td>' +
      '<td>' + (g.descripcion || '—') + '</td>' +
      '<td><span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:10px;height:10px;border-radius:50%;background:' + color.border + ';"></span>' + color.label + '</span></td>' +
      '<td>' + cantidad + ' servicio' + (cantidad !== 1 ? 's' : '') + '</td>' +
      '<td class="td-actions">' +
        '<button class="btn-icon" onclick="eliminarGrupo(\'' + g.id + '\')" title="Eliminar">🗑</button>' +
      '</td>' +
      '</tr>';
  }
  
  tbody.innerHTML = html;
}

function filtrarGrupos() {
  var texto = document.getElementById('buscar-grupo').value;
  renderGrupos(texto);
}

// ============================================================
// RENDER GRUPOS VISUALES (tarjetas)
// ============================================================
function renderGruposVisuales() {
  var container = document.getElementById('grupos-visual');
  if (!container) return;
  
  var grupos = obtenerGrupos();
  var map = obtenerMapaGrupos();
  
  var conteo = {};
  for (var sid in map) {
    var gid = map[sid];
    conteo[gid] = (conteo[gid] || 0) + 1;
  }
  
  var html = '';
  for (var i = 0; i < grupos.length; i++) {
    var g = grupos[i];
    var color = COLORES_GRUPO[g.color] || COLORES_GRUPO.gray;
    var cantidad = conteo[g.id] || 0;
    
    html += '<div class="grupo-card" onclick="filtrarServiciosPorGrupo(\'' + g.id + '\')">' +
      '<div class="grupo-card-header">' +
        '<div class="grupo-card-icon" style="background:' + color.bg + ';color:' + color.border + ';">' + color.icon + '</div>' +
        '<div class="grupo-card-title">' + g.nombre + '</div>' +
      '</div>' +
      '<div class="grupo-card-count">' + cantidad + '</div>' +
      '<div class="grupo-card-label">servicio' + (cantidad !== 1 ? 's' : '') + '</div>' +
      '</div>';
  }
  
  container.innerHTML = html;
}

// ============================================================
// SERVICIOS POR GRUPO
// ============================================================
function renderServiciosPorGrupo() {
  var container = document.getElementById('servicios-por-grupo');
  if (!container) return;
  
  var servicios = obtenerServicios();
  var grupos = obtenerGrupos();
  var map = obtenerMapaGrupos();
  
  var porGrupo = {};
  var sinGrupo = [];
  
  for (var i = 0; i < servicios.length; i++) {
    var s = servicios[i];
    var gid = map[s.id];
    if (gid && porGrupo[gid]) {
      porGrupo[gid].push(s);
    } else if (gid) {
      porGrupo[gid] = [s];
    } else {
      sinGrupo.push(s);
    }
  }
  
  var html = '';
  
  for (var i = 0; i < grupos.length; i++) {
    var g = grupos[i];
    var servs = porGrupo[g.id] || [];
    if (servs.length === 0) continue;
    
    var color = COLORES_GRUPO[g.color] || COLORES_GRUPO.gray;
    
    html += '<div class="grupo-cotizacion" style="margin-bottom:16px;">' +
      '<div class="grupo-cotizacion-header" style="background:' + color.bg + ';color:' + color.border + ';">' +
        '<span class="grupo-dot" style="background:' + color.border + ';"></span>' +
        g.nombre + ' (' + servs.length + ')' +
      '</div>' +
      '<div class="table-wrap">' +
      '<table>' +
      '<thead><tr><th>Código</th><th>Descripción</th><th>Unidad</th><th>Precio</th><th>ITBMS</th><th>Acción</th></tr></thead>' +
      '<tbody>';
    
    for (var j = 0; j < servs.length; j++) {
      var s = servs[j];
      html += '<tr>' +
        '<td><strong style="color:' + color.border + '">' + s.codigo + '</strong></td>' +
        '<td>' + s.descripcion + '</td>' +
        '<td>' + s.unidad + '</td>' +
        '<td class="td-monto">' + formatMoney(s.precio) + '</td>' +
        '<td>' + (s.itbms ? 'Sí' : 'No') + '</td>' +
        '<td class="td-actions">' +
          '<button class="btn-icon" onclick="eliminarServicio(\'' + s.id + '\')" title="Eliminar">🗑</button>' +
        '</td>' +
        '</tr>';
    }
    
    html += '</tbody></table></div></div>';
  }
  
  if (sinGrupo.length > 0) {
    html += '<div class="grupo-cotizacion" style="margin-bottom:16px;">' +
      '<div class="grupo-cotizacion-header" style="background:rgba(100,116,139,0.1);color:#64748b;">' +
        '<span class="grupo-dot" style="background:#64748b;"></span>' +
        'Sin grupo asignado (' + sinGrupo.length + ')' +
      '</div>' +
      '<div class="table-wrap">' +
      '<table>' +
      '<thead><tr><th>Código</th><th>Descripción</th><th>Unidad</th><th>Precio</th><th>ITBMS</th><th>Acción</th></tr></thead>' +
      '<tbody>';
    
    for (var j = 0; j < sinGrupo.length; j++) {
      var s = sinGrupo[j];
      html += '<tr>' +
        '<td><strong style="color:#64748b;">' + s.codigo + '</strong></td>' +
        '<td>' + s.descripcion + '</td>' +
        '<td>' + s.unidad + '</td>' +
        '<td class="td-monto">' + formatMoney(s.precio) + '</td>' +
        '<td>' + (s.itbms ? 'Sí' : 'No') + '</td>' +
        '<td class="td-actions">' +
          '<button class="btn-icon" onclick="eliminarServicio(\'' + s.id + '\')" title="Eliminar">🗑</button>' +
        '</td>' +
        '</tr>';
    }
    
    html += '</tbody></table></div></div>';
  }
  
  container.innerHTML = html || '<div class="tabla-vacia" style="padding:40px;"><div class="tabla-vacia-icon">📋</div>No hay servicios registrados</div>';
}

function filtrarServiciosPorGrupo(grupoId) {
  // Scroll a la sección de catálogo y filtrar
  switchSubSection('negocio', 'catalogo');
  // Aquí se podría implementar un filtro visual
}

// ============================================================
// ASIGNAR SERVICIOS A GRUPOS
// ============================================================
function actualizarSelectGrupos() {
  var selects = document.querySelectorAll('#serv-grupo, #asig-grupo');
  
  var grupos = obtenerGrupos();
  
  for (var s = 0; s < selects.length; s++) {
    var select = selects[s];
    if (!select) continue;
    var valActual = select.value;
    select.innerHTML = '<option value="">Selecciona un grupo</option>';
    
    for (var i = 0; i < grupos.length; i++) {
      var g = grupos[i];
      select.innerHTML += '<option value="' + g.id + '">' + g.codigo + ' — ' + g.nombre + '</option>';
    }
    
    select.value = valActual;
  }
}

function renderServiciosSinGrupo() {
  var container = document.getElementById('servicios-sin-grupo');
  if (!container) return;
  
  var servicios = obtenerServicios();
  var map = obtenerMapaGrupos();
  
  var sinGrupo = [];
  for (var i = 0; i < servicios.length; i++) {
    if (!map[servicios[i].id]) {
      sinGrupo.push(servicios[i]);
    }
  }
  
  if (sinGrupo.length === 0) {
    container.innerHTML = '<p class="tabla-vacia" style="padding:20px;">✅ Todos los servicios tienen un grupo asignado</p>';
    return;
  }
  
  var html = '<div class="checklist-grid">';
  for (var i = 0; i < sinGrupo.length; i++) {
    var s = sinGrupo[i];
    html += '<label class="checklist-item">' +
      '<input type="checkbox" value="' + s.id + '" class="chk-servicio-grupo">' +
      '<span class="checklist-text">' +
        '<strong style="color:#6bbd45">' + s.codigo + '</strong> — ' + s.descripcion +
        '<small style="color:#8a8a96;display:block;">' + (CAT_LABELS[s.categoria] || s.categoria) + ' | ' + formatMoney(s.precio) + '</small>' +
      '</span>' +
      '</label>';
  }
  html += '</div>';
  
  container.innerHTML = html;
}

function asignarServiciosAGrupo() {
  var feedback = document.getElementById('feedback-asignacion');
  var grupoId = document.getElementById('asig-grupo').value;
  
  if (!grupoId) {
    feedback.className = 'form-feedback error';
    feedback.textContent = '❌ Selecciona un grupo primero';
    return;
  }
  
  var checkboxes = document.querySelectorAll('.chk-servicio-grupo:checked');
  if (checkboxes.length === 0) {
    feedback.className = 'form-feedback error';
    feedback.textContent = '❌ Selecciona al menos un servicio';
    return;
  }
  
  var map = obtenerMapaGrupos();
  for (var i = 0; i < checkboxes.length; i++) {
    map[checkboxes[i].value] = grupoId;
  }
  guardarMapaGrupos(map);
  
  feedback.className = 'form-feedback success';
  feedback.textContent = '✅ ' + checkboxes.length + ' servicio(s) asignado(s) al grupo';
  
  renderGrupos();
  renderGruposVisuales();
  renderServiciosPorGrupo();
  renderServiciosSinGrupo();
}

// ============================================================
// IA - SUGERIR GRUPO (FASE 1: Manual / FASE 2: Automático)
// ============================================================
function sugerirGrupoIA() {
  var descripcion = document.getElementById('serv-descripcion').value.trim().toLowerCase();
  var categoria = document.getElementById('serv-categoria').value;
  
  if (!descripcion) {
    alert('❌ Escribe una descripción primero');
    return;
  }
  
  // FASE 1: Reglas básicas de palabras clave
  var keywords = {
    'desarrollo': ['grp-desarrollo', 'desarrollo', 'programación', 'coding', 'api', 'backend', 'frontend', 'web', 'app', 'sistema'],
    'diseno': ['grp-diseno', 'diseño', 'ui', 'ux', 'landing', 'mockup', 'wireframe', 'figma', 'interfaz'],
    'branding': ['grp-branding', 'logo', 'marca', 'identidad', 'manual', 'papelería', 'brand'],
    'marketing': ['grp-marketing', 'marketing', 'ads', 'google ads', 'facebook ads', 'seo', 'email', 'campana'],
    'social': ['grp-social', 'social', 'instagram', 'facebook', 'tiktok', 'redes', 'community'],
    'consultoria': ['grp-consultoria', 'consultoría', 'auditoría', 'estrategia', 'asesoría', 'plan'],
    'soporte': ['grp-soporte', 'hosting', 'dominio', 'mantenimiento', 'soporte', 'backup', 'server']
  };
  
  var sugerencia = null;
  var maxMatches = 0;
  
  for (var grupoId in keywords) {
    var data = keywords[grupoId];
    var grupoRealId = data[0];
    var matches = 0;
    
    for (var i = 1; i < data.length; i++) {
      if (descripcion.indexOf(data[i]) !== -1) matches++;
    }
    
    if (matches > maxMatches) {
      maxMatches = matches;
      sugerencia = grupoRealId;
    }
  }
  
  // También verificar por categoría
  var catMap = {
    'desarrollo': 'grp-desarrollo',
    'diseno_web': 'grp-diseno',
    'branding': 'grp-branding',
    'marketing': 'grp-marketing',
    'social_media': 'grp-social',
    'consultoria': 'grp-consultoria',
    'mantenimiento': 'grp-soporte',
    'hosting': 'grp-soporte'
  };
  
  if (!sugerencia && catMap[categoria]) {
    sugerencia = catMap[categoria];
  }
  
  if (sugerencia) {
    var grupos = obtenerGrupos();
    var grupo = null;
    for (var i = 0; i < grupos.length; i++) {
      if (grupos[i].id === sugerencia) {
        grupo = grupos[i];
        break;
      }
    }
    
    if (grupo) {
      var confirmar = confirm('🤖 Sugerencia de IA:\n\nEl servicio parece pertenecer al grupo: "' + grupo.nombre + '"\n\n¿Aplicar esta sugerencia?');
      if (confirmar) {
        document.getElementById('serv-grupo').value = sugerencia;
      }
    }
  } else {
    // FASE 2: Preguntar si crear nuevo grupo
    var crear = confirm('🤖 No encontré un grupo que encaje con este servicio.\n\n¿Quieres que cree un nuevo grupo automáticamente basado en: "' + descripcion + '"?\n\n(Fase 2: El sistema aprenderá de tus decisiones)');
    if (crear) {
      // Aquí iría la lógica para crear grupo automático
      alert('🚧 Función de creación automática en desarrollo. Por favor crea el grupo manualmente.');
    }
  }
}

// ============================================================
// FUNCIONES PARA COTIZACIONES (agrupar items)
// ============================================================
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
