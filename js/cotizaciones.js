// ============================================================
// js/cotizaciones.js — Módulo de Cotizaciones
// ============================================================

var itemsCotizacionActual = [];

// ============================================================
// INICIALIZAR
// ============================================================

function inicializarCotizaciones() {
  if (typeof getData !== 'function' || typeof setData !== 'function') return;

  var key = STORAGE_KEYS && STORAGE_KEYS.COTIZACIONES ? STORAGE_KEYS.COTIZACIONES : 'gn_cotizaciones';
  var data = getData(key);
  if (!Array.isArray(data)) setData(key, []);

  var fechaInput = document.getElementById('cot-fecha');
  if (fechaInput && !fechaInput.value) {
    fechaInput.value = obtenerFechaHoy();
  }

  actualizarSelectServicios();
  actualizarSelectClientes();
  renderItemsCotizacion();
  renderCotizacionesGuardadas();
}

// ============================================================
// HELPERS
// ============================================================

function keyCotizaciones() {
  return STORAGE_KEYS && STORAGE_KEYS.COTIZACIONES ? STORAGE_KEYS.COTIZACIONES : 'gn_cotizaciones';
}

function obtenerCotizaciones() {
  return getData(keyCotizaciones()) || [];
}

function guardarCotizacionesData(cotizaciones) {
  setData(keyCotizaciones(), cotizaciones);
}

function obtenerFechaHoy() {
  var hoy = new Date();
  return hoy.getFullYear()
    + '-' + String(hoy.getMonth() + 1).padStart(2, '0')
    + '-' + String(hoy.getDate()).padStart(2, '0');
}

function obtenerTextoOpcion(selectId) {
  var select = document.getElementById(selectId);
  if (!select || select.selectedIndex < 0) return '';
  return (select.options[select.selectedIndex] && select.options[select.selectedIndex].text) || '';
}

function obtenerClienteSeleccionado() {
  var clienteId = document.getElementById('cot-cliente') ? document.getElementById('cot-cliente').value : '';
  if (!clienteId) return null;

  var clientes = getData(STORAGE_KEYS.CLIENTES) || [];
  for (var i = 0; i < clientes.length; i++) {
    if (clientes[i].id === clienteId) return clientes[i];
  }
  return null;
}

function calcularTotalesCotizacion() {
  var subtotal = 0;
  var itbmsMonto = 0;

  for (var i = 0; i < itemsCotizacionActual.length; i++) {
    var item = itemsCotizacionActual[i];
    var cantidad = parseFloat(item.cantidad) || 0;
    var precio = parseFloat(item.precioUnitario) || 0;
    var totalItem = cantidad * precio;

    subtotal += totalItem;

    if (item.aplicaItbms) {
      itbmsMonto += totalItem * 0.07;
    }
  }

  var descuentoPct = parseFloat(document.getElementById('cot-descuento') ? document.getElementById('cot-descuento').value : 0) || 0;
  var descuentoMonto = (subtotal + itbmsMonto) * (descuentoPct / 100);
  var total = subtotal + itbmsMonto - descuentoMonto;

  return {
    subtotal: subtotal,
    itbmsMonto: itbmsMonto,
    descuentoPct: descuentoPct,
    descuentoMonto: descuentoMonto,
    total: total
  };
}

function actualizarResumenCotizacion() {
  var resumen = calcularTotalesCotizacion();

  var subtotalEl = document.getElementById('cot-subtotal');
  var itbmsEl = document.getElementById('cot-itbms-monto');
  var descuentoEl = document.getElementById('cot-descuento-monto');
  var totalEl = document.getElementById('cot-total');
  var rowItbms = document.getElementById('row-itbms');
  var rowDescuento = document.getElementById('row-descuento');

  if (subtotalEl) subtotalEl.textContent = formatMoney(resumen.subtotal);
  if (itbmsEl) itbmsEl.textContent = formatMoney(resumen.itbmsMonto);
  if (descuentoEl) descuentoEl.textContent = formatMoney(resumen.descuentoMonto);
  if (totalEl) totalEl.textContent = formatMoney(resumen.total);

  if (rowItbms) {
    rowItbms.style.display = resumen.itbmsMonto > 0 ? '' : 'none';
  }

  if (rowDescuento) {
    rowDescuento.style.display = resumen.descuentoMonto > 0 ? '' : 'none';
  }
}

