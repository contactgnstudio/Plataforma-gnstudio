// ============================================================
// js/catalogo.js — Catálogo de Servicios
// ============================================================

function $serv(id) {
  return document.getElementById(id);
}

function servicioEscapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

var serviciosEjemplo = [
  { id: generarId(), codigo: 'WEB-001', categoria: 'diseno', descripcion: 'Landing page de alto impacto', unidad: 'und', precio: 450.00, itbms: 1 },
  { id: generarId(), codigo: 'WEB-002', categoria: 'diseno', descripcion: 'Sitio web corporativo hasta 5 páginas', unidad: 'proyecto', precio: 1800.00, itbms: 1 },
  { id: generarId(), codigo: 'DEV-001', categoria: 'desarrollo', descripcion: 'Desarrollo frontend HTML/CSS/JS', unidad: 'hr', precio: 45.00, itbms: 1 },
  { id: generarId(), codigo: 'DEV-002', categoria: 'desarrollo', descripcion: 'Desarrollo backend', unidad: 'hr', precio: 55.00, itbms: 1 },
  { id: generarId(), codigo: 'BRD-001', categoria: 'branding', descripcion: 'Diseño de logotipo', unidad: 'proyecto', precio: 650.00, itbms: 1 },
  { id: generarId(), codigo: 'BRD-002', categoria: 'branding', descripcion: 'Manual de marca', unidad: 'proyecto', precio: 1200.00, itbms: 1 },
  { id: generarId(), codigo: 'MKT-001', categoria: 'marketing', descripcion: 'Estrategia de marketing digital mensual', unidad: 'mes', precio: 800.00, itbms: 1 },
  { id: generarId(), codigo: 'SEO-001', categoria: 'seo', descripcion: 'Auditoría SEO completa', unidad: 'proyecto', precio: 500.00, itbms: 1 },
  { id: generarId(), codigo: 'SM-001', categoria: 'social_media', descripcion: 'Gestión mensual de redes sociales', unidad: 'mes', precio: 600.00, itbms: 1 },
  { id: generarId(), codigo: 'HOS-001', categoria: 'hosting', descripcion: 'Hosting compartido anual', unidad: 'und', precio: 120.00, itbms: 1 }
];

// ============================================================
// DATOS
// ============================================================

function inicializarCatalogo() {
  var data = getData(STORAGE_KEYS.SERVICIOS);
  if (!Array.isArray(data) || data.length === 0) {
    setData(STORAGE_KEYS.SERVICIOS, serviciosEjemplo);
  }
}

function obtenerServicios() {
  var data = getData(STORAGE_KEYS.SERVICIOS);
  return Array.isArray(data) ? data : [];
}

function guardarServicios(servicios) {
  setData(STORAGE_KEYS.SERVICIOS, servicios);
}

// ============================================================
// HELPERS
// ============================================================

function obtenerGrupoIdFormularioServicio() {
  var select = $serv('serv-grupo') || $serv('serv-categoria');
  return select ? select.value : '';
}

function obtenerNombreGrupoPorId(grupoId) {
  if (!grupoId || typeof obtenerGrupos !== 'function') return '';
  var grupos = obtenerGrupos();
  for (var i = 0; i < grupos.length; i++) {
    if (grupos[i].id === grupoId) return grupos[i].nombre;
  }
  return '';
}

function sincronizarGrupoServicio(servicioId, grupoId) {
  if (typeof obtenerMapaGrupos !== 'function' || typeof guardarMapaGrupos !== 'function') return;
  var map = obtenerMapaGrupos() || {};

  if (grupoId) {
    map[servicioId] = grupoId;
  } else {
    delete map[servicioId];
  }

  guardarMapaGrupos(map);
}

// ============================================================
// CRUD
// ============================================================

