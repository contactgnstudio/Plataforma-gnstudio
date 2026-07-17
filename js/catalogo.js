// ============================================================
// js/catalogo.js — Catálogo de Servicios + Supabase
// ============================================================

function $serv(id) {
  return document.getElementById(id);
}

function servicioEscapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function servicioFormatMoney(valor) {
  if (typeof formatMoney === 'function') return formatMoney(valor);
  var num = parseFloat(valor || 0);
  return 'USD ' + num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function catalogoSupabase() {
  return window.supabaseClient || null;
}

async function catalogoGetUserId() {
  var sb = catalogoSupabase();
  if (!sb) return null;

  try {
    var session = await sb.auth.getSession();
    return session && session.data && session.data.session
      ? session.data.session.user.id
      : null;
  } catch (error) {
    return null;
  }
}

var serviciosEjemplo = [
  { codigo: 'WEB-001', categoria: 'diseno_web', descripcion: 'Landing page de alto impacto', unidad: 'und', precio: 450.00, itbms: 1 },
  { codigo: 'WEB-002', categoria: 'diseno_web', descripcion: 'Sitio web corporativo hasta 5 páginas', unidad: 'proyecto', precio: 1800.00, itbms: 1 },
  { codigo: 'DEV-001', categoria: 'desarrollo_web', descripcion: 'Desarrollo frontend HTML/CSS/JS', unidad: 'hr', precio: 45.00, itbms: 1 },
  { codigo: 'DEV-002', categoria: 'desarrollo_web', descripcion: 'Desarrollo backend', unidad: 'hr', precio: 55.00, itbms: 1 },
  { codigo: 'BRD-001', categoria: 'branding', descripcion: 'Diseño de logotipo', unidad: 'proyecto', precio: 650.00, itbms: 1 },
  { codigo: 'BRD-002', categoria: 'branding', descripcion: 'Manual de marca', unidad: 'proyecto', precio: 1200.00, itbms: 1 },
  { codigo: 'MKT-001', categoria: 'marketing', descripcion: 'Estrategia de marketing digital mensual', unidad: 'mes', precio: 800.00, itbms: 1 },
  { codigo: 'SEO-001', categoria: 'seo', descripcion: 'Auditoría SEO completa', unidad: 'proyecto', precio: 500.00, itbms: 1 },
  { codigo: 'SM-001', categoria: 'social_media', descripcion: 'Gestión mensual de redes sociales', unidad: 'mes', precio: 600.00, itbms: 1 },
  { codigo: 'HOS-001', categoria: 'hosting', descripcion: 'Hosting compartido anual', unidad: 'und', precio: 120.00, itbms: 1 }
];

// ============================================================
// DATOS
// ============================================================

async function inicializarCatalogo() {
  await sembrarServiciosSiVacio();
  await renderServicios();
  await actualizarVistaJSON();
}

async function obtenerServicios() {
  var sb = catalogoSupabase();
  if (!sb) {
    console.error('Supabase no disponible en catálogo');
    return [];
  }

  try {
    var result = await sb
      .from('servicios')
      .select('*')
      .order('codigo', { ascending: true });

    if (result.error) {
      console.error('Error obtenerServicios:', result.error.message);
      return [];
    }

    return Array.isArray(result.data) ? result.data : [];
  } catch (error) {
    console.error('Error obtenerServicios:', error);
    return [];
  }
}

async function sembrarServiciosSiVacio() {
  var servicios = await obtenerServicios();
  if (servicios.length > 0) return true;

  var sb = catalogoSupabase();
  if (!sb) return false;

  var userId = await catalogoGetUserId();
  if (!userId) {
    console.error('No se pudo obtener el usuario autenticado para sembrar servicios');
    return false;
  }

  var rows = serviciosEjemplo.map(function(item) {
    return {
      codigo: item.codigo,
      categoria: item.categoria,
      descripcion: item.descripcion,
      unidad: item.unidad,
      precio: item.precio,
      itbms: item.itbms,
      user_id: userId
    };
  });

  try {
    var result = await sb.from('servicios').insert(rows);
    if (result.error) {
      console.error('Error sembrando servicios de ejemplo:', result.error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error sembrando servicios de ejemplo:', error);
    return false;
  }
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

function normalizarCategoriaDesdeGrupo(grupoNombre) {
  return (grupoNombre || 'general')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
}

// ============================================================
// CRUD
// ============================================================

async function guardarServicio(event) {
  if (event) event.preventDefault();

  var feedback = $serv('feedback-servicio');
  var codigo = ($serv('serv-codigo') ? $serv('serv-codigo').value : '').trim().toUpperCase();
  var descripcion = ($serv('serv-descripcion') ? $serv('serv-descripcion').value : '').trim();
  var unidad = $serv('serv-unidad') ? $serv('serv-unidad').value : 'und';
  var precio = parseFloat($serv('serv-precio') ? $serv('serv-precio').value : 0);
  var itbms = parseInt($serv('serv-itbms') ? $serv('serv-itbms').value : 1, 10);
  var grupoId = obtenerGrupoIdFormularioServicio();
  var grupoNombre = obtenerNombreGrupoPorId(grupoId);

  if (!codigo || !descripcion || !precio || precio <= 0) {
    if (feedback) {
      feedback.className = 'form-feedback error';
      feedback.textContent = '❌ Completa código, descripción y precio válido';
      feedback.style.display = 'block';
    }
    return false;
  }

  var servicios = await obtenerServicios();

  for (var i = 0; i < servicios.length; i++) {
    if ((servicios[i].codigo || '').toUpperCase() === codigo) {
      if (feedback) {
        feedback.className = 'form-feedback error';
        feedback.textContent = '❌ El código "' + codigo + '" ya existe';
        feedback.style.display = 'block';
      }
      return false;
    }
  }

  var sb = catalogoSupabase();
  if (!sb) {
    if (feedback) {
      feedback.className = 'form-feedback error';
      feedback.textContent = '❌ Supabase no está disponible';
      feedback.style.display = 'block';
    }
    return false;
  }

  var userId = await catalogoGetUserId();
  if (!userId) {
    if (feedback) {
      feedback.className = 'form-feedback error';
      feedback.textContent = '❌ No hay una sesión válida';
      feedback.style.display = 'block';
    }
    return false;
  }

  var nuevoServicio = {
    codigo: codigo,
    categoria: normalizarCategoriaDesdeGrupo(grupoNombre),
    descripcion: descripcion,
    unidad: unidad,
    precio: precio,
    itbms: itbms === 1 ? 1 : 0,
    user_id: userId
  };

  try {
    var result = await sb
      .from('servicios')
      .insert(nuevoServicio)
      .select()
      .single();

    if (result.error) {
      if (feedback) {
        feedback.className = 'form-feedback error';
        feedback.textContent = '❌ ' + result.error.message;
        feedback.style.display = 'block';
      }
      return false;
    }

    if (result.data && result.data.id) {
      sincronizarGrupoServicio(result.data.id, grupoId);
    }

    if (feedback) {
      feedback.className = 'form-feedback success';
      feedback.textContent = '✅ Servicio "' + codigo + '" guardado correctamente';
      feedback.style.display = 'block';
    }

    if ($serv('formServicio')) $serv('formServicio').reset();

    await renderServicios();
    await actualizarVistaJSON();

    if (typeof actualizarSelectServicios === 'function') {
      await actualizarSelectServicios();
    }

    if (typeof renderServiciosPorGrupo === 'function') {
      renderServiciosPorGrupo();
    }

    if (typeof renderServiciosSinGrupo === 'function') {
      renderServiciosSinGrupo();
    }

    return false;
  } catch (error) {
    console.error('Error guardarServicio:', error);

    if (feedback) {
      feedback.className = 'form-feedback error';
      feedback.textContent = '❌ No se pudo guardar el servicio';
      feedback.style.display = 'block';
    }

    return false;
  }
}

async function eliminarServicio(id) {
  if (!confirm('¿Eliminar este servicio?')) return;

  var sb = catalogoSupabase();
  if (!sb) return;

  try {
    var result = await sb.from('servicios').delete().eq('id', id);

    if (result.error) {
      alert('No se pudo eliminar el servicio: ' + result.error.message);
      return;
    }

    sincronizarGrupoServicio(id, '');

    await renderServicios();
    await actualizarVistaJSON();

    if (typeof actualizarSelectServicios === 'function') {
      await actualizarSelectServicios();
    }

    if (typeof renderServiciosPorGrupo === 'function') {
      renderServiciosPorGrupo();
    }

    if (typeof renderServiciosSinGrupo === 'function') {
      renderServiciosSinGrupo();
    }
  } catch (error) {
    console.error('Error eliminarServicio:', error);
    alert('No se pudo eliminar el servicio.');
  }
}

// ============================================================
// RENDER
// ============================================================

async function renderServicios(filtroTexto, filtroGrupo) {
  var servicios = await obtenerServicios();
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
      if (typeof obtenerMapaGrupos !== 'function') return false;
      var map = obtenerMapaGrupos() || {};
      var grupoId = map[s.id] || '';
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
    var grupoId = '';

    if (typeof obtenerMapaGrupos === 'function') {
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
      + '<td>' + servicioFormatMoney(parseFloat(s.precio) || 0) + '</td>'
      + '<td>' + ((parseInt(s.itbms, 10) === 1) ? 'Sí' : 'No') + '</td>'
      + '<td><button type="button" class="btn-table danger" onclick="eliminarServicio(\'' + s.id + '\')">Eliminar</button></td>'
      + '</tr>';
  }

  tbody.innerHTML = html;
}

async function filtrarServicios() {
  var input = $serv('buscar-servicio');
  var filtroGrupo = $serv('filtro-grupo-servicio') || $serv('filtro-servicio-grupo');

  await renderServicios(
    input ? input.value : '',
    filtroGrupo ? filtroGrupo.value : ''
  );
}

async function actualizarVistaJSON() {
  var target = $serv('jsonServicios') || $serv('vista-json') || $serv('servicios-json');
  if (!target) return;

  var servicios = await obtenerServicios();
  target.textContent = JSON.stringify(servicios, null, 2);
}