// ============================================================
// SELECTS
// ============================================================

function actualizarSelectServicios() {
  var select = document.getElementById('cot-item-servicio');
  if (!select || typeof obtenerServicios !== 'function') return;

  var servicios = obtenerServicios() || [];
  var html = '<option value="">Selecciona del catálogo</option>';

  for (var i = 0; i < servicios.length; i++) {
    var s = servicios[i];
    html += '<option value="' + s.id + '">[' + s.codigo + '] ' + s.descripcion + '</option>';
  }

  select.innerHTML = html;
}

function actualizarSelectClientes() {
  var select = document.getElementById('cot-cliente');
  if (!select) return;

  var clientes = getData(STORAGE_KEYS.CLIENTES) || [];
  var html = '<option value="">Selecciona un cliente</option>';

  for (var i = 0; i < clientes.length; i++) {
    var c = clientes[i];
    html += '<option value="' + c.id + '">' + c.nombre + '</option>';
  }

  select.innerHTML = html;
}

// ============================================================
// SERVICIO DESDE CATÁLOGO
// ============================================================

function cargarPrecioServicio() {
  return true;
}

function agregarItemDesdeCatalogo() {
  var servicioId = document.getElementById('cot-item-servicio').value;
  var cantidad = parseFloat(document.getElementById('cot-item-cantidad-catalogo').value) || 1;

  if (!servicioId) {
    alert('Selecciona un servicio del catálogo');
    return false;
  }

  var servicio = findItem(STORAGE_KEYS.SERVICIOS, servicioId);
  if (!servicio) {
    alert('No se encontró el servicio seleccionado');
    return false;
  }

  var item = {
    id: generarId(),
    tipo: 'catalogo',
    servicioId: servicio.id,
    codigo: servicio.codigo,
    descripcion: servicio.descripcion,
    cantidad: cantidad,
    unidad: servicio.unidad,
    precioUnitario: parseFloat(servicio.precio) || 0,
    aplicaItbms: parseInt(servicio.itbms) === 1
  };

  itemsCotizacionActual.push(item);

  document.getElementById('cot-item-servicio').value = '';
  document.getElementById('cot-item-cantidad-catalogo').value = '1';

  renderItemsCotizacion();
  return false;
}

// ============================================================
// ITEM MANUAL
// ============================================================

function agregarItemManual() {
  var descripcion = document.getElementById('cot-item-desc-manual').value.trim();
  var cantidad = parseFloat(document.getElementById('cot-item-cantidad-manual').value) || 1;
  var unidad = document.getElementById('cot-item-unidad-manual').value;
  var precio = parseFloat(document.getElementById('cot-item-precio-manual').value);
  var itbms = parseInt(document.getElementById('cot-item-itbms-manual').value);

  if (!descripcion) {
    alert('Ingresa una descripción para el servicio');
    return false;
  }

  if (!precio || precio <= 0) {
    alert('Ingresa un precio unitario válido');
    return false;
  }

  var item = {
    id: generarId(),
    tipo: 'manual',
    servicioId: null,
    codigo: 'MANUAL',
    descripcion: descripcion,
    cantidad: cantidad,
    unidad: unidad,
    precioUnitario: precio,
    aplicaItbms: itbms === 1
  };

  itemsCotizacionActual.push(item);

  document.getElementById('cot-item-desc-manual').value = '';
  document.getElementById('cot-item-cantidad-manual').value = '1';
  document.getElementById('cot-item-precio-manual').value = '';

  renderItemsCotizacion();
  return false;
}

// ============================================================
// RENDER ITEMS
// ============================================================

function eliminarItemCotizacion(itemId) {
  itemsCotizacionActual = itemsCotizacionActual.filter(function(item) {
    return item.id !== itemId;
  });

  renderItemsCotizacion();
}