function guardarServicio(event) {
  event.preventDefault();

  var feedback = $serv('feedback-servicio');
  var codigo = ($serv('serv-codigo') ? $serv('serv-codigo').value : '').trim().toUpperCase();
  var descripcion = ($serv('serv-descripcion') ? $serv('serv-descripcion').value : '').trim();
  var unidad = $serv('serv-unidad') ? $serv('serv-unidad').value : 'und';
  var precio = parseFloat($serv('serv-precio') ? $serv('serv-precio').value : 0);
  var itbms = parseInt($serv('serv-itbms') ? $serv('serv-itbms').value : 1);
  var grupoId = obtenerGrupoIdFormularioServicio();

  if (!codigo || !descripcion || !precio || precio <= 0) {
    if (feedback) {
      feedback.className = 'form-feedback error';
      feedback.textContent = '❌ Completa código, descripción y precio válido';
    }
    return false;
  }

  var servicios = obtenerServicios();

  for (var i = 0; i < servicios.length; i++) {
    if (servicios[i].codigo === codigo) {
      if (feedback) {
        feedback.className = 'form-feedback error';
        feedback.textContent = '❌ El código "' + codigo + '" ya existe';
      }
      return false;
    }
  }

  var grupoNombre = obtenerNombreGrupoPorId(grupoId);

  var nuevoServicio = {
    id: generarId(),
    codigo: codigo,
    categoria: grupoNombre ? grupoNombre.toLowerCase().replace(/\s+/g, '_') : 'general',
    grupoId: grupoId || '',
    descripcion: descripcion,
    unidad: unidad,
    precio: precio,
    itbms: itbms === 1 ? 1 : 0,
    creadoEn: new Date().toISOString()
  };

  servicios.push(nuevoServicio);
  servicios.sort(function(a, b) {
    return a.codigo.localeCompare(b.codigo);
  });

  guardarServicios(servicios);
  sincronizarGrupoServicio(nuevoServicio.id, grupoId);

  if (feedback) {
    feedback.className = 'form-feedback success';
    feedback.textContent = '✅ Servicio "' + codigo + '" guardado correctamente';
  }

  if ($serv('formServicio')) $serv('formServicio').reset();

  renderServicios();
  actualizarVistaJSON();

  if (typeof actualizarSelectServicios === 'function') actualizarSelectServicios();
  if (typeof renderServiciosPorGrupo === 'function') renderServiciosPorGrupo();
  if (typeof renderServiciosSinGrupo === 'function') renderServiciosSinGrupo();

  return false;
}

function eliminarServicio(id) {
  if (!confirm('¿Eliminar este servicio?')) return;

  var servicios = obtenerServicios().filter(function(s) {
    return s.id !== id;
  });

  guardarServicios(servicios);
  sincronizarGrupoServicio(id, '');

  renderServicios();
  actualizarVistaJSON();

  if (typeof actualizarSelectServicios === 'function') actualizarSelectServicios();
  if (typeof renderServiciosPorGrupo === 'function') renderServiciosPorGrupo();
  if (typeof renderServiciosSinGrupo === 'function') renderServiciosSinGrupo();
}

// ============================================================
// RENDER
// ============================================================

function renderServicios(filtroTexto, filtroGrupo) {
  var servicios = obtenerServicios();
  var tbody = $serv('tbodyServicios');
  if (!tbody) return;

  if (filtroTexto) {
    var term = filtroTexto.toLowerCase();
    servicios = servicios.filter(function(s) {
      return (s.descripcion || '').toLowerCase().indexOf(term) !== -1
        || (s.codigo || '').toLowerCase().indexOf(term) !== -1;
    });
  }

  if (filtroGrupo && filtroGrupo !== 'todos') {
    servicios = servicios.filter(function(s) {
      var grupoId = s.grupoId || '';
      if (!grupoId && typeof obtenerMapaGrupos === 'function') {
        var map = obtenerMapaGrupos() || {};
        grupoId = map[s.id] || '';
      }
      return grupoId === filtroGrupo;
    });
  }

  if (servicios.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hay servicios registrados</td></tr>';
    return;
  }

  var html = '';

  for (var i = 0; i < servicios.length; i++) {
    var s = servicios[i];
    var grupoId = s.grupoId || '';
    if (!grupoId && typeof obtenerMapaGrupos === 'function') {
      var map = obtenerMapaGrupos() || {};
      grupoId = map[s.id] || '';
    }
    var grupoNombre = obtenerNombreGrupoPorId(grupoId) || 'Sin grupo';

    html += ''
      + '<tr>'
      + '<td>' + servicioEscapeHtml(s.codigo) + '</td>'
      + '<td>'
      + '<div style="font-weight:600;">' + servicioEscapeHtml(s.descripcion) + '</div>'
      + '<div style="opacity:.75;font-size:.9em;">' + servicioEscapeHtml(grupoNombre) + '</div>'
      + '</td>'
      + '<td>' + servicioEscapeHtml(s.unidad) + '</td>'
      + '<td>' + formatMoney(parseFloat(s.precio) || 0) + '</td>'
      + '<td>' + ((parseInt(s.itbms) === 1) ? 'Sí' : 'No') + '</td>'
      + '<td><button type="button" class="btn-table danger" onclick="eliminarServicio(\'' + s.id + '\')">Eliminar</button></td>'
      + '</tr>';
  }

  tbody.innerHTML = html;
}

function filtrarServicios() {
  var input = $serv('buscar-servicio');
  var filtroGrupo = $serv('filtro-grupo-servicio') || $serv('filtro-servicio-grupo');

  renderServicios(
    input ? input.value : '',
    filtroGrupo ? filtroGrupo.value : ''
  );
}

function actualizarVistaJSON() {
  var target = $serv('jsonServicios') || $serv('vista-json') || $serv('servicios-json');
  if (!target) return;

  var servicios = obtenerServicios();
  target.textContent = JSON.stringify(servicios, null, 2);
}
