// ============================================================
// js/catalogo-paquetes.js — Fase 5: Paquetes en Catálogo
// Paquetes agrupados de servicios con precio especial
// Requiere: storage.js (getData, addItem, updateItem, deleteItem)
// ============================================================

(function(window, document) {
  'use strict';

  var GNUtils = window.GNUtils || {};
  var byId = GNUtils.byId || function(id) { return document.getElementById(id); };
  var escapeHtml = GNUtils.escapeHtml || function(v) { return String(v || ''); };
  var formatMoney = GNUtils.formatMoney || function(v) {
    return 'USD ' + (parseFloat(v || 0) || 0).toFixed(2);
  };
  var showFeedback = GNUtils.showFeedback || function(target, msg, type) {
    var el = typeof target === 'string' ? byId(target) : target;
    if (!el) return;
    el.className = 'form-feedback ' + (type || 'error');
    el.textContent = msg || '';
    el.style.display = msg ? 'block' : 'none';
  };

  var STORAGE_KEY_PAQUETES = 'paquetes_catalogo';

  // ─── Helpers ─────────────────────────────────────────────

  function getPaquetesKey() {
    return window.STORAGE_KEYS && window.STORAGE_KEYS.PAQUETES
      ? window.STORAGE_KEYS.PAQUETES
      : STORAGE_KEY_PAQUETES;
  }

  async function obtenerPaquetes() {
    if (typeof window.getData !== 'function') return [];
    var result = await window.getData(getPaquetesKey(), { orderBy: 'nombre', ascending: true });
    return Array.isArray(result) ? result : [];
  }

  function calcularTotalServicios(itemsIds) {
    if (!Array.isArray(itemsIds) || !itemsIds.length) return 0;
    if (typeof window.obtenerServicios !== 'function') return 0;
    // Obtener servicios de forma sincrónica desde caché si existe
    var serviciosCached = window._serviciosCached || [];
    var total = 0;
    itemsIds.forEach(function(id) {
      var s = serviciosCached.find(function(x) { return x.id === id; });
      if (s) total += parseFloat(s.precio || 0) || 0;
    });
    return total;
  }

  function descuentoPorcentaje(totalBase, precioFinal) {
    if (!totalBase || totalBase <= 0) return 0;
    var diff = totalBase - precioFinal;
    if (diff <= 0) return 0;
    return Math.round((diff / totalBase) * 100);
  }

  // ─── Render principal de paquetes ────────────────────────

  async function renderPaquetes(filtroTexto) {
    var container = byId('listaPaquetes');
    if (!container) return;

    // Cachear servicios para cálculos
    if (typeof window.obtenerServicios === 'function') {
      window._serviciosCached = await window.obtenerServicios();
    }

    var paquetes = await obtenerPaquetes();

    if (filtroTexto) {
      var term = String(filtroTexto).toLowerCase();
      paquetes = paquetes.filter(function(p) {
        return String(p.nombre || '').toLowerCase().indexOf(term) !== -1 ||
               String(p.descripcion || '').toLowerCase().indexOf(term) !== -1;
      });
    }

    if (!paquetes.length) {
      container.innerHTML = '<div class="empty-state">No hay paquetes registrados. Crea tu primer paquete.</div>';
      return;
    }

    var html = paquetes.map(function(pkg) {
      var serviciosIds = Array.isArray(pkg.servicios_ids) ? pkg.servicios_ids : [];
      var totalBase = calcularTotalServicios(serviciosIds);
      var precioFinal = parseFloat(pkg.precio || 0) || 0;
      var descuento = descuentoPorcentaje(totalBase, precioFinal);
      var color = pkg.color || '#2D8B5E';
      var badgeHtml = descuento > 0
        ? '<span class="paquete-badge-descuento">-' + descuento + '%</span>'
        : '';

      var serviciosNombres = serviciosIds.map(function(sid) {
        var s = (window._serviciosCached || []).find(function(x) { return x.id === sid; });
        return s ? escapeHtml(s.nombre || s.descripcion || s.codigo || sid) : sid;
      });

      var serviciosListaHtml = serviciosNombres.length
        ? '<ul class="paquete-servicios-lista">' +
            serviciosNombres.map(function(n) { return '<li>' + n + '</li>'; }).join('') +
          '</ul>'
        : '<p class="paquete-sin-servicios">Sin servicios asignados</p>';

      return (
        '<div class="paquete-card" data-id="' + escapeHtml(pkg.id || '') + '" ' +
             'style="border-left: 4px solid ' + escapeHtml(color) + ';">' +
          '<div class="paquete-card-header">' +
            '<div class="paquete-card-titulo">' +
              '<span class="paquete-color-dot" style="background:' + escapeHtml(color) + ';"></span>' +
              '<strong>' + escapeHtml(pkg.nombre || 'Paquete') + '</strong>' +
              badgeHtml +
            '</div>' +
            '<div class="paquete-card-precio">' +
              (totalBase > 0 && descuento > 0
                ? '<span class="paquete-precio-tachado">' + formatMoney(totalBase) + '</span> '
                : '') +
              '<span class="paquete-precio-final">' + formatMoney(precioFinal) + '</span>' +
            '</div>' +
          '</div>' +
          '<p class="paquete-descripcion">' + escapeHtml(pkg.descripcion || '') + '</p>' +
          serviciosListaHtml +
          '<div class="paquete-card-acciones">' +
            '<button type="button" class="btn-table" onclick="editarPaquete(\'' + escapeHtml(pkg.id || '') + '\')">' +
              '✏️ Editar' +
            '</button>' +
            '<button type="button" class="btn-table secondary" onclick="usarPaqueteEnCotizacion(\'' + escapeHtml(pkg.id || '') + '\')">' +
              '📋 Usar en cotización' +
            '</button>' +
            '<button type="button" class="btn-table danger" onclick="eliminarPaquete(\'' + escapeHtml(pkg.id || '') + '\')">' +
              '🗑️ Eliminar' +
            '</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    container.innerHTML = html;
  }

  // ─── Formulario: abrir modal ──────────────────────────────

  async function abrirModalPaquete(idEditar) {
    var modal = byId('modalPaquete');
    if (!modal) return;

    // Cachear servicios para los checkboxes
    if (typeof window.obtenerServicios === 'function') {
      window._serviciosCached = await window.obtenerServicios();
    }

    var paqueteEditar = null;
    if (idEditar) {
      var todos = await obtenerPaquetes();
      paqueteEditar = todos.find(function(p) { return p.id === idEditar; }) || null;
    }

    // Rellenar formulario
    var fNombre = byId('pkg-nombre');
    var fDesc = byId('pkg-descripcion');
    var fPrecio = byId('pkg-precio');
    var fColor = byId('pkg-color');
    var fId = byId('pkg-id-editar');

    if (fNombre) fNombre.value = paqueteEditar ? (paqueteEditar.nombre || '') : '';
    if (fDesc) fDesc.value = paqueteEditar ? (paqueteEditar.descripcion || '') : '';
    if (fPrecio) fPrecio.value = paqueteEditar ? (paqueteEditar.precio || '') : '';
    if (fColor) fColor.value = paqueteEditar ? (paqueteEditar.color || '#2D8B5E') : '#2D8B5E';
    if (fId) fId.value = paqueteEditar ? (paqueteEditar.id || '') : '';

    // Render checkboxes de servicios
    renderCheckboxesServicios(
      paqueteEditar ? (Array.isArray(paqueteEditar.servicios_ids) ? paqueteEditar.servicios_ids : []) : []
    );

    // Actualizar preview de precio
    actualizarPreviewPrecioPaquete();

    modal.style.display = 'flex';
    modal.classList.add('activo');
  }

  function cerrarModalPaquete() {
    var modal = byId('modalPaquete');
    if (!modal) return;
    modal.style.display = 'none';
    modal.classList.remove('activo');
    var feedback = byId('feedback-paquete');
    showFeedback(feedback, '', '');
  }

  function renderCheckboxesServicios(seleccionados) {
    var cont = byId('pkg-servicios-lista');
    if (!cont) return;
    var servicios = window._serviciosCached || [];
    if (!servicios.length) {
      cont.innerHTML = '<p class="empty-state">No hay servicios en el catálogo</p>';
      return;
    }
    var html = servicios.map(function(s) {
      var checked = seleccionados.indexOf(s.id) !== -1 ? 'checked' : '';
      return (
        '<label class="pkg-servicio-check">' +
          '<input type="checkbox" value="' + escapeHtml(s.id || '') + '" ' + checked +
            ' onchange="actualizarPreviewPrecioPaquete()">' +
          '<span>' + escapeHtml(s.nombre || s.descripcion || s.codigo || '') +
            ' <em class="pkg-precio-ref">(' + formatMoney(s.precio) + ')</em>' +
          '</span>' +
        '</label>'
      );
    }).join('');
    cont.innerHTML = html;
  }

  function obtenerServiciosSeleccionados() {
    var cont = byId('pkg-servicios-lista');
    if (!cont) return [];
    var checks = cont.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checks).map(function(c) { return c.value; });
  }

  function actualizarPreviewPrecioPaquete() {
    var ids = obtenerServiciosSeleccionados();
    var totalBase = calcularTotalServicios(ids);
    var previewEl = byId('pkg-precio-preview');
    if (!previewEl) return;

    var precioInput = parseFloat((byId('pkg-precio') || {}).value || 0) || 0;
    var descuento = descuentoPorcentaje(totalBase, precioInput);

    var html = 'Suma de servicios: <strong>' + formatMoney(totalBase) + '</strong>';
    if (precioInput > 0 && descuento > 0) {
      html += ' → Ahorro: <strong class="color-success">-' + descuento + '%</strong>';
    }
    previewEl.innerHTML = html;
  }

  // ─── Guardar paquete ──────────────────────────────────────

  async function guardarPaquete(event) {
    if (event) event.preventDefault();
    var feedback = byId('feedback-paquete');

    var nombre = ((byId('pkg-nombre') || {}).value || '').trim();
    var descripcion = ((byId('pkg-descripcion') || {}).value || '').trim();
    var precio = parseFloat(((byId('pkg-precio') || {}).value || '0'));
    var color = ((byId('pkg-color') || {}).value || '#2D8B5E').trim();
    var idEditar = ((byId('pkg-id-editar') || {}).value || '').trim();
    var serviciosIds = obtenerServiciosSeleccionados();

    if (!nombre) {
      showFeedback(feedback, 'El nombre del paquete es obligatorio', 'error');
      return false;
    }
    if (precio <= 0) {
      showFeedback(feedback, 'Ingresa un precio válido mayor a cero', 'error');
      return false;
    }

    var payload = {
      nombre: nombre,
      descripcion: descripcion,
      precio: precio,
      color: color,
      servicios_ids: serviciosIds
    };

    var ok;
    if (idEditar) {
      if (typeof window.updateItem !== 'function') {
        showFeedback(feedback, 'No se puede actualizar en este momento', 'error');
        return false;
      }
      ok = await window.updateItem(getPaquetesKey(), idEditar, payload);
    } else {
      if (typeof window.addItem !== 'function') {
        showFeedback(feedback, 'No se puede guardar en este momento', 'error');
        return false;
      }
      ok = await window.addItem(getPaquetesKey(), payload);
    }

    if (!ok) {
      showFeedback(feedback, 'Error al guardar el paquete. Intenta de nuevo.', 'error');
      return false;
    }

    showFeedback(feedback, 'Paquete "' + nombre + '" guardado correctamente', 'success');
    setTimeout(cerrarModalPaquete, 900);
    await renderPaquetes();
    return false;
  }

  // ─── Editar / Eliminar ────────────────────────────────────

  async function editarPaquete(id) {
    await abrirModalPaquete(id);
  }

  async function eliminarPaquete(id) {
    if (!id) return;
    if (!window.confirm('¿Eliminar este paquete?')) return;
    if (typeof window.deleteItem !== 'function') return;
    var ok = await window.deleteItem(getPaquetesKey(), id);
    if (!ok) {
      window.alert('No se pudo eliminar el paquete.');
      return;
    }
    await renderPaquetes();
  }

  // ─── Usar en cotización ───────────────────────────────────

  async function usarPaqueteEnCotizacion(id) {
    var todos = await obtenerPaquetes();
    var pkg = todos.find(function(p) { return p.id === id; });
    if (!pkg) return;

    // Navegar a cotizaciones y precargar el paquete
    if (typeof window.navegarA === 'function') {
      window.navegarA('cotizaciones');
    } else {
      var link = document.querySelector('[data-section="cotizaciones"], [href="#cotizaciones"]');
      if (link) link.click();
    }

    // Evento para que cotizaciones.js / negocio-cotizaciones.js escuche
    setTimeout(function() {
      document.dispatchEvent(new CustomEvent('gn:usarPaquete', {
        detail: {
          paqueteId: pkg.id,
          nombre: pkg.nombre,
          precio: pkg.precio,
          serviciosIds: pkg.servicios_ids || []
        }
      }));
    }, 350);
  }

  // ─── Buscar paquetes ──────────────────────────────────────

  function filtrarPaquetes() {
    var input = byId('buscar-paquete');
    renderPaquetes(input ? input.value : '');
  }

  // ─── Inicializar módulo ───────────────────────────────────

  async function inicializarPaquetes() {
    await renderPaquetes();

    var btnNuevo = byId('btn-nuevo-paquete');
    if (btnNuevo) {
      btnNuevo.addEventListener('click', function() { abrirModalPaquete(null); });
    }

    var btnCerrar = byId('btn-cerrar-modal-paquete');
    if (btnCerrar) {
      btnCerrar.addEventListener('click', cerrarModalPaquete);
    }

    var formPkg = byId('formPaquete');
    if (formPkg) {
      formPkg.addEventListener('submit', guardarPaquete);
    }

    var inputBuscar = byId('buscar-paquete');
    if (inputBuscar) {
      inputBuscar.addEventListener('input', filtrarPaquetes);
    }

    var inputPrecio = byId('pkg-precio');
    if (inputPrecio) {
      inputPrecio.addEventListener('input', actualizarPreviewPrecioPaquete);
    }
  }

  // ─── Exportar al scope global ─────────────────────────────
  window.inicializarPaquetes = inicializarPaquetes;
  window.renderPaquetes = renderPaquetes;
  window.guardarPaquete = guardarPaquete;
  window.eliminarPaquete = eliminarPaquete;
  window.editarPaquete = editarPaquete;
  window.usarPaqueteEnCotizacion = usarPaqueteEnCotizacion;
  window.abrirModalPaquete = abrirModalPaquete;
  window.cerrarModalPaquete = cerrarModalPaquete;
  window.filtrarPaquetes = filtrarPaquetes;
  window.actualizarPreviewPrecioPaquete = actualizarPreviewPrecioPaquete;

})(window, document);