function renderItemsCotizacion() {
  var tbody = document.getElementById('tbodyItemsCotizacion');
  var agrupados = document.getElementById('items-agrupados-container');

  if (tbody) {
    if (itemsCotizacionActual.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No hay items agregados</td></tr>';
    } else {
      var html = '';

      for (var i = 0; i < itemsCotizacionActual.length; i++) {
        var item = itemsCotizacionActual[i];
        var totalItem = (parseFloat(item.cantidad) || 0) * (parseFloat(item.precioUnitario) || 0);
        var itbmsItem = item.aplicaItbms ? totalItem * 0.07 : 0;

        html += ''
          + '<tr>'
          + '<td>' + (i + 1) + '</td>'
          + '<td>' + (item.tipo === 'catalogo' ? '[' + item.codigo + '] ' : '') + item.descripcion + '</td>'
          + '<td>' + item.cantidad + '</td>'
          + '<td>' + item.unidad + '</td>'
          + '<td>' + formatMoney(item.precioUnitario) + '</td>'
          + '<td>' + formatMoney(totalItem) + '</td>'
          + '<td>' + (item.aplicaItbms ? formatMoney(itbmsItem) : '—') + '</td>'
          + '<td><button type="button" class="btn-table danger" onclick="eliminarItemCotizacion(\'' + item.id + '\')">Eliminar</button></td>'
          + '</tr>';
      }

      tbody.innerHTML = html;
    }
  }

  if (agrupados) {
    if (itemsCotizacionActual.length === 0) {
      agrupados.innerHTML = '<div class="tabla-vacia"><div class="tabla-vacia-icon">🧾</div>No hay items agregados</div>';
    } else {
      var tarjetas = '';

      for (var j = 0; j < itemsCotizacionActual.length; j++) {
        var item2 = itemsCotizacionActual[j];
        var totalItem2 = (parseFloat(item2.cantidad) || 0) * (parseFloat(item2.precioUnitario) || 0);

        tarjetas += ''
          + '<div class="card-item-cotizacion" style="border:1px solid rgba(255,255,255,0.08);padding:12px;border-radius:12px;margin-bottom:10px;">'
          + '<div style="font-weight:600;">' + (item2.tipo === 'catalogo' ? '[' + item2.codigo + '] ' : '') + item2.descripcion + '</div>'
          + '<div style="opacity:.8;margin-top:4px;">'
          + item2.cantidad + ' × ' + item2.unidad + ' · ' + formatMoney(item2.precioUnitario)
          + (item2.aplicaItbms ? ' · ITBMS' : ' · Sin ITBMS')
          + '</div>'
          + '<div style="margin-top:6px;font-weight:700;color:#6bbd45;">' + formatMoney(totalItem2) + '</div>'
          + '</div>';
      }

      agrupados.innerHTML = tarjetas;
    }
  }

  actualizarResumenCotizacion();
}

// ============================================================
// GUARDAR COTIZACIÓN
// ============================================================

function guardarCotizacion() {
  var feedback = document.getElementById('feedback-cotizacion');
  var clienteId = document.getElementById('cot-cliente').value;
  var proyecto = document.getElementById('cot-proyecto').value.trim();
  var fecha = document.getElementById('cot-fecha').value;
  var atencion = document.getElementById('cot-atencion').value.trim();
  var alcance = document.getElementById('cot-alcance').value.trim();
  var aplicaItbmsGeneral = parseInt(document.getElementById('cot-itbms').value) === 1;

  if (!clienteId) {
    alert('Selecciona un cliente');
    return false;
  }

  if (!proyecto) {
    alert('Ingresa el nombre del proyecto');
    return false;
  }

  if (itemsCotizacionActual.length === 0) {
    alert('Agrega al menos un item a la cotización');
    return false;
  }

  var cliente = obtenerClienteSeleccionado();
  var resumen = calcularTotalesCotizacion();

  var cotizacion = {
    id: generarId(),
    numero: typeof generarNumeroCotizacion === 'function' ? generarNumeroCotizacion(fecha) : ('COT-' + Date.now()),
    clienteId: clienteId,
    clienteNombre: cliente ? cliente.nombre : '',
    proyecto: proyecto,
    fecha: fecha,
    atencion: atencion,
    alcance: alcance,
    aplicaItbms: aplicaItbmsGeneral,
    descuentoPct: resumen.descuentoPct,
    subtotal: resumen.subtotal,
    itbmsMonto: resumen.itbmsMonto,
    descuentoMonto: resumen.descuentoMonto,
    total: resumen.total,
    estado: 'pendiente',
    items: JSON.parse(JSON.stringify(itemsCotizacionActual)),
    creadoEn: new Date().toISOString()
  };

  var cotizaciones = obtenerCotizaciones();
  cotizaciones.push(cotizacion);
  cotizaciones.sort(function(a, b) {
    return new Date(b.creadoEn) - new Date(a.creadoEn);
  });

  guardarCotizacionesData(cotizaciones);

  if (feedback) {
    feedback.className = 'form-feedback success';
    feedback.textContent = '✅ Cotización guardada: ' + cotizacion.numero;
  }

  renderCotizacionesGuardadas();
  if (typeof actualizarKPIs === 'function') actualizarKPIs();
  if (typeof limpiarCotizacion === 'function') limpiarCotizacion();

  return false;
}

// ============================================================
// HISTORIAL
// ============================================================

function cambiarEstadoCotizacion(id, nuevoEstado) {
  var cotizaciones = obtenerCotizaciones();

  for (var i = 0; i < cotizaciones.length; i++) {
    if (cotizaciones[i].id === id) {
      cotizaciones[i].estado = nuevoEstado;
      break;
    }
  }

  guardarCotizacionesData(cotizaciones);
  renderCotizacionesGuardadas();
  if (typeof actualizarKPIs === 'function') actualizarKPIs();
}

function eliminarCotizacion(id) {
  if (!confirm('¿Eliminar esta cotización?')) return;

  var cotizaciones = obtenerCotizaciones().filter(function(c) {
    return c.id !== id;
  });

  guardarCotizacionesData(cotizaciones);
  renderCotizacionesGuardadas();
  if (typeof actualizarKPIs === 'function') actualizarKPIs();
}

function renderCotizacionesGuardadas(filtro) {
  var tbody = document.getElementById('tbodyCotizaciones');
  if (!tbody) return;

  var cotizaciones = obtenerCotizaciones();

  if (filtro) {
    var term = filtro.toLowerCase();
    cotizaciones = cotizaciones.filter(function(c) {
      return (c.numero || '').toLowerCase().indexOf(term) !== -1
        || (c.clienteNombre || '').toLowerCase().indexOf(term) !== -1
        || (c.proyecto || '').toLowerCase().indexOf(term) !== -1;
    });
  }

  if (cotizaciones.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay cotizaciones registradas</td></tr>';
    return;
  }

  var html = '';

  for (var i = 0; i < cotizaciones.length; i++) {
    var c = cotizaciones[i];

    html += ''
      + '<tr>'
      + '<td>' + c.numero + '</td>'
      + '<td>' + (c.clienteNombre || '—') + '</td>'
      + '<td>' + (c.proyecto || '—') + '</td>'
      + '<td>' + formatMoney(c.total || 0) + '</td>'
      + '<td>'
      + '<select onchange="cambiarEstadoCotizacion(\'' + c.id + '\', this.value)">'
      + '<option value="pendiente"' + (c.estado === 'pendiente' ? ' selected' : '') + '>Pendiente</option>'
      + '<option value="aprobada"' + (c.estado === 'aprobada' ? ' selected' : '') + '>Aprobada</option>'
      + '<option value="rechazada"' + (c.estado === 'rechazada' ? ' selected' : '') + '>Rechazada</option>'
      + '<option value="vencida"' + (c.estado === 'vencida' ? ' selected' : '') + '>Vencida</option>'
      + '</select>'
      + '</td>'
      + '<td>' + (typeof formatDate === 'function' ? formatDate(c.fecha) : c.fecha) + '</td>'
      + '<td><button type="button" class="btn-table danger" onclick="eliminarCotizacion(\'' + c.id + '\')">Eliminar</button></td>'
      + '</tr>';
  }

  tbody.innerHTML = html;
}

function filtrarCotizaciones() {
  var term = document.getElementById('buscar-cotizacion');
  renderCotizacionesGuardadas(term ? term.value : '');
}
